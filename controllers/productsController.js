// controllers/productsController.js
import Product from "../models/Product.js";

/**
 * Normaliza el payload proveniente de FileMaker a nuestro modelo:
 * - sku: si hay auxiliar (item.sku y no es el placeholder) úsalo; si no, usa productos[0].sku.
 * - productos: mapea kitsPivot a [{ sku, color }] filtrando vacíos.
 * - compatibles: mantiene [{ sku, marca, impresora, categoria }] (sin tocar otras props).
 * - stock/precio: fuerza a Number (acepta "2" como string).
 */
function normalizeItem(item) {
  const AUX_PLACEHOLDER = "SKU_AUXILIAR_KITS_SI_NO_ES_KIT_ESTO_VACIO";

  const auxSkuRaw = (item?.sku ?? "").trim();
  const auxSku = auxSkuRaw && auxSkuRaw !== AUX_PLACEHOLDER ? auxSkuRaw : "";

  const productos = Array.isArray(item?.productos)
    ? item.productos
        .map((x) => {
          const sku = (x?.sku ?? "").trim();
          const color = typeof x?.color === "string" ? x.color : undefined;
          return sku ? { sku, ...(color ? { color } : {}) } : null;
        })
        .filter(Boolean)
    : [];

  const canonicalSku = auxSku || productos[0]?.sku || "";
  if (!canonicalSku) {
    const t = item?.titulo || "(sin titulo)";
    throw new Error(
      `SKU requerido para "${t}": envía sku auxiliar o productos[0].sku`
    );
  }

  const stockNum =
    typeof item?.stock === "number" ? item.stock : Number(item?.stock ?? 0);
  const precioNum =
    typeof item?.precio === "number" ? item.precio : Number(item?.precio ?? 0);

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

    // stock global (activo si > 0)
    stock: Number.isFinite(stockNum) ? stockNum : 0,

    descripcion: item?.descripcion ?? undefined,

    // subtablas
    productos, // kitsPivot normalizado
    compatibles, // compatibilidades (no se usan para el checkout)

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

/** Listado — por defecto solo productos con stock > 0 */
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
    if (sku) q.sku = sku; // campo top-level
    if (NroParte) q.NroParte = NroParte; // índice existente
    if (printerFmId) q["compatibles.impresora"] = printerFmId; // usa índice compatibilidades
    if (!include_out_of_stock) q.stock = { $gt: 0 }; // activo = stock > 0

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
