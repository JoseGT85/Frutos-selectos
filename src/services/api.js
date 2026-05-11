// ─────────────────────────────────────────────────────────────────────────────
// API SERVICE — Conexión directa al Catálogo Híbrido Backend
// ─────────────────────────────────────────────────────────────────────────────
import config from '../config/index.js';

// En localhost usamos la URL completa del backend; en producción usamos rutas relativas
// para que vercel.json las reescriba al serverless function correctamente.
const _isLocal = typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
const BACKEND_URL = _isLocal
  ? (import.meta.env.VITE_BACKEND_URL || "http://localhost:3000")
  : "";

/**
 * Obtiene la lista unificada de productos directamente del Motor Principal
 * (Google Sheets + Fotografías + Precios Modificados).
 * @returns {Promise<Array>} Lista de productos
 */
export async function fetchProducts() {
  const res = await fetch(`${BACKEND_URL}/api/catalog`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return await res.json();
}

// ─── ADMIN API (Requieren Token de Auth JWT) ─────────────────────────────────

// (El valor de BACKEND_URL ya está arriba)

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

export async function setNameOverrideAPI(originalName, customName) {
  return fetchWithAuth(`${BACKEND_URL}/api/admin/catalog/name-override`, {
    method: "PUT",
    body: JSON.stringify({ originalName, customName })
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
export async function getMarginsAPI() {
  return fetchWithAuth(`${BACKEND_URL}/api/admin/catalog/margins`, {
    method: "GET"
  });
}

export async function updateMarginAPI(id, margin) {
  return fetchWithAuth(`${BACKEND_URL}/api/admin/catalog/margins`, {
    method: "PUT",
    body: JSON.stringify({ id, margin: Number(margin) })
  });
}
