// ═══════════════════════════════════════════════════════════════════════════
//  DIFRUMARKET — WhatsApp Cloud API Webhook
//  Recibe mensajes de clientes vía el webhook de Meta y responde con IA.
//
//  Flujo completo (100% automático):
//  ┌──────────┐    webhook     ┌──────────┐    AI Orchestrator    ┌──────────┐
//  │ Cliente  │ ──────────►   │ Este     │ ──────────────────►  │ IA       │
//  │ WhatsApp │               │ webhook  │                      │ (ventas) │
//  └──────────┘               └──────────┘                      └────┬─────┘
//       ▲                          │                                  │
//       │     Cloud API send       │     Respuesta IA                 │
//       └──────────────────────────┼──────────────────────────────────┘
//                                  │
//                                  ▼
//                           Notifica al admin
//                           por Telegram 📱
//
//  Configuración en Meta:
//  - Webhook URL: https://tu-dominio.com/webhook/whatsapp
//  - Verify Token: el que pongas en WA_VERIFY_TOKEN
//  - Suscribirse a: messages
// ═══════════════════════════════════════════════════════════════════════════
import { Router } from "express";
import { SecurityMiddleware } from "../security/middleware.js";

const router   = Router();
const security = new SecurityMiddleware();

// ── Refs inyectadas desde index.js ───────────────────────────────────────────
let _orchestratorRef = null;
let _catalogRef      = null;
let _waServiceRef    = null;
let _botRef          = null;   // Referencia al bot de Telegram para notificar admins
let _adminIds        = [];

export function setWhatsAppRefs({ orchestrator, catalog, waService, bot, adminIds }) {
  _orchestratorRef = orchestrator;
  _catalogRef      = catalog;
  _waServiceRef    = waService;
  _botRef          = bot;
  _adminIds        = adminIds || [];
}

// ── Sesiones por número de teléfono ──────────────────────────────────────────
const sessions = new Map(); // phoneNumber → { messages[], name, lastActivity }
const MAX_HISTORY = 14;
const SESSION_TTL = 24 * 60 * 60_000; // 24 horas

function getSession(phone) {
  if (!sessions.has(phone)) {
    sessions.set(phone, { messages: [], name: null, lastActivity: Date.now() });
  }
  const s = sessions.get(phone);
  s.lastActivity = Date.now();
  return s;
}

// ── Tareas recurrentes: limpiar sesiones y follow-ups (cada 15 min) ──────────
setInterval(async () => {
  const now = Date.now();
  const cutoff = now - SESSION_TTL; // 24 horas

  // Hora actual en Argentina (0-23)
  const argHour = parseInt(
    new Intl.DateTimeFormat("es-AR", {
      hour: "numeric",
      timeZone: "America/Argentina/Buenos_Aires",
      hour12: false,
    }).format(new Date())
  );

  // Vigilia: entre las 09:00 y las 21:00 hs
  const isAwakeTime = argHour >= 9 && argHour <= 21;

  for (const [phone, s] of sessions) {
    // 1. Limpieza de expirados
    if (s.lastActivity < cutoff) {
      sessions.delete(phone);
      continue;
    }

    // 2. Follow-up: entre 18 y 23.5 horas de inactividad
    const ageMs = now - s.lastActivity;
    const isDue = ageMs >= 18 * 60 * 60_000 && ageMs < 23.5 * 60 * 60_000;

    if (isDue && isAwakeTime && !s.followUpSent) {
      s.followUpSent = true;

      try {
        if (_waServiceRef?.isConfigured()) {
          const clientName = s.name && s.name !== "Cliente" ? ` ${s.name}` : "";
          const text = `Hola${clientName} 👋. Vimos que ayer estuviste consultando por nuestros productos. ¿Tuviste alguna duda? ¿Querés que te ayude a armar un pedido? 🌰`;
          
          await _waServiceRef.sendText(phone, text);
          
          // Registrar en la sesión para que la IA tenga contexto
          s.messages.push({ role: "assistant", content: text });
          
          // Notificar al admin por Telegram
          await notifyAdminsTelegram(phone, s.name || "Cliente", "[Sistema: Follow-up automático]", text, "Sistema", 0);
        }
      } catch (err) {
        console.error(`[WA] Error enviando follow-up a ${phone}:`, err);
      }
    }
  }
}, 15 * 60_000); // 15 minutos

