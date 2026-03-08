import { NextResponse } from "next/server";
import { getUpcomingMatches } from "@/lib/cricapi";
import { getUpcomingMatchesRapidAPI } from "@/lib/rapidapi";
import dbConnect from "@/lib/mongodb";
import Settings from "@/models/Settings";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

async function getApiProvider() {
  try {
    await dbConnect();
    const setting = await Settings.findOne({ key: "apiProvider" });
    return setting?.value || "rapidapi";
  } catch {
    return "rapidapi";
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email || "anonymous";
    const provider = await getApiProvider();

    let matches = [];
    if (provider === "rapidapi") {
      matches = await getUpcomingMatchesRapidAPI(userEmail);
    } else {
      matches = await getUpcomingMatches(userEmail);
    }

    return NextResponse.json({ matches, provider });
  } catch (error) {
    console.error("Matches API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch matches", matches: [] },
      { status: 500 }
    );
  }
}
