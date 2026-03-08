import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Challenge from "@/models/Challenge";
import User from "@/models/User";
import Pick from "@/models/Pick";
import { nanoid } from "nanoid";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { match, questions, picksLockedBefore, creatorAnswers } = await request.json();

    if (!match || !questions || questions.length < 1 || !picksLockedBefore || !creatorAnswers) {
      return NextResponse.json(
        { error: "Invalid challenge data. Questions, creator answers, and a deadline are required." },
        { status: 400 }
      );
    }

    await dbConnect();

    const shareCode = nanoid(8);

    const challenge = await Challenge.create({
      shareCode,
      createdBy: {
        userId: session.user.id,
        username: session.user.username,
      },
      match: {
        apiMatchId: match.id || match.apiMatchId,
        title: match.name || match.title,
        teams: match.teams,
        matchDate: match.dateTimeGMT || match.matchDate,
        venue: match.venue,
        format: match.matchType || match.format,
        cachedAt: new Date(),
      },
      questions,
      picksLockedBefore: new Date(picksLockedBefore),
      status: "open",
    });

    // Automatically submit the Creator's picks
    const formattedCreatorPicks = questions.map((q) => ({
      questionId: q.id,
      pick: creatorAnswers[q.id]
    }));

    await Pick.create({
      challengeId: challenge._id,
      userId: session.user.id,
      username: session.user.username,
      answers: formattedCreatorPicks,
    });

    // Increment user stats
    await User.findByIdAndUpdate(session.user.id, {
      $inc: { "stats.totalChallengesCreated": 1 },
    });

    return NextResponse.json(
      { shareCode: challenge.shareCode, id: challenge._id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create challenge error:", error);
    return NextResponse.json(
      { error: "Failed to create challenge" },
      { status: 500 }
    );
  }
}
