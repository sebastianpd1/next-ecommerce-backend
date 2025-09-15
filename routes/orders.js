// routes/orders.js
import express from "express";
import mongoose from "mongoose";
import Order from "../models/Order.js";

const router = express.Router();

// GET /api/orders/:id  (público: sin x-api-key; solo lectura)
router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: "id inválido" });
    const order = await Order.findById(id).lean();
    if (!order) return res.status(404).json({ error: "no encontrada" });
    // Sanitizar (no mandar raw completo si no quieres)
    return res.json({
      id: order._id,
      status: order.status,
      currency: order.currency,
      total: order.total,
      lines: order.lines,
      payment: {
        provider: order.payment?.provider,
        mp: { id: order.payment?.mp?.id, status: order.payment?.mp?.status },
      },
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
