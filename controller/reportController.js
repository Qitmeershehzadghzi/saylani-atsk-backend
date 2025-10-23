import { v2 as cloudinary } from "cloudinary";
import axios from "axios";
import Tesseract from "tesseract.js";
import ReportModel from "../models/ReportModel.js";
import VitalsModel from "../models/VitalsModel.js";
import * as pdf from "pdf-parse";
import dotenv from "dotenv";
import { jsPDF } from "jspdf";
import { fromBuffer } from "pdf2pic";
import fs from "fs-extra";
// import uploadToCloudinary from "../utils/uploadToCloudinary.js";

dotenv.config();

// 🌩️ Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ☁️ Upload helper
const uploadToCloudinary = (file) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: "auto" },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    uploadStream.end(file.buffer);
  });

// 📄 Upload & Analyze Report (Scanned PDF Safe)
export const uploadReport = async (req, res) => {
  try {
    console.log("🔍 Starting full PDF/image extraction...");

    if (!process.env.OPENROUTER_API_KEY)
      return res
        .status(500)
        .json({ success: false, msg: "Missing OpenRouter API key." });

    const file = req.file;
    if (!file)
      return res
        .status(400)
        .json({ success: false, msg: "No file uploaded." });

    console.log("📁 File received:", file.originalname, file.mimetype);

    // ☁️ Upload to Cloudinary
    const cloudFile = await uploadToCloudinary(file);
    console.log("☁️ File uploaded successfully to Cloudinary");

    let reportText = "";

    // 🧠 Detect file type
    if (file.mimetype === "application/pdf") {
      console.log("📄 Extracting from full PDF...");

      try {
        // Try normal text extraction
        const data = await pdf(file.buffer);
        if (data.text && data.text.trim().length > 50) {
          reportText = data.text.trim();
          console.log("✅ Extracted full text-based PDF content");
        } else {
          console.log("⚠️ Scanned PDF detected. Performing OCR on all pages...");
          await fs.ensureDir("./temp");

          const convert = fromBuffer(file.buffer, {
            density: 250, // increase clarity
            saveFilename: "page",
            savePath: "./temp",
            format: "png",
            width: 1300,
            height: 1800,
          });

          const pages = await convert(-1);
          let ocrText = "";

          for (const page of pages) {
            console.log(`🔠 OCR extracting page: ${page.name}`);
            const ocr = await Tesseract.recognize(page.path, "eng", {
              logger: (m) => console.log(m.status),
            });
            ocrText += "\n" + (ocr.data.text || "");
            await fs.remove(page.path);
          }

          reportText = ocrText.trim() || "No readable text found.";
          console.log("✅ OCR completed successfully.");
        }
      } catch (err) {
        console.error("❌ PDF extraction error:", err.message);
        reportText = "PDF text extraction failed.";
      }
    } else if (file.mimetype.startsWith("image/")) {
      console.log("🖼️ Extracting text from image...");
      const ocr = await Tesseract.recognize(file.buffer, "eng");
      reportText = ocr.data.text?.trim() || "No readable text found.";
    } else {
      return res
        .status(400)
        .json({ success: false, msg: "Unsupported file type." });
    }

    console.log("📝 Extracted text length:", reportText.length);

    // ⚙️ Don't block for short text — just warn
    if (reportText.length < 30) {
      console.warn("⚠️ Extracted text seems short — continuing anyway...");
    }

    // 🧩 AI Summary
    const prompt = `
You are a bilingual medical assistant who understands both English and Roman Urdu.

Analyze the following medical report and provide:

1. **English Summary:** (2–3 lines)
2. **Roman Urdu Summary:** (e.g., "Patient ka BP thora high hai")
3. **3 Key Findings:** (in English)
4. **3 Questions for Doctor:** (in English)
5. **Health Metrics:** (BP, Sugar, Weight, Pulse if available)

--- REPORT DATA ---
${reportText.substring(0, 12000)}
`;

    console.log("🤖 Sending text to OpenRouter AI...");

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
model: "mistralai/mistral-7b-instruct:free",

        messages: [
          {
            role: "system",
            content:
              "You are a bilingual medical assistant. Always give both English and Roman Urdu summaries clearly separated.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 1800,
        temperature: 0.4,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "http://localhost:5000",
          "X-Title": "HealthMate AI Report",
          "Content-Type": "application/json",
        },
        timeout: 120000,
      }
    );

    const aiText =
      response.data?.choices?.[0]?.message?.content ||
      "AI did not return any text.";
    console.log("✅ AI analysis completed successfully");

    // 📘 Generate AI PDF
    const pdfDoc = new jsPDF();
    pdfDoc.setFontSize(16);
    pdfDoc.text("HealthMate AI Report Summary", 15, 15);
    pdfDoc.setFontSize(10);
    pdfDoc.text(
      `User ID: ${req.user?._id || "anonymous"}`,
      15,
      25
    );
    pdfDoc.text(`Generated: ${new Date().toLocaleString()}`, 15, 30);
    pdfDoc.text(`File: ${file.originalname}`, 15, 35);
    pdfDoc.setFontSize(12);
    pdfDoc.text("AI Analysis:", 15, 45);

    const wrapped = pdfDoc.splitTextToSize(aiText, 170);
    let y = 55;
    for (const line of wrapped) {
      if (y > 270) {
        pdfDoc.addPage();
        y = 20;
      }
      pdfDoc.text(line, 15, y);
      y += 7;
    }

    const pdfBuffer = Buffer.from(pdfDoc.output("arraybuffer"));

    const pdfUpload = await new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        { resource_type: "raw", folder: "healthmate/reports", format: "pdf" },
        (err, result) => (err ? reject(err) : resolve(result))
      );
      upload.end(pdfBuffer);
    });

    // 💾 Save report
    const report = await ReportModel.create({
      user: req.user?._id || "000000000000000000000000",
      fileUrl: cloudFile.secure_url,
      fileType: file.mimetype,
      extractedText: reportText,
      aiSummary: { english: aiText },
      pdfUrl: pdfUpload.secure_url,
    });

    console.log("💾 Report saved successfully");

    res.json({
      success: true,
      report,
      msg: "Report analyzed successfully — full text extracted from all pages.",
    });
  } catch (error) {
    console.error(
      "❌ AI Analysis Error:",
      error.response?.data || error.message
    );
    res.status(500).json({
      success: false,
      msg:
        error.response?.data?.error?.message ||
        "AI analysis failed. Please try again later.",
    });
  }
};

// 📜 Get all reports
export const getUserReports = async (req, res) => {
  try {
    const reports = await ReportModel.find({ user: req.user._id }).sort({ createdAt: -1 });
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
    const vitals = await VitalsModel.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, vitals });
  } catch (error) {
    res.status(500).json({ success: false, msg: error.message });
  }
};

