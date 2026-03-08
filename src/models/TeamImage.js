import mongoose from "mongoose";

const TeamImageSchema = new mongoose.Schema({
  imageId: { type: String, required: true, unique: true },
  contentType: { type: String, required: true },
  base64Data: { type: String, required: true }, // Store as base64 chunk string
  fetchedAt: { type: Date, default: Date.now },
});

export default mongoose.models.TeamImage ||
  mongoose.model("TeamImage", TeamImageSchema);
