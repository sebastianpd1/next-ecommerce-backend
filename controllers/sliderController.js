import SliderImage from "../models/SliderImage.js";

export const addSliderImages = async (req, res) => {
  try {
    const payload = req.body;

    if (Array.isArray(payload)) {
      const ops = payload.map((item) => ({
        updateOne: {
          filter: { fmId: item.fmId },
          update: { $set: item },
          upsert: true,
        },
      }));
      const r = await SliderImage.bulkWrite(ops, { ordered: false });
      return res.status(201).json({
        message: `Procesadas ${r.modifiedCount + r.upsertedCount} imágenes.`,
        created: r.upsertedCount || 0,
        updated: r.modifiedCount || 0,
      });
    }

    const r = await SliderImage.updateOne(
      { fmId: payload.fmId },
      { $set: payload },
      { upsert: true }
    );
    res.status(201).json({
      message: r.upsertedCount ? "Imagen creada." : "Imagen actualizada.",
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res
        .status(409)
        .json({ message: "Slider duplicado (fmId ya existe)." });
    }
    console.error("❌ Error slider:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

export const getSliderImages = async (_req, res) => {
  try {
    const data = await SliderImage.find({ isActive: true })
      .sort({ order: 1 })
      .lean();
    res.status(200).json(data);
  } catch {
    res.status(500).json({ message: "Error al obtener slider" });
  }
};
export const deleteSliderImage = async (req, res) => {
  try {
    const { fmId } = req.query; // ?fmId=...
    if (!fmId) return res.status(400).json({ message: "Falta fmId" });

    const r = await SliderImage.deleteOne({ fmId });
    if (r.deletedCount === 0)
      return res.status(404).json({ message: "No encontrado" });

    res.status(200).json({ message: "Imagen de slider borrada" });
  } catch {
    res.status(500).json({ message: "Error al borrar slider" });
  }
};
