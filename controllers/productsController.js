// controllers/productsController.js
import Product from "../models/Product.js";

export const addProduct = async (req, res) => {
  try {
    const payload = req.body;

    if (Array.isArray(payload)) {
      // Si recibimos un array desde FileMaker
      const result = await Product.insertMany(payload);
      return res.status(201).json({
        message: `Se guardaron ${result.length} productos correctamente.`,
      });
    }

    // Si recibimos un solo producto
    const newProduct = new Product(payload);
    await newProduct.save();
    res.status(201).json({ message: "Producto guardado correctamente." });
  } catch (error) {
    console.error("❌ Error al guardar producto:", error);
    res.status(500).json({ message: "Error en el servidor", error });
  }
};

export const getProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener productos", error });
  }
};