// ═══════════════════════════════════════════════════════════════════════════
// GET /webhook/whatsapp — Verificación del webhook (Meta lo llama una vez)
// ═══════════════════════════════════════════════════════════════════════════
router.get("/", (req, res) => {
  const VERIFY_TOKEN = process.env.WA_VERIFY_TOKEN;

  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[WA] ✅ Webhook verificado por Meta");
    return res.status(200).send(challenge);
  }

  console.warn("[WA] ⚠️ Verificación fallida:", { mode, token: token?.slice(0, 8) + "..." });
  return res.sendStatus(403);
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /webhook/whatsapp — Recepción de mensajes de clientes
// ═══════════════════════════════════════════════════════════════════════════
router.post("/", async (req, res) => {
  // Meta espera un 200 inmediato (procesar en background)
  res.sendStatus(200);

  try {
    const body = req.body;

    // Validar estructura del webhook de Meta
    if (body.object !== "whatsapp_business_account") return;

    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field !== "messages") continue;

        const value    = change.value || {};
        const messages = value.messages || [];
        const contacts = value.contacts || [];

        for (const msg of messages) {
          await handleIncomingMessage(msg, contacts, value.metadata);
        }
      }
    }
  } catch (err) {
    console.error("[WA] Error procesando webhook:", err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// HANDLER — Procesa cada mensaje entrante
// ═══════════════════════════════════════════════════════════════════════════
async function handleIncomingMessage(msg, contacts, metadata) {
  // Solo procesar mensajes de texto (ignorar imágenes, audio, etc. por ahora)
  const msgType = msg.type;
  const from    = msg.from;   // Número del cliente (ej: "5491134567890")
  const msgId   = msg.id;

  // Extraer el texto según el tipo de mensaje
  let text = "";
  if (msgType === "text") {
    text = msg.text?.body || "";
  } else if (msgType === "interactive") {
    // Respuesta a botón o lista
    text = msg.interactive?.button_reply?.title
      || msg.interactive?.list_reply?.title
      || msg.interactive?.list_reply?.description
      || "";
  } else if (msgType === "button") {
    text = msg.button?.text || "";
  } else {
    // Tipos no soportados (imagen, audio, video, sticker, location, etc.)
    if (_waServiceRef?.isConfigured()) {
      await _waServiceRef.sendText(from,
        "¡Hola! 🌰 Por ahora solo puedo leer mensajes de texto. " +
        "Escribime tu consulta y te ayudo con info de productos, precios y pedidos."
      );
    }
    return;
  }

  if (!text.trim()) return;

  // Datos del contacto
  const contactName = contacts?.[0]?.profile?.name || "Cliente";

  console.log(`[WA] 📩 ${contactName} (${from}): ${text.slice(0, 80)}`);

  // Sanitizar
  const cleanText = security.sanitize(text);
  if (!cleanText || cleanText.length < 1) return;

  // Detectar prompt injection
  if (security.detectPromptInjection(cleanText)) {
    security.log({ event: "wa_prompt_injection", from, text: cleanText.slice(0, 100) });
    if (_waServiceRef?.isConfigured()) {
      await _waServiceRef.sendText(from,
        "No entendí tu mensaje. ¿Puedo ayudarte con info sobre nuestros productos? 🌰"
      );
    }
    return;
  }

  // Marcar como leído (doble tilde azul)
  if (_waServiceRef?.isConfigured()) {
    await _waServiceRef.markAsRead(msgId);
  }

  // Obtener sesión del cliente
  const session = getSession(from);
  session.name = contactName;
  session.messages.push({ role: "user", content: cleanText });

  if (session.messages.length > MAX_HISTORY) {
    session.messages.splice(0, session.messages.length - MAX_HISTORY);
  }

  // ── Procesar con IA ──────────────────────────────────────────────────────
  if (!_orchestratorRef) {
    console.error("[WA] Orchestrator no disponible");
    return;
  }

  try {
    const products = _catalogRef ? await _catalogRef.getAll() : [];

    const { reply, agent, latency } = await _orchestratorRef.run({
      messages: session.messages,
      products,
      context: {
        userName: contactName,
        platform: "whatsapp",   // ← Activa el prompt de ventas
        userId:   `wa_${from}`,
      },
    });

    // Guardar en sesión
    session.messages.push({ role: "assistant", content: reply });

    // ── Enviar respuesta al cliente por WhatsApp ────────────────────────────
    if (_waServiceRef?.isConfigured()) {
      // Si la respuesta es larga, dividir en chunks (WA tiene límite de 4096 chars)
      if (reply.length > 4000) {
        const chunks = splitMessage(reply, 4000);
        for (const chunk of chunks) {
          await _waServiceRef.sendText(from, chunk);
          await sleep(500); // Esperar entre mensajes
        }
      } else {
        await _waServiceRef.sendText(from, reply);
      }

      // Si es la primera interacción, enviar botones de ayuda después
      if (session.messages.length <= 2) {
        await sleep(1000);
        await _waServiceRef.sendButtons(from,
          "¿En qué más puedo ayudarte?",
          [
            { id: "btn_pedido",    title: "📦 Hacer pedido" },
            { id: "btn_envios",    title: "🚚 Info envíos" },
          ]
        );
      }
    }

    // ── Notificar al admin por Telegram ──────────────────────────────────────
    await notifyAdminsTelegram(from, contactName, cleanText, reply, agent, latency);

    // ── Log de auditoría ─────────────────────────────────────────────────────
    security.log({
      event:      "wa_message",
      from,
      clientName: contactName,
      query:      cleanText.slice(0, 150),
      replyLen:   reply.length,
      agent,
      latency,
    });

  } catch (err) {
    console.error("[WA] Error procesando:", err);
    // Intentar enviar mensaje de error al cliente
    if (_waServiceRef?.isConfigured()) {
      await _waServiceRef.sendText(from,
        "Perdón, tuve un problema técnico. ¿Podés intentar de nuevo? 🌰"
      ).catch(() => {});
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICACIÓN AL ADMIN POR TELEGRAM
// El admin ve cada conversación de WhatsApp en su chat de Telegram.
// Puede intervenir manualmente si quiere con /wa <respuesta>
// ═══════════════════════════════════════════════════════════════════════════
async function notifyAdminsTelegram(from, clientName, query, reply, agent, latency) {
  if (!_botRef || _adminIds.length === 0) return;

  const msg =
    `📱 *WhatsApp — ${clientName}*\n` +
    `📞 \`+${from}\`\n\n` +
    `❓ _${query.slice(0, 200)}_\n\n` +
    `🤖 *${agent}* (${latency}ms):\n` +
    `${reply.slice(0, 300)}${reply.length > 300 ? "…" : ""}\n\n` +
    `_Respuesta enviada automáticamente ✅_`;

  for (const adminId of _adminIds) {
    try {
      await _botRef.telegram.sendMessage(adminId, msg, { parse_mode: "Markdown" });
    } catch (err) {
      console.error(`[WA→TG] Error notificando admin ${adminId}:`, err.message);
    }
  }
}

// ── Utilidades ───────────────────────────────────────────────────────────────
function splitMessage(text, maxLen) {
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }
    // Buscar un punto de corte natural (punto, salto de línea)
    let cut = remaining.lastIndexOf("\n", maxLen);
    if (cut < maxLen * 0.5) cut = remaining.lastIndexOf(". ", maxLen);
    if (cut < maxLen * 0.5) cut = maxLen;
    chunks.push(remaining.slice(0, cut + 1).trim());
    remaining = remaining.slice(cut + 1).trim();
  }
  return chunks;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Estadísticas ─────────────────────────────────────────────────────────────
export function getWhatsAppStats() {
  return {
    activeSessions: sessions.size,
    sessions: Array.from(sessions.entries()).map(([phone, s]) => ({
      phone: phone.slice(0, 4) + "****" + phone.slice(-3), // Ofuscar
      name: s.name,
      messages: s.messages.length,
      lastActivity: new Date(s.lastActivity).toISOString(),
    })),
  };
}

export default router;
