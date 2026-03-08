import mongoose from "mongoose";

const ApiLogSchema = new mongoose.Schema({
  provider: {
    type: String,
    required: true,
    enum: ["cricapi", "rapidapi"],
  },
  endpoint: {
    type: String,
    required: true,
  },
  userEmail: {
    type: String,
    default: "system", // 'system' for cron jobs, or the user's email
  },
  status: {
    type: Number,
    required: true,
  },
  responseTime: {
    type: Number, // in milliseconds
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 24 * 30, // Auto-delete logs older than 30 days
  },
});

// Prevent Next.js hot-reload from caching the old schema
if (mongoose.models.ApiLog) {
  delete mongoose.models.ApiLog;
}

export default mongoose.model("ApiLog", ApiLogSchema);
