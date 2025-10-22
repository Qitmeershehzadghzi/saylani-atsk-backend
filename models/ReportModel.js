import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    fileUrl: { type: String, required: true },
    fileType: { type: String, required: true },
    aiSummary: {
      english: String,
      urdu: String,
      keyFindings: [String],
      doctorQuestions: [String],
      healthMetrics: {
        bp: String,
        sugar: String,
        weight: String,
        pulse: String,  
      },
    },
  },
  { timestamps: true }
);

const ReportModel =
  mongoose.models.Report || mongoose.model("Report", reportSchema);
export default ReportModel;