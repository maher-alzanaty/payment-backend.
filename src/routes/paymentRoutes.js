import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

// ---------------- Multer Setup ----------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/proofs";
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

// ---------------- POST /payments ----------------
router.post("/", upload.single("proof"), async (req, res) => {
  try {
    const { clientName, amount, currency, invoiceNo, methodId } = req.body;

    if (!req.file) return res.status(400).json({ error: "Proof is required" });

    // methodId is string UUID
    const method = await prisma.paymentMethod.findUnique({
      where: { id: methodId },
    });
    if (!method) return res.status(400).json({ error: "Method غير موجود" });

    const proofPath = `/uploads/proofs/${req.file.filename}`;

    const payment = await prisma.payment.create({
      data: {
        id: crypto.randomUUID(), // generate string UUID
        clientName,
        amount: parseFloat(amount),
        currency,
        invoiceNo,
        status: "pending",
      },
    });

    await prisma.transaction.create({
      data: {
        id: crypto.randomUUID(), // string UUID
        paymentId: payment.id,   // string
        methodId: method.id,     // string
        status: "review",
        proof: proofPath,
      },
    });

    const paymentWithTransaction = await prisma.payment.findUnique({
      where: { id: payment.id },
      include: { transactions: { include: { method: true } } },
    });

    res.status(201).json(paymentWithTransaction);
  } catch (err) {
    console.error("POST /payments error:", err);
    res.status(500).json({ error: "حدث خطأ أثناء إنشاء الدفع" });
  }
});

// ---------------- GET /payments ----------------
router.get("/", async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      include: { transactions: { include: { method: true } } },
    });
    res.json(payments);
  } catch (err) {
    console.error("GET /payments error:", err);
    res.status(500).json({ error: "حدث خطأ أثناء جلب البيانات" });
  }
});

// ---------------- PATCH /payments/:id ----------------
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params; // string UUID
    const { status } = req.body;

    if (!status) return res.status(400).json({ error: "Status is required" });

    const updatedPayment = await prisma.payment.update({
      where: { id },
      data: { status },
      include: { transactions: { include: { method: true } } }, // include related transaction and method
    });

    res.json(updatedPayment);
  } catch (err) {
    // Prisma P2025 = Record not found
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Payment not found" });
    }

    console.error("PATCH /payments/:id error:", err);
    res.status(500).json({ error: "حدث خطأ أثناء تحديث الدفع" });
  }
});

export default router;