import jwt from "jsonwebtoken";
import UserModel from "../models/userModel.js";

export const protect = async (req, res, next) => {
  let token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, msg: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await UserModel.findById(decoded.id).select("-password");
    if (!req.user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }
    next();
  } catch (error) {
    res.status(401).json({ success: false, msg: "Invalid or expired token" });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ success: false, msg: "Access denied" });
  }
  next();
};