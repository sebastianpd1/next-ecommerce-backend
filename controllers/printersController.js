// controllers/printersController.js
import Printer from "../models/Printer.js";

export const addPrinters = async (req, res) => {
  try {
    const payload = req.body;

    if (Array.isArray(payload)) {
      const ops = payload.map((p) => ({
        updateOne: {
          filter: { fmId: p.fmId }, // buscamos por ID serial de FileMaker
          update: { $set: p },
          upsert: true,
        },
      }));
      const r = await Printer.bulkWrite(ops, { ordered: false });
      return res.status(201).json({
        message: `Procesadas ${r.modifiedCount + r.upsertedCount} impresoras.`,
        created: r.upsertedCount || 0,
        updated: r.modifiedCount || 0,
      });
    }

    // single
    const r = await Printer.updateOne(
      { fmId: payload.fmId },
      { $set: payload },
      { upsert: true }
    );
    return res.status(201).json({
      message: r.upsertedCount ? "Impresora creada." : "Impresora actualizada.",
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        message: "Impresora duplicada (fmId ya existe).",
        keyValue: error.keyValue,
      });
    }
    console.error("❌ Error impresoras:", error);
    return res.status(500).json({ message: "Error en el servidor" });
  }
};

export const getPrinters = async (req, res) => {
  try {
    const data = await Printer.find().lean();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener impresoras" });
  }
};
export const deletePrinter = async (req, res) => {
  try {
    const { fmId } = req.query; // ?fmId=...
    if (!fmId) return res.status(400).json({ message: "Falta fmId" });

    const r = await Printer.deleteOne({ fmId });
    if (r.deletedCount === 0)
      return res.status(404).json({ message: "No encontrado" });

    res.status(200).json({ message: "Impresora borrada" });
  } catch {
    res.status(500).json({ message: "Error al borrar impresora" });
  }
};
