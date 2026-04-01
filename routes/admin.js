// ═══════════════════════════════════════════════════════════════════════════
//  DIFRUMARKET — Rutas API: Admin + Chat Proxy
//  Auth JWT, métricas IA, log de conversaciones, estado del bot,
//  gestión de margen y endpoint unificado de chat IA.
// ═══════════════════════════════════════════════════════════════════════════
import { Router }             from "express";
import fs                     from "fs";
import path                   from "path";
import multer                 from "multer";
import { SecurityMiddleware } from "../security/middleware.js";
import { kbService }          from "../kb-service.js";
import { settings }           from "../settings-service.js";
import { responseCache }      from "../response-cache.js";
import { customCatalog }      from "../custom-catalog-service.js";

const router   = Router();
const security = new SecurityMiddleware();
const LOG_DIR  = process.env.LOG_DIR || "./logs";

// ── Refs inyectadas desde index.js ───────────────────────────────────────────
let _orchestratorRef = null;
let _catalogRef      = null;
export function setOrchestratorRef(o) { _orchestratorRef = o; }
export function setCatalogRef(c) { _catalogRef = c; }

// ═══════════════════════════════════════════════════════════════════════════
// PÚBLICO — /api/admin/login (sin JWT)
// ═══════════════════════════════════════════════════════════════════════════
router.post("/login", (req, res) => {
  const { password } = req.body;
  const ADMIN_PASS   = process.env.ADMIN_PASSWORD;

  if (!ADMIN_PASS) {
    return res.status(500).json({ ok: false, error: "ADMIN_PASSWORD no configurado en el servidor" });
  }
  if (!password || typeof password !== "string") {
    return res.status(400).json({ ok: false, error: "Contraseña requerida" });
  }
  if (password !== ADMIN_PASS) {
    security.log({ event: "login_failed", ip: req.ip });
    return res.status(401).json({ ok: false, error: "Contraseña incorrecta" });
  }

  const token = security.generateAdminToken("admin");
  security.log({ event: "login_success", ip: req.ip });
  res.json({ ok: true, token, expiresIn: "8h" });
});

// ═══════════════════════════════════════════════════════════════════════════
// PÚBLICO — /api/admin/chat (proxy IA para el frontend)
// El frontend llama acá en vez de directamente a Anthropic.
// La API key nunca sale del servidor.
// ═══════════════════════════════════════════════════════════════════════════
router.post("/chat", async (req, res) => {
  if (!_orchestratorRef) {
    return res.status(503).json({ ok: false, error: "Orquestador no disponible" });
  }

  const { messages, context } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ ok: false, error: "Se esperaba un array 'messages'" });
  }

  // Validar estructura de messages
  for (const m of messages) {
    if (!m.role || !m.content || typeof m.content !== "string") {
      return res.status(400).json({ ok: false, error: "Cada message debe tener role y content" });
    }
    if (!["user", "assistant"].includes(m.role)) {
      return res.status(400).json({ ok: false, error: "role debe ser 'user' o 'assistant'" });
    }
    // Limitar longitud del contenido individual
    if (m.content.length > 2000) {
      return res.status(400).json({ ok: false, error: "Mensaje demasiado largo (máx 2000 caracteres)" });
    }
  }

  // Sanitizar contenido del usuario
  const sanitizedMessages = messages.map(m => ({
    role:    m.role,
    content: m.role === "user" ? security.sanitize(m.content) : m.content,
  }));

  // Detectar prompt injection
  const lastUserMsg = sanitizedMessages.filter(m => m.role === "user").pop();
  if (lastUserMsg && security.detectPromptInjection(lastUserMsg.content)) {
    security.log({
      event: "prompt_injection_web",
      ip: req.ip,
      text: lastUserMsg.content.slice(0, 100),
    });
    return res.json({
      ok:    true,
      reply: "No entendí tu consulta. ¿Puedo ayudarte con información sobre nuestros productos? 🌰",
      agent: "security",
      latency: 0,
    });
  }

  try {
    const products = _catalogRef ? await _catalogRef.getAll() : [];
    const { reply, agent, latency } = await _orchestratorRef.run({
      messages: sanitizedMessages,
      products,
      context:  {
        ...context,
        platform: "web",
        ip: req.ip,
      },
    });

    security.log({
      event:   "chat_web",
      ip:      req.ip,
      agent,
      latency,
      msgLen:  lastUserMsg?.content?.length || 0,
    });

    res.json({ ok: true, reply, agent, latency });
  } catch (err) {
    console.error("[CHAT] Error:", err);
    res.status(500).json({
      ok:    false,
      error: "Error procesando la consulta",
      reply: "Perdón, tuve un error técnico. Intentá de nuevo en unos segundos. 🌰",
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// A partir de acá todas las rutas requieren JWT
// ═══════════════════════════════════════════════════════════════════════════
router.use(security.requireAdmin());

// ── CATÁLOGO HÍBRIDO (Custom y Overrides) ───────────────────────────────────

// Configuración de Multer para almacenar fotos físicas
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const uploadPath = path.join(process.cwd(), "public", "uploads");
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    } catch (err) {
      console.error("> Error Multer Mkdir:", err);
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, "product" + '-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage });

router.post("/catalog/upload", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: "No se encontró el archivo" });
  res.json({ ok: true, imageUrl: `/uploads/${req.file.filename}` });
});

