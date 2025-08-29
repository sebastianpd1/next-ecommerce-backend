// server.js
import express from "express";
import mongoose from "mongoose";

import productsRoutes from "./routes/products.js";
import printersRoutes from "./routes/printers.js";
import sliderRoutes from "./routes/sliders.js";
import announcementsRoutes from "./routes/announcements.js";

const app = express();

// Body parser (sube el límite si mandas arrays grandes)
app.use(express.json({ limit: "10mb" }));

// Rutas
app.use("/api/products", productsRoutes);
app.use("/api/printers", printersRoutes);
app.use("/api/slider", sliderRoutes);
app.use("/api/announcements", announcementsRoutes);

// (Opcional) Healthcheck simple
app.get("/health", (_req, res) => res.status(200).send("ok"));

// ENV
const MONGO_URI = process.env.MONGO_URI; // p.ej. ...mongodb.net/ecommerce?...  (recomendado)
const MONGO_DB = process.env.MONGO_DB || ""; // opcional si prefieres pasar dbName aquí
const PORT = process.env.PORT || 4000;

async function start() {
  if (!MONGO_URI) {
    console.error("❌ Falta MONGO_URI en variables de entorno");
    process.exit(1);
  }

  // Conexión MongoDB
  if (MONGO_DB) {
    await mongoose.connect(MONGO_URI, { dbName: MONGO_DB });
  } else {
    await mongoose.connect(MONGO_URI); // si la URI ya trae el nombre de la DB (recomendado)
  }
  console.log("✅ Conectado a MongoDB");

  app.listen(PORT, () => {
    console.log(`🚀 API lista en http://localhost:${PORT}`);
  });
}

start();
