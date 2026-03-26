// ─────────────────────────────────────────────────────────────────────────────
// AUTOMATION SERVICE — scaffold para integración futura con agente AI
// ─────────────────────────────────────────────────────────────────────────────
//
// Este módulo prepara los puntos de integración para conectar la tienda
// con un sistema de automatización (bot de WhatsApp, CRM, AI agent, etc.)
//
// ─── ARQUITECTURA FUTURA ────────────────────────────────────────────────────
//
// ┌──────────────┐    webhook     ┌──────────────────┐
// │  Frutos Web  │ ──────────────►│  Automation Agent │
// │  (esta app)  │                │  (n8n / Make /    │
// └──────────────┘                │   custom bot)     │
//        ▲                        └──────────────────┘
//        │  fetch products                │
//        │                                │ respuestas
//        ▼                                ▼
// ┌──────────────┐                ┌──────────────────┐
// │ Google Sheets │                │    WhatsApp API   │
// │  / Supabase  │                │   (Twilio/Meta)   │
// └──────────────┘                └──────────────────┘
//
// ─────────────────────────────────────────────────────────────────────────────

import config from '../config/index.js';

/**
 * Envía los datos de un pedido al webhook de automatización.
 * Esto permite que un agente externo (bot, CRM, etc.) procese el pedido.
 *
 * @param {Object} orderData - Datos del pedido
 * @param {Array}  orderData.items - Items del carrito
 * @param {number} orderData.total - Total del pedido
 * @param {number} orderData.margin - Margen aplicado
 * @param {string} orderData.timestamp - ISO timestamp
 * @returns {Promise<Object|null>} Respuesta del webhook o null si no está configurado
 */
export async function sendOrderToWebhook(orderData) {
  if (!config.automationWebhookUrl) {
    console.info('[Automation] Webhook no configurado. Pedido solo por WhatsApp.');
    return null;
  }

  try {
    const res = await fetch(config.automationWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.automationApiKey && {
          'Authorization': `Bearer ${config.automationApiKey}`,
        }),
      },
      body: JSON.stringify({
        event: 'order_created',
        data: orderData,
        source: 'frutos-selectos-web',
      }),
    });

    if (!res.ok) throw new Error(`Webhook error: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[Automation] Error enviando al webhook:', err);
    return null;
  }
}

/**
 * Notifica al sistema de automatización que se completó una sincronización.
 * Útil para triggers de actualización de inventario.
 *
 * @param {number} productCount - Cantidad de productos sincronizados
 */
export async function notifySyncCompleted(productCount) {
  if (!config.automationWebhookUrl) return null;

  try {
    const res = await fetch(config.automationWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.automationApiKey && {
          'Authorization': `Bearer ${config.automationApiKey}`,
        }),
      },
      body: JSON.stringify({
        event: 'sync_completed',
        data: { productCount, timestamp: new Date().toISOString() },
        source: 'frutos-selectos-web',
      }),
    });

    if (!res.ok) throw new Error(`Webhook error: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[Automation] Error notificando sync:', err);
    return null;
  }
}
