// routes/webhooks.mercadopago.js
import express from "express";
import fetch from "node-fetch";

const router = express.Router();

// ⚠️ Webhooks NO llevan x-api-key
router.post("/", async (req, res) => {
  try {
    // MP envía distintas formas; la más común en payments:
    // { type: "payment", data: { id: "PAYMENT_ID" } }
    const { type, data } = req.body || {};
    if (type !== "payment" || !data?.id) {
      // También puede llegar topic/action con query params; si necesitas, maneja GET.
      return res.status(200).json({ ok: true, ignored: true });
    }

    // Consultar detalle de pago
    const payRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${data.id}`,
      {
        headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
      }
    );
    const payment = await payRes.json();

    // Estado
    const status = payment.status; // approved | pending | rejected | in_process ...
    const externalRef = payment.external_reference; // el que mandamos en preference
    const total = payment.transaction_amount;

    // TODO: aquí marca tu orden:
    // - findByExternalRef(externalRef)
    // - si status === "approved": set PAID, emitir DTE (TÜU/Haulmer), descontar stock, enviar a FileMaker
    // - si rejected/pending: actualizar estado
    console.log("[MP webhook]", { status, externalRef, id: data.id, total });

    return res.status(200).json({ ok: true });
  } catch (e) {
    // Importante responder 200 siempre que sea posible para evitar reintentos masivos si ya procesaste
    console.error("MP webhook error:", e);
    return res.status(200).json({ ok: true });
  }
});

export default router;
