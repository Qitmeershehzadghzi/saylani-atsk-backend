import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import conDb from "./config/db.js";
import userRouter from "./routes/userRoute.js";
import reportRouter from "./routes/reportRoute.js";
import vitalsRouter from "./routes/vitalsRoute.js";
dotenv.config();
const app = express();

// DB Connect
conDb();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/user", userRouter);
app.use("/api/report", reportRouter);
app.use("/api/vitals", vitalsRouter);
// Root Route
app.get("/", (req, res) => {
  res.send("🚀 Backend Server is Running ✅");
});

// 🟡 Important: Vercel me `app.listen` mat lagao
export default app;
