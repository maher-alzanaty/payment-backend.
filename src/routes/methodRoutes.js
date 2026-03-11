import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

// ================= Multer Setup for method logos =================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/logos";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = file.originalname.replace(ext, "").replace(/\s+/g, "-");
    cb(null, `${name}-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

// ================= GET all methods =================
router.get("/", async (req, res) => {
  try {
    const methods = await prisma.paymentMethod.findMany();
    res.json(methods);
  } catch (err) {
    console.error("GET /methods error:", err);
    res.status(500).json({ error: "حدث خطأ أثناء جلب طرق الدفع" });
  }
});

// ================= POST create new method =================
router.post("/", upload.single("logo"), async (req, res) => {
  try {
    const { name, beneficiaryName, accountNumber, comingSoon } = req.body;
    const logoUrl = req.file ? `/uploads/logos/${req.file.filename}` : undefined;

    const method = await prisma.paymentMethod.create({
      data: {
        name,
        beneficiaryName,
        accountNumber,
        comingSoon: comingSoon === "true",
        logo: logoUrl,
      },
    });

    res.status(201).json(method);
  } catch (err) {
    console.error("POST /methods error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================= PUT update method =================
router.put("/:id", upload.single("logo"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, beneficiaryName, accountNumber, comingSoon } = req.body;

    // Build update data
    const updateData = {
      name,
      beneficiaryName,
      accountNumber,
      comingSoon: comingSoon === "true",
    };

    if (req.file) {
      updateData.logo = `/uploads/logos/${req.file.filename}`;
    }

    const updatedMethod = await prisma.paymentMethod.update({
      where: { id }, // id is string (UUID)
      data: updateData,
    });

    res.json(updatedMethod);
  } catch (err) {
    // Prisma P2025 = Record not found
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Method not found" });
    }

    console.error("PUT /methods/:id error:", err);
    res.status(500).json({ error: "حدث خطأ أثناء تحديث طريقة الدفع" });
  }
});
// ================= DELETE method =================
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.paymentMethod.delete({ where: { id } });
    res.json({ message: "Method deleted successfully" });
  } catch (err) {
    console.error("DELETE /methods/:id error:", err);
    res.status(500).json({ error: "حدث خطأ أثناء حذف طريقة الدفع" });
  }
});

export default router;