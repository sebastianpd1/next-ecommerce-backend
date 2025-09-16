// models/Product.js
import mongoose from "mongoose";

const compatibleSchema = new mongoose.Schema(
  { sku: String, marca: String, impresora: String, categoria: String },
  { _id: false }
);

// Ítems: solo SKU (y opcionalmente color). SIN stocks por sucursal.
const itemSchema = new mongoose.Schema(
  { sku: String, color: String },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    id: { type: String, index: true },         // id externo (FM/ML)
    titulo: { type: String, required: true },
    modelo: String,
    NroParte: String,
    marca: String,
    precio: Number,

    /** ÚNICO stock global (controlado por FileMaker) */
    stock: { type: Number, default: 0 },

    descripcion: String,
    productos: [itemSchema],
    compatibles: [compatibleSchema],
    fotos: [String],
  },
  { timestamps: true }
);

// Índices útiles
productSchema.index({ stock: 1 });
productSchema.index({ "productos.sku": 1 });
productSchema.index({ NroParte: 1 });
productSchema.index({ "compatibles.sku": 1 });
productSchema.index({ "compatibles.impresora": 1 });
productSchema.index({ "compatibles.marca": 1 });
productSchema.index({ marca: 1 });

export default mongoose.models.Product || mongoose.model("Product", productSchema);