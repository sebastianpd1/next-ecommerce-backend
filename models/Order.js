// models/Order.js
import mongoose from "mongoose";

const LineSchema = new mongoose.Schema(
  {
    sku: String,
    title: { type: String, required: true },
    price: { type: Number, required: true }, // CLP
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["UNPAID", "PAID", "FAILED"],
      default: "UNPAID",
    },
    currency: { type: String, default: "CLP" },
    total: { type: Number, default: 0 },
    lines: { type: [LineSchema], default: [] },
    external_reference: String, // igual al _id en string
    payment: {
      provider: String, // "mercadopago"
      mp: {
        id: String,
        status: String,
        raw: Object,
      },
    },
    customer: { type: Object, default: {} },
    shipping: { type: Object, default: {} },
  },
  { timestamps: true }
);

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
