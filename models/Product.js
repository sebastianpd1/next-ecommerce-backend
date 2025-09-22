// models/Product.js
import mongoose from "mongoose";

const compatibleSchema = new mongoose.Schema(
  { sku: String, marca: String, impresora: String, categoria: String },
  { _id: false }
);

// Variantes (no-kit) con stock propio
const varianteSchema = new mongoose.Schema(
  {
    sku: String,
    color: String,
    stock: { type: Number, default: 0 }, // <-- NUEVO: stock por variante
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    id: { type: String, index: true }, // id externo (FM/ML)
    titulo: { type: String, required: true },
    modelo: String,
    NroParte: String,
    marca: String,
    precio: Number,

    // SKU canónico:
    // - KIT  => top-level (ej: "K-HP310X4")
    // - NO KIT => productos[0].sku (primera variante)
    sku: { type: String, index: true },

    // Activador único (0 => desactivado):
    // - KIT / MONO: viene de item.stock (FM)
    // - VARIANTES: suma(productos[].stock)
    stock: { type: Number, default: 0 },

    descripcion: String,

    // Variantes (solo no-kit)
    productos: { type: [varianteSchema], default: [] },

    // Compatibilidades
    compatibles: { type: [compatibleSchema], default: [] },

    // Fotos
    fotos: { type: [String], default: [] },
  },
  { timestamps: true }
);

// Índices útiles
productSchema.index({ stock: 1 });
productSchema.index({ NroParte: 1 });
productSchema.index({ "compatibles.sku": 1 });
productSchema.index({ "compatibles.impresora": 1 });
productSchema.index({ "compatibles.marca": 1 });
productSchema.index({ "productos.sku": 1 });
productSchema.index({ marca: 1 });

export default mongoose.models.Product ||
  mongoose.model("Product", productSchema);
