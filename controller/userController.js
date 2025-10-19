import UserModel from "../models/userModel.js";
import validator from "validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Create Token
const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// ======================= REGISTER =======================
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const checkUser = await UserModel.findOne({ email });
    if (checkUser) {
      return res.status(400).json({ success: false, msg: "User already exists" });
    }

    // Email & Password Validation
    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, msg: "Invalid email format" });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, msg: "Password must be at least 8 characters" });
    }

    // Password Hash
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    // Create User
    const user = await UserModel.create({ name, email, password: hash });

    const token = createToken(user._id);
    res.json({ success: true, token, user: { id: user._id, name: user.name, email: user.email } });

  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, msg: error.message });
  }
};

// ======================= LOGIN =======================
export const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, msg: "User doesn't exist" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, msg: "Invalid credentials" });
    }

    const token = createToken(user._id);
    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, msg: error.message });
  }
};

// ======================= ADMIN LOGIN =======================
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      const token = jwt.sign(
        { email, role: "admin" },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );
      res.json({ success: true, token, role: "admin" });
    } else {
      res.status(401).json({ success: false, msg: "Invalid admin credentials" });
    }

  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, msg: error.message });
  }
};

// ======================= PROFILE (protected) =======================
export const getProfile = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.id).select("-password");
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, msg: error.message });
  }
};