import express from "express";
import {
  addAnnouncements,
  getActiveAnnouncements,
  deleteAnnouncement,
} from "../controllers/announcementsController.js";
import { requireApiKey } from "../middleware/auth.js";

const router = express.Router();

// También protegido si no quieres que lo lean sin clave
router.get("/", getActiveAnnouncements);
router.post("/", requireApiKey, addAnnouncements);
router.delete("/", requireApiKey, deleteAnnouncement);

export default router;
