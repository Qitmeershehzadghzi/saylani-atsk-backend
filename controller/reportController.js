import { v2 as cloudinary } from "cloudinary";
import axios from "axios";
import Tesseract from "tesseract.js";
import ReportModel from "../models/ReportModel.js";
import VitalsModel from "../models/VitalsModel.js";
import * as pdf from "pdf-parse";
import dotenv from "dotenv";
dotenv.config();

// 🌩️ Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ☁️ Helper: Upload file to Cloudinary
const uploadToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: "auto" },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    uploadStream.end(file.buffer);
  });
};

// 📄 Upload & Analyze Report
export const uploadReport = async (req, res) => {
  try {
    // ✅ Check API Key
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({
        success: false,
        msg: "Missing OpenRouter API key.",
      });
    }

    const file = req.file;
    if (!file)
      return res.status(400).json({ success: false, msg: "No file uploaded" });

    // ✅ Upload to Cloudinary
    let result;
    try {
      result = await uploadToCloudinary(file);
    } catch (err) {
      console.error("Cloudinary upload error:", err);
      return res
        .status(500)
        .json({ success: false, msg: "Cloudinary upload failed." });
    }

    // ✅ Extract text (PDF or Image)
    let reportText = "";
    if (file.mimetype === "application/pdf") {
      try {
        const data = await pdf.default(file.buffer);
        reportText = data.text?.trim() || "PDF text extraction failed.";
      } catch (pdfError) {
        console.error("PDF parsing error:", pdfError);
        reportText = "PDF uploaded but text extraction failed.";
      }
    } else {
      try {
        const ocrResult = await Tesseract.recognize(file.buffer, "eng");
        reportText =
          ocrResult.data.text?.trim() ||
          "Image uploaded but no readable text detected.";
      } catch (ocrError) {
        console.error("OCR extraction error:", ocrError);
        reportText = "Image uploaded but OCR extraction failed.";
      }
    }

    if (!reportText || reportText.length < 20) {
      return res.status(400).json({
        success: false,
        msg: "Unable to extract text. Please upload a clearer report.",
      });
    }

    // ✅ AI Prompt
    const prompt = `
You are a medical assistant. Analyze this health report and provide:
1. English Summary
2. Roman Urdu Summary
3. 3 Key Findings
4. 3 Questions for Doctor
5. Health Metrics (BP, Sugar, Weight, Pulse)

Report Data:
${reportText}
`;

    // ✅ Send to OpenRouter API
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mistral-7b-instruct", // free stable model
        messages: [
          {
            role: "system",
            content: "You are a helpful medical assistant.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "HealthMate AI Report",
          "Content-Type": "application/json",
        },
      }
    );

    const aiText =
      response.data?.choices?.[0]?.message?.content ||
      "AI did not return any text.";

    // ✅ Save to DB
    const report = await ReportModel.create({
      user: req.user._id,
      fileUrl: result.secure_url,
      fileType: file.mimetype,
      aiSummary: { english: aiText },
    });

    res.json({ success: true, report });
  } catch (error) {
    console.error("AI Analysis Error:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      msg: "AI analysis failed. Please check your OpenRouter API key or try again later.",
    });
  }
};

// 📜 Get all reports of user
export const getUserReports = async (req, res) => {
  try {
    const reports = await ReportModel.find({ user: req.user._id }).sort({
      createdAt: -1,
    });
    res.json({ success: true, reports });
  } catch (error) {
    res.status(500).json({ success: false, msg: error.message });
  }
};

// 🧾 Get single report
export const getReportById = async (req, res) => {
  try {
    const report = await ReportModel.findById(req.params.id);
    if (!report)
      return res.status(404).json({ success: false, msg: "Report not found" });
    res.json({ success: true, report });
  } catch (error) {
    res.status(500).json({ success: false, msg: error.message });
  }
};

// 🩺 Add Vitals
export const addVitals = async (req, res) => {
  try {
    const vitals = await VitalsModel.create({
      user: req.user._id,
      ...req.body,
    });
    res.json({ success: true, vitals });
  } catch (error) {
    res.status(500).json({ success: false, msg: error.message });
  }
};

// 🩺 Get Vitals
export const getVitals = async (req, res) => {
  try {
    const vitals = await VitalsModel.find({ user: req.user._id }).sort({
      createdAt: -1,
    });
    res.json({ success: true, vitals });
  } catch (error) {
    res.status(500).json({ success: false, msg: error.message });
  }
};
