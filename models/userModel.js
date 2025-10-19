import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    cartData: { type: Object, default: {} },
    role: { type: String, default: "user" },
  },
  { timestamps: true, minimize: false }
);

const UserModel = mongoose.models.User || mongoose.model("User", UserSchema);
export default UserModel;