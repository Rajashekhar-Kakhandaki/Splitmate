require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const roomRoutes = require("./routes/room.routes");
const uploadRoutes = require("./routes/upload.routes");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

// Serve uploaded receipt photos. In production, swap this for Cloudinary
// or S3 — local disk storage doesn't persist on most serverless/PaaS
// platforms, but works fine for local dev or a VPS with a persistent disk.
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "splitmate-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/uploads", uploadRoutes);

// Future routes get mounted here the same way — one router per resource,
// kept thin, logic in controllers.

app.use((req, res) => {
  res.status(404).json({ error: "Not found." });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`SplitMate API listening on http://localhost:${PORT}`);
});
