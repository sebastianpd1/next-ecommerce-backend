// controllers/productsController.js
import Product from "../models/Product.js";

/**
 * Normaliza payload de FileMaker (formato fijo que envías):
 * - KIT / MONO:
 *    - sku top-level "K-..." para kit, o sku vacío para mono
 *    - stock = Number(item.stock)
 * - VARIANTES:
 *    - productos: [{ sku, color, stock }]
 *    - sku canónico = productos[0].sku
 *    - stock = suma(productos[].stock)  (desactiva solo si TODAS están en 0)
 * - precio/stock forzados a Number (aceptan string)
 * - campos extra como "skuA" se ignoran
 */
function normalizeItem(item) {
  const topSku = (item?.sku ?? "").trim();
  const isKit = topSku.toUpperCase().startsWith("K-");

  // Variantes con stock propio
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

  // SKU canónico
  const canonicalSku = isKit ? topSku : (productos[0]?.sku ?? "").trim();

  if (!canonicalSku) {
    const t = item?.titulo || "(sin titulo)";
    throw new Error(
      `SKU requerido para "${t}": en KIT usar sku "K-...", en NO KIT usar productos[0].sku`
    );
  }

  // Precio
  const precioNum =
    typeof item?.precio === "number" ? item.precio : Number(item?.precio ?? 0);

  // Stock (activador único)
  const topStockRaw = item?.stock ?? 0;
  const topStock =
    typeof topStockRaw === "number" ? topStockRaw : Number(topStockRaw);

  const sumVariantes = productos.reduce(
    (s, v) => s + (Number(v?.stock) || 0),
    0
  );

  // Regla:
  // - KIT / MONO: usa stock top-level
  // - VARIANTES: usa suma de variantes (desactiva solo si todas 0)
  const stock = productos.length > 0 && !isKit ? sumVariantes : topStock;

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

  return {
    id: item?.id ?? undefined,
    titulo: item?.titulo,
    modelo: item?.modelo ?? undefined,
    NroParte: item?.NroParte ?? undefined,
    marca: item?.marca ?? undefined,
    precio: Number.isFinite(precioNum) ? precioNum : 0,

    // clave de venta
    sku: canonicalSku,

    // activador único
    stock: Number.isFinite(stock) ? stock : 0,

    descripcion: item?.descripcion ?? undefined,

    // subtablas
    productos, // [{ sku, color, stock }]
    compatibles,
    fotos,
  };
}

/** Crea/actualiza productos (FileMaker) */
export const addProduct = async (req, res) => {
  try {
    const payload = req.body;

    if (Array.isArray(payload)) {
      const docs = payload.map(normalizeItem);
      const bulkOps = docs.map((doc) => ({
        updateOne: {
          filter: { titulo: doc.titulo },
          update: { $set: doc },
          upsert: true,
        },
      }));
      const result = await Product.bulkWrite(bulkOps, { ordered: false });
      return res.status(201).json({
        message: `Procesados ${
          (result.modifiedCount || 0) + (result.upsertedCount || 0)
        } productos.`,
        created: result.upsertedCount || 0,
        updated: result.modifiedCount || 0,
      });
    }

    const doc = normalizeItem(payload);
    const r = await Product.updateOne(
      { titulo: doc.titulo },
      { $set: doc },
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
    if (!include_out_of_stock) q.stock = { $gt: 0 }; // activo

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
    const filter = include_out_of_stock ? base : { ...base, stock: { $gt: 0 } };

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
