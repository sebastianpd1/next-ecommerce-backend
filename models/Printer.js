import mongoose from "mongoose";

const printerSchema = new mongoose.Schema(
  {
    fmId: { type: String, required: true, unique: true },
    marca: { type: String, required: true },
    modelo: { type: String, required: true },
    tipo: String,
    condicion: String,
    duplex: Boolean,
    red: Boolean,
    precio: Number,
    voltage: String,
    scanner: Boolean,
    velocidad: String,
    toner: String,
    drum: String,
    rendimiento: String,
    garantia: String,
    stock: Number,
    foto: String,
  },
  { timestamps: true }
);

/** Índices para impresoras **/
printerSchema.index({ marca: 1 });
printerSchema.index({ modelo: 1 });

export default mongoose.model("Printer", printerSchema);
