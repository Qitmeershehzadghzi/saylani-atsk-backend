import jwt from "jsonwebtoken";
import UserModel from "../models/userModel.js";

export const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        msg: "Not authorized, no token" 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await UserModel.findById(decoded.id).select("-password");
    
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        msg: "User not found" 
      });
    }
    
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      msg: "Not authorized, token failed" 
    });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ 
      success: false, 
      msg: "Admin access only" 
    });
  }
};