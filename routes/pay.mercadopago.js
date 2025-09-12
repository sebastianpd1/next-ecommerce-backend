// routes/pay.mercadopago.js
import express from "express";
import { requireApiKey } from "../middleware/auth.js";

const router = express.Router();

// POST /api/pay/mercadopago/preference
router.post("/preference", requireApiKey, async (req, res) => {
  try {
    const { items = [], back_urls, orderRef } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items requerido" });
    }

    const payload = {
      items,
      external_reference: orderRef || `ref_${Date.now()}`,
      auto_return: "approved",
      back_urls: back_urls || {
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
    return res.json({
      redirectUrl,
      preferenceId: mpJson.id,
      external_reference: payload.external_reference,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
