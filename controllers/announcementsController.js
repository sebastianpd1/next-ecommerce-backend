import Announcement from "../models/Announcement.js";

export const addAnnouncements = async (req, res) => {
  try {
    const payload = req.body;

    if (Array.isArray(payload)) {
      const ops = payload.map((a) => ({
        updateOne: {
          filter: { fmId: a.fmId },
          update: { $set: a },
          upsert: true,
        },
      }));
      const r = await Announcement.bulkWrite(ops, { ordered: false });
      return res.status(201).json({
        message: `Procesados ${r.modifiedCount + r.upsertedCount} anuncios.`,
        created: r.upsertedCount || 0,
        updated: r.modifiedCount || 0,
      });
    }

    const r = await Announcement.updateOne(
      { fmId: payload.fmId },
      { $set: payload },
      { upsert: true }
    );
    res.status(201).json({
      message: r.upsertedCount ? "Anuncio creado." : "Anuncio actualizado.",
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res
        .status(409)
        .json({ message: "Anuncio duplicado (fmId ya existe)." });
    }
    console.error("❌ Error anuncios:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

export const getActiveAnnouncements = async (_req, res) => {
  try {
    const now = new Date();
    const data = await Announcement.find({
      isActive: true,
      $or: [{ startsAt: { $lte: now } }, { startsAt: { $exists: false } }],
      $or: [
        { endsAt: { $gte: now } },
        { endsAt: { $exists: false } },
        { endsAt: null },
      ],
    })
      .sort({ priority: -1, startsAt: -1 })
      .lean();

    res.status(200).json(data);
  } catch {
    res.status(500).json({ message: "Error al obtener anuncios" });
  }
};
export const deleteAnnouncement = async (req, res) => {
  try {
    const { fmId } = req.query; // ?fmId=...
    if (!fmId) return res.status(400).json({ message: "Falta fmId" });

    const r = await Announcement.deleteOne({ fmId });
    if (r.deletedCount === 0)
      return res.status(404).json({ message: "No encontrado" });

    res.status(200).json({ message: "Anuncio borrado" });
  } catch {
    res.status(500).json({ message: "Error al borrar anuncio" });
  }
};
