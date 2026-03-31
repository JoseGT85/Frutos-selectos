// ═══════════════════════════════════════════════════════════════════════════
//  DIFRUMARKET — WhatsApp Cloud API Service
//  Envío de mensajes vía la API oficial de Meta (gratuito hasta 1000/mes).
//  Este módulo se encarga SOLO de enviar — la recepción está en routes/whatsapp.js
// ═══════════════════════════════════════════════════════════════════════════

const API_VERSION = "v21.0";

export class WhatsAppService {
  #phoneNumberId;   // ID del número de teléfono registrado en Meta
  #accessToken;     // Token de acceso permanente
  #baseUrl;

  constructor() {
    this.#phoneNumberId = process.env.WA_PHONE_NUMBER_ID || "";
    this.#accessToken   = process.env.WA_ACCESS_TOKEN || "";
    this.#baseUrl       = `https://graph.facebook.com/${API_VERSION}/${this.#phoneNumberId}`;
  }

  /** ¿Está configurado el servicio? */
  isConfigured() {
    return !!(this.#phoneNumberId && this.#accessToken);
  }

  // ─── Enviar mensaje de texto ───────────────────────────────────────────────
  /**
   * Envía un mensaje de texto al cliente.
   * @param {string} to — Número del cliente con código de país (ej: "5491134567890")
   * @param {string} text — Texto del mensaje
   * @returns {Promise<Object>} — Respuesta de la API de Meta
   */
  async sendText(to, text) {
    return this.#send({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body: text },
    });
  }

  // ─── Marcar como leído ─────────────────────────────────────────────────────
  /**
   * Marca un mensaje como leído (doble tilde azul).
   * @param {string} messageId — ID del mensaje recibido
   */
  async markAsRead(messageId) {
    try {
      await this.#send({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      });
    } catch {
      // No es crítico si falla
    }
  }

  // ─── Enviar reacción ───────────────────────────────────────────────────────
  /**
   * Envía una reacción a un mensaje del cliente.
   * @param {string} messageId — ID del mensaje a reaccionar
   * @param {string} emoji — Emoji de reacción (ej: "🌰")
   */
  async sendReaction(messageId, emoji = "🌰") {
    try {
      await this.#send({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        type: "reaction",
        reaction: { message_id: messageId, emoji },
      });
    } catch {
      // No es crítico
    }
  }

  // ─── Enviar mensaje con botones (interactive) ──────────────────────────────
  /**
   * Envía un mensaje con botones de respuesta rápida.
   * @param {string} to — Número del cliente
   * @param {string} bodyText — Texto del cuerpo
   * @param {Array<{id: string, title: string}>} buttons — Máximo 3 botones
   */
  async sendButtons(to, bodyText, buttons) {
    return this.#send({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: bodyText },
        action: {
          buttons: buttons.slice(0, 3).map(b => ({
            type: "reply",
            reply: { id: b.id, title: b.title.slice(0, 20) },
          })),
        },
      },
    });
  }

  // ─── Enviar lista de opciones ──────────────────────────────────────────────
  /**
   * Envía un mensaje con lista desplegable de opciones.
   * Ideal para mostrar categorías de productos.
   * @param {string} to — Número del cliente
   * @param {string} bodyText — Texto del cuerpo
   * @param {string} buttonText — Texto del botón que abre la lista
   * @param {Array<{title: string, rows: Array<{id, title, description}>}>} sections
   */
  async sendList(to, bodyText, buttonText, sections) {
    return this.#send({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "interactive",
      interactive: {
        type: "list",
        body: { text: bodyText },
        action: {
          button: buttonText.slice(0, 20),
          sections: sections.map(s => ({
            title: s.title.slice(0, 24),
            rows: s.rows.slice(0, 10).map(r => ({
              id: r.id,
              title: r.title.slice(0, 24),
              description: (r.description || "").slice(0, 72),
            })),
          })),
        },
      },
    });
  }

  // ─── Request interno ───────────────────────────────────────────────────────
  async #send(body) {
    if (!this.isConfigured()) {
      throw new Error("WhatsApp Cloud API no configurado (faltan WA_PHONE_NUMBER_ID o WA_ACCESS_TOKEN)");
    }

    const url = body.status
      ? `${this.#baseUrl}/messages`   // markAsRead también va a /messages
      : `${this.#baseUrl}/messages`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.#accessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.error?.message || `HTTP ${res.status}`;
      throw new Error(`WhatsApp API: ${msg}`);
    }

    return res.json();
  }
}
