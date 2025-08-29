import express from "express";
import { addPrinters, getPrinters } from "../controllers/printersController.js";
import { requireApiKey } from "../middleware/auth.js";

const router = express.Router();

// Protege también GET para no exponer catálogo completo
router.get("/", getPrinters);
router.post("/", requireApiKey, addPrinters);

export default router;
