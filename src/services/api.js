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

// ─── ADMIN API (Requieren Configurar VITE_BACKEND_URL) ───────────────────────

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

function getAuthHeaders() {
  const token = localStorage.getItem("difrumarket:adminToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
}

export async function loginAdmin(password) {
  const res = await fetch(`${BACKEND_URL}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password })
  });
  if (!res.ok) throw new Error("Contraseña incorrecta");
  const data = await res.json();
  localStorage.setItem("difrumarket:adminToken", data.token);
  return data.token;
}

async function fetchWithAuth(url, options) {
  let res = await fetch(url, { ...options, headers: getAuthHeaders() });
  
  if (res.status === 401 || res.status === 403) {
    const pwd = window.prompt("🔒 Requiere Contraseña de Administrador para modificar precios:");
    if (!pwd) throw new Error("Acceso cancelado");
    
    await loginAdmin(pwd);
    // Reintentar con el nuevo token
    res = await fetch(url, { ...options, headers: getAuthHeaders() });
  }

  if (!res.ok) throw new Error("Error en la operación del servidor");
  return res.json();
}

export async function addCustomProductAPI(productData) {
  return fetchWithAuth(`${BACKEND_URL}/api/admin/catalog/custom`, {
    method: "POST",
    body: JSON.stringify(productData)
  });
}

export async function deleteCustomProductAPI(id) {
  return fetchWithAuth(`${BACKEND_URL}/api/admin/catalog/custom/${id}`, {
    method: "DELETE"
  });
}

export async function setCostOverrideAPI(name, newCost) {
  return fetchWithAuth(`${BACKEND_URL}/api/admin/catalog/override`, {
    method: "PUT",
    body: JSON.stringify({ name, newCost: Number(newCost) })
  });
}

// ── FOTOGRAFÍAS (Híbrido URL / Archivos Locales) ─────────────────────────────

export async function setProductImageAPI(name, imageUrl) {
  return fetchWithAuth(`${BACKEND_URL}/api/admin/catalog/image`, {
    method: "PUT",
    body: JSON.stringify({ name, imageUrl })
  });
}

export async function uploadImageAPI(file) {
  const formData = new FormData();
  formData.append("image", file);
  
  // Custom fetch sin JSON headers porque es FormData (Multipart)
  let res = await fetch(`${BACKEND_URL}/api/admin/catalog/upload`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${localStorage.getItem("difrumarket:adminToken")}`
    },
    body: formData
  });

  if (res.status === 401 || res.status === 403) {
    const pwd = window.prompt("🔒 Contraseña para subir imagen:");
    if (!pwd) throw new Error("Cancelado");
    await loginAdmin(pwd);
    res = await fetch(`${BACKEND_URL}/api/admin/catalog/upload`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("difrumarket:adminToken")}`
      },
      body: formData
    });
  }

  if (!res.ok) throw new Error("Error al subir archivo");
  return res.json();
}
