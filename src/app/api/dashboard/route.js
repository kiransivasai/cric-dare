import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Challenge from "@/models/Challenge";
import Pick from "@/models/Pick";
import User from "@/models/User";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Get user stats
    const user = await User.findById(session.user.id).select("stats");

    // Challenges created by user
    const createdChallenges = await Challenge.find({
      "createdBy.userId": session.user.id,
    })
      .sort({ createdAt: -1 })
      .limit(20);

    // Get participant counts for created challenges
    const createdWithCounts = await Promise.all(
      createdChallenges.map(async (c) => {
        const participantCount = await Pick.countDocuments({
          challengeId: c._id,
        });
        return {
          shareCode: c.shareCode,
          match: c.match,
          status: c.status,
          picksLockedBefore: c.picksLockedBefore,
          needsManualResolution: c.needsManualResolution,
          participantCount,
          createdAt: c.createdAt,
        };
      })
    );

    // Challenges joined by user (where they submitted picks)
    const myPicks = await Pick.find({ userId: session.user.id })
      .sort({ lockedAt: -1 })
      .limit(20);

    const joinedChallenges = await Promise.all(
      myPicks.map(async (pick) => {
        const challenge = await Challenge.findById(pick.challengeId);
        if (!challenge) return null;
        return {
          shareCode: challenge.shareCode,
          match: challenge.match,
          status: challenge.status,
          createdBy: challenge.createdBy,
          myScore: pick.score,
        };
      })
    );

    return NextResponse.json({
      stats: user?.stats || {},
      createdChallenges: createdWithCounts,
      joinedChallenges: joinedChallenges.filter(Boolean),
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard" },
      { status: 500 }
    );
  }
}