router.put("/catalog/image", async (req, res) => {
  try {
    const { name, imageUrl } = req.body;
    await customCatalog.setProductImage(name, imageUrl);
    if (_catalogRef) _catalogRef.invalidate();
    res.json({ ok: true });
  } catch(err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post("/catalog/custom", async (req, res) => {
  try {
    const p = await customCatalog.addCustomProduct(req.body);
    if (_catalogRef) _catalogRef.invalidate();
    res.json({ ok: true, product: p });
  } catch(err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete("/catalog/custom/:id", async (req, res) => {
  try {
    await customCatalog.deleteCustomProduct(req.params.id);
    if (_catalogRef) _catalogRef.invalidate();
    res.json({ ok: true });
  } catch(err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.put("/catalog/override", async (req, res) => {
  try {
    const { name, newCost } = req.body;
    if (newCost > 0) {
      await customCatalog.setOverride(name, newCost);
    } else {
      await customCatalog.removeOverride(name);
    }
    if (_catalogRef) _catalogRef.invalidate();
    res.json({ ok: true });
  } catch(err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.put("/catalog/name-override", async (req, res) => {
  try {
    const { originalName, customName } = req.body;
    await customCatalog.setNameOverride(originalName, customName);
    if (_catalogRef) _catalogRef.invalidate();
    res.json({ ok: true });
  } catch(err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── POST /api/admin/catalog/sync ─────────────────────────────────────────
router.post("/catalog/sync", (req, res) => {
  try {
    if (_catalogRef) {
      _catalogRef.invalidate();
      res.json({ ok: true, message: "Cache invalidado. El catálogo se sincronizará en el próximo acceso." });
    } else {
      res.status(500).json({ ok: false, error: "Servicio de catálogo no disponible" });
    }
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /api/admin/metrics ───────────────────────────────────────────────
router.get("/metrics", (req, res) => {
  const metrics = _orchestratorRef
    ? _orchestratorRef.getMetrics()
    : { error: "Orquestador no disponible aún" };

  res.json({
    ok: true,
    metrics,
    kb:         kbService.getStats(),
    catalogSync: _catalogRef ? _catalogRef.getSyncStatus() : null,
    cache:      responseCache.getStats(),
    margin:     settings.getMargin(),
    uptime:     Math.round(process.uptime()),
    memory:     process.memoryUsage(),
    timestamp:  new Date().toISOString(),
  });
});

// ── GET /api/admin/conversations ─────────────────────────────────────────
router.get("/conversations", (req, res) => {
  const limit   = Math.min(parseInt(req.query.limit) || 50, 200);
  const today   = new Date().toISOString().slice(0, 10);
  const logFile = path.join(LOG_DIR, `audit-${today}.jsonl`);

  try {
    if (!fs.existsSync(logFile)) return res.json({ ok: true, conversations: [], total: 0 });

    const lines = fs.readFileSync(logFile, "utf-8")
      .split("\n")
      .filter(Boolean)
      .map(l => { try { return JSON.parse(l); } catch { return null; } })
      .filter(l => l && l.event === "message")
      .slice(-limit)
      .reverse();

    res.json({ ok: true, total: lines.length, conversations: lines });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── GET /api/admin/status ────────────────────────────────────────────────
router.get("/status", (req, res) => {
  const agents = [
    { name: "Claude (Anthropic)", configured: !!process.env.ANTHROPIC_API_KEY, priority: 1 },
    { name: "Grok (xAI)",         configured: !!process.env.GROK_API_KEY,      priority: 2 },
    { name: "Mistral 7B (HF)",    configured: !!process.env.HF_API_KEY,        priority: 3 },
    { name: "Ollama Local",        configured: !!process.env.OLLAMA_URL,        priority: 4 },
  ];

  res.json({
    ok:      true,
    version: "2.0.0",
    env:     process.env.NODE_ENV || "development",
    bot:     {
      token:  !!process.env.TELEGRAM_BOT_TOKEN,
      admins: (process.env.ADMIN_CHAT_IDS || "").split(",").filter(Boolean).length,
    },
    agents,
    kb:        kbService.getStats(),
    catalogSync: _catalogRef ? _catalogRef.getSyncStatus() : null,
    cache:     responseCache.getStats(),
    margin:    settings.getMargin(),
    uptime:    Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ── PUT /api/admin/margin ────────────────────────────────────────────────
router.put("/margin", (req, res) => {
  const { margin } = req.body;

  if (margin === undefined || margin === null) {
    return res.status(400).json({ ok: false, error: "Falta el campo 'margin'" });
  }

  const m = Number(margin);
  if (isNaN(m) || m < 0 || m > 500) {
    return res.status(400).json({ ok: false, error: "Margen debe ser un número entre 0 y 500" });
  }

  try {
    settings.setMargin(m);

    if (_catalogRef) {
      _catalogRef.setMargin(m);
      _catalogRef.invalidate();
    }

    // Invalidar caché de respuestas (precios cambiaron)
    responseCache.invalidate();

    security.log({ event: "margin_updated", margin: m, ip: req.ip });

    res.json({
      ok:      true,
      margin:  m,
      factor:  Number((1 + m / 100).toFixed(4)),
      message: `Margen actualizado a ${m}%. Los precios del catálogo se recalcularán en la próxima consulta.`,
    });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// ── POST /api/admin/catalog/refresh ──────────────────────────────────────
router.post("/catalog/refresh", async (req, res) => {
  if (!_catalogRef) return res.status(503).json({ ok: false, error: "Catálogo no disponible" });
  try {
    _catalogRef.invalidate();
    responseCache.invalidate(); // precios pueden haber cambiado
    const products = await _catalogRef.getAll();
    res.json({ ok: true, message: "Catálogo recargado", count: products.length, margin: settings.getMargin() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── POST /api/admin/cache/clear ──────────────────────────────────────────
router.post("/cache/clear", (req, res) => {
  responseCache.invalidate();
  res.json({ ok: true, message: "Caché de respuestas limpiado" });
});

// ═══════════════════════════════════════════════════════════════════════════
// WEBHOOK n8n — Integración para automatización WhatsApp → Telegram → IA
// ═══════════════════════════════════════════════════════════════════════════
//
// Flujo con n8n:
//   1. Cliente escribe en WhatsApp
//   2. n8n captura el mensaje (vía WhatsApp Web node o webhook)
//   3. n8n hace POST a /api/admin/n8n/chat con el mensaje
//   4. Este endpoint procesa con la IA (modo ventas)
//   5. n8n recibe la respuesta y puede:
//      a) Enviarla al admin por Telegram
//      b) Logearla en una hoja de cálculo
//      c) Notificar por email
//
// Auth: usa N8N_WEBHOOK_TOKEN en .env (token simple, no JWT)
// ═══════════════════════════════════════════════════════════════════════════

const N8N_SESSIONS = new Map(); // sessionId → { messages[], lastActivity }

router.post("/n8n/chat", async (req, res) => {
  // Autenticar con token de n8n
  const n8nToken = process.env.N8N_WEBHOOK_TOKEN;
  if (!n8nToken) {
    return res.status(503).json({ ok: false, error: "N8N_WEBHOOK_TOKEN no configurado" });
  }

  const authHeader = req.headers.authorization || req.headers["x-webhook-token"] || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (token !== n8nToken) {
    security.log({ event: "n8n_auth_failed", ip: req.ip });
    return res.status(401).json({ ok: false, error: "Token inválido" });
  }

  if (!_orchestratorRef) {
    return res.status(503).json({ ok: false, error: "Orquestador no disponible" });
  }

  // Parsear el body
  const {
    message,          // Texto del cliente (requerido)
    clientName,       // Nombre del cliente (opcional)
    sessionId,        // ID de sesión para mantener contexto (opcional)
    platform,         // Plataforma origen: 'whatsapp' | 'instagram' | etc. (opcional)
    resetSession,     // true para limpiar el contexto de la sesión (opcional)
  } = req.body;

  if (!message || typeof message !== "string" || message.trim().length < 1) {
    return res.status(400).json({ ok: false, error: "Se requiere 'message' (string)" });
  }

  const sid = sessionId || "default";

  // Reset de sesión si se pide
  if (resetSession) {
    N8N_SESSIONS.delete(sid);
  }

  // Obtener o crear sesión
  if (!N8N_SESSIONS.has(sid)) {
    N8N_SESSIONS.set(sid, { messages: [], lastActivity: Date.now() });
  }
  const session = N8N_SESSIONS.get(sid);
  session.lastActivity = Date.now();

  // Sanitizar y agregar mensaje del cliente
  const cleanMsg = security.sanitize(message);
  if (security.detectPromptInjection(cleanMsg)) {
    security.log({ event: "n8n_prompt_injection", ip: req.ip, text: cleanMsg.slice(0, 100) });
    return res.json({
      ok: true,
      reply: "No entendí tu consulta. ¿Puedo ayudarte con información sobre nuestros productos? 🌰",
      agent: "security",
      latency: 0,
      sessionId: sid,
    });
  }

  session.messages.push({ role: "user", content: cleanMsg });
  // Limitar historial
  if (session.messages.length > 14) {
    session.messages.splice(0, session.messages.length - 14);
  }

  try {
    const products = _catalogRef ? await _catalogRef.getAll() : [];

    const { reply, agent, latency } = await _orchestratorRef.run({
      messages: session.messages,
      products,
      context: {
        userName: clientName || "Cliente",
        platform: platform || "whatsapp", // Por defecto WhatsApp = modo ventas
        userId:   `n8n_${sid}`,
      },
    });

    // Guardar respuesta en la sesión
    session.messages.push({ role: "assistant", content: reply });

    // Log
    security.log({
      event:       "n8n_chat",
      ip:          req.ip,
      sessionId:   sid,
      clientName:  clientName || "anónimo",
      agent,
      latency,
      msgLen:      cleanMsg.length,
    });

    res.json({
      ok:        true,
      reply,
      agent,
      latency,
      sessionId: sid,
      sessionMessages: session.messages.length,
    });

  } catch (err) {
    console.error("[N8N] Error:", err);
    res.status(500).json({
      ok:    false,
      error: "Error procesando la consulta",
      reply: "Error técnico. Intentá de nuevo.",
    });
  }
});

// Limpiar sesiones n8n inactivas cada 30 minutos
setInterval(() => {
  const cutoff = Date.now() - 30 * 60_000;
  for (const [sid, session] of N8N_SESSIONS) {
    if (session.lastActivity < cutoff) N8N_SESSIONS.delete(sid);
  }
}, 30 * 60_000);

export default router;
