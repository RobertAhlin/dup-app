// backend/src/routes/auth.ts

import { Router, Request, Response } from "express";
import pool from "../db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { verifyToken, AuthenticatedRequest } from "../middleware/verifyToken";

const router = Router();

const registerHandler = async (req: Request, res: Response) => {
  const { email, password, name, role } = req.body;

  if (!email || !password || !role) {
    return res
      .status(400)
      .json({ error: "Email, password, and role are required." });
  }

  try {
    const userExists = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );
    if (userExists.rows.length > 0) {
      return res.status(409).json({ error: "Email already in use." });
    }

    const roleResult = await pool.query(
      "SELECT id FROM roles WHERE name = $1",
      [role]
    );

    if (roleResult.rows.length === 0) {
      return res.status(400).json({ error: "Invalid role name." });
    }

    const role_id = roleResult.rows[0].id;
    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, role_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role_id, created_at`,
      [email, password_hash, name || null, role_id]
    );

    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    console.error("❌ Registration error:", err);
    res.status(500).json({ error: "Server error during registration." });
  }
};

router.post("/register", (req: Request, res: Response) => {
  registerHandler(req, res);
});

const secret = process.env.JWT_SECRET || "supersecret";
const isProduction = process.env.NODE_ENV === "production";

const loginHandler = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "Email and password are required." });
  }

  try {
    const result = await pool.query(
      `SELECT id, email, password_hash, name, role_id FROM users WHERE email = $1`,
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    await pool.query("UPDATE users SET last_login_at = NOW() WHERE id = $1", [
      user.id,
    ]);

    const tokenPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role_id: user.role_id,
    };

    const token = jwt.sign(tokenPayload, secret, { expiresIn: "12h" });

    res
      .cookie("token", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: 12 * 60 * 60 * 1000,
      })
      .json({
        message: "Login successful",
        socketToken: token, // frontend plockar upp denna och sparar i sessionStorage
      });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ error: "Server error during login." });
  }
};

router.post("/login", (req: Request, res: Response) => {
  loginHandler(req, res);
});

const getProfileHandler = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const userId = req.user?.id;

  try {
    const result = await pool.query(
      `SELECT 
         users.id,
         users.email,
         users.name,
         roles.name AS role,
         users.created_at
       FROM users
       JOIN roles ON users.role_id = roles.id
       WHERE users.id = $1`,
      [userId]
    );

    const user = result.rows[0];

    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    res.json({
      message: "👤 Profile retrieved",
      user,
    });
  } catch (err) {
    console.error("❌ Error fetching profile:", err);
    res.status(500).json({ error: "Failed to fetch user profile." });
  }
};

router.get("/me", verifyToken, getProfileHandler);

router.post("/logout", (_req, res) => {
  const baseOptions = {
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  } as const;

  res.clearCookie("token", {
    ...baseOptions,
    httpOnly: true,
  });

  // socketToken-cookien använder vi inte längre egentligen,
  // men om den fortfarande finns från äldre versioner kan vi rensa den också:
  res.clearCookie("socketToken", {
    ...baseOptions,
    httpOnly: false,
  });

  res.json({ message: "Logged out" });
});

export default router;
