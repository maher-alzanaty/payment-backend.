import express from "express";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { authenticateAdmin } from "../middleware/authMiddleware.js";

const prisma = new PrismaClient();
const router = express.Router();

router.use(cookieParser()); // <-- required to read/write cookies

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// ================= POST admin login (PUBLIC) =================
// login route in adminRoutes.js
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin by email
    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) return res.status(401).json({ error: "Invalid credentials" });

    // Check password
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    // Generate JWT token
    const token = jwt.sign(
      { id: admin.id, email: admin.email },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Set cookie correctly
   // ✅ send proper 200 response, not 204
  res
    .cookie("token", token, {
      httpOnly: true,
      secure: "no",
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
    })
    .status(200)
    .json({ message: "Login success", admin: { id: admin.id, name: admin.name, email: admin.email } });

 
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ================= Logout (CLEAR COOKIE) =================
router.post("/logout", authenticateAdmin, (req, res) => {
  res.clearCookie("token", { path: "/" });
  res.json({ message: "Logged out successfully" });
});

// ================= GET all admins =================
router.get("/", authenticateAdmin, async (req, res) => {
  try {
    const admins = await prisma.admin.findMany({
      select: { id: true, name: true, email: true, createdAt: true },
    });
    res.json(admins);
  } catch (err) {
    console.error("GET /admins error:", err);
    res.status(500).json({ error: "حدث خطأ أثناء جلب المستخدمين" });
  }
});

// ================= GET single admin =================
router.get("/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await prisma.admin.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    if (!admin) return res.status(404).json({ error: "Admin not found" });
    res.json(admin);
  } catch (err) {
    console.error("GET /admins/:id error:", err);
    res.status(500).json({ error: "حدث خطأ أثناء جلب المستخدم" });
  }
});

// ================= POST create admin =================
router.post("/", authenticateAdmin, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "All fields are required" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await prisma.admin.create({
      data: { name, email, password: hashedPassword },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    res.status(201).json(admin);
  } catch (err) {
    console.error("POST /admins error:", err);
    if (err.code === "P2002") return res.status(400).json({ error: "Email already exists" });
    res.status(500).json({ error: "حدث خطأ أثناء إنشاء المستخدم" });
  }
});

// ================= PATCH update admin =================
router.patch("/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password } = req.body;

    const data = {};
    if (name) data.name = name;
    if (email) data.email = email;
    if (password) data.password = await bcrypt.hash(password, 10);

    const updated = await prisma.admin.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, createdAt: true },
    });

    res.json(updated);
  } catch (err) {
    console.error("PATCH /admins/:id error:", err);
    if (err.code === "P2025") return res.status(404).json({ error: "Admin not found" });
    res.status(500).json({ error: "حدث خطأ أثناء تحديث المستخدم" });
  }
});

// ================= DELETE admin =================
router.delete("/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.admin.delete({ where: { id } });
    res.json({ message: "Admin deleted successfully" });
  } catch (err) {
    console.error("DELETE /admins/:id error:", err);
    if (err.code === "P2025") return res.status(404).json({ error: "Admin not found" });
    res.status(500).json({ error: "حدث خطأ أثناء حذف المستخدم" });
  }
});

export default router;