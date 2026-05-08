// ═══════════════════════════════════════════════════════════════════════════
//  DIFRUMARKET — Telegram Bot Gateway v2
//
//  Arquitectura:
//  ┌────────────┐     reenvío manual      ┌──────────────────────────────┐
//  │ WhatsApp   │ ─────────────────────→  │  Telegram Bot (este archivo) │
//  │ (clientes) │                         │  - Lee KB desde /data/kb.json │
//  └────────────┘                         │  - Llama al AI Orchestrator   │
//                                         │  - Persiste conversaciones    │
//  ┌────────────────────────────────────────────────────────────────────── ┐
//  │  Admin React Panel ──→ POST /api/kb  ──→  kbService actualiza en disco│
//  │                        (hot-reload automático en el bot)              │
//  └─────────────────────────────────────────────────────────────────────-─┘
//
//  npm install telegraf express express-rate-limit helmet cors @anthropic-ai/sdk
//              axios jsdom dotenv jsonwebtoken
// ═══════════════════════════════════════════════════════════════════════════
import { Telegraf, Markup }       from "telegraf";
import express                    from "express";
import cors                       from "cors";
import helmet                     from "helmet";
import rateLimit                  from "express-rate-limit";
import dotenv                     from "dotenv";
import path                       from "path";

import { AIOrchestrator }         from "./ai-orchestrator.js";
import { ProductCatalog }         from "./catalog.js";
import { SecurityMiddleware }     from "./security/middleware.js";
import { WhatsAppService }        from "./whatsapp-service.js";
import { kbService }              from "./kb-service.js";
import { settings }               from "./settings-service.js";
import kbRoutes                   from "./routes/kb.js";
import adminRoutes, { setOrchestratorRef, setCatalogRef } from "./routes/admin.js";
import waRoutes, { setWhatsAppRefs, getWhatsAppStats }    from "./routes/whatsapp.js";
import ordersRoutes               from "./routes/orders.js";

dotenv.config();
const isVercel = !!(process.env.VERCEL || process.env.NOW_REGION);

// ─── Validación de env requeridas ───────────────────────────────────────────
const REQUIRED = ["TELEGRAM_BOT_TOKEN", "ADMIN_CHAT_IDS"];
REQUIRED.forEach(k => {
  if (!process.env[k]) {
    console.error(`❌ Falta variable de entorno: ${k}`);
    if (!isVercel) process.exit(1);
  }
});

const PORT       = Number(process.env.PORT || 3000);
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const BOT_TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_IDS   = (process.env.ADMIN_CHAT_IDS || "").split(",").map(id => Number(id.trim())).filter(id => !isNaN(id));

// ─── Instancias ─────────────────────────────────────────────────────────────
const bot          = new Telegraf(BOT_TOKEN);
const orchestrator = new AIOrchestrator();
// El catálogo arranca con el margen guardado en disco (sobrevive reinicios)
const catalog      = new ProductCatalog(settings.getMargin());
const security     = new SecurityMiddleware();
const waService    = new WhatsAppService();

// Exportamos para el entry de Vercel (ahora que están inicializados)
// Se movió al final del archivo para asegurar la inicialización de 'app'

// Si el admin cambia el margen via API, el catálogo lo refleja en tiempo real
settings.on("marginChanged", m => catalog.setMargin(m));

// Exponer refs para las rutas admin
setOrchestratorRef(orchestrator);
setCatalogRef(catalog);

// Exponer refs para el webhook de WhatsApp Cloud API
setWhatsAppRefs({
  orchestrator,
  catalog,
  waService,
  bot,
  adminIds: ADMIN_IDS,
});

// ─── Historial de conversaciones por usuario ─────────────────────────────────
// { userId: [{ role, content }] }
const conversations = new Map();
const MAX_HISTORY   = 14; // turnos de conversación a recordar

