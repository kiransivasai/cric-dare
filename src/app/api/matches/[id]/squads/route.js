import { NextResponse } from "next/server";
import { getTeamPlayersRapidAPI } from "@/lib/rapidapi";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Settings from "@/models/Settings";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const matchId = params.id;
    if (!matchId) {
      return NextResponse.json({ error: "Match ID required" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const team1Id = searchParams.get("t1");
    const team2Id = searchParams.get("t2");

    if (!team1Id || !team2Id) {
      return NextResponse.json({ error: "Missing team IDs in query parameters" }, { status: 400 });
    }

    const userEmail = session?.user?.email || "anonymous";

    // Verify provider is RapidAPI
    await dbConnect();
    const setting = await Settings.findOne({ key: "apiProvider" });
    const provider = setting?.value || "rapidapi";
    
    if (provider !== "rapidapi") {
       return NextResponse.json({ error: "Squad fetching is only supported with RapidAPI" }, { status: 400 });
    }

    // Fetch players for both teams concurrently directly using the provided IDs
    const [team1Players, team2Players] = await Promise.all([
      getTeamPlayersRapidAPI(matchId, team1Id, userEmail),
      getTeamPlayersRapidAPI(matchId, team2Id, userEmail)
    ]);

    // Force map the correct Team Names for Dropdown Headers
    const urlParams = new URL(request.url).searchParams;
    const t1Name = urlParams.get("t1Name") || "Team 1";
    const t2Name = urlParams.get("t2Name") || "Team 2";

    const mappedTeam1 = team1Players.map(p => ({ ...p, teamName: t1Name }));
    const mappedTeam2 = team2Players.map(p => ({ ...p, teamName: t2Name }));

    // Format and return
    return NextResponse.json({
      team1: {
        id: team1Id,
        players: mappedTeam1
      },
      team2: {
        id: team2Id,
        players: mappedTeam2
      },
      allPlayers: [...mappedTeam1, ...mappedTeam2] // Flat list for easy dropdowns
    });

  } catch (error) {
    console.error("Squads API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch squads", message: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
