// ═══════════════════════════════════════════════════════════════════════════
//  DIFRUMARKET — Settings Service
//  Persiste configuración mutable en disco (JSON).
//  Actualmente maneja: margen de precio.
//  Se extiende fácilmente para cualquier otro valor configurable.
//
//  Uso:
//    import { settings } from "./settings-service.js";
//    settings.getMargin()        → 30
//    settings.setMargin(35)      → guarda en disco y emite "updated"
//    settings.get("margin")      → 35
//    settings.set("someKey", v)  → genérico
// ═══════════════════════════════════════════════════════════════════════════
import fs   from "fs";
import path from "path";
import { EventEmitter } from "events";

const isVercel = !!(process.env.VERCEL || process.env.NOW_REGION);
const SETTINGS_FILE = path.resolve(process.env.SETTINGS_FILE || "./data/settings.json");
const DATA_DIR      = path.dirname(SETTINGS_FILE);

if (!isVercel) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn("[SETTINGS] No se pudo crear directorio:", err.message);
  }
}

const DEFAULTS = {
  margin:    Number(process.env.MARGIN_PCT || 30),
  updatedAt: null,
};

class SettingsService extends EventEmitter {
  #data;

  constructor() {
    super();
    this.#data = this.#load();
  }

  // ── Margen ────────────────────────────────────────────────────────────────
  getMargin() {
    return this.#data.margin ?? DEFAULTS.margin;
  }

  setMargin(value) {
    const m = Number(value);
    if (isNaN(m) || m < 0 || m > 500) throw new Error(`Margen inválido: ${value}`);
    this.#data.margin    = m;
    this.#data.updatedAt = new Date().toISOString();
    this.#save();
    this.emit("marginChanged", m);
    console.log(`[SETTINGS] 📊 Margen actualizado a ${m}%`);
    return m;
  }

  // ── Genérico ──────────────────────────────────────────────────────────────
  get(key) { return this.#data[key]; }

  set(key, value) {
    this.#data[key]       = value;
    this.#data.updatedAt  = new Date().toISOString();
    this.#save();
    this.emit("updated", { key, value });
    return value;
  }

  getAll() { return { ...this.#data }; }

  // ── I/O ───────────────────────────────────────────────────────────────────
  #load() {
    try {
      if (fs.existsSync(SETTINGS_FILE)) {
        return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8")) };
      }
    } catch (e) {
      console.warn("[SETTINGS] Error leyendo settings, usando defaults:", e.message);
    }
    return { ...DEFAULTS };
  }

  #save() {
    if (isVercel) return; // No persistir en Vercel
    try {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(this.#data, null, 2), "utf-8");
    } catch (e) {
      console.error("[SETTINGS] Error guardando settings:", e.message);
    }
  }
}

// Singleton
export const settings = new SettingsService();
