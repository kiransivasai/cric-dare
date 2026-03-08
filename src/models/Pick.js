import mongoose from "mongoose";

const AnswerSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    pick: { type: String, required: true },
  },
  { _id: false }
);

const PickSchema = new mongoose.Schema({
  challengeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Challenge",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  username: { type: String, required: true },
  answers: [AnswerSchema],
  score: { type: Number, default: null },
  lockedAt: {
    type: Date,
    default: Date.now,
  },
});

PickSchema.index({ challengeId: 1, userId: 1 }, { unique: true });

export default mongoose.models.Pick || mongoose.model("Pick", PickSchema);
