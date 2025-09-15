// routes/public.tracking.js
import express from "express";
import mongoose from "mongoose";

const router = express.Router();

// GET /api/public/tracking?rut=XXXXXXXXX&phone=+56912345678
router.get("/", async (req, res) => {
  try {
    let { rut = "", phone = "" } = req.query || {};
    rut = String(rut).replace(/[.\-]/g, "").toUpperCase(); // 12345678K
    phone = String(phone).replace(/\D/g, ""); // solo dígitos

    if (!rut && !phone)
      return res.status(400).json({ error: "rut o phone requerido" });

    const col = mongoose.connection.collection("orders");
    const filter = {};
    if (rut) filter["customer.rut"] = rut;
    if (phone) filter["customer.phone"] = new RegExp(`${phone}$`); // coincide por últimos dígitos

    const docs = await col
      .find(filter, {
        projection: {
          status: 1,
          currency: 1,
          total: 1,
          createdAt: 1,
          "lines.sku": 1,
          "lines.qty": 1,
          "lines.title": 1,
          "payment.mp.status": 1,
        },
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    const orders = docs.map((o) => ({
      id: o._id,
      status: o.status,
      currency: o.currency,
      total: o.total,
      createdAt: o.createdAt,
      paymentStatus: o?.payment?.mp?.status,
      lines: (o.lines || []).map((l) => ({
        sku: l.sku,
        qty: l.qty,
        title: l.title,
      })),
    }));

    return res.json({ orders });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
