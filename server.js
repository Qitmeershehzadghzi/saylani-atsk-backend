import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import conDb from "./config/db.js";
import userRouter from "./routes/userRoute.js";

dotenv.config();
const app = express();

// DB Connect
conDb();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/user", userRouter);

// Root Route
app.get("/", (req, res) => {
  res.send("🚀 Backend Server is Running ✅");
});

// 🟡 Important: Vercel me `app.listen` mat lagao
export default app;
