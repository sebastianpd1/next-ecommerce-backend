// routes/webhooks.mercadopago.js
import express from "express";
import crypto from "crypto";
import Order from "../models/Order.js";
import Product from "../models/Product.js";

const STATUS_PENDING = "pending";
const STATUS_PAID = "paid";
const STATUS_FAILED = "failed";
const STATUS_CANCELLED = "cancelled";

async function deductStock(orderItems) {
  if (!Array.isArray(orderItems) || orderItems.length === 0) return;

  for (const item of orderItems) {
    const sku = typeof item?.sku === "string" ? item.sku.trim() : "";
    const qtyRaw = Number(item?.qty);
    const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 0;
    if (!sku || qty <= 0) continue;

    const product = await Product.findOne({
      $or: [{ sku }, { "productos.sku": sku }],
    });
    if (!product) continue;

    let updated = false;

    if (Array.isArray(product.productos) && product.productos.length) {
      const idx = product.productos.findIndex((v) => v?.sku === sku);
      if (idx >= 0) {
        const current = Number(product.productos[idx]?.stock) || 0;
        product.productos[idx].stock = Math.max(0, current - qty);
        updated = true;
      }

      const sum = product.productos.reduce(
        (total, variant) => total + (Number(variant?.stock) || 0),
        0
      );
      product.stock = sum;
    }

    if (!updated) {
      const current = Number(product.stock) || 0;
      product.stock = Math.max(0, current - qty);
      updated = true;
    }

    if (updated) {
      await product.save();
    }
  }
}

const router = express.Router();

function parseSignatureHeader(header) {
  if (!header || typeof header !== "string") return {};
  return header.split(/[;,]/).reduce((acc, part) => {
    const [rawKey, rawValue] = part.split("=");
    if (!rawKey || !rawValue) return acc;
    const key = rawKey.trim().toLowerCase();
    const value = rawValue.trim().replace(/^"|"$/g, "");
    if (key) acc[key] = value;
    return acc;
  }, {});
}

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function computeHmac(secret, base) {
  return crypto.createHmac("sha256", secret).update(base, "utf8").digest("hex");
}

function isValidSignature({ signatureHeader, secret, rawBody }) {
  if (!secret || !signatureHeader) return false;
  const parsed = parseSignatureHeader(signatureHeader);
  const ts = parsed.ts || parsed.timestamp;
  const requestId = parsed.id || parsed["request-id"];
  const provided = (parsed.v1 || parsed.signature || parsed.sig || "").toLowerCase();
  if (!provided || !ts) return false;

  const candidates = new Set();
  const body = rawBody || "";
  candidates.add(`${ts}.${body}`);
  if (requestId) {
    candidates.add(`${ts}.${requestId}.${body}`);
    candidates.add(`${requestId}.${ts}.${body}`);
  }
  candidates.add(body);

  for (const base of candidates) {
    const expected = computeHmac(secret, base);
    if (timingSafeEqual(provided, expected)) {
      return true;
    }
  }
  return false;
}

// ⚠️ Webhooks NO llevan x-api-key
router.post("/", async (req, res) => {
  try {
    const secret = process.env.MP_WEBHOOK_SECRET;
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";
    const signatureHeader = req.header("x-mp-signature") || req.header("x-meli-signature");

    if (!secret) {
      console.error("MP_WEBHOOK_SECRET no configurado: rechazada la petición de webhook");
      return res.status(500).json({ ok: false, error: "configuracion invalida" });
    }

    if (!isValidSignature({ signatureHeader, secret, rawBody })) {
      console.warn("Firma de Mercado Pago inválida", { signatureHeader });
      return res.status(401).json({ ok: false, error: "firma invalida" });
    }

    let payload;
    try {
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch (err) {
      console.warn("JSON inválido en webhook de Mercado Pago", err);
      return res.status(400).json({ ok: false, error: "json invalido" });
    }

    const { type, data } = payload || {};
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

    const status = payment?.status; // approved | pending | rejected ...
    const external_reference = payment?.external_reference;
    const paidAmount = Number(payment?.transaction_amount || 0);

    if (!external_reference)
      return res.status(200).json({ ok: true, noRef: true });

    const order = await Order.findById(external_reference);
    if (!order) return res.status(200).json({ ok: true, noOrder: true });

    if (order.status === STATUS_PAID)
      return res.status(200).json({ ok: true, alreadyPaid: true });

    if (status === "approved") {
      const expectedTotal = Math.round(order.totals?.total || order.total || 0);
      if (expectedTotal !== Math.round(paidAmount)) {
        await Order.findByIdAndUpdate(order._id, {
          status: STATUS_FAILED,
          payment: {
            provider: "mercadopago",
            mp: { id: String(payment?.id || data.id), status, raw: payment },
          },
        });
        return res.status(200).json({ ok: true, mismatch: true });
      }

      await Order.findByIdAndUpdate(order._id, {
        status: STATUS_PAID,
        payment: {
          provider: "mercadopago",
          mp: { id: String(payment?.id || data.id), status, raw: payment },
        },
      });

      await deductStock(order.items || order.lines || []);
    } else if (status === "rejected") {
      await Order.findByIdAndUpdate(order._id, {
        status: STATUS_FAILED,
        payment: {
          provider: "mercadopago",
          mp: { id: String(payment?.id || data.id), status, raw: payment },
        },
      });
    } else {
      await Order.findByIdAndUpdate(order._id, {
        status: STATUS_PENDING,
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
