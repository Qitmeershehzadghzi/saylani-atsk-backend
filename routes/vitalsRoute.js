import express from "express";
import { protect } from "../middleware/authMidlleware.js";
import { addVitals, getVitals } from "../controller/vitalsController.js";

const router = express.Router();

router.post("/", protect, addVitals);
router.get("/", protect, getVitals);

export default router;
