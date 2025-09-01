import express from "express";
import {
  addProduct,
  getProducts,
  deleteProduct,
} from "../controllers/productsController.js";
import { requireApiKey } from "../middleware/auth.js";

const router = express.Router();

router.post("/", requireApiKey, addProduct);
router.get("/", requireApiKey, getProducts);
router.delete("/", requireApiKey, deleteProduct);
export default router;