function getHistory(uid) {
  if (!conversations.has(uid)) conversations.set(uid, []);
  return conversations.get(uid);
}
function addToHistory(uid, role, content) {
  const h = getHistory(uid);
  h.push({ role, content });
  if (h.length > MAX_HISTORY) h.splice(0, h.length - MAX_HISTORY);
}

// ─── Sistema de reenvío WhatsApp ─────────────────────────────────────────────
// Cuando un admin reenvía un mensaje de un cliente de WhatsApp,
// el bot lo procesa como si fuera una consulta del cliente.
//
// Flujo:
// 1. Cliente escribe por WhatsApp
// 2. Admin reenvía el mensaje al bot de Telegram
// 3. Bot detecta que es un reenvío y activa modo "asistente de ventas"
// 4. Bot responde con una respuesta optimizada para copiar/pegar en WA
// 5. Admin copia la respuesta y la pega en WhatsApp
//
// Los admins también pueden escribir /wa <mensaje> para consultar directamente.

// Contexto de consultas WhatsApp pendientes (por admin)
const whatsappSessions = new Map(); // adminId → { clientName, messages[], lastActivity }

function getWaSession(adminId) {
  if (!whatsappSessions.has(adminId)) {
    whatsappSessions.set(adminId, { clientName: null, messages: [], lastActivity: Date.now() });
  }
  return whatsappSessions.get(adminId);
}

function clearWaSession(adminId) {
  whatsappSessions.delete(adminId);
}

// ─── Escuchar cambios en la KB (hot-reload) ──────────────────────────────────
kbService.on("updated", entries => {
  const active = entries.filter(e => e.active && e.cat !== "ai_rules").length;
  console.log(`[KB] 🔄 KB recargada — ${entries.length} entradas (${active} activas)`);
  // El orchestrator ya usa kbService.buildPromptBlock() en cada llamada,
  // por lo que no hay nada más que hacer aquí.
});

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE DEL BOT
// ═══════════════════════════════════════════════════════════════════════════
bot.use(async (ctx, next) => {
  const uid = ctx.from?.id;
  if (!uid) return;

  // Rate limiting: 10 mensajes/minuto por usuario
  if (!security.checkRateLimit(uid, 10, 60_000)) {
    return ctx.reply("⏳ Demasiadas consultas. Esperá un momento antes de escribir de nuevo.");
  }

  security.log({
    event:    "message",
    userId:   uid,
    username: ctx.from?.username,
    text:     ctx.message?.text?.slice(0, 120),
    timestamp: new Date().toISOString(),
  });

  await next();
});

// ═══════════════════════════════════════════════════════════════════════════
// COMANDOS DEL BOT
// ═══════════════════════════════════════════════════════════════════════════

// /start
bot.start(async ctx => {
  const name = ctx.from.first_name || "amigo/a";
  conversations.delete(ctx.from.id); // reset historial al iniciar

  await ctx.reply(
    `🌰 *¡Hola ${name}!* Bienvenido/a a *Frutos Selectos DIFRUMARKET*.\n\n` +
    `Puedo ayudarte con:\n` +
    `• 🛍️ Precios y disponibilidad\n` +
    `• 📦 Cómo hacer un pedido\n` +
    `• 🚚 Información de envíos\n` +
    `• 🌿 Recomendaciones de productos\n\n` +
    `¡Escribime lo que necesitás!`,
    {
      parse_mode: "Markdown",
      ...Markup.keyboard([
        ["🛍️ Ver catálogo", "💰 Precios"],
        ["📦 Hacer un pedido", "🚚 Info de envíos"],
        ["🕐 Horarios", "📞 Contacto"],
      ]).resize(),
    }
  );
});

