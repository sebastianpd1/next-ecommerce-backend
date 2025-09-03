import mongoose from "mongoose";

const compatibleSchema = new mongoose.Schema(
  {
    sku: String,
    marca: String,
    impresora: String,
    categoria: String,
  },
  { _id: false }
);

const itemSchema = new mongoose.Schema(
  {
    sku: String,
    stockRenca: Number,
    stockAgustinas: Number,
    color: String,
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    id: { type: String, index: true }, // id externo (ML, FM, etc.)
    titulo: { type: String, required: true },
    modelo: String,
    NroParte: String,
    marca: String,
    precio: Number,
    descripcion: String,

    productos: [itemSchema], // array de objetos (sin _id por ítem)
    compatibles: [compatibleSchema], // ahora objetos completos
    fotos: [String],
  },
  { timestamps: true }
);

/** Índices útiles **/
productSchema.index({ "productos.sku": 1 }); // búsqueda por SKU interno
productSchema.index({ NroParte: 1 }); // búsqueda por número de parte
productSchema.index({ "compatibles.sku": 1 }); // búsqueda por SKU compatible
productSchema.index({ "compatibles.impresora": 1 });
productSchema.index({ "compatibles.marca": 1 });
productSchema.index({ marca: 1 });

export default mongoose.model("Product", productSchema);
