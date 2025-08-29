// models/Product.js
import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    id: String, // opcional si te llega desde FileMaker
    titulo: { type: String, required: true }, // será único vía índice
    modelo: String,
    NroParte: String,
    marca: String,
    precio: Number,
    descripcion: String,
    productos: [
      {
        sku: String, // puede repetirse entre documentos
        stockRenca: Number,
        stockAgustinas: Number,
        color: String,
      },
    ],
    fotos: [String],
  },
  { timestamps: true }
);

// índice único por título
productSchema.index({ titulo: 1 }, { unique: true });

const Product = mongoose.model("Product", productSchema);
export default Product;

// // models/Product.js
// import mongoose from "mongoose";

// const productSchema = new mongoose.Schema({
//   id: String,
//   titulo: String,
//   modelo: String,
//   NroParte: String,
//   marca: String,
//   precio: Number,
//   descripcion: String,
//   productos: [
//     {
//       sku: String,
//       stockRenca: Number,
//       stockAgustinas: Number,
//       color: String,
//     },
//   ],
//   fotos: [String],
// });

// const Product = mongoose.model("Product", productSchema);

// export default Product;
