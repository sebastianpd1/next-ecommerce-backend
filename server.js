import express from "express";
import cors from "cors";
import connectDB from "./db/connect.js";
import productsRouter from "./routes/products.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use("/api/products", productsRouter);

app.get("/", (req, res) => {
  res.send("API funcionando correctamente");
});

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Error al iniciar el servidor:", error);
  }
};

startServer();
