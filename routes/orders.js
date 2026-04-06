import express from "express";
import { ordersService } from "../orders-service.js";

const router = express.Router();

router.post("/", (req, res) => {
  try {
    const { clientData, cartData, totalKg } = req.body;
    if (!clientData || !clientData.phone) {
      return res.status(400).json({ error: "Missing client data" });
    }

    const order = ordersService.processOrder(clientData, cartData, totalKg || 0);
    res.json({ ok: true, order });
  } catch (err) {
    console.error("[ORDERS API]", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
