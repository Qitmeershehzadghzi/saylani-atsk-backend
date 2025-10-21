import { v2 as cloudinary } from "cloudinary";
import axios from "axios";
import Tesseract from "tesseract.js";
import ReportModel from "../models/ReportModel.js";
import VitalsModel from "../models/VitalsModel.js";
import * as pdf from "pdf-parse";
import dotenv from "dotenv";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import fs from "fs";

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
    if (!process.env.OPENROUTER_API_KEY)
      return res.status(500).json({
        success: false,
        msg: "Missing OpenRouter API key.",
      });

    const file = req.file;
    if (!file)
      return res.status(400).json({ success: false, msg: "No file uploaded" });

    // ✅ Upload to Cloudinary
    const result = await uploadToCloudinary(file);

    // ✅ Extract Text (PDF or Image)
    let reportText = "";
    if (file.mimetype === "application/pdf") {
      const data = await pdf.default(file.buffer);
      reportText = data.text?.trim() || "PDF text extraction failed.";
    } else {
      const ocrResult = await Tesseract.recognize(file.buffer, "eng");
      reportText =
        ocrResult.data.text?.trim() ||
        "Image uploaded but no readable text detected.";
    }

    // ✅ Send to AI
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

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mistral-7b-instruct",
        messages: [
          {
            role: "system",
            content: "You are a helpful medical assistant.",
          },
          { role: "user", content: prompt },
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

    // ✅ Generate PDF locally
    const pdfDoc = new jsPDF();
    pdfDoc.setFontSize(14);
    pdfDoc.text("HealthMate AI Report Summary", 15, 15);
    pdfDoc.setFontSize(11);
    pdfDoc.text(`User ID: ${req.user._id}`, 15, 25);
    pdfDoc.text(`Report Generated: ${new Date().toLocaleString()}`, 15, 35);
    pdfDoc.setFontSize(12);
    pdfDoc.text("AI Analysis:", 15, 50);

    const wrappedText = pdfDoc.splitTextToSize(aiText, 180);
    pdfDoc.text(wrappedText, 15, 60);

    const filePath = `./report_${Date.now()}.pdf`;
    pdfDoc.save(filePath);

    // ✅ Upload PDF to Cloudinary
    const pdfUpload = await cloudinary.uploader.upload(filePath, {
      resource_type: "auto",
      folder: "healthmate/reports",
    });

    // ✅ Delete local file
    fs.unlinkSync(filePath);

    // ✅ Save to MongoDB
    const report = await ReportModel.create({
      user: req.user._id,
      fileUrl: result.secure_url,
      fileType: file.mimetype,
      aiSummary: { english: aiText },
      pdfUrl: pdfUpload.secure_url, // 🔥 new field
    });

    res.json({
      success: true,
      report,
      msg: "Report analyzed and PDF generated successfully.",
    });
  } catch (error) {
    console.error("AI Analysis Error:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      msg: "AI analysis failed. Please check your OpenRouter API key or try again later.",
    });
  }
};

// 📜 Get all reports
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
