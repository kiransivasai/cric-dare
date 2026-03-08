import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Challenge from "@/models/Challenge";
import Pick from "@/models/Pick";

export async function GET(request, { params }) {
  try {
    const { code } = params;

    await dbConnect();

    const challenge = await Challenge.findOne({ shareCode: code });
    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      );
    }

    const picks = await Pick.find({ challengeId: challenge._id }).sort({
      score: -1,
      lockedAt: 1,
    });

    return NextResponse.json({
      challenge: {
        id: challenge._id,
        shareCode: challenge.shareCode,
        createdBy: challenge.createdBy,
        match: challenge.match,
        questions: challenge.questions,
        status: challenge.status,
        resolution: challenge.resolution,
      },
      picks: picks.map((p) => ({
        userId: p.userId,
        username: p.username,
        answers: p.answers,
        score: p.score,
        lockedAt: p.lockedAt,
      })),
    });
  } catch (error) {
    console.error("Get picks error:", error);
    return NextResponse.json(
      { error: "Failed to fetch picks" },
      { status: 500 }
    );
  }
}
