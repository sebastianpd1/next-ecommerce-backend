// models/Product.js
import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  id: String,
  titulo: String,
  modelo: String,
  NroParte: String,
  marca: String,
  precio: Number,
  descripcion: String,
  productos: [
    {
      sku: String,
      stockRenca: Number,
      stockAgustinas: Number,
      color: String,
    },
  ],
  fotos: [String],
});

const Product = mongoose.model("Product", productSchema);

export default Product;
