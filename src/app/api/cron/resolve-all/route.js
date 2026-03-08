import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Challenge from "@/models/Challenge";
import Pick from "@/models/Pick";
import User from "@/models/User";
import { getMatchResult } from "@/lib/cricapi";
import { scorePicks, matchBracket } from "@/lib/scoring";

export async function GET(request) {
  // Verify cron secret
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();

    const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);

    // Find open challenges where match should have ended
    const challenges = await Challenge.find({
      status: "open",
      "match.matchDate": { $lt: eightHoursAgo },
    });

    let resolved = 0;
    let skipped = 0;
    let failed = 0;

    for (const challenge of challenges) {
      try {
        const result = await getMatchResult(challenge.match.apiMatchId);

        if (!result || !result.data || !result.data.matchEnded) {
          skipped++;
          continue;
        }

        const matchData = result.data;
        const actualResults = {};

        // Q1: Winner
        actualResults.q1 = matchData.matchWinner || null;

        // Q2: MOM
        actualResults.q2 = matchData.manOfTheMatch || null;

        // Q3-Q5: Would need actual score data processing
        // For now, these would need manual resolution if auto data isn't clean enough

        if (!actualResults.q1) {
          // Increment attempt counter
          await Challenge.findByIdAndUpdate(challenge._id, {
            $inc: { autoResolveAttempts: 1 },
          });

          // After 3 attempts, flag for manual resolution
          if ((challenge.autoResolveAttempts || 0) >= 2) {
            await Challenge.findByIdAndUpdate(challenge._id, {
              needsManualResolution: true,
            });
          }
          failed++;
          continue;
        }

        // Score all picks
        const picks = await Pick.find({ challengeId: challenge._id });
        for (const pick of picks) {
          const score = scorePicks(
            pick.answers,
            actualResults,
            challenge.questions
          );
          await Pick.findByIdAndUpdate(pick._id, { score });
          await User.findByIdAndUpdate(pick.userId, {
            $inc: { "stats.totalCorrect": score },
          });
        }

        await Challenge.findByIdAndUpdate(challenge._id, {
          status: "resolved",
          resolution: {
            method: "auto",
            resolvedAt: new Date(),
            actualResults,
          },
        });

        resolved++;
      } catch (err) {
        console.error(`Failed to resolve challenge ${challenge.shareCode}:`, err);
        failed++;
      }
    }

    return NextResponse.json({
      message: `Processed ${challenges.length} challenges: ${resolved} resolved, ${skipped} skipped, ${failed} failed`,
    });
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json(
      { error: "Cron job failed" },
      { status: 500 }
    );
  }
}
