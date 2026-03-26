// ─────────────────────────────────────────────────────────────────────────────
// API SERVICE — fetch de productos con fallback a datos mock
// ─────────────────────────────────────────────────────────────────────────────
import config from '../config/index.js';
import { MOCK_API_DATA } from '../data/mockProducts.js';

/**
 * Obtiene la lista de productos.
 * Si VITE_API_ENDPOINT está configurado, hace fetch al endpoint real.
 * De lo contrario, devuelve los datos mock con latencia simulada.
 *
 * Estructura esperada del JSON: [{ id, name, cost, category, unit, emoji }]
 *
 * @returns {Promise<Array>} Lista de productos
 */
export async function fetchProducts() {
  if (config.apiEndpoint) {
    const res = await fetch(config.apiEndpoint);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return data;
  }

  // Modo desarrollo — datos mock con latencia simulada
  await new Promise((r) => setTimeout(r, 900));
  return MOCK_API_DATA;
}
