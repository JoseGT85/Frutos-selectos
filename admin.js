// ═══════════════════════════════════════════════════════════════════════════
//  DIFRUMARKET — Rutas API: Admin
//  Auth JWT, métricas del orquestador IA, log de conversaciones, estado del bot
//
//  Endpoints:
//    POST /api/admin/login           — obtener JWT
//    GET  /api/admin/metrics         — métricas de agentes IA
//    GET  /api/admin/conversations   — últimas N conversaciones
//    GET  /api/admin/status          — estado del sistema
//    PUT  /api/admin/margin          — actualizar margen de precio ← NUEVO
//    POST /api/admin/catalog/refresh — forzar recarga del catálogo
// ═══════════════════════════════════════════════════════════════════════════
import { Router }             from "express";
import fs                     from "fs";
import path                   from "path";
import { SecurityMiddleware } from "../security/middleware.js";
import { kbService }          from "../kb-service.js";
import { settings }           from "../settings-service.js";

const router   = Router();
const security = new SecurityMiddleware();
const LOG_DIR  = process.env.LOG_DIR || "./logs";

// ── POST /api/admin/login ─────────────────────────────────────────────────
// Body: { password }
router.post("/login", (req, res) => {
  const { password } = req.body;
  const ADMIN_PASS   = process.env.ADMIN_PASSWORD;

  if (!ADMIN_PASS) {
    return res.status(500).json({ ok: false, error: "ADMIN_PASSWORD no configurado" });
  }
  if (password !== ADMIN_PASS) {
    security.log({ event: "login_failed", ip: req.ip });
    return res.status(401).json({ ok: false, error: "Contraseña incorrecta" });
  }

  const token = security.generateAdminToken("admin");
  security.log({ event: "login_success", ip: req.ip });
  res.json({ ok: true, token, expiresIn: "8h" });
});

// ── A partir de acá todas las rutas requieren JWT ─────────────────────────
router.use(security.requireAdmin());

// ── GET /api/admin/metrics ────────────────────────────────────────────────
let _orchestratorRef = null;
export function setOrchestratorRef(o) { _orchestratorRef = o; }

router.get("/metrics", (req, res) => {
  const metrics = _orchestratorRef
    ? _orchestratorRef.getMetrics()
    : { error: "Orquestador no disponible aún" };

  res.json({
    ok: true,
    metrics,
    kb:     kbService.getStats(),
    margin: settings.getMargin(),
    uptime: Math.round(process.uptime()),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  });
});

// ── GET /api/admin/conversations ──────────────────────────────────────────
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

// ── GET /api/admin/status ─────────────────────────────────────────────────
router.get("/status", (req, res) => {
  const agents = [
    { name: "Claude (Anthropic)", configured: !!process.env.ANTHROPIC_API_KEY, priority: 1 },
    { name: "Grok (xAI)",         configured: !!process.env.GROK_API_KEY,       priority: 2 },
    { name: "Mistral 7B (HF)",    configured: !!process.env.HF_API_KEY,         priority: 3 },
    { name: "Ollama Local",        configured: !!process.env.OLLAMA_URL,         priority: 4 },
  ];

  res.json({
    ok:      true,
    version: "1.0.0",
    env:     process.env.NODE_ENV || "development",
    bot:     {
      token:  !!process.env.TELEGRAM_BOT_TOKEN,
      admins: (process.env.ADMIN_CHAT_IDS || "").split(",").filter(Boolean).length,
    },
    agents,
    kb:      kbService.getStats(),
    margin:  settings.getMargin(),
    uptime:  Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ── PUT /api/admin/margin ─────────────────────────────────────────────────
// Actualiza el margen de precio en tiempo real.
// El catálogo invalida su cache y recalcula con el nuevo margen.
// El valor se persiste en data/settings.json → sobrevive reinicios.
// Body: { margin: number }
let _catalogRef = null;
export function setCatalogRef(c) { _catalogRef = c; }

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
    // 1. Persistir en disco
    settings.setMargin(m);

    // 2. Invalidar cache del catálogo para que recalcule con el nuevo margen
    if (_catalogRef) {
      _catalogRef.setMargin(m);   // actualiza en memoria
      _catalogRef.invalidate();   // fuerza recarga en próxima llamada
    }

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

// ── POST /api/admin/catalog/refresh ───────────────────────────────────────
router.post("/catalog/refresh", async (req, res) => {
  if (!_catalogRef) return res.status(503).json({ ok: false, error: "Catálogo no disponible" });
  try {
    _catalogRef.invalidate();
    const products = await _catalogRef.getAll();
    res.json({ ok: true, message: "Catálogo recargado", count: products.length, margin: settings.getMargin() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;

