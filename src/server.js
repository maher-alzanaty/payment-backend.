import express from "express";
import cors from "cors";
import path from "path";
import methodRoutes from "./routes/methodRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import cookieParser from "cookie-parser";


const app = express();
app.use(cookieParser()); // <-- must be before routes

// ================= Middleware =================


app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://payment-gateway-frontend-new1.vercel.app"
    ],
    credentials: true
  })
);

app.set("trust proxy", 1);//This fixes secure cookies behind proxies. foreploy on Render, Express sometimes thinks the request is HTTP instead of HTTPS, and then refuses to send secure cookies.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ================= Routes =================
app.use("/methods", methodRoutes);
app.use("/payments", paymentRoutes);
app.use("/admins", adminRoutes);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));