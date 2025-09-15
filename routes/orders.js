// routes/orders.js
import express from "express";
import mongoose from "mongoose";
import Order from "../models/Order.js";

const router = express.Router();

// GET /api/orders/:id  (público, solo lectura)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "id inválido" });
    }
    const order = await Order.findById(id).lean();
    if (!order) return res.status(404).json({ error: "no encontrada" });

    return res.json({
      id: order._id,
      status: order.status,
      currency: order.currency,
      total: order.total,
      lines: order.lines || [],
      payment: {
        provider: order?.payment?.provider,
        id: order?.payment?.mp?.id,
        status: order?.payment?.mp?.status,
      },
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
