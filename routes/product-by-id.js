// routes/product-by-id.js
import { Router } from "express";
import mongoose from "mongoose";
import Product from "../models/Product.js"; // si tu modelo está en otro directorio, ajusta la ruta

const router = Router();

/**
 * GET /api/products/:id
 * Acepta:
 *  - Mongo _id (ObjectId)
 *  - id externo (el que ves en Mongo: ej. "MLC2281779206")
 *
 * Devuelve: 200 { ...producto }  |  404 { error: 'not_found' }
 */
router.get("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;

    let doc = null;

    // 1) Si es ObjectId, intenta por _id
    if (mongoose.isValidObjectId(id)) {
      doc = await Product.findById(id).lean();
    }

    // 2) Si no se encontró, intenta por id externo
    if (!doc) {
      doc = await Product.findOne({ id }).lean();
    }

    if (!doc) return res.status(404).json({ error: "not_found" });
    return res.json(doc);
  } catch (e) {
    console.error("GET /api/products/:id error", e);
    return res.status(500).json({ error: "server_error" });
  }
});

export default router;
