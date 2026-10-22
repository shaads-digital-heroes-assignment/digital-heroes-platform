import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./config/db.js";

import authRoutes from "./routes/auth.routes.js";
import charityRoutes from "./routes/charity.routes.js";
import scoreRoutes from "./routes/score.routes.js";
import drawRoutes from "./routes/draw.routes.js";

dotenv.config();

const app = express();

// Explicit CORS headers for Vercel Frontend + Localhost
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());

// Health & DB diagnostic endpoint
app.get("/api/health", async (_req, res) => {
  try {
    const dbCheck = await pool.query("SELECT NOW() as time");
    res.json({
      status: "ok",
      db_connected: true,
      server_time: dbCheck.rows[0].time,
    });
  } catch (err: any) {
    res.status(500).json({
      status: "db_error",
      error: err.message,
      hint: "Verify DATABASE_URL in Vercel Environment Variables",
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/charities", charityRoutes);
app.use("/api/scores", scoreRoutes);
app.use("/api/admin/draws", drawRoutes);

// Local development listener only
if (!process.env.VERCEL) {
  const PORT = Number(process.env.PORT) || 5001;
  app.listen(PORT, () => {
    console.log(`🚀 Digital Heroes Backend running on port ${PORT}`);
  });
}

export default app;
// Ensure Vercel CommonJS runtime picks up the Express app
if (typeof module !== "undefined") {
  module.exports = app;
}
