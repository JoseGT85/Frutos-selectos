import { MercadoPagoConfig, Preference } from 'mercadopago';
import dotenv from 'dotenv';
dotenv.config();

// Configuración de Mercado Pago
const client = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN || 'TEST-YOUR-TOKEN-HERE' 
});

export const PROVINCIAS_TARIFAS = {
  "Mendoza": 0, // Por ser locales o base
  "Buenos Aires": 8500,
  "CABA": 8500,
  "Cordoba": 7500,
  "Santa Fe": 7500,
  "San Luis": 6000,
  "San Juan": 6000,
  "Otro": 9500
};

export class PaymentService {
  /**
   * Crea una preferencia de pago en Mercado Pago
   */
  static async createPreference(orderData) {
    const { items, client: clientInfo, shippingCost, orderId } = orderData;

    // 1. Mapear items del carrito al formato de MP
    const mpItems = items.map(item => ({
      id: item.id,
      title: item.name,
      unit_price: Number(item.price),
      quantity: Number(item.quantity),
      currency_id: 'ARS'
    }));

    // 2. Agregar el costo de envío como un item si existe
    if (shippingCost > 0) {
      mpItems.push({
        id: 'shipping',
        title: 'Costo de Envío (Andreani)',
        unit_price: Number(shippingCost),
        quantity: 1,
        currency_id: 'ARS'
      });
    }

    const preference = new Preference(client);

    const body = {
      items: mpItems,
      payer: {
        name: clientInfo.name,
        email: clientInfo.email || 'cliente@frutosselectos.com.ar',
        phone: {
          number: clientInfo.phone
        }
      },
      back_urls: {
        success: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout/success`,
        failure: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout/error`,
        pending: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout/pending`,
      },
      auto_return: 'approved',
      notification_url: `${process.env.WEBHOOK_URL}/api/payments/webhook`,
      external_reference: orderId,
    };

    try {
      const response = await preference.create({ body });
      return {
        id: response.id,
        init_point: response.init_point // Link de pago
      };
    } catch (error) {
      console.error('[MP] Error creando preferencia:', error);
      throw error;
    }
  }
}
