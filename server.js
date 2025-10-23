import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import conDb from './config/db.js';
import userRouter from './routes/userRoute.js';
import reportRouter from './routes/reportRoute.js';
import vitalsRouter from './routes/vitalsRoute.js';

// ✅ DOTENV CONFIG - YEH LINE IMPORTANT HAI
dotenv.config();
console.log("OPENROUTER_API_KEY:", process.env.OPENROUTER_API_KEY ? "Loaded ✅" : "❌ Missing");


// Debug environment variables
console.log('🔍 Environment Variables Debug:');
console.log('MONGODB_URL:', process.env.MONGODB_URL);
console.log('PORT:', process.env.PORT);
console.log('JWT_SECRET:', process.env.JWT_SECRET);

const app = express();
const PORT = process.env.PORT || 5000;

// DB Connect with error handling
if (!process.env.MONGODB_URL) {
  console.error('❌ MONGODB_URL is not defined in environment variables');
  process.exit(1);
}

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

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log('✅ Environment Variables Loaded:');
  console.log(`   - PORT: ${process.env.PORT}`);
  console.log(`   - MONGODB_URL: ${process.env.MONGODB_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`   - GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`   - CLOUDINARY: ${process.env.CLOUDINARY_CLOUD_NAME ? '✅ Set' : '❌ Missing'}`);
  console.log("🧩 CLOUDINARY ENV CHECK:");
console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("API Key:", process.env.CLOUDINARY_API_KEY);
console.log("API Secret:", process.env.CLOUDINARY_API_SECRET ? "✅ Present" : "❌ Missing");

});