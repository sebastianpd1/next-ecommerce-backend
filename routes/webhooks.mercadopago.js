// routes/webhooks.mercadopago.js
import express from "express";
import Order from "../models/Order.js";

const router = express.Router();

// ⚠️ Webhooks NO llevan x-api-key
router.post("/", async (req, res) => {
  try {
    const { type, data } = req.body || {};
    if (type !== "payment" || !data?.id) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    // Consulta de pago
    const r = await fetch(
      `https://api.mercadopago.com/v1/payments/${data.id}`,
      {
        headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
      }
    );
    const payment = await r.json();

    const status = payment?.status; // approved | pending | rejected | ...
    const external_reference = payment?.external_reference;
    const paidAmount = Number(payment?.transaction_amount || 0);

    if (!external_reference)
      return res.status(200).json({ ok: true, noRef: true });

    const order = await Order.findById(external_reference);
    if (!order) return res.status(200).json({ ok: true, noOrder: true });

    // Idempotencia: si ya está PAID, solo confirma
    if (order.status === "PAID")
      return res.status(200).json({ ok: true, alreadyPaid: true });

    // Validación de monto (básica)
    if (status === "approved") {
      if (Math.round(order.total) !== Math.round(paidAmount)) {
        // Montos no cuadran → marca FAILED y guarda raw
        await Order.findByIdAndUpdate(order._id, {
          status: "FAILED",
          payment: {
            provider: "mercadopago",
            mp: { id: String(payment?.id || data.id), status, raw: payment },
          },
        });
        return res.status(200).json({ ok: true, mismatch: true });
      }

      // Marca PAID
      await Order.findByIdAndUpdate(order._id, {
        status: "PAID",
        payment: {
          provider: "mercadopago",
          mp: { id: String(payment?.id || data.id), status, raw: payment },
        },
      });

      // TODO: emitir DTE con TÜU aquí (services/tuu.js) y descontar stock
      // try { await issueDTE(order) } catch (e) { /* log */ }
    } else if (status === "rejected") {
      await Order.findByIdAndUpdate(order._id, {
        status: "FAILED",
        payment: {
          provider: "mercadopago",
          mp: { id: String(payment?.id || data.id), status, raw: payment },
        },
      });
    } else {
      // pending / in_process → solo guarda estado
      await Order.findByIdAndUpdate(order._id, {
        status: "UNPAID",
        payment: {
          provider: "mercadopago",
          mp: { id: String(payment?.id || data.id), status, raw: payment },
        },
      });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("MP webhook error:", e);
    return res.status(200).json({ ok: true });
  }
});

export default router;
