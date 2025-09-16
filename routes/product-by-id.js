// routes/product-by-id.js
import { Router } from "express";
import { requireApiKey } from "../middleware/auth.js";
import { getProductById } from "../controllers/productsController.js";

const router = Router();

// Ping de diagnóstico: GET /api/products/_ping
router.get("/_ping", requireApiKey, (_req, res) => {
  res.json({ ok: true, where: "/api/products/_ping" });
});

// DETALLE: GET /api/products/:id  (montado bajo /api/products)
router.get("/:id", requireApiKey, getProductById);

export default router;
