import mongoose from "mongoose";

const QuestionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ["winner", "mom", "highestScorer", "mostWickets", "totalRuns", "sixes", "fours"],
      required: true,
    },
    label: { type: String, required: true },
    options: [{ type: mongoose.Schema.Types.Mixed }], // Mixed to support both Strings and {name, imageId} objects
  },
  { _id: false }
);

const ChallengeSchema = new mongoose.Schema({
  shareCode: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  createdBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String, required: true },
  },
  match: {
    apiMatchId: { type: String },
    title: { type: String, required: true },
    teams: [{ type: String }],
    matchDate: { type: Date, required: true },
    venue: { type: String },
    format: { type: String },
    cachedAt: { type: Date },
  },
  questions: [QuestionSchema],
  picksLockedBefore: { type: Date, required: true },
  status: {
    type: String,
    enum: ["open", "locked", "resolved"],
    default: "open",
  },
  resolution: {
    method: { type: String, enum: ["auto", "manual", null], default: null },
    resolvedAt: { type: Date },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actualResults: { type: mongoose.Schema.Types.Mixed },
  },
  needsManualResolution: { type: Boolean, default: false },
  autoResolveAttempts: { type: Number, default: 0 },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Challenge ||
  mongoose.model("Challenge", ChallengeSchema);
