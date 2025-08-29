import express from "express";
import {
  addSliderImages,
  getSliderImages,
} from "../controllers/sliderController.js";
import { requireApiKey } from "../middleware/auth.js";

const router = express.Router();

// Si quieres ocultar el slider hasta que lo consumas vía SSR, también protégelo
router.get("/", getSliderImages);
router.post("/", requireApiKey, addSliderImages);

export default router;
