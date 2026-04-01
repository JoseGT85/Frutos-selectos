// ═══════════════════════════════════════════════════════════════════════════
//  DIFRUMARKET — Product Catalog Service
//  Parseo de Google Sheets + cache con TTL + cálculo de precio de venta
// ═══════════════════════════════════════════════════════════════════════════
import { customCatalog } from "./custom-catalog-service.js";

// URL por defecto actualizada al nuevo listado proporcionado por el usuario
const DEFAULT_SHEETS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSG8HiC02weCi6VOkBZO_DvChdbviKFEeE2WCJEZ-9awel9e4BqFnuvT8iXdRXNMK6orDFk8eiVibmX/pub?gid=0&single=true&output=csv";
const SHEETS_URL  = process.env.GOOGLE_SHEETS_URL || DEFAULT_SHEETS_URL;
const CACHE_TTL   = Number(process.env.CACHE_TTL_MS) || 15 * 60_000; // 15 min default

export class ProductCatalog {
  #margin;
  #cache    = null;
  #cacheAt  = 0;
  #syncStatus = { 
    ok: true, 
    lastSync: null, 
    error: null, 
    source: "init" 
  };

  constructor(margin = 30) {
    this.#margin = margin;
  }

  // ─── Public API ────────────────────────────────────────────────────────────
  setMargin(m) {
    this.#margin = Number(m);
    this.invalidate(); // recalcular precios
  }

  invalidate() {
    this.#cache = null;
    this.#cacheAt = 0;
  }

  getSyncStatus() {
    return {
      ...this.#syncStatus,
      cacheAge: this.#cacheAt ? Math.round((Date.now() - this.#cacheAt) / 1000) : null
    };
  }

  /**
   * Obtiene todos los productos con precio de venta calculado.
   * Usa cache con TTL para evitar requests excesivos a Google Sheets.
   * @returns {Promise<Array<Object>>}
   */
  async getAll() {
    if (this.#cache && (Date.now() - this.#cacheAt) < CACHE_TTL) {
      return this.#applyMargin(this.#cache);
    }

    try {
      let rawProducts = await this.#fetchFromSheets();
      
      // Combinar Sheets + Sobrescrituras y Productos Manuales
      let products = this.#enrichWithLocalData(rawProducts);

      if (products.length > 0) {
        this.#cache = products;
        this.#cacheAt = Date.now();
        this.#syncStatus = { ok: true, lastSync: new Date().toISOString(), error: null, source: "sheets" };
        console.log(`[CATALOG] 📡 ${rawProducts.length} traídos de Sheets, ${products.length - rawProducts.length} manuales, Cacheado.`);
        return this.#applyMargin(products);
      }
    } catch (err) {
      this.#syncStatus = { ok: false, lastSync: new Date().toISOString(), error: err.message, source: "error" };
      console.error("[CATALOG] Error fetch:", err.message);
    }

    // Fallback: devolver cache viejo (si existe) pero marcar error
    if (this.#cache) {
      console.log("[CATALOG] ⚠️ Usando cache expirado por error en sync");
      return this.#applyMargin(this.#cache);
    }

    console.log("[CATALOG] 📦 Usando datos fallback fundidos");
    return this.#applyMargin(this.#enrichWithLocalData(FALLBACK_PRODUCTS));
  }

  // ─── Mezcla con DB Local ───────────────────────────────────────────────────
  #enrichWithLocalData(products) {
    const overrides = customCatalog.getOverrides();
    const images    = customCatalog.getImages();
    const nameOverrides = customCatalog.getNameOverrides();
    const custom    = customCatalog.getCustomProducts();

    // 1. Sobrescribir costos y anexar fotos de Sheets si coinciden en el nombre
    const enriched = products.map(p => {
      const pName = p.name.trim();
      let merged = { ...p, originalName: pName };
      
      if (overrides[pName]) {
        merged.cost = overrides[pName];
        merged.isOverride = true;
      }
      if (images[pName]) {
        merged.imageUrl = images[pName];
      }
      if (nameOverrides[pName]) {
        merged.name = nameOverrides[pName];
        merged.isNameOverride = true;
      }
      
      return merged;
    });

    // 2. Agregar los manuales y recabar sus fotos también
    const customWithImages = custom.map(c => {
      let merged = { ...c, originalName: c.name.trim() };
      if (images[merged.originalName]) merged.imageUrl = images[merged.originalName];
      if (nameOverrides[merged.originalName]) {
        merged.name = nameOverrides[merged.originalName];
        merged.isNameOverride = true;
      }
      return merged;
    });

    return [...enriched, ...customWithImages];
  }

  // ─── Sheet parser ──────────────────────────────────────────────────────────
  async #fetchFromSheets() {
    if (!SHEETS_URL) return FALLBACK_PRODUCTS;

    try {
      const res = await fetch(SHEETS_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status} al obtener la hoja de cálculo`);
      
      const csvText = await res.text();
      const rows = this.#parseCSV(csvText);

      let headerIdx = -1, costCol = -1, nameCol = 0, unitCol = -1;

      // Buscar encabezado
      for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].map(c => c.toLowerCase());
        const ri = cells.findIndex(c => c.includes("remito"));
        if (ri > -1) {
          headerIdx = i;
          costCol = ri;
          unitCol = cells.findIndex(c => /kg|g\b|unidad|presentac/.test(c));
          nameCol = cells.findIndex(c => /producto|artículo|descripción|nombre/.test(c));
          if (nameCol === -1) nameCol = 0;
          break;
        }
      }

      if (headerIdx === -1 || costCol === -1) {
        throw new Error("No se pudo detectar la estructura de la hoja (falta columna 'remito')");
      }

      const products = [];
      for (let i = headerIdx + 1; i < rows.length; i++) {
        const cells = rows[i];
        if (cells.length <= costCol) continue;

        const name = cells[nameCol]?.trim();
        if (!name || name.length < 2) continue;

        // Limpieza de precio robusta ($ 18.862,95 -> 18862.95)
        const raw = cells[costCol]?.trim()
          .replace(/[^0-9,.]/g, "")
          .replace(/\./g, "")
          .replace(",", ".");
          
        const cost = parseFloat(raw);
        if (isNaN(cost) || cost <= 0) continue;

        const unit = unitCol > -1
          ? cells[unitCol]?.trim() || "1kg"
          : "1kg";
        const { category, emoji } = inferCategory(name);

        products.push({ id: i, name, cost, category, unit, emoji });
      }

      return products.length > 5 ? products : FALLBACK_PRODUCTS;
    } catch (err) {
      console.error("[CATALOG] Critical sync error:", err.message);
      throw err;
    }
  }

  // Helper simple para parsear CSV respetando comillas
  #parseCSV(text) {
    const rows = [];
    let currentRow = [];
    let inQuotes = false;
    let currentValue = "";

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          currentValue += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          currentValue += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          currentRow.push(currentValue);
          currentValue = "";
        } else if (char === '\n' || char === '\r') {
          currentRow.push(currentValue);
          if (currentRow.length > 1 || currentRow[0] !== "") {
            rows.push(currentRow);
          }
          currentRow = [];
          currentValue = "";
          if (char === '\r' && nextChar === '\n') i++;
        } else {
          currentValue += char;
        }
      }
    }
    if (currentValue || currentRow.length > 0) {
      currentRow.push(currentValue);
      rows.push(currentRow);
    }
    return rows;
  }

  // ─── Aplicar margen ────────────────────────────────────────────────────────
  #applyMargin(products) {
    return products.map(p => ({
      ...p,
      salePrice: Math.round(p.cost * (1 + this.#margin / 100)),
      margin:    this.#margin,
    }));
  }
}

// ─── Inferencia de categoría por nombre ──────────────────────────────────────
function inferCategory(name) {
  const n = (name || "").toLowerCase();
  if (/almendr|pecan|nuez|pistacho|anacardo|castaña|maní|macadam/i.test(n))
    return { category: "Nueces", emoji: "🥜" };
  if (/arándano|dátil|higo|pasa|damasco|ciruela|coco|goji/i.test(n))
    return { category: "Frutas Secas", emoji: "🍇" };
  if (/mix|mezcla|trail/i.test(n))
    return { category: "Mezclas", emoji: "✨" };
  if (/semilla|girasol|lino|chía|sésamo|zapallo/i.test(n))
    return { category: "Semillas", emoji: "🌱" };
  if (/granola|avena|cereal/i.test(n))
    return { category: "Cereales", emoji: "🥣" };
  return { category: "Otros", emoji: "🌿" };
}

// ─── Datos fallback ──────────────────────────────────────────────────────────
const FALLBACK_PRODUCTS = [
  { id: 1,  name: "Almendras Natural",     cost: 2800, category: "Nueces",       unit: "500g", emoji: "🌰" },
  { id: 2,  name: "Almendras Blanqueadas", cost: 3200, category: "Nueces",       unit: "500g", emoji: "🌰" },
  { id: 3,  name: "Nueces Mariposa",       cost: 4500, category: "Nueces",       unit: "500g", emoji: "🥜" },
  { id: 4,  name: "Pistachos Iraníes",     cost: 5800, category: "Nueces",       unit: "250g", emoji: "🫘" },
  { id: 5,  name: "Anacardos Natural",     cost: 4200, category: "Nueces",       unit: "500g", emoji: "🌿" },
  { id: 6,  name: "Maní Tostado Salado",   cost: 800,  category: "Nueces",       unit: "500g", emoji: "🥜" },
  { id: 7,  name: "Pecán Entero",          cost: 6800, category: "Nueces",       unit: "500g", emoji: "🌰" },
  { id: 8,  name: "Arándanos Secos",       cost: 3500, category: "Frutas Secas", unit: "250g", emoji: "🫐" },
  { id: 9,  name: "Dátiles Medjool",       cost: 6800, category: "Frutas Secas", unit: "500g", emoji: "🟤" },
  { id: 10, name: "Higos Secos Premium",   cost: 2200, category: "Frutas Secas", unit: "500g", emoji: "🍂" },
  { id: 11, name: "Pasas de Uva Rubias",   cost: 1400, category: "Frutas Secas", unit: "500g", emoji: "🍇" },
  { id: 12, name: "Damascos Secos",        cost: 2800, category: "Frutas Secas", unit: "500g", emoji: "🍑" },
  { id: 13, name: "Mix Mediterráneo",      cost: 3800, category: "Mezclas",      unit: "500g", emoji: "✨" },
  { id: 14, name: "Trail Mix Energético",  cost: 2900, category: "Mezclas",      unit: "500g", emoji: "⚡" },
  { id: 15, name: "Semillas de Chía",      cost: 1200, category: "Semillas",     unit: "500g", emoji: "🌱" },
  { id: 16, name: "Semillas de Lino",      cost: 800,  category: "Semillas",     unit: "500g", emoji: "🌾" },
  { id: 17, name: "Granola Artesanal",     cost: 2400, category: "Cereales",     unit: "500g", emoji: "🥣" },
];
