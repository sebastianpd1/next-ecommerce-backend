// models/Order.js
import mongoose from "mongoose";

const LineSchema = new mongoose.Schema(
  {
    sku: { type: String, trim: true },
    title: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const CustomerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    rut: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    documentType: {
      type: String,
      enum: ["boleta", "factura"],
      default: "boleta",
    },
  },
  { _id: false }
);

const DeliverySchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: ["retiro", "despacho"],
      default: "retiro",
    },
    address: { type: String, trim: true },
  },
  { _id: false }
);

const TotalsSchema = new mongoose.Schema(
  {
    items: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "CLP", trim: true },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "cancelled"],
      default: "pending",
      set: (value) => {
        if (typeof value !== "string") return "pending";
        const normalized = value.trim().toLowerCase();
        if (normalized === "unpaid") return "pending";
        if (["pending", "paid", "failed", "cancelled"].includes(normalized)) {
          return normalized;
        }
        return "pending";
      },
    },
    items: { type: [LineSchema], default: [] },
    totals: { type: TotalsSchema, default: () => ({}) },
    customer: { type: CustomerSchema, required: true },
    delivery: { type: DeliverySchema, default: () => ({}) },
    documentType: {
      type: String,
      enum: ["boleta", "factura"],
      default: "boleta",
    },
    payment: {
      provider: String,
      mp: {
        id: String,
        status: String,
        raw: Object,
      },
    },
    meta: { type: Object, default: () => ({}) },
  },
  { timestamps: true }
);

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
