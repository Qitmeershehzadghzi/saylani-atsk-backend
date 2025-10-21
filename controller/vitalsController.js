import VitalsModel from "../models/VitalsModel.js";

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

// Remove extra "};" at the end of file
export const getVitals = async (req, res) => {
  try {
    const vitals = await VitalsModel.find({ user: req.user._id }).sort({
      createdAt: -1,
    });
    res.json({ success: true, vitals });
  } catch (error) {
    res.status(500).json({ success: false, msg: error.message });
  }
}; // ✅ This should be the last line
