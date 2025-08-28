import mongoose from "mongoose";
import dotenv from "dotenv";

// Cargar las variables de entorno desde .env
dotenv.config();

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;

    if (!mongoURI) {
      throw new Error("❌ MONGO_URI no está definido en el archivo .env");
    }

    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ Conectado a MongoDB Atlas");
  } catch (error) {
    console.error("❌ Error de conexión a MongoDB:", error.message);
    throw error;
  }
};

export default connectDB;
