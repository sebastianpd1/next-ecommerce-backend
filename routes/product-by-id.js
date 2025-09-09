// routes/product-by-id.js
import { Router } from "express";
import mongoose from "mongoose";
import Product from "../models/Product.js";

const router = Router();

// mismo esquema de protección que el resto
function requireApiKey(req, res, next) {
  const key = req.header("x-api-key");
  if (!key || key !== process.env.API_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

// Ping de diagnóstico: GET /api/products/_ping
router.get("/_ping", requireApiKey, (_req, res) => {
  res.json({ ok: true, where: "/api/products/_ping" });
});

// DETALLE: GET /api/products/:id  (nota: usamos '/:id' porque se monta bajo '/api/products')
router.get("/:id", requireApiKey, async (req, res) => {
  try {
    const { id } = req.params;

    let doc = null;
    if (mongoose.isValidObjectId(id)) {
      doc = await Product.findById(id).lean();
    }
    if (!doc) {
      doc = await Product.findOne({ id }).lean(); // tu campo 'id' externo
    }

    if (!doc) return res.status(404).json({ error: "not_found" });
    return res.json(doc);
  } catch (err) {
    console.error("GET /api/products/:id error", err);
    return res.status(500).json({ error: "server_error" });
  }
});

export default router;
