import express from "express";
import cors from "cors";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";

console.log("Iniciando servidor...");

const app = express();
const PORT = process.env.PORT || 3001;

const adapter = new JSONFile("db.json");
const db = new Low(adapter, { products: [] });

await db.read();

app.use(cors());
app.use(express.json());

app.get("/api/products", async (req, res) => {
  await db.read();
  res.json(db.data.products);
});

app.get("/api/products/:id", async (req, res) => {
  const { id } = req.params;
  await db.read();
  const product = db.data.products.find((p) => p.id === id);
  if (product) res.json(product);
  else res.status(404).json({ error: "Producto no encontrado" });
});

app.post("/sync", async (req, res) => {
  const incomingProducts = req.body;

  if (!Array.isArray(incomingProducts)) {
    return res
      .status(400)
      .json({ error: "Formato inválido, debe ser un array de productos" });
  }

  db.data.products = incomingProducts;
  await db.write();

  res.json({ success: true, count: incomingProducts.length });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend API corriendo en http://localhost:${PORT}`);
});
