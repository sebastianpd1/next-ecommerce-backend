import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    fmId: { type: String, required: true, unique: true }, // <- ID serial de FileMaker
    text: { type: String, required: true },
    startsAt: { type: Date, default: Date.now },
    endsAt: { type: Date },
    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },
  },
  { timestamps: true }
);

announcementSchema.index({ isActive: 1, startsAt: 1, endsAt: 1 });

export default mongoose.model("Announcement", announcementSchema);
