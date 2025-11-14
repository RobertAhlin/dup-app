//backend/src/index.ts

import express from "express";
import http from "http";
import pool from "./db";
import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import rolesRoutes from "./routes/roles";
import coursesRoutes from "./routes/courses";
import testRoutes from "./routes/test";
import hubsRoutes from "./routes/hubs";
import tasksRoutes from "./routes/tasks";
import edgesRoutes from "./routes/edges";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { initializeSocket } from "./socket";

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Socket.IO
initializeSocket(httpServer);

// Ensure critical schema tweaks exist (safe to run on every start)
async function ensureSchema() {
  try {
    await pool.query(`ALTER TABLE hub ADD COLUMN IF NOT EXISTS is_start BOOLEAN DEFAULT FALSE;`);
    await pool.query(`ALTER TABLE hub ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;`);
    console.log("✅ Schema ensured: hub.is_start and hub.payload present");
  } catch (err) {
    console.warn("⚠️ Schema ensure warning:", (err as Error).message);
  }
}

// Fire and forget; server can start while this runs
ensureSchema();
console.log("🔍 före ping");
app.get("/ping", (_req, res) => {
  console.log("🔍 /ping route HIT!");
  res.send("Pong");
});
console.log("🔍 efter ping");

// CORS: Viktigt att 'credentials: true' kommer ihop med origin
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

// Middleware
app.use(cookieParser());
app.use(express.json());

// 🔍 Test-rout för att se om cookies fungerar
app.get("/test-cookie", (_req, res) => {
  console.log("🍪 /test-cookie route HIT!");
  res
    .cookie("token", "dummyvalue", {
      httpOnly: true,
      secure: false, // Sätt till true i produktion (med HTTPS)
      sameSite: "lax", // Eller 'strict' om du vill vara striktare
    })
    .send("🍪 Test-cookie set!");
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/roles", rolesRoutes);
app.use("/api/courses", coursesRoutes);
app.use("/api/hubs", hubsRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/edges", edgesRoutes);

// Statuskontroll
app.get("/", async (_req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.send(`✅ Connected to DB! Time: ${result.rows[0].now}`);
  } catch (err) {
    console.error("❌ DB connection failed:", (err as Error).message);
    res.status(500).send("Database connection error");
  }
});
console.log("✅ All routes registered");

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
