// routes/pay.mercadopago.js
import express from "express";
import fetch from "node-fetch";
import { requireApiKey } from "../middleware/auth.js";

const router = express.Router();

// POST /api/pay/mercadopago/preference
// Body mínimo (temporal, hasta que definamos Order y validación de precios):
// { items: [{ title, quantity, unit_price, currency_id, sku? }], back_urls?: { success, pending, failure }, orderRef?: "string" }
router.post("/preference", requireApiKey, async (req, res) => {
  try {
    const { items = [], back_urls, orderRef } = req.body || {};
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ error: "items requerido" });

    // TODO (cuando definas Order): recalcular precios a partir de tu BD por SKU/ID; NO confiar en unit_price del cliente.
    // Por ahora, pasamos los items tal cual para poder probar el flujo end-to-end.

    const payload = {
      items,
      external_reference: orderRef || `ref_${Date.now()}`,
      auto_return: "approved",
      back_urls: back_urls || {
        success: `${
          process.env.PUBLIC_SITE_URL || "https://tu-sitio"
        }/pago/exito`,
        pending: `${
          process.env.PUBLIC_SITE_URL || "https://tu-sitio"
        }/pago/pendiente`,
        failure: `${
          process.env.PUBLIC_SITE_URL || "https://tu-sitio"
        }/pago/error`,
      },
      notification_url: `${process.env.PUBLIC_BACKEND_URL}/api/webhooks/mercadopago`, // debe ser pública
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

    // init_point (prod) o sandbox_init_point (test)
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
