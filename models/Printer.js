// models/Printer.js
import mongoose from "mongoose";

const printerSchema = new mongoose.Schema(
  {
    fmId: { type: String, required: true, unique: true }, // <- ID serial de FileMaker
    marca: { type: String, required: true },
    modelo: { type: String, required: true },
    tipo: String,
    condicion: String,
    duplex: Boolean,
    red: Boolean,
    precio: Number,
    voltage: String,
    scanner: Boolean,
    velocidad: String, // ej: "30 ppm"
    toner: String,
    drum: String,
    rendimiento: String, // ej: "1500 páginas"
    garantia: String, // ej: "6 meses"
    stock: Number,
    foto: String, // o [String] si necesitas varias
  },
  { timestamps: true }
);

export default mongoose.model("Printer", printerSchema);
