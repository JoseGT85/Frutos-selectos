// ═══════════════════════════════════════════════════════════════════════════
//  DIFRUMARKET — Custom Catalog Service
//  Gestión de productos manuales y sobrescrituras de precio locales (persistente)
// ═══════════════════════════════════════════════════════════════════════════
import fs from "fs/promises";
import path from "path";

const isVercel = !!(process.env.VERCEL || process.env.NOW_REGION);
const DATA_FILE = path.join(process.cwd(), "data", "custom_catalog.json");

export class CustomCatalogService {
  #state = {
    customProducts: [],
    overrides: {}, // { "Nombre exacto del producto": newCost }
    images: {},    // { "Nombre exacto del producto": "/uploads/xx.jpg" }
    nameOverrides: {} // { "Nombre exacto del producto": "Nuevo Nombre Frontend" }
  };

  /**
   * Carga el estado desde el disco al inicializarse
   */
  async init() {
    if (isVercel) return; // No intentar leer disco en Vercel
    try {
      await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
      const data = await fs.readFile(DATA_FILE, "utf-8");
      this.#state = JSON.parse(data);
      if (!this.#state.images) this.#state.images = {}; // migración automática
      if (!this.#state.nameOverrides) this.#state.nameOverrides = {}; // migración automática
      console.log(`[CUSTOM CATALOG] Cargado: ${this.#state.customProducts.length} custom, ${Object.keys(this.#state.overrides).length} overrides, ${Object.keys(this.#state.images).length} fotos, ${Object.keys(this.#state.nameOverrides).length} renombrados`);
    } catch (err) {
      if (err.code !== "ENOENT") {
        console.error("[CUSTOM CATALOG] Error de lectura:", err.message);
      }
    }
  }

  async #save() {
    if (isVercel) return; // No persistir en Vercel
    try {
      await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
      await fs.writeFile(DATA_FILE, JSON.stringify(this.#state, null, 2), "utf-8");
    } catch (err) {
      console.error("[CUSTOM CATALOG] Error guardando:", err.message);
    }
  }

  // ─── API Lógica ────────────────────────────────────────────────────────────

  getOverrides() {
    return this.#state.overrides;
  }

  getImages() {
    return this.#state.images;
  }

  getNameOverrides() {
    return this.#state.nameOverrides;
  }

  getCustomProducts() {
    return this.#state.customProducts;
  }

  /**
   * Agrega o actualiza un producto manual.
   */
  async addCustomProduct(product) {
    if (!product.id) {
      product.id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    }
    
    product.isCustom = true; // Flag para el frontend
    
    const idx = this.#state.customProducts.findIndex(p => p.id === product.id);
    if (idx > -1) {
      this.#state.customProducts[idx] = { ...this.#state.customProducts[idx], ...product };
    } else {
      this.#state.customProducts.push(product);
    }
    
    await this.#save();
    return product;
  }

  /**
   * Elimina un producto manual
   */
  async deleteCustomProduct(id) {
    this.#state.customProducts = this.#state.customProducts.filter(p => p.id !== id);
    await this.#save();
  }

  /**
   * Establece un precio sobrescrito. Útil para productos bajados de Sheets.
   * Usamos el "name" como key firme.
   */
  async setOverride(productName, newCost) {
    if (!productName || newCost <= 0) return;
    this.#state.overrides[productName] = Number(newCost);
    await this.#save();
  }

  /**
   * Elimina un override, devolviendo el producto a su precio de Sheets.
   */
  async removeOverride(productName) {
    if (this.#state.overrides[productName]) {
      delete this.#state.overrides[productName];
      await this.#save();
    }
  }

  /**
   * Define la URL o Path de imagen de cualquier producto.
   */
  async setProductImage(productName, imageUrl) {
    if (!productName) return;
    if (imageUrl) {
      this.#state.images[productName] = imageUrl;
    } else {
      delete this.#state.images[productName];
    }
    await this.#save();
  }

  /**
   * Define un nombre visual alternativo para un producto de Sheets
   */
  async setNameOverride(originalName, customName) {
    if (!originalName) return;
    if (customName && customName.trim() !== "") {
      this.#state.nameOverrides[originalName] = customName.trim();
    } else {
      delete this.#state.nameOverrides[originalName];
    }
    await this.#save();
  }
}

// Instancia global en memoria
export const customCatalog = new CustomCatalogService();
// Autocargar
customCatalog.init();
