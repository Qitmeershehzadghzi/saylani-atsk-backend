import { v2 as cloudinary } from "cloudinary";
import { GoogleGenerativeAI } from "@google/generative-ai";
import ReportModel from "../models/ReportModel.js";
import * as pdf from "pdf-parse";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 📄 Upload & Analyze Report
export const uploadReport = async (req, res) => {
  try {
    const file = req.file;
    if (!file)
      return res.status(400).json({ success: false, msg: "No file uploaded" });

    cloudinary.uploader
      .upload_stream({ resource_type: "auto" }, async (err, result) => {
        if (err)
          return res.status(500).json({ success: false, msg: "Upload failed" });

        let reportText = "";
        if (file.mimetype === "application/pdf") {
          const data = await pdf(file.buffer);
          reportText = data.text;
        } else {
          reportText =
            "Image uploaded. OCR extraction can be added later if needed.";
        }

        // Gemini prompt
        const prompt = `
You are a medical assistant. Analyze this report and provide:
1. English Summary
2. Roman Urdu Summary
3. 3 Key Findings
4. 3 Questions for Doctor
5. Health Metrics (BP, Sugar, Weight, Pulse)
Report:
${reportText}
`;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const response = await model.generateContent(prompt);
        const text = response.response.text();

        const report = await ReportModel.create({
          user: req.user._id,
          fileUrl: result.secure_url,
          fileType: file.mimetype,
          aiSummary: { english: text },
        });

        res.json({ success: true, report });
      })
      .end(file.buffer);
  } catch (error) {
    res.status(500).json({ success: false, msg: error.message });
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

// 🧾 Get single report by ID
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