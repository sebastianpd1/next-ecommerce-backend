import express from "express";
import {
  addSliderImages,
  getSliderImages,
  deleteSliderImage,
} from "../controllers/sliderController.js";
import { requireApiKey } from "../middleware/auth.js";

const router = express.Router();

// Si quieres ocultar el slider hasta que lo consumas vía SSR, también protégelo
router.get("/", requireApiKey, getSliderImages);
router.post("/", requireApiKey, addSliderImages);
router.delete("/", requireApiKey, deleteSliderImage);

export default router;
