// ═══════════════════════════════════════════════════════════════════════════
//  DIFRUMARKET — Rutas API: Knowledge Base
//  Permite al admin panel (React) leer y actualizar la KB del servidor.
//  El bot de Telegram usa la misma KB en tiempo real.
//
//  Endpoints:
//    GET  /api/kb              — todas las entradas
//    POST /api/kb              — reemplazar toda la KB (sync desde el admin)
//    POST /api/kb/entry        — agregar una entrada
//    PUT  /api/kb/:id          — actualizar una entrada
//    DELETE /api/kb/:id        — eliminar una entrada
//    PATCH /api/kb/:id/toggle  — activar/desactivar
//    GET  /api/kb/stats        — estadísticas para el dashboard
//    GET  /api/kb/prompt       — previsualizar el bloque de system prompt
// ═══════════════════════════════════════════════════════════════════════════
import { Router } from "express";
import { kbService } from "../kb-service.js";
import { SecurityMiddleware } from "../security/middleware.js";

const router   = Router();
const security = new SecurityMiddleware();

// ── Autenticación JWT en todas las rutas KB ──────────────────────────────
// Las peticiones deben incluir: Authorization: Bearer <token>
// El token se obtiene via POST /api/admin/login
router.use(security.requireAdmin());

// ── GET /api/kb ────────────────────────────────────────────────────────────
// Retorna todas las entradas de la KB
router.get("/", (req, res) => {
  try {
    const entries = kbService.getAll();
    res.json({ ok: true, count: entries.length, entries });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── POST /api/kb ────────────────────────────────────────────────────────────
// Reemplaza TODA la KB (usado cuando el admin guarda desde el panel React)
// Body: { entries: [...] }
router.post("/", (req, res) => {
  try {
    const { entries } = req.body;
    if (!Array.isArray(entries)) {
      return res.status(400).json({ ok: false, error: "Se esperaba un array 'entries'" });
    }
    const saved = kbService.replaceAll(entries);
    security.log({ event: "kb_replace", count: saved.length, ip: req.ip });
    res.json({ ok: true, count: saved.length, entries: saved });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// ── POST /api/kb/entry ─────────────────────────────────────────────────────
// Agrega una sola entrada
// Body: { cat, question, answer, triggers?, priority?, active? }
router.post("/entry", (req, res) => {
  try {
    const entry = kbService.add(req.body);
    security.log({ event: "kb_add", id: entry.id, question: entry.question?.slice(0, 60), ip: req.ip });
    res.status(201).json({ ok: true, entry });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// ── PUT /api/kb/:id ────────────────────────────────────────────────────────
// Actualiza campos de una entrada existente
// Body: { cat?, question?, answer?, triggers?, priority?, active? }
router.put("/:id", (req, res) => {
  try {
    const entry = kbService.update(req.params.id, req.body);
    security.log({ event: "kb_update", id: req.params.id, ip: req.ip });
    res.json({ ok: true, entry });
  } catch (e) {
    res.status(404).json({ ok: false, error: e.message });
  }
});

// ── DELETE /api/kb/:id ─────────────────────────────────────────────────────
router.delete("/:id", (req, res) => {
  try {
    const result = kbService.delete(req.params.id);
    security.log({ event: "kb_delete", id: req.params.id, ip: req.ip });
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(404).json({ ok: false, error: e.message });
  }
});

// ── PATCH /api/kb/:id/toggle ───────────────────────────────────────────────
router.patch("/:id/toggle", (req, res) => {
  try {
    const entry = kbService.toggle(req.params.id);
    res.json({ ok: true, entry });
  } catch (e) {
    res.status(404).json({ ok: false, error: e.message });
  }
});

// ── GET /api/kb/stats ─────────────────────────────────────────────────────
router.get("/stats", (req, res) => {
  try {
    res.json({ ok: true, stats: kbService.getStats() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── GET /api/kb/prompt ────────────────────────────────────────────────────
// Previsualiza el bloque que se inyecta en el system prompt de Claude
router.get("/prompt-preview", (req, res) => {
  try {
    const block = kbService.buildPromptBlock();
    res.json({ ok: true, ...block });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
