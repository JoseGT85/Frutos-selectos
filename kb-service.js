// ═══════════════════════════════════════════════════════════════════════════
//  DIFRUMARKET — Knowledge Base Service
//  CRUD de la base de conocimiento + hot-reload + sistema de eventos.
//  Persiste en disco como JSON. El bot de Telegram y el chat web
//  consumen la KB en tiempo real a través de buildPromptBlock().
// ═══════════════════════════════════════════════════════════════════════════
import fs   from "fs";
import path from "path";
import { EventEmitter } from "events";

const KB_FILE   = path.resolve(process.env.KB_FILE || "./data/kb.json");
const DATA_DIR  = path.dirname(KB_FILE);

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ─── KB entry por defecto ────────────────────────────────────────────────────
const DEFAULT_KB = [
  {
    id: "kb1", cat: "faq", active: true, priority: 1,
    triggers: "horario,cuándo,cuando,atienden",
    question: "¿Cuál es el horario de atención?",
    answer: "Atendemos Lunes a Viernes de 9 a 18hs y Sábados de 9 a 13hs. Fuera de ese horario podés dejar tu mensaje y te respondemos al siguiente día hábil.",
  },
  {
    id: "kb2", cat: "shipping", active: true, priority: 1,
    triggers: "envío,envio,mandan,despacho,llega",
    question: "¿Hacen envíos a todo el país?",
    answer: "Sí, enviamos a todo el país con Andreani y OCA. El costo varía según destino y peso. Los envíos salen dentro de las 24-48hs de confirmado el pago.",
  },
  {
    id: "kb3", cat: "payment", active: true, priority: 1,
    triggers: "pago,pagar,transferencia,mercadopago,tarjeta",
    question: "¿Cómo puedo pagar?",
    answer: "Aceptamos transferencia bancaria, MercadoPago (débito, crédito y cuotas) y efectivo en retiros.",
  },
  {
    id: "kb4", cat: "products", active: true, priority: 1,
    triggers: "vencimiento,vence,duran,fecha",
    question: "¿Cuánto duran los productos?",
    answer: "Entre 6 y 12 meses dependiendo del producto. Se conservan mejor en lugar fresco y seco, idealmente en recipiente hermético.",
  },
  {
    id: "kb9", cat: "ai_rules", active: true, priority: 0,
    triggers: "",
    question: "Tono y estilo",
    answer: "Respondé siempre en español argentino (vos, che). Sé amable pero conciso (máx 3-4 líneas). Usá emojis con moderación. Para pedidos, siempre derivá a finalizar por WhatsApp. No inventes precios ni disponibilidades. Si no sabés algo, decilo honestamente.",
  },
];

class KBService extends EventEmitter {
  #entries;

  constructor() {
    super();
    this.#entries = this.#load();
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────
  getAll() {
    return [...this.#entries];
  }

  getActive() {
    return this.#entries.filter(e => e.active);
  }

  add(entry) {
    if (!entry.question?.trim() || !entry.answer?.trim()) {
      throw new Error("Pregunta y respuesta son obligatorias");
    }
    const newEntry = {
      id:       entry.id || `kb${Date.now().toString(36)}`,
      cat:      entry.cat || "faq",
      active:   entry.active !== false,
      priority: Number(entry.priority) || 2,
      triggers: entry.triggers || "",
      question: entry.question.trim(),
      answer:   entry.answer.trim(),
    };
    this.#entries.push(newEntry);
    this.#save();
    this.emit("updated", this.#entries);
    return newEntry;
  }

  update(id, fields) {
    const idx = this.#entries.findIndex(e => e.id === id);
    if (idx === -1) throw new Error(`Entrada ${id} no encontrada`);
    this.#entries[idx] = { ...this.#entries[idx], ...fields, id };
    this.#save();
    this.emit("updated", this.#entries);
    return this.#entries[idx];
  }

  delete(id) {
    const idx = this.#entries.findIndex(e => e.id === id);
    if (idx === -1) throw new Error(`Entrada ${id} no encontrada`);
    this.#entries.splice(idx, 1);
    this.#save();
    this.emit("updated", this.#entries);
    return { deleted: true, id };
  }

  toggle(id) {
    const entry = this.#entries.find(e => e.id === id);
    if (!entry) throw new Error(`Entrada ${id} no encontrada`);
    entry.active = !entry.active;
    this.#save();
    this.emit("updated", this.#entries);
    return entry;
  }

  replaceAll(entries) {
    if (!Array.isArray(entries)) throw new Error("Se esperaba un array");
    this.#entries = entries.map(e => ({
      id:       e.id || `kb${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
      cat:      e.cat || "faq",
      active:   e.active !== false,
      priority: Number(e.priority) || 2,
      triggers: e.triggers || "",
      question: (e.question || "").trim(),
      answer:   (e.answer || "").trim(),
    }));
    this.#save();
    this.emit("updated", this.#entries);
    return this.#entries;
  }

  // ─── Prompt builder — lo que se inyecta en el system prompt del LLM ─────
  buildPromptBlock() {
    const active = [...this.#entries]
      .filter(e => e.active)
      .sort((a, b) => a.priority - b.priority);

    const rules = active
      .filter(e => e.cat === "ai_rules")
      .map(e => `- ${e.answer}`)
      .join("\n");

    const entries = active
      .filter(e => e.cat !== "ai_rules")
      .map(e => {
        const tags = e.triggers ? ` [clave: ${e.triggers}]` : "";
        return `P: ${e.question}${tags}\nR: ${e.answer}`;
      })
      .join("\n\n");

    return {
      rules:   rules || null,
      entries: entries || null,
      count:   active.filter(e => e.cat !== "ai_rules").length,
    };
  }

  // ─── Stats para el dashboard admin ──────────────────────────────────────
  getStats() {
    const active   = this.#entries.filter(e => e.active).length;
    const inactive = this.#entries.length - active;
    const byCat    = {};
    for (const e of this.#entries) {
      byCat[e.cat] = (byCat[e.cat] || 0) + 1;
    }
    return {
      total:       this.#entries.length,
      active,
      inactive,
      byCat,
      lastUpdated: this.#entries.length > 0 ? new Date().toISOString() : null,
    };
  }

  // ─── I/O disco ──────────────────────────────────────────────────────────
  #load() {
    try {
      if (fs.existsSync(KB_FILE)) {
        const data = JSON.parse(fs.readFileSync(KB_FILE, "utf-8"));
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (e) {
      console.warn("[KB] Error leyendo KB, usando defaults:", e.message);
    }
    // Guardar defaults en disco
    this.#entries = [...DEFAULT_KB];
    this.#save();
    return this.#entries;
  }

  #save() {
    try {
      fs.writeFileSync(KB_FILE, JSON.stringify(this.#entries, null, 2), "utf-8");
    } catch (e) {
      console.error("[KB] Error guardando KB:", e.message);
    }
  }
}

// Singleton
export const kbService = new KBService();
