// ─────────────────────────────────────────────────────────────────────────────
// PRICING UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula precio de venta: Costo × (1 + Margen / 100)
 * @param {number} cost - Costo base del producto
 * @param {number} margin - Margen de ganancia (porcentaje)
 * @returns {number} Precio de venta
 */
export const calcSalePrice = (cost, margin) => cost * (1 + margin / 100);

/**
 * Formatea un número como precio en pesos argentinos
 * @param {number} n - Número a formatear
 * @returns {string} Precio formateado (ej: "$1.200")
 */
export const fmt = (n) =>
  "$" + Math.round(n).toLocaleString("es-AR", { minimumFractionDigits: 0 });
