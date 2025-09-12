// routes/webhooks.mercadopago.js
import express from "express";

const router = express.Router();

// ⚠️ Webhooks NO llevan x-api-key
router.post("/", async (req, res) => {
  try {
    const { type, data } = req.body || {};
    if (type !== "payment" || !data?.id) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    const r = await fetch(
      `https://api.mercadopago.com/v1/payments/${data.id}`,
      {
        headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
      }
    );
    const payment = await r.json();

    // TODO: actualizar tu orden por external_reference y estado
    // const status = payment.status; // approved | pending | rejected ...
    // const externalRef = payment.external_reference;

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("MP webhook error:", e);
    // responde 200 para evitar reintentos infinitos si ya procesaste
    return res.status(200).json({ ok: true });
  }
});

export default router;
