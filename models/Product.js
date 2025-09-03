import mongoose from "mongoose";
const compatibleSchema = new mongoose.Schema(
  {
    sku: String,
    marca: String,
    impresora: String,
    categoria: String,
  },
  { _id: false } // para que no genere _id en cada compatible
);

const productSchema = new mongoose.Schema(
  {
    id: String,
    titulo: { type: String, required: true },
    modelo: String,
    NroParte: String,
    marca: String,
    precio: Number,
    descripcion: String,

    // igual que lo tenías: array de objetos con sku, stock, color...
    productos: [
      {
        sku: String,
        stockRenca: Number,
        stockAgustinas: Number,
        color: String,
      },
    ],

    // IDs de impresoras compatibles (fmId)
    compatibles: [compatibleSchema],

    fotos: [String],
  },
  { timestamps: true }
);

/** Índices necesarios **/
productSchema.index({ "productos.sku": 1 }); // búsqueda por SKU
productSchema.index({ NroParte: 1 }); // búsqueda por número de parte
productSchema.index({ compatibles: 1 }); // búsqueda por impresoras (multi-key)
productSchema.index({ marca: 1 }); // búsqueda por marca

export default mongoose.model("Product", productSchema);
