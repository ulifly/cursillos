const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (videos y PDFs)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Conectar a MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() =>
    console.log(`✅ Conectado a MongoDB en ${process.env.MONGODB_URI}`)
  )
  .catch((err) => console.error("❌ Error conectando a MongoDB:", err));

// Rutas
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/courses", require("./routes/courses"));
app.use("/api/videos", require("./routes/videos"));
app.use("/api/files", require("./routes/files"));

// Ruta de prueba
app.get("/", (req, res) => {
  res.json({ message: "API de Cursos Streaming funcionando!" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
