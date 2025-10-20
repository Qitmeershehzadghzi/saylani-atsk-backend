import mongoose from "mongoose";

const vitalsSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    bp: String,
    sugar: String,
    weight: String,
    pulse: String,
  },
  { timestamps: true }
);

const VitalsModel =
  mongoose.models.Vitals || mongoose.model("Vitals", vitalsSchema);
export default VitalsModel;
