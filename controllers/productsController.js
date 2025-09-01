// controllers/productsController.js
import Product from "../models/Product.js";

export const addProduct = async (req, res) => {
  try {
    const payload = req.body;

    // Array desde FileMaker: bulk upsert por titulo
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
    // Manejo elegante de índice único (E11000)
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

export const getProducts = async (req, res) => {
  try {
    const products = await Product.find().lean();
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener productos" });
  }
};
export const deleteProduct = async (req, res) => {
  try {
    const { titulo } = req.query; // ?titulo=...
    if (!titulo) return res.status(400).json({ message: "Falta titulo" });

    const r = await Product.deleteOne({ titulo });
    if (r.deletedCount === 0)
      return res.status(404).json({ message: "No encontrado" });

    res.status(200).json({ message: "Producto borrado" });
  } catch (e) {
    res.status(500).json({ message: "Error al borrar producto" });
  }
};

// // controllers/productsController.js
// import Product from "../models/Product.js";

// export const addProduct = async (req, res) => {
//   try {
//     const payload = req.body;

//     if (Array.isArray(payload)) {
//       // Si recibimos un array desde FileMaker
//       const result = await Product.insertMany(payload);
//       return res.status(201).json({
//         message: `Se guardaron ${result.length} productos correctamente.`,
//       });
//     }

//     // Si recibimos un solo producto
//     const newProduct = new Product(payload);
//     await newProduct.save();
//     res.status(201).json({ message: "Producto guardado correctamente." });
//   } catch (error) {
//     console.error("❌ Error al guardar producto:", error);
//     res.status(500).json({ message: "Error en el servidor", error });
//   }
// };

// export const getProducts = async (req, res) => {
//   try {
//     const products = await Product.find();
//     res.status(200).json(products);
//   } catch (error) {
//     res.status(500).json({ message: "Error al obtener productos", error });
//   }
// };
