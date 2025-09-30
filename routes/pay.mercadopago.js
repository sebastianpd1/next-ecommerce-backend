// routes/pay.mercadopago.js
import express from "express";
import mongoose from "mongoose";
import { requireApiKey } from "../middleware/auth.js";
import Order from "../models/Order.js";

const STATUS_PENDING = "pending";

const router = express.Router();

function escapeRx(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
async function findProductByTitle(title) {
  const col = mongoose.connection.collection("products");
  const rx = new RegExp(`^${escapeRx(title.trim())}$`, "i");
  return await col.findOne({ titulo: rx }); // usamos p.precio
}

// POST /api/pay/mercadopago/preference
// Body: { items:[{ title, qty, sku? }], customer?, shipping? }
router.post("/preference", requireApiKey, async (req, res) => {
  try {
    if (!process.env.MP_ACCESS_TOKEN) {
      return res.status(500).json({ error: "MP_ACCESS_TOKEN no configurado" });
    }
    const {
      items = [],
      customer: incomingCustomer = {},
      deliveryMethod,
      address,
      documentType,
      orderId,
      shipping = {},
      source,
    } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items requerido" });
    }

    // Resuelve líneas por TÍTULO (precio desde BD)
    const lines = [];
    for (const it of items) {
      const title = String(it?.title || "").trim();
      const qty = Number(it?.qty || 0);
      if (!title || !qty || qty < 1)
        return res.status(400).json({ error: "title/qty inválidos" });

      const p = await findProductByTitle(title);
      if (!p || typeof p.precio !== "number") {
        return res
          .status(400)
          .json({ error: `Título no encontrado o sin precio: ${title}` });
      }

      const lineSku =
        it.sku || (Array.isArray(p.productos) && p.productos[0]?.sku) || "";

      const price = p.precio;
      lines.push({
        sku: lineSku,
        title: p.titulo,
        price,
        qty,
        subtotal: price * qty,
      });
    }

    const total = lines.reduce((s, l) => s + l.subtotal, 0);

    const normalizedCustomer = {
      name: typeof incomingCustomer?.name === "string" ? incomingCustomer.name.trim() : "",
      rut: typeof incomingCustomer?.rut === "string" ? incomingCustomer.rut.trim() : "",
      phone: typeof incomingCustomer?.phone === "string" ? incomingCustomer.phone.trim() : "",
      email: typeof incomingCustomer?.email === "string" ? incomingCustomer.email.trim() : "",
      documentType: ["boleta", "factura"].includes(String(documentType || incomingCustomer?.documentType).toLowerCase())
        ? String(documentType || incomingCustomer?.documentType).toLowerCase()
        : "boleta",
    };

    const deliveryMethodNormalized = ["retiro", "despacho"].includes(String(deliveryMethod).toLowerCase())
      ? String(deliveryMethod).toLowerCase()
      : "retiro";
    const delivery = {
      method: deliveryMethodNormalized,
      address:
        deliveryMethodNormalized === "despacho" && typeof address === "string"
          ? address.trim()
          : "",
    };

    const totals = {
      items: lines.reduce((s, l) => s + l.qty, 0),
      subtotal: total,
      total,
      currency: "CLP",
    };

    const meta = {
      source: typeof source === "string" ? source : "web",
      shipping,
    };

    let persistedOrderId = null;
    if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
      const update = {
        status: STATUS_PENDING,
        items: lines,
        totals,
        customer: normalizedCustomer,
        delivery,
        documentType: normalizedCustomer.documentType,
        meta,
      };
      const updated = await Order.findByIdAndUpdate(orderId, update, { new: true });
      persistedOrderId = updated ? updated._id.toString() : null;
    }

    if (!persistedOrderId) {
      const order = await Order.create({
        status: STATUS_PENDING,
        items: lines,
        totals,
        customer: normalizedCustomer,
        delivery,
        documentType: normalizedCustomer.documentType,
        meta,
      });
      persistedOrderId = order._id.toString();
    }

    // Arma preference
    const mpItems = lines.map((l) => ({
      title: l.title,
      quantity: l.qty,
      unit_price: l.price,
      currency_id: "CLP",
    }));

    const payload = {
      items: mpItems,
      external_reference: persistedOrderId,
      auto_return: "approved",
      back_urls: {
        success: `${process.env.PUBLIC_SITE_URL}/pago/exito`,
        pending: `${process.env.PUBLIC_SITE_URL}/pago/pendiente`,
        failure: `${process.env.PUBLIC_SITE_URL}/pago/error`,
      },
      notification_url: `${process.env.PUBLIC_BACKEND_URL}/api/webhooks/mercadopago`,
    };

    const mpRes = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(payload),
      }
    );
    const mpJson = await mpRes.json();
    if (!mpRes.ok) return res.status(mpRes.status).json(mpJson);

    const redirectUrl = mpJson.init_point || mpJson.sandbox_init_point;
    return res.json({ redirectUrl, orderId: persistedOrderId, preferenceId: mpJson.id });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
