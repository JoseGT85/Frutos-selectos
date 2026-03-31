// ═══════════════════════════════════════════════════════════════════════════
//  DIFRUMARKET — Product Catalog Service
//  Parseo de Google Sheets + cache con TTL + cálculo de precio de venta
// ═══════════════════════════════════════════════════════════════════════════
import { JSDOM } from "jsdom";

const SHEETS_URL  = process.env.GOOGLE_SHEETS_URL || "";
const CACHE_TTL   = Number(process.env.CACHE_TTL_MS) || 15 * 60_000; // 15 min default

export class ProductCatalog {
  #margin;
  #cache    = null;
  #cacheAt  = 0;

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
      const products = await this.#fetchFromSheets();
      if (products.length > 0) {
        this.#cache = products;
        this.#cacheAt = Date.now();
        console.log(`[CATALOG] 📡 ${products.length} productos cargados desde Sheets`);
        return this.#applyMargin(products);
      }
    } catch (err) {
      console.error("[CATALOG] Error fetch:", err.message);
    }

    // Fallback: devolver cache viejo o datos mock
    if (this.#cache) {
      console.log("[CATALOG] ⚠️ Usando cache expirado");
      return this.#applyMargin(this.#cache);
    }

    console.log("[CATALOG] 📦 Usando datos fallback");
    return this.#applyMargin(FALLBACK_PRODUCTS);
  }

  // ─── Sheet parser ──────────────────────────────────────────────────────────
  async #fetchFromSheets() {
    if (!SHEETS_URL) return FALLBACK_PRODUCTS;

    const res  = await fetch(SHEETS_URL);
    const html = await res.text();
    const dom  = new JSDOM(html);
    const doc  = dom.window.document;
    const rows = Array.from(doc.querySelectorAll("table tr"));

    let headerIdx = -1, costCol = -1, nameCol = 0, unitCol = -1;

    for (let i = 0; i < rows.length; i++) {
      const cells = Array.from(rows[i].querySelectorAll("td,th"))
        .map(c => c.textContent.trim().toLowerCase());
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

    if (headerIdx === -1 || costCol === -1) return FALLBACK_PRODUCTS;

    const products = [];
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const cells = Array.from(rows[i].querySelectorAll("td,th"));
      if (cells.length <= costCol) continue;

      const name = cells[nameCol]?.textContent.trim();
      if (!name || name.length < 2) continue;

      const raw = cells[costCol]?.textContent.trim()
        .replace(/[^0-9,.]/g, "").replace(",", ".");
      const cost = parseFloat(raw);
      if (!cost || cost <= 0) continue;

      const unit = unitCol > -1
        ? cells[unitCol]?.textContent.trim() || "1kg"
        : "1kg";
      const { category, emoji } = inferCategory(name);

      products.push({ id: i, name, cost, category, unit, emoji });
    }

    return products.length > 5 ? products : FALLBACK_PRODUCTS;
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
