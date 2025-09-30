// routes/orders.js
import express from "express";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import { createOrder, listOrders } from "../controllers/ordersController.js";
import { requireApiKey } from "../middleware/auth.js";

const router = express.Router();

// POST /api/orders (privado)
router.post("/", requireApiKey, createOrder);

// GET /api/orders (privado listado)
router.get("/", requireApiKey, listOrders);

// GET /api/orders/:id  (público, solo lectura)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "id inválido" });
    }
    const order = await Order.findById(id).lean();
    if (!order) return res.status(404).json({ error: "no encontrada" });

    const totals = order.totals || {
      currency: order.currency || "CLP",
      total: order.total || 0,
      subtotal: order.total || 0,
      items:
        Array.isArray(order.lines)
          ? order.lines.reduce((sum, line) => sum + (Number(line?.qty) || 0), 0)
          : 0,
    };

    const items = Array.isArray(order.items) && order.items.length
      ? order.items
      : Array.isArray(order.lines)
      ? order.lines.map((line) => ({
          sku: line?.sku,
          title: line?.title,
          qty: line?.qty,
          price: line?.price,
          subtotal: Number(line?.qty || 0) * Number(line?.price || 0),
        }))
      : [];

    return res.json({
      id: order._id,
      status: order.status,
      totals,
      items,
      customer: order.customer || order.shipping?.customer || {},
      delivery: order.delivery || order.shipping || {},
      documentType: order.documentType || order.customer?.documentType,
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
