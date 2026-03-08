import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Challenge from "@/models/Challenge";
import Pick from "@/models/Pick";
import User from "@/models/User";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { shareCode, answers } = await request.json();

    if (!shareCode || !answers || answers.length < 1) {
      return NextResponse.json(
        { error: "All answers are required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const challenge = await Challenge.findOne({ shareCode });
    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      );
    }

    // Check deadline
    if (new Date() > new Date(challenge.picksLockedBefore)) {
      return NextResponse.json(
        { error: "Picks are closed for this challenge. Deadline has passed." },
        { status: 400 }
      );
    }

    // Check for existing picks
    const existingPick = await Pick.findOne({
      challengeId: challenge._id,
      userId: session.user.id,
    });

    if (existingPick) {
      return NextResponse.json(
        { error: "You have already submitted your picks for this challenge" },
        { status: 409 }
      );
    }

    // Save picks
    await Pick.create({
      challengeId: challenge._id,
      userId: session.user.id,
      username: session.user.username,
      answers,
    });

    // Update user stats
    await User.findByIdAndUpdate(session.user.id, {
      $inc: { "stats.totalPredictions": 1 },
    });

    return NextResponse.json(
      { message: "Picks locked! 🔒 Check back after the match." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Submit picks error:", error);
    return NextResponse.json(
      { error: "Failed to submit picks" },
      { status: 500 }
    );
  }
}
