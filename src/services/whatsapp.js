// ─────────────────────────────────────────────────────────────────────────────
// WHATSAPP SERVICE — construye y abre el mensaje de pedido
// ─────────────────────────────────────────────────────────────────────────────
import config from '../config/index.js';
import { calcSalePrice, fmt } from '../utils/pricing.js';

/**
 * Construye el texto del pedido formateado para WhatsApp.
 * @param {Array} cart - Items del carrito [{ id, name, unit, cost, qty }]
 * @param {number} margin - Margen de rentabilidad actual
 * @param {string} shippingStatus
 * @param {number} totalKg
 * @param {object} clientData
 * @returns {string} Mensaje formateado con markdown de WhatsApp
 */
export function buildOrderMessage(cart, margin, shippingStatus = "", totalKg = 0, clientData = null) {
  const lines = cart.map((item) => {
    const p = calcSalePrice(item.cost, margin);
    return `• ${item.name} (${item.unit}) ×${item.qty}  →  ${fmt(p * item.qty)}`;
  });

  const total = cart.reduce(
    (sum, item) => sum + calcSalePrice(item.cost, margin) * item.qty,
    0
  );

  const statusBox = clientData ? [
    "",
    `👤 *Cliente:* ${clientData.name} ${clientData.lastname}`,
    `📞 *Tel:* ${clientData.phone}`,
    `📍 *Envío:* ${clientData.address}`,
    `📄 *CUIT/CUIL:* ${clientData.cuit}`,
    `⚖️ *Peso Total:* ${totalKg.toFixed(2)} kg`,
    `🚚 *Estado Envío:* ${shippingStatus}`
  ] : ["", "Por favor confirmar disponibilidad y coordinar el envío. ¡Muchas gracias!"];

  return [
    `🌰 *Pedido — ${config.businessName} Premium*`,
    "━━━━━━━━━━━━━━━━━━━━━━━",
    ...lines,
    "━━━━━━━━━━━━━━━━━━━━━━━",
    `💰 *Total: ${fmt(total)}*`,
    ...statusBox,
  ].join("\n");
}

/**
 * Abre WhatsApp Web/App con el mensaje de pedido pre-cargado.
 * @param {string} message - Texto codificado del pedido
 */
export function openWhatsApp(message) {
  const url = `https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}
