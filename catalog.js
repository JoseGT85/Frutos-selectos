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
  // Estructura de la hoja (multi-sección):
  //   Fila header:     PRODUCTO | PRESENTACIÓN | | REMITO    | |     | PX (IVA) |
  //   Fila sub-header: |        |              | | KG        | BULTO | | KG    | BULTO
  //   Fila datos:      ALMENDRA | CAJA X 10 KG | | $18.862   | $188.629 | | ...
  //
  // Usamos: REMITO → BULTO como precio base, PRESENTACIÓN como unidad
  async #fetchFromSheets() {
    if (!SHEETS_URL) return FALLBACK_PRODUCTS;

    try {
      const res = await fetch(SHEETS_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status} al obtener la hoja de cálculo`);
      
      const csvText = await res.text();
      const rows = this.#parseCSV(csvText);

      // Detectar estructura de columnas en la primera aparición del header
      let nameCol = 0, presCol = 1, bultoKgCol = 3;
      let foundHeader = false;

      for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].map(c => c.toLowerCase().trim());
        if (cells.some(c => c.includes("precio kg x bulto cerrado") || c.includes("precio kg x bulto"))) {
          nameCol = cells.findIndex(c => /producto|artículo/.test(c));
          presCol = cells.findIndex(c => /peso bulto|presentac/.test(c));
          bultoKgCol = cells.findIndex(c => /precio kg x bulto/.test(c));
          
          if (nameCol === -1) nameCol = 0;
          if (presCol === -1) presCol = 1;
          if (bultoKgCol === -1) bultoKgCol = 3;
          
          foundHeader = true;
          console.log(`[CATALOG] Estructura detectada: nombre=col${nameCol}, presentación=col${presCol}, precio_kg_bulto=col${bultoKgCol}`);
          break;
        }
      }

      // Si no encuentra el header nuevo, usar defaults por si acaso
      if (!foundHeader) {
        console.log("[CATALOG] ⚠️ No se detectó header exacto, usando columnas por defecto (0, 1, 3)");
      }

      // Parsear todas las filas de datos, saltando headers y secciones
      const products = [];
      let currentSection = "General";
      let productId = 0;

      for (let i = 0; i < rows.length; i++) {
        const cells = rows[i];
        if (!cells || cells.length < 2) continue;

        const cell0 = (cells[0] || "").trim();
        const cell0Lower = cell0.toLowerCase();

        // Detectar filas de header/sub-header → saltar
        if (cell0Lower.includes("producto") && (cells[1] || "").toLowerCase().includes("peso")) continue;
        
        // La columna bultoKgCol tiene el precio POR KG
        const bultoRaw = (cells[bultoKgCol] || "").trim();
        
        // Detectar filas de sección (solo texto en primera columna, sin precio en BULTO)
        if (cell0 && !bultoRaw && cell0.length > 3) {
          if (/[*(]/.test(cell0) || cell0 === cell0.toUpperCase()) {
            currentSection = cell0;
          }
          continue;
        }

        // Si no hay nombre → saltar
        const name = cells[nameCol]?.trim();
        if (!name || name.length < 2) continue;

        // Saltar filas descriptivas
        if (/^(mix .+\(|recetas sujetas)/i.test(name) && !bultoRaw) continue;

        // Parsear precio POR KG
        const rawKgCost = bultoRaw
          .replace(/[^0-9,.]/g, "")
          .replace(/\./g, "")
          .replace(",", ".");
        const costPerKg = parseFloat(rawKgCost);
        if (isNaN(costPerKg) || costPerKg <= 0) continue;

        // Presentación como unidad
        const presentation = cells[presCol]?.trim() || "";
        const unit = presentation || "Bulto";

        const { category, emoji, imageUrl } = inferCategory(name);
        const { peso_kg, tipo_producto } = inferWeightAndType(unit, name);
        
        // El costo de la unidad entera es el precio por kg multiplicado por el peso total
        const costBulto = costPerKg * peso_kg;

        productId++;
        products.push({
          id: productId,
          name,
          cost: costBulto,       // Precio TOTAL de la unidad (base para margen y carrito)
          costPerKg: costPerKg,  // Referencia precio por kg
          category,
          unit,                  // Presentación (ej: "CAJA X 10 KG")
          emoji,
          imageUrl,
          section: currentSection,
          peso_kg,
          tipo_producto,
        });
      }

      console.log(`[CATALOG] Parseados ${products.length} productos con precio REMITO BULTO`);
      return products.length > 3 ? products : FALLBACK_PRODUCTS;
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
  
  if (/avena/i.test(n)) return { category: "Cereales", emoji: "🥣", imageUrl: "https://images.unsplash.com/photo-1559951585-645e730d3cf0?w=600&q=80" };
  if (/arándano/i.test(n)) return { category: "Frutas Secas", emoji: "🫐", imageUrl: "https://images.unsplash.com/photo-1642102903918-b97c37955bbf?w=600&q=80" };
  if (/castaña.*cajú/i.test(n)) return { category: "Nueces", emoji: "🌿", imageUrl: "https://images.unsplash.com/photo-1596422846543-7dc3fa908d08?auto=format&fit=crop&q=80&w=400" };
  if (/pistacho/i.test(n)) return { category: "Nueces", emoji: "🫘", imageUrl: "https://images.unsplash.com/photo-1524593000379-d4729b2c4f99?w=600&q=80" };
  if (/nuez|nueces/i.test(n)) return { category: "Nueces", emoji: "🥜", imageUrl: "https://images.unsplash.com/photo-1524593656068-fbac72624bb0?w=600&q=80" };
  if (/almendr/i.test(n)) return { category: "Nueces", emoji: "🌰", imageUrl: "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=600&q=80" };
  if (/avellana/i.test(n)) return { category: "Nueces", emoji: "🌰", imageUrl: "https://images.unsplash.com/photo-1560155016-bd4879ae8f21?w=600&q=80" };
  if (/maní|mani /i.test(n)) return { category: "Nueces", emoji: "🥜", imageUrl: "https://images.unsplash.com/photo-1626196340006-f89d9bedf1c6?w=600&q=80" };
  if (/pecan/i.test(n)) return { category: "Nueces", emoji: "🥜", imageUrl: "https://images.unsplash.com/photo-1598049025533-dbd5c11c2462?w=600&q=80" };

  if (/dátil|datil/i.test(n)) return { category: "Frutas Secas", emoji: "🟤", imageUrl: "https://images.unsplash.com/photo-1691657917109-c6e027eac44a?w=600&q=80" };
  if (/pasa.*uva/i.test(n)) return { category: "Frutas Secas", emoji: "🍇", imageUrl: "https://images.unsplash.com/photo-1621597121291-fa650ac736e5?w=600&q=80" };
  if (/coco/i.test(n)) return { category: "Frutas Secas", emoji: "🥥", imageUrl: "https://images.unsplash.com/photo-1526656755455-89ffb578c740?w=600&q=80" };
  if (/higo|damasco|ciruela|goji|papaya|pera/i.test(n)) return { category: "Frutas Secas", emoji: "🍑", imageUrl: "https://images.unsplash.com/photo-1629738601425-494c3d6ba3e2?w=600&q=80" };
  if (/tomate/i.test(n)) return { category: "Otros", emoji: "🍅", imageUrl: "https://images.unsplash.com/photo-1558500201-d576a92ec23d?w=600&q=80" };

  if (/mix|mezcla|trail/i.test(n)) return { category: "Mezclas", emoji: "✨", imageUrl: "https://images.unsplash.com/photo-1642073537056-20608544f111?w=600&q=80" };
  
  if (/chía|chia/i.test(n)) return { category: "Semillas", emoji: "🌱", imageUrl: "https://images.unsplash.com/photo-1604768802835-899055f0e245?w=600&q=80" };
  if (/girasol|lino|sésamo|sesamo|zapallo/i.test(n)) return { category: "Semillas", emoji: "🌾", imageUrl: "https://images.unsplash.com/photo-1642497393633-a19e9231fb92?w=600&q=80" };
  if (/maiz|maíz/i.test(n)) return { category: "Otros", emoji: "🌽", imageUrl: "https://images.unsplash.com/photo-1582236592237-72ce00cb3fbc?w=600&q=80" };
  if (/chips.*banana/i.test(n)) return { category: "Frutas Secas", emoji: "🍌", imageUrl: "https://images.unsplash.com/photo-1600351792694-a15e61bf5ab9?w=600&q=80" };

  return { category: "Otros", emoji: "🌿", imageUrl: "https://images.unsplash.com/photo-1615485925873-7ecbbe90a866?w=600&q=80" };
}

// ─── Inferencia de peso y tipo_producto ──────────────────────────────────────
function inferWeightAndType(unit, name) {
  let peso_kg = 1;
  let tipo_producto = "fraccionado";
  
  const u = (unit || "").toLowerCase();
  const n = (name || "").toLowerCase();

  let matchKg = u.match(/(\d+(?:[\.,]\d+)?)\s*kg/);
  if (matchKg) {
    peso_kg = parseFloat(matchKg[1].replace(',', '.'));
  } else {
    let matchG = u.match(/(\d+)\s*g/);
    if (matchG) {
      peso_kg = parseInt(matchG[1], 10) / 1000;
    }
  }

  if (u.includes("bulto") || n.includes("bulto") || peso_kg >= 10) {
    if (!matchKg && !matchG) peso_kg = 10;
    tipo_producto = "bulto_10kg";
  }

  return { peso_kg, tipo_producto };
}

// ─── Datos fallback ──────────────────────────────────────────────────────────
const rawFallbackParams = [
  { id: 1,  name: "Almendras Natural",     cost: 2800, category: "Nueces",       unit: "500g", emoji: "🌰", imageUrl: "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=600&q=80" },
  { id: 2,  name: "Almendras Blanqueadas", cost: 3200, category: "Nueces",       unit: "500g", emoji: "🌰", imageUrl: "https://images.unsplash.com/photo-1608797178974-15b35a64ede9?w=600&q=80" },
  { id: 3,  name: "Nueces Mariposa",       cost: 4500, category: "Nueces",       unit: "500g", emoji: "🥜", imageUrl: "https://images.unsplash.com/photo-1524593656068-fbac72624bb0?w=600&q=80" },
  { id: 4,  name: "Pistachos Iraníes",     cost: 5800, category: "Nueces",       unit: "250g", emoji: "🫘", imageUrl: "https://images.unsplash.com/photo-1524593000379-d4729b2c4f99?w=600&q=80" },
  { id: 5,  name: "Anacardos Natural",     cost: 4200, category: "Nueces",       unit: "500g", emoji: "🌿", imageUrl: "https://images.unsplash.com/photo-1726771517475-e7acdd34cd8a?w=600&q=80" },
  { id: 6,  name: "Maní Tostado Salado",   cost: 800,  category: "Nueces",       unit: "500g", emoji: "🥜", imageUrl: "https://images.unsplash.com/photo-1626196340006-f89d9bedf1c6?w=600&q=80" },
  { id: 7,  name: "Pecán Entero",          cost: 6800, category: "Nueces",       unit: "500g", emoji: "🌰", imageUrl: "https://images.unsplash.com/photo-1598049025533-dbd5c11c2462?w=600&q=80" },
  { id: 8,  name: "Arándanos Secos",       cost: 3500, category: "Frutas Secas", unit: "250g", emoji: "🫐", imageUrl: "https://images.unsplash.com/photo-1642102903918-b97c37955bbf?w=600&q=80" },
  { id: 9,  name: "Dátiles Medjool",       cost: 6800, category: "Frutas Secas", unit: "500g", emoji: "🟤", imageUrl: "https://images.unsplash.com/photo-1691657917109-c6e027eac44a?w=600&q=80" },
  { id: 10, name: "Higos Secos Premium",   cost: 2200, category: "Frutas Secas", unit: "500g", emoji: "🍂", imageUrl: "https://images.unsplash.com/photo-1629738601425-494c3d6ba3e2?w=600&q=80" },
  { id: 11, name: "Pasas de Uva Rubias",   cost: 1400, category: "Frutas Secas", unit: "500g", emoji: "🍇", imageUrl: "https://images.unsplash.com/photo-1621597121291-fa650ac736e5?w=600&q=80" },
  { id: 12, name: "Damascos Secos",        cost: 2800, category: "Frutas Secas", unit: "500g", emoji: "🍑", imageUrl: "https://images.unsplash.com/photo-1608842850202-06e70ead4c10?w=600&q=80" },
  { id: 13, name: "Mix Mediterráneo",      cost: 3800, category: "Mezclas",      unit: "500g", emoji: "✨", imageUrl: "https://images.unsplash.com/photo-1642073537056-20608544f111?w=600&q=80" },
  { id: 14, name: "Trail Mix Energético",  cost: 2900, category: "Mezclas",      unit: "500g", emoji: "⚡", imageUrl: "https://images.unsplash.com/photo-1615485925873-7ecbbe90a866?w=600&q=80" },
  { id: 15, name: "Semillas de Chía",      cost: 1200, category: "Semillas",     unit: "500g", emoji: "🌱", imageUrl: "https://images.unsplash.com/photo-1604768802835-899055f0e245?w=600&q=80" },
  { id: 16, name: "Semillas de Lino",      cost: 800,  category: "Semillas",     unit: "500g", emoji: "🌾", imageUrl: "https://images.unsplash.com/photo-1642497393633-a19e9231fb92?w=600&q=80" },
  { id: 17, name: "Granola Artesanal",     cost: 2400, category: "Cereales",     unit: "500g", emoji: "🥣", imageUrl: "https://images.unsplash.com/photo-1559951585-645e730d3cf0?w=600&q=80" },
  { id: 18, name: "Almendras Bulto",       cost: 25000,category: "Nueces",       unit: "10 kg", emoji: "📦", imageUrl: "https://images.unsplash.com/photo-1608797178974-15b35a64ede9?w=600&q=80" }
];

const FALLBACK_PRODUCTS = rawFallbackParams.map(p => ({
  ...p,
  ...inferWeightAndType(p.unit, p.name)
}));
