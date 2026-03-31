// ═══════════════════════════════════════════════════════════════════════════
//  DIFRUMARKET — Intent Detector (sin LLM)
//  Clasifica la intención del usuario por keywords antes de llamar al AI.
//  Si hay un match de alta confianza con la KB → responde sin LLM (ahorra tokens).
// ═══════════════════════════════════════════════════════════════════════════
import { kbService } from "./kb-service.js";

// ─── Intenciones conocidas con keywords ───────────────────────────────────────
const INTENTS = {
  buy:      ["comprar", "quiero", "pedido", "necesito", "dame", "encargar", "pedir", "armar"],
  price:    ["precio", "cuánto", "cuanto", "cuesta", "vale", "sale", "cotizar", "presupuesto"],
  shipping: ["envío", "envio", "mandan", "llega", "despacho", "retiro", "delivery", "domicilio"],
  hours:    ["horario", "atienden", "abierto", "cerrado", "hora", "turnos", "abre", "cierra"],
  payment:  ["pago", "pagar", "transferencia", "mercadopago", "tarjeta", "efectivo", "cuota"],
  product:  ["tienen", "hay", "almendra", "nuez", "mix", "semilla", "granola", "fruta", "seco", "stock"],
  greeting: ["hola", "buenas", "buen día", "buenos dias", "qué tal", "che"],
  thanks:   ["gracias", "genial", "perfecto", "dale", "ok", "buenísimo", "excelente"],
  help:     ["ayuda", "help", "qué puedo", "que puedo", "cómo funciona", "como funciona"],
};

// ─── Normalizar texto ─────────────────────────────────────────────────────────
function normalize(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar acentos
    .replace(/[^a-z0-9áéíóúñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Similaridad Jaccard simplificada ─────────────────────────────────────────
function jaccardSimilarity(a, b) {
  const setA = new Set(a.split(" "));
  const setB = new Set(b.split(" "));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

class IntentDetector {
  /**
   * Detecta la intención del usuario y busca match en la KB.
   * @param {string} text — Mensaje del usuario (crudo)
   * @returns {{
   *   type: string,           — Tipo de intención ('buy', 'price', etc.)
   *   confidence: number,     — 0..1
   *   kbMatch: Object|null    — Entrada de KB que matchea (si tiene ≥0.8 confidence)
   * }}
   */
  detect(text) {
    const normalized = normalize(text);
    const words = normalized.split(" ");

    // ── 1. Detectar tipo de intención ─────────────────────────────────────
    let bestType   = "unknown";
    let bestScore  = 0;

    for (const [type, keywords] of Object.entries(INTENTS)) {
      const matches = keywords.filter(kw =>
        words.some(w => w.includes(kw) || kw.includes(w))
      );
      const score = matches.length / keywords.length;
      if (score > bestScore) {
        bestScore = score;
        bestType  = type;
      }
    }

    // ── 2. Buscar match directo en la KB por triggers ─────────────────────
    let kbMatch    = null;
    let kbConfidence = 0;

    const activeEntries = kbService.getActive().filter(e => e.cat !== "ai_rules");

    for (const entry of activeEntries) {
      if (!entry.triggers) continue;

      const triggers = entry.triggers.split(",").map(t => normalize(t.trim())).filter(Boolean);
      const triggerMatches = triggers.filter(t =>
        words.some(w => w.includes(t) || t.includes(w))
      );

      if (triggerMatches.length === 0) continue;

      // Score basado en triggers + similaridad con la pregunta
      const triggerScore = triggerMatches.length / Math.max(triggers.length, 1);
      const questionSim  = jaccardSimilarity(normalized, normalize(entry.question));
      const combined     = (triggerScore * 0.7) + (questionSim * 0.3);

      if (combined > kbConfidence) {
        kbConfidence = combined;
        kbMatch      = entry;
      }
    }

    return {
      type:       bestType,
      confidence: Math.max(bestScore, kbConfidence),
      kbMatch:    kbConfidence >= 0.8 ? kbMatch : null,
    };
  }
}

// Singleton
export const intentDetector = new IntentDetector();
