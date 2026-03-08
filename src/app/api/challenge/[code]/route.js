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

    // Get participants directly from the username field
    const picks = await Pick.find({ challengeId: challenge._id })
      .select("username")
      .lean();

    const participants = picks.map((p) => p.username).filter(Boolean);
    const participantCount = participants.length;

    return NextResponse.json({
      challenge: {
        id: challenge._id,
        shareCode: challenge.shareCode,
        createdBy: challenge.createdBy,
        match: challenge.match,
        questions: challenge.questions,
        picksLockedBefore: challenge.picksLockedBefore,
        status: challenge.status,
        resolution: challenge.resolution,
        needsManualResolution: challenge.needsManualResolution,
        createdAt: challenge.createdAt,
        participantCount,
        participants,
      },
    });
  } catch (error) {
    console.error("Get challenge error:", error);
    return NextResponse.json(
      { error: "Failed to fetch challenge" },
      { status: 500 }
    );
  }
}
