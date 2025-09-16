// routes/products.js
import express from "express";
import {
  addProduct,
  getProducts,
  deleteProduct,
} from "../controllers/productsController.js";
import { requireApiKey } from "../middleware/auth.js";

const router = express.Router();

router.post("/", requireApiKey, addProduct); // crear
router.get("/", requireApiKey, getProducts); // listar (stock > 0 por defecto)
router.delete("/", requireApiKey, deleteProduct); // eliminar

export default router;
