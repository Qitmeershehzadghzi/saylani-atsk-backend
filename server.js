import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import conDb from "./config/db.js";
import userRouter from "./routes/userRoute.js";
// import { notFound, errorHandler } from "./middleware/errorMiddleware.js";

dotenv.config();
const app = express();
const port = process.env.PORT || 4000;

conDb();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/user", userRouter);

// Root Route
app.get("/", (req, res) => {
  res.send("🚀 Backend Server is Running");
});

// Error Middleware
// app.use(notFound);
// app.use(errorHandler);

app.listen(port, () => console.log(`✅ Server started on port ${port}`));