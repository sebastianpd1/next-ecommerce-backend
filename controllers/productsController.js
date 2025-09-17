// controllers/productsController.js
import Product from "../models/Product.js";

/**
 * Normaliza el payload proveniente de FileMaker a nuestro modelo EXACTO:
 * - KIT: sku top-level "K-..." y cantidad top-level.
 * - NO KIT: variantes en productos[{ sku, color, cantidad }]; sku canónico = productos[0].sku.
 * - stock: KIT => cantidad; NO KIT => suma(variantes[].cantidad).
 * - precio/stock/cantidad forzados a Number.
 */
function normalizeItem(item) {
  const isKit =
    typeof item?.sku === "string" &&
    item.sku.trim().toUpperCase().startsWith("K-");

  // Variantes (no-kit): [{ sku, color, cantidad }]
  const productos = Array.isArray(item?.productos)
    ? item.productos
        .map((x) => {
          const sku = (x?.sku ?? "").trim();
          if (!sku) return null;
          const color = typeof x?.color === "string" ? x.color : undefined;
          const cantidad =
            typeof x?.cantidad === "number"
              ? x.cantidad
              : Number(x?.cantidad ?? 0);
          return {
            sku,
            ...(color ? { color } : {}),
            cantidad: Number.isFinite(cantidad) ? cantidad : 0,
          };
        })
        .filter(Boolean)
    : [];

  // SKU canónico
  const canonicalSku = isKit
    ? (item?.sku ?? "").trim()
    : (productos[0]?.sku ?? "").trim();

  if (!canonicalSku) {
    const t = item?.titulo || "(sin titulo)";
    throw new Error(
      `SKU requerido para "${t}": en KIT usar sku top-level "K-...", en NO KIT usar productos[0].sku`
    );
  }

  // Cantidades y stock calculado
  const cantidadTop =
    typeof item?.cantidad === "number"
      ? item.cantidad
      : Number(item?.cantidad ?? 0);
  const stockFromVariantes = productos.reduce(
    (s, v) => s + (Number(v?.cantidad) || 0),
    0
  );

  const stock = isKit
    ? Number.isFinite(cantidadTop)
      ? cantidadTop
      : 0
    : stockFromVariantes;

  // Precio
  const precioNum =
    typeof item?.precio === "number" ? item.precio : Number(item?.precio ?? 0);

  // Compatibilidades
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

    // Claves de venta / stock
    sku: canonicalSku,
    cantidad: isKit ? (Number.isFinite(cantidadTop) ? cantidadTop : 0) : 0,
    stock: Number.isFinite(stock) ? stock : 0,

    descripcion: item?.descripcion ?? undefined,

    // Subtablas
    productos, // variantes (no-kit)
    compatibles,

    fotos,
  };
}

/** Crea/actualiza productos (FileMaker) */
export const addProduct = async (req, res) => {
  try {
    const payload = req.body;

    // Array: bulk upsert por título
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

    // Uno: upsert por título
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
    if (!include_out_of_stock) q.stock = { $gt: 0 }; // activo = stock > 0 (kit o suma de variantes)

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
    const { titulo } = req.query; // ?titulo=...
    if (!titulo) return res.status(400).json({ message: "Falta titulo" });

    const r = await Product.deleteOne({ titulo });
    if (r.deletedCount === 0)
      return res.status(404).json({ message: "No encontrado" });

    return res.status(200).json({ message: "Producto borrado" });
  } catch {
    return res.status(500).json({ message: "Error al borrar producto" });
  }
};