// /catalogo — muestra el catálogo agrupado por categoría
bot.hears(["🛍️ Ver catálogo", "/catalogo"], async ctx => {
  await ctx.sendChatAction("typing");
  const products = await catalog.getAll();
  const byCat    = products.reduce((acc, p) => {
    acc[p.category] = acc[p.category] || [];
    acc[p.category].push(p);
    return acc;
  }, {});

  let msg = `🌰 *Catálogo DIFRUMARKET* — ${products.length} productos\n━━━━━━━━━━━━━━━━\n\n`;
  for (const [cat, items] of Object.entries(byCat)) {
    msg += `*${cat}*\n`;
    items.slice(0, 6).forEach(p => {
      msg += `• ${p.name} (${p.unit}) → $${p.salePrice.toLocaleString("es-AR")}\n`;
    });
    msg += "\n";
  }
  msg += `_Precios con ${products[0]?.margin || 30}% incluido. Sujeto a stock._`;
  await ctx.reply(msg.slice(0, 3800), { parse_mode: "Markdown" });
});

// Horarios — responde directo desde la KB
bot.hears(["🕐 Horarios", "/horarios"], async ctx => {
  const entry = kbService.getActive().find(e => e.cat === "hours" || e.triggers?.includes("horario"));
  const text  = entry
    ? `🕐 *Horarios*\n\n${entry.answer}`
    : "Atendemos Lunes a Viernes de 9 a 18hs y Sábados de 9 a 13hs.";
  await ctx.reply(text, { parse_mode: "Markdown" });
});

// Contacto
bot.hears(["📞 Contacto", "/contacto"], async ctx => {
  await ctx.reply(
    `📞 *Contacto DIFRUMARKET*\n\n` +
    `WhatsApp: +${process.env.WA_NUMBER || "5491112345678"}\n` +
    `🚚 Envíos a todo el país\n` +
    `📍 Buenos Aires, Argentina\n\n` +
    `_Para hacer un pedido, usá el botón "📦 Hacer un pedido"_`,
    { parse_mode: "Markdown" }
  );
});

// Hacer un pedido — link al catálogo web
bot.hears(["📦 Hacer un pedido", "/pedido"], async ctx => {
  await ctx.reply(
    `🛒 *¿Cómo hacer tu pedido?*\n\n` +
    `1️⃣ Decime qué productos querés y en qué cantidad\n` +
    `2️⃣ Te confirmo disponibilidad y precio total\n` +
    `3️⃣ Elegís el medio de pago (transferencia, MercadoPago, efectivo)\n` +
    `4️⃣ Coordinamos envío o retiro\n\n` +
    `_¡Escribime tu lista y arrancamos!_ 🌰`,
    { parse_mode: "Markdown" }
  );
});

// ── Comando admin: /kb — resumen de la KB (solo para admins) ─────────────────
bot.command("kb", async ctx => {
  if (!ADMIN_IDS.includes(ctx.from.id)) return;
  const stats = kbService.getStats();
  await ctx.reply(
    `🧠 *Estado KB*\n\n` +
    `• Total: ${stats.total} entradas\n` +
    `• Activas: ${stats.active}\n` +
    `• Inactivas: ${stats.inactive}\n` +
    `• Por categoría: ${Object.entries(stats.byCat).map(([k,v])=>`${k}(${v})`).join(", ")}\n` +
    `• Última actualización: ${stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleString("es-AR") : "sin datos"}`,
    { parse_mode: "Markdown" }
  );
});

// ── Comando admin: /metrics ──────────────────────────────────────────────────
bot.command("metrics", async ctx => {
  if (!ADMIN_IDS.includes(ctx.from.id)) return;
  const m    = orchestrator.getMetrics();
  const text = `📊 *Métricas IA*\n\nTotal consultas: ${m.totalCalls}\nÚltimo agente: ${m.lastUsedAgent || "—"}\n\n` +
    m.agents.map(a => `${a.configured ? "✅" : "⬜"} *${a.name}*\n   ✓ ${a.success} | ✗ ${a.failures} | ⚡ ${a.latencyMs ? a.latencyMs + "ms" : "—"}`).join("\n");
  await ctx.reply(text, { parse_mode: "Markdown" });
});

