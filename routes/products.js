import express from "express";
import { addProduct, getProducts } from "../controllers/productsController.js";
import { requireApiKey } from "../middleware/auth.js";

const router = express.Router();

router.post("/", requireApiKey, addProduct);
router.get("/", getProducts);

export default router;
