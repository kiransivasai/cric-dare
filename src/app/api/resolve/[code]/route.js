import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Challenge from "@/models/Challenge";
import Pick from "@/models/Pick";
import User from "@/models/User";
import { scorePicks } from "@/lib/scoring";

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = params;
    const { actualResults, method } = await request.json();

    await dbConnect();

    const challenge = await Challenge.findOne({ shareCode: code });
    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      );
    }

    // Only creator can manually resolve
    if (
      method === "manual" &&
      challenge.createdBy.userId.toString() !== session.user.id
    ) {
      return NextResponse.json(
        { error: "Only the challenge creator can resolve this challenge" },
        { status: 403 }
      );
    }

    if (challenge.status === "resolved") {
      return NextResponse.json(
        { error: "Challenge is already resolved" },
        { status: 400 }
      );
    }

    // Score all picks
    const picks = await Pick.find({ challengeId: challenge._id });

    // Convert actualResults array to a lookup map {questionId: answer}
    const resultsMap = {};
    if (Array.isArray(actualResults)) {
      actualResults.forEach(r => { resultsMap[r.questionId] = r.answer; });
    } else {
      Object.assign(resultsMap, actualResults);
    }

    for (const pick of picks) {
      const score = scorePicks(pick.answers, resultsMap, challenge.questions);
      await Pick.findByIdAndUpdate(pick._id, { score });
      // Update user stats
      await User.findByIdAndUpdate(pick.userId, {
        $inc: { "stats.totalCorrect": score },
      });
    }

    // Update challenge
    await Challenge.findByIdAndUpdate(challenge._id, {
      status: "resolved",
      resolution: {
        method: method || "manual",
        resolvedAt: new Date(),
        resolvedBy: session.user.id,
        actualResults,
      },
    });

    return NextResponse.json({ message: "Challenge resolved!", status: "resolved" });
  } catch (error) {
    console.error("Resolve error:", error);
    return NextResponse.json(
      { error: "Failed to resolve challenge" },
      { status: 500 }
    );
  }
}