// ═══════════════════════════════════════════════════════════════════════════
// WHATSAPP → TELEGRAM — Reenvío inteligente para atención a clientes
// ═══════════════════════════════════════════════════════════════════════════

// ── /wa <mensaje> — Consultar como si fuera un cliente de WhatsApp ───────────
bot.command("wa", async ctx => {
  if (!ADMIN_IDS.includes(ctx.from.id)) return;

  const text = ctx.message.text.replace(/^\/wa\s*/i, "").trim();
  if (!text) {
    return ctx.reply(
      "📱 *Modo Asistente WhatsApp*\n\n" +
      "Usá este comando para obtener respuestas orientadas a ventas que podés copiar y pegar en WhatsApp.\n\n" +
      "*Opciones:*\n" +
      "• `/wa <mensaje del cliente>` — Generar respuesta de ventas\n" +
      "• `/wa nuevo` — Resetear conversación (nuevo cliente)\n" +
      "• `/wa clientes` — Ver sesiones activas\n" +
      "• También podés *reenviar* un mensaje de WhatsApp directamente al bot\n\n" +
      "_La IA generará respuestas optimizadas para cerrar ventas._",
      { parse_mode: "Markdown" }
    );
  }

  // /wa nuevo — resetear sesión
  if (text.toLowerCase() === "nuevo") {
    clearWaSession(ctx.from.id);
    return ctx.reply("🔄 Sesión WhatsApp reseteada. Listo para un nuevo cliente.");
  }

  // /wa clientes — ver sesiones activas
  if (text.toLowerCase() === "clientes") {
    if (whatsappSessions.size === 0) {
      return ctx.reply("No hay sesiones WhatsApp activas.");
    }
    let msg = "📱 *Sesiones WhatsApp Activas*\n\n";
    for (const [adminId, session] of whatsappSessions) {
      const ago = Math.round((Date.now() - session.lastActivity) / 60000);
      msg += `• Admin ${adminId} → Cliente: ${session.clientName || "anónimo"} (${session.messages.length} msgs, hace ${ago}min)\n`;
    }
    return ctx.reply(msg, { parse_mode: "Markdown" });
  }

  // Procesar como consulta de cliente WhatsApp
  await processWhatsAppQuery(ctx, text, "Cliente WhatsApp");
});

// ── Detectar mensajes reenviados (admin reenvía mensaje de WhatsApp) ─────────
bot.on("message", async (ctx, next) => {
  const uid = ctx.from.id;

  // Solo procesar reenvíos de admins
  if (!ADMIN_IDS.includes(uid)) return next();

  // Detectar si es un mensaje reenviado
  const fwd = ctx.message.forward_from || ctx.message.forward_sender_name;
  if (!fwd && !ctx.message.forward_date) return next();

  // Es un reenvío — extraer el texto y el nombre del cliente original
  const text = ctx.message.text || ctx.message.caption || "";
  if (!text.trim()) return next();

  const clientName = ctx.message.forward_from?.first_name
    || ctx.message.forward_sender_name
    || "Cliente";

  await processWhatsAppQuery(ctx, text, clientName);
});

/**
 * Procesa una consulta de WhatsApp (ya sea reenviada o via /wa).
 * Genera una respuesta optimizada para ventas y la formatea para copiar/pegar.
 */
