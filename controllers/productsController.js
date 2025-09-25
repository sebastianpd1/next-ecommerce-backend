// controllers/productsController.js
import Product from "../models/Product.js";

/**
 * Normaliza payload de FileMaker (formato fijo que envías):
 * - KIT (sku "K-...") => mantiene sku/stock top-level tal como llegan.
 * - Producto simple (una sola variante en productos[]) => promote sku/stock de esa variante al top-level.
 * - Producto con variantes (productos[].length > 1) => sku/stock solo a nivel variante; top-level queda sin campos.
 * - precio/stock forzados a Number (aceptan string).
 */
function normalizeItem(item) {
  const topSku = (item?.sku ?? "").trim();
  const isKit = topSku.toUpperCase().startsWith("K-");

  // Variantes con stock propio (si llega vacío, queda [])
  const productos = Array.isArray(item?.productos)
    ? item.productos
        .map((x) => {
          const sku = (x?.sku ?? "").trim();
          if (!sku) return null;
          const color = typeof x?.color === "string" ? x.color : undefined;
          const vStockRaw = x?.stock ?? 0; // FM manda "1" o number
          const vStock =
            typeof vStockRaw === "number" ? vStockRaw : Number(vStockRaw);
          return {
            sku,
            ...(color ? { color } : {}),
            stock: Number.isFinite(vStock) ? vStock : 0,
          };
        })
        .filter(Boolean)
    : [];

  const hasSingleVariant = productos.length === 1;
  const hasMultipleVariants = productos.length > 1;

  // Precio
  const precioNum =
    typeof item?.precio === "number" ? item.precio : Number(item?.precio ?? 0);

  // Stock top-level recibido
  const topStockRaw = item?.stock ?? 0;
  const topStock =
    typeof topStockRaw === "number" ? topStockRaw : Number(topStockRaw);

  // Compatibilidades / fotos tal cual
  const compatibles = Array.isArray(item?.compatibles)
    ? item.compatibles.map((c) => ({
        sku: typeof c?.sku === "string" ? c.sku : undefined,
        marca: typeof c?.marca === "string" ? c.marca : undefined,
        impresora: typeof c?.impresora === "string" ? c.impresora : undefined,
        categoria: typeof c?.categoria === "string" ? c.categoria : undefined,
      }))
    : [];

  const fotos = Array.isArray(item?.fotos) ? item.fotos : [];

  const doc = {
    id: item?.id ?? undefined,
    titulo: item?.titulo,
    modelo: item?.modelo ?? undefined,
    NroParte: item?.NroParte ?? undefined,
    marca: item?.marca ?? undefined,
    precio: Number.isFinite(precioNum) ? precioNum : 0,
    descripcion: item?.descripcion ?? undefined,
    productos,
    compatibles,
    fotos,
  };

  const unset = {};

  if (isKit) {
    if (!topSku) {
      const t = item?.titulo || "(sin titulo)";
      throw new Error(
        `SKU requerido para "${t}": los kits deben traer sku "K-..." en el top-level`
      );
    }
    doc.sku = topSku;
    doc.stock = Number.isFinite(topStock) ? topStock : 0;
  } else if (hasSingleVariant) {
    const [variant] = productos;
    if (!variant?.sku) {
      const t = item?.titulo || "(sin titulo)";
      throw new Error(
        `SKU requerido para "${t}": la única variante debe incluir un sku`
      );
    }
    doc.sku = variant.sku;
    doc.stock = Number.isFinite(variant.stock) ? variant.stock : 0;
  } else if (hasMultipleVariants) {
    unset.sku = 1;
    unset.stock = 1;
  } else {
    // Producto sin variantes explícitas (mono sin arreglo) => usa top-level
    if (!topSku) {
      const t = item?.titulo || "(sin titulo)";
      throw new Error(
        `SKU requerido para "${t}": en productos simples usa sku top-level o variantes`
      );
    }
    doc.sku = topSku;
    doc.stock = Number.isFinite(topStock) ? topStock : 0;
  }

  return { doc, unset };
}

/** Crea/actualiza productos (FileMaker) */
export const addProduct = async (req, res) => {
  try {
    const payload = req.body;

    if (Array.isArray(payload)) {
      const entries = payload.map(normalizeItem);
      const bulkOps = entries.map(({ doc, unset }) => {
        const update = { $set: doc };
        if (unset && Object.keys(unset).length > 0) update.$unset = unset;
        return {
          updateOne: {
            filter: { titulo: doc.titulo },
            update,
            upsert: true,
          },
        };
      });
      const result = await Product.bulkWrite(bulkOps, { ordered: false });
      return res.status(201).json({
        message: `Procesados ${
          (result.modifiedCount || 0) + (result.upsertedCount || 0)
        } productos.`,
        created: result.upsertedCount || 0,
        updated: result.modifiedCount || 0,
      });
    }

    const { doc, unset } = normalizeItem(payload);
    const update = { $set: doc };
    if (unset && Object.keys(unset).length > 0) update.$unset = unset;
    const r = await Product.updateOne(
      { titulo: doc.titulo },
      update,
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
    return res
      .status(500)
      .json({ message: String(error?.message || "Error en el servidor") });
  }
};

/** Listado — por defecto solo productos activos (stock > 0) */
export const getProducts = async (req, res) => {
  try {
    const {
      sku,
      NroParte,
      printerFmId,
      limit = 12,
      include_out_of_stock,
    } = req.query;

    const q = {};
    if (sku) q.sku = sku; // canónico
    if (NroParte) q.NroParte = NroParte;
    if (printerFmId) q["compatibles.impresora"] = printerFmId;
    if (!include_out_of_stock) {
      q.$or = [{ stock: { $gt: 0 } }, { "productos.stock": { $gt: 0 } }];
    }

    const lim = Math.min(parseInt(limit, 10) || 12, 5000);

    const products = await Product.find(q)
      .sort({ updatedAt: -1 })
      .limit(lim)
      .lean();

    return res.status(200).json(products);
  } catch {
    return res.status(500).json({ message: "Error al obtener productos" });
  }
};

/** Detalle por id externo — por defecto solo si stock > 0 */
export const getProductById = async (req, res) => {
  try {
    const { include_out_of_stock } = req.query;
    const { id } = req.params;

    const base = { id: String(id) };
    const filter = include_out_of_stock
      ? base
      : {
          ...base,
          $or: [{ stock: { $gt: 0 } }, { "productos.stock": { $gt: 0 } }],
        };

    const doc = await Product.findOne(filter).lean();
    if (!doc) return res.status(404).json({ error: "no encontrado" });

    return res.status(200).json(doc);
  } catch {
    return res.status(500).json({ message: "Error al obtener producto" });
  }
};

/** Borrado por título */
export const deleteProduct = async (req, res) => {
  try {
    const { titulo } = req.query;
    if (!titulo) return res.status(400).json({ message: "Falta titulo" });

    const r = await Product.deleteOne({ titulo });
    if (r.deletedCount === 0)
      return res.status(404).json({ message: "No encontrado" });

    return res.status(200).json({ message: "Producto borrado" });
  } catch {
    return res.status(500).json({ message: "Error al borrar producto" });
  }
};
