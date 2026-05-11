import express from "express";
import { ordersService } from "../orders-service.js";
import { PaymentService, PROVINCIAS_TARIFAS } from "../payments-service.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { clientData, cartData, totalKg, totalAmount } = req.body;
    
    if (!clientData || !clientData.phone) {
      return res.status(400).json({ error: "Missing client data" });
    }

    // 1. Calcular costo de envío inicial
    const province = clientData.province || "Mendoza";
    let shippingCost = PROVINCIAS_TARIFAS[province] || PROVINCIAS_TARIFAS["Otro"];

    // 2. Aplicar lógica de Envío Gratis
    // Regla: 10kg+ Y >$400k Y (es primera compra - esto lo valida el service)
    const isFreeShippingEligible = (totalKg >= 10 && totalAmount >= 400000);
    
    // Procesamos la orden en el servicio
    const order = await ordersService.processOrder(clientData, cartData, totalKg || 0, totalAmount);
    
    // Si el servicio confirma que es envío gratis (porque es 1ra compra)
    if (order.shippingStatus === "GRATIS" || (isFreeShippingEligible && order.isFirstOrder)) {
      shippingCost = 0;
    }

    // 3. Crear preferencia de Mercado Pago
    const payment = await PaymentService.createPreference({
      items: cartData,
      client: clientData,
      shippingCost: shippingCost,
      orderId: order.id
    });

    res.json({ 
      ok: true, 
      order,
      paymentUrl: payment.init_point,
      preferenceId: payment.id,
      shippingCost
    });
  } catch (err) {
    console.error("[ORDERS API]", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
