import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    fmId: { type: String, required: true, unique: true },
    text: { type: String, required: true },
    startsAt: { type: Date, default: Date.now },
    endsAt: { type: Date },
    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ❌ sin índices extra

export default mongoose.model("Announcement", announcementSchema);