async function processWhatsAppQuery(ctx, clientMessage, clientName) {
  const adminId = ctx.from.id;
  const session = getWaSession(adminId);

  // Actualizar sesión
  session.clientName = clientName;
  session.lastActivity = Date.now();
  session.messages.push({ role: "user", content: clientMessage });

  // Limitar historial de la sesión
  if (session.messages.length > MAX_HISTORY) {
    session.messages.splice(0, session.messages.length - MAX_HISTORY);
  }

  await ctx.sendChatAction("typing");

  try {
    const products = await catalog.getAll();

    const { reply, agent, latency } = await orchestrator.run({
      messages: session.messages,
      products,
      context: {
        userName: clientName,
        platform: "whatsapp",  // ← Esto cambia el tono del prompt
        userId: `wa_${adminId}`,
      },
    });

    // Guardar respuesta en la sesión
    session.messages.push({ role: "assistant", content: reply });

    // Formatear la respuesta para que el admin la copie fácilmente
    const header = `📱 *Respuesta para ${clientName}*\n` +
      `_Copiá el texto debajo de la línea y pegalo en WhatsApp:_\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    const footer = `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `_[${agent} · ${latency}ms · /wa nuevo para resetear]_`;

    await ctx.reply(header + reply + footer, { parse_mode: "Markdown" });

    // Log de auditoría
    security.log({
      event:       "whatsapp_query",
      adminId,
      clientName,
      query:       clientMessage.slice(0, 150),
      agent,
      latency,
    });

  } catch (err) {
    console.error("[WA] Error:", err);
    await ctx.reply(
      "❌ Error procesando la consulta de WhatsApp. " +
      "Intentá de nuevo o respondé manualmente."
    );
  }
}
bot.on("text", async ctx => {
  const uid     = ctx.from.id;
  const rawText = ctx.message.text;

  // Ignorar si es un comando no procesado
  if (rawText.startsWith("/")) return;

  const userMsg = security.sanitize(rawText);
  if (!userMsg || userMsg.length < 2) return;

  // Detectar prompt injection
  if (security.detectPromptInjection(userMsg)) {
    security.log({ event: "prompt_injection_attempt", userId: uid, text: userMsg.slice(0, 100) });
    return ctx.reply("❓ No entendí tu mensaje. ¿Puedo ayudarte con algo relacionado a nuestros productos?");
  }

  await ctx.sendChatAction("typing");
  addToHistory(uid, "user", userMsg);

  try {
    const products = await catalog.getAll();
    const history  = getHistory(uid);

    const { reply, agent, latency } = await orchestrator.run({
      messages: history,
      products,
      context: {
        userName: ctx.from.first_name,
        platform: "telegram",
        userId:   uid,
      },
    });

    addToHistory(uid, "assistant", reply);

    // Footer para admins (invisible para clientes normales)
    const isAdmin   = ADMIN_IDS.includes(uid);
    const footer    = isAdmin ? `\n\n_[${agent} · ${latency}ms]_` : "";
    const kbActive  = kbService.getStats().active;
    const kbFooter  = isAdmin ? "" : `\n\n_Respondido por IA · ${kbActive} respuestas en base · DIFRUMARKET_`;

    await ctx.reply(reply + footer + kbFooter, { parse_mode: "Markdown" });

    // Notificar a admins (solo si no ES el admin quien escribe)
    if (!isAdmin) notifyAdmins(uid, ctx.from.username, userMsg, reply, agent);

  } catch (err) {
    console.error("[BOT] Error:", err);
    await ctx.reply(
      "❌ Ocurrió un error procesando tu consulta. " +
      "Por favor intentá de nuevo o contactanos directamente por WhatsApp."
    );
  }
});

// ─── Notificación a admins ───────────────────────────────────────────────────
async function notifyAdmins(userId, username, userMsg, reply, agent) {
  const msg = `📨 *Consulta Telegram*\n` +
    `👤 @${username || userId}\n` +
    `❓ _${userMsg.slice(0, 150)}_\n` +
    `🤖 *${agent}:* ${reply.slice(0, 180)}${reply.length > 180 ? "…" : ""}`;

  for (const adminId of ADMIN_IDS) {
    try { await bot.telegram.sendMessage(adminId, msg, { parse_mode: "Markdown" }); }
    catch {}
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPRESS — API REST + CORS para el admin panel React
// ═══════════════════════════════════════════════════════════════════════════
const app = express();

// Security headers
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));

