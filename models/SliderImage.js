import mongoose from "mongoose";

const sliderImageSchema = new mongoose.Schema(
  {
    fmId: { type: String, required: true, unique: true },
    imageUrl: { type: String, required: true },
    title: String,
    caption: String,
    linkUrl: String,
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ❌ sin índices extra

export default mongoose.model("SliderImage", sliderImageSchema);
