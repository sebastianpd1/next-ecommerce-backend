// controllers/productsController.js
import Product from "../models/Product.js";

/** Crea/actualiza productos (FM) */
export const addProduct = async (req, res) => {
  try {
    const payload = req.body;

    // Array desde FileMaker: bulk upsert por titulo (el payload debe traer 'sku' único)
    if (Array.isArray(payload)) {
      const bulkOps = payload.map((item) => ({
        updateOne: {
          filter: { titulo: item.titulo },
          update: { $set: item },
          upsert: true,
        },
      }));

      const result = await Product.bulkWrite(bulkOps, { ordered: false });

      return res.status(201).json({
        message: `Procesados ${
          result.modifiedCount + result.upsertedCount
        } productos.`,
        created: result.upsertedCount || 0,
        updated: result.modifiedCount || 0,
      });
    }

    // Un solo producto: upsert por titulo
    const r = await Product.updateOne(
      { titulo: payload.titulo },
      { $set: payload },
      { upsert: true }
    );

    return res.status(201).json({
      message: r.upsertedCount ? "Producto creado." : "Producto actualizado.",
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        message: "Título duplicado: ya existe un producto con ese título.",
        keyValue: error.keyValue,
      });
    }
    console.error("❌ Error al guardar producto:", error);
    return res.status(500).json({ message: "Error en el servidor" });
  }
};

/** Listado — por defecto solo productos con stock > 0 */
export const getProducts = async (req, res) => {
  try {
    const {
      sku,
      NroParte,
      printerFmId,
      limit = 48,
      include_out_of_stock,
    } = req.query;

    const q = {};
    if (sku) q.sku = sku; // ahora es campo plano
    if (NroParte) q.NroParte = NroParte;
    if (printerFmId) q.compatibles = printerFmId; // se mantiene tu filtro existente
    if (!include_out_of_stock) q.stock = { $gt: 0 }; // activo = stock > 0

    const lim = Math.min(parseInt(limit, 10) || 48, 5000);

    const products = await Product.find(q)
      .sort({ updatedAt: -1 })
      .limit(lim)
      .lean();

    return res.status(200).json(products);
  } catch (error) {
    return res.status(500).json({ message: "Error al obtener productos" });
  }
};

/** Detalle por id externo — por defecto solo si stock > 0 */
export const getProductById = async (req, res) => {
  try {
    const { include_out_of_stock } = req.query;
    const { id } = req.params;

    const base = { id: String(id) };
    const filter = include_out_of_stock ? base : { ...base, stock: { $gt: 0 } };

    const doc = await Product.findOne(filter).lean();
    if (!doc) return res.status(404).json({ error: "no encontrado" });

    return res.status(200).json(doc);
  } catch (e) {
    return res.status(500).json({ message: "Error al obtener producto" });
  }
};

/** Borrado por título */
export const deleteProduct = async (req, res) => {
  try {
    const { titulo } = req.query; // ?titulo=...
    if (!titulo) return res.status(400).json({ message: "Falta titulo" });

    const r = await Product.deleteOne({ titulo });
    if (r.deletedCount === 0)
      return res.status(404).json({ message: "No encontrado" });

    return res.status(200).json({ message: "Producto borrado" });
  } catch (e) {
    return res.status(500).json({ message: "Error al borrar producto" });
  }
};