// CORS — permite que el admin panel (React) haga fetch a esta API
app.use(cors({
  origin:  CORS_ORIGIN,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json({ limit: "512kb" }));

// Archivos locales (imágenes) servidos estáticamente
app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

// Rate limit global: 200 req/min
app.use(rateLimit({ windowMs: 60_000, max: 200, standardHeaders: true, legacyHeaders: false }));

// Rate limit estricto para pedidos: 3 pedidos cada 15 minutos por IP
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 3, 
  message: { error: "Demasiados pedidos desde esta conexión. Por favor esperá 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/orders", orderLimiter);

// ── Rutas ────────────────────────────────────────────────────────────────────
app.get("/health", (_, res) => res.json({
  status:    "ok",
  uptime:    Math.round(process.uptime()),
  margin:    settings.getMargin(),
  kb:        kbService.getStats(),
  catalogSync: catalog.getSyncStatus(),
  timestamp: new Date().toISOString(),
}));

// Servir Catálogo Integrado al Frontend (Fotos, Overrides y Sheets)
app.get("/api/catalog", async (req, res) => {
  try {
    const list = await catalog.getAll();
    res.json(list || []);
  } catch (err) {
    console.error("[CATALOG API]", err);
    res.status(500).json({ error: err.message });
  }
});

app.use("/api/kb",    kbRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/orders", ordersRoutes);

// WhatsApp Cloud API webhook — Meta envía los mensajes de clientes acá
// Configurar en Meta: Webhook URL = https://tu-dominio.com/webhook/whatsapp
app.use("/webhook/whatsapp", waRoutes);

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ ok: false, error: "Ruta no encontrada" }));

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("[EXPRESS]", err);
  res.status(500).json({ ok: false, error: "Error interno del servidor" });
});

// ═══════════════════════════════════════════════════════════════════════════
// ARRANQUE — Solo si no estamos en Vercel
// ═══════════════════════════════════════════════════════════════════════════
if (!isVercel) {
  const server = app.listen(PORT, () => {
    console.log(`\n🚀 DIFRUMARKET Backend corriendo en puerto ${PORT}`);
    console.log(`   📡 API KB:     http://localhost:${PORT}/api/kb`);
    console.log(`   ⚙️  API Admin:  http://localhost:${PORT}/api/admin/status`);
    console.log(`   💚 WhatsApp:   http://localhost:${PORT}/webhook/whatsapp`);
    console.log(`   💓 Health:     http://localhost:${PORT}/health`);
    console.log(`   🧠 KB activas: ${kbService.getStats().active} entradas`);
    console.log(`   📊 Margen:     ${settings.getMargin()}% (persistido en disco)`);
    console.log(`   📱 WhatsApp:   ${waService.isConfigured() ? "✅ Cloud API configurado" : "⚠️ No configurado (faltan WA_PHONE_NUMBER_ID y WA_ACCESS_TOKEN)"}\n`);
  });

  if (process.env.NODE_ENV === "production" && process.env.WEBHOOK_URL) {
    const secret = process.env.WEBHOOK_SECRET || "difrumarket_secret";
    app.use(bot.webhookCallback(`/telegram/${secret}`));
    bot.telegram.setWebhook(`${process.env.WEBHOOK_URL}/telegram/${secret}`).catch(e => console.error(e));
  } else {
    bot.launch({ dropPendingUpdates: true }).catch(err => console.error("❌ Error lanzando bot:", err.message));
  }
} else {
  // En Vercel configuramos el webhook callback como middleware (pero no hacemos setWebhook automático acá, mejor manual o en deploy)
  const secret = process.env.WEBHOOK_SECRET || "difrumarket_secret";
  app.use(bot.webhookCallback(`/telegram/${secret}`));
}

// ─── Graceful shutdown (solo fuera de Vercel) ───────────────────────────────
const shutdown = signal => {
  console.log(`\n⚠️ ${signal} recibido — cerrando…`);
  bot.stop(signal);
  server.close(() => {
    console.log("👋 Servidor cerrado.");
    process.exit(0);
  });
};
process.once("SIGINT",  () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

export { app, bot };
