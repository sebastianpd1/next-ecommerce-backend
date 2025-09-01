// server.js
import express from "express";
import mongoose from "mongoose";

import productsRoutes from "./routes/products.js";
import printersRoutes from "./routes/printers.js";
import sliderRoutes from "./routes/sliders.js";
import announcementsRoutes from "./routes/announcements.js";

// importa los modelos que tienen índices definidos
import Product from "./models/Product.js";
import Printer from "./models/Printer.js";

const app = express();

// Body parser (sube el límite si mandas arrays grandes)
app.use(express.json({ limit: "10mb" }));

// Rutas
app.use("/api/products", productsRoutes);
app.use("/api/printers", printersRoutes);
app.use("/api/slider", sliderRoutes);
app.use("/api/announcements", announcementsRoutes);

// Healthcheck
app.get("/health", (_req, res) => res.status(200).send("ok"));

// ENV
const MONGO_URI = process.env.MONGO_URI; // IMPORTANTE: con nombre de DB en la URI
const PORT = process.env.PORT || 4000;

async function start() {
  try {
    if (!MONGO_URI) {
      console.error("❌ Falta MONGO_URI");
      process.exit(1);
    }

    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB conectado");

    // 🔧 Crear índices si la variable está activada
    if (process.env.BUILD_INDEXES === "true") {
      console.log("🔧 Creando índices...");
      await Promise.all([Product.syncIndexes(), Printer.syncIndexes()]);
      console.log("✅ Índices listos");
    }

    app.listen(PORT, () => console.log(`🚀 API escuchando en ${PORT}`));
  } catch (err) {
    console.error("❌ Error al iniciar servidor:", err);
    process.exit(1);
  }
}

start();
