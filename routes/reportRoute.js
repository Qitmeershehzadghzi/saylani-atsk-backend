import express from "express";
import multer from "multer";
import { protect } from "../middleware/authMidlleware.js";
import {
  uploadReport,
  getUserReports,
  getReportById,
} from "../controller/reportController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload",protect,  upload.single("file"), uploadReport);
router.get("/", protect, getUserReports);
router.get("/:id", protect, getReportById);

export default router;
