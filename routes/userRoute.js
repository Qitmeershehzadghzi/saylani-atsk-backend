import express from "express";
import { userLogin, registerUser, adminLogin, getProfile } from "../controller/userController.js";
import { protect, adminOnly } from "../middleware/authMidlleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", userLogin);
router.post("/admin", adminLogin);
router.get("/profile", protect, getProfile);

export default router;