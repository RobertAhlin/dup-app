//backend/src/index.ts

import express from "express";
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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
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
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
