import dbConnect from "./mongodb";
import mongoose from "mongoose";
import ApiLog from "@/models/ApiLog";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "cricbuzz-cricket.p.rapidapi.com";

/**
 * Fetch upcoming matches from Cricbuzz via RapidAPI — cached in MongoDB for 1 hour
 */
export async function getUpcomingMatchesRapidAPI(userEmail = "system") {
  await dbConnect();
  const db = mongoose.connection.db;

  const cached = await db.collection("matchCache").findOne({ type: "upcoming" });
  if (cached && Date.now() - new Date(cached.cachedAt).getTime() < 3600000) {
    return cached.matches;
  }

  try {
    const startTime = performance.now();
    const endpoint = "/matches/v1/upcoming";
    
    const res = await fetch(
      `https://${RAPIDAPI_HOST}${endpoint}`,
      {
        headers: {
          "x-rapidapi-host": RAPIDAPI_HOST,
          "x-rapidapi-key": RAPIDAPI_KEY,
        },
        cache: "no-store",
      }
    );
    
    const responseTime = Math.round(performance.now() - startTime);
    
    // Log API Usage
    await ApiLog.create({
      provider: "rapidapi",
      endpoint,
      userEmail,
      status: res.status,
      responseTime
    }).catch(err => console.error("ApiLog error:", err));

    const data = await res.json();

    if (!data.typeMatches) {
      if (cached) return cached.matches;
      return [];
    }

    const matches = [];

    for (const typeMatch of data.typeMatches) {
      if (!typeMatch.seriesMatches) continue;

      for (const seriesMatch of typeMatch.seriesMatches) {
        const wrapper = seriesMatch.seriesAdWrapper;
        if (!wrapper || !wrapper.matches) continue;

        for (const match of wrapper.matches) {
          const info = match.matchInfo;
          if (!info) continue;

          // Only include matches that haven't completed
          if (info.state === "Complete") continue;

          const startDate = info.startDate
            ? new Date(parseInt(info.startDate))
            : null;

          // Only include future matches (or ones starting very soon / in progress)
          if (startDate && startDate.getTime() < Date.now() - 24 * 60 * 60 * 1000) {
            continue;
          }

          matches.push({
            id: String(info.matchId),
            name: `${info.team1?.teamName || "TBD"} vs ${info.team2?.teamName || "TBD"}, ${info.matchDesc}`,
            teams: [
              info.team1?.teamName || "Team 1",
              info.team2?.teamName || "Team 2",
            ],
            team1Id: info.team1?.teamId,
            team2Id: info.team2?.teamId,
            team1ImageId: info.team1?.imageId,
            team2ImageId: info.team2?.imageId,
            matchType: info.matchFormat || typeMatch.matchType,
            venue: info.venueInfo
              ? `${info.venueInfo.ground}, ${info.venueInfo.city}`
              : "TBD",
            date: startDate ? startDate.toISOString() : null,
            dateTimeGMT: startDate ? startDate.toISOString() : null,
            status: info.status,
            state: info.state,
            seriesName: info.seriesName || wrapper.seriesName,
            matchStarted: info.state === "In Progress",
            matchEnded: info.state === "Complete",
          });
        }
      }
    }

    // Sort by date ascending (nearest match first)
    matches.sort(
      (a, b) => new Date(a.dateTimeGMT || 0) - new Date(b.dateTimeGMT || 0)
    );

    await db.collection("matchCache").updateOne(
      { type: "upcoming" },
      { $set: { matches, cachedAt: new Date() } },
      { upsert: true }
    );

    return matches;
  } catch (error) {
    console.error("RapidAPI error:", error);
    if (cached) return cached.matches;
    return [];
  }
}

/**
 * Fetch match scorecard from Cricbuzz via RapidAPI for auto-resolution
 */

export async function getMatchScorecardRapidAPI(matchId, userEmail = "system") {
  try {
    await dbConnect();
    const startTime = performance.now();
    const endpoint = `/mcenter/v1/${matchId}/scard`;
    
    const res = await fetch(
      `https://${RAPIDAPI_HOST}${endpoint}`,
      {
        headers: {
          "x-rapidapi-host": RAPIDAPI_HOST,
          "x-rapidapi-key": RAPIDAPI_KEY,
        },
        cache: "no-store",
      }
    );
    
    const responseTime = Math.round(performance.now() - startTime);
    
    // Log API Usage
    await ApiLog.create({
      provider: "rapidapi",
      endpoint: "/mcenter/v1/.../scard", // generic for charts
      userEmail,
      status: res.status,
      responseTime
    }).catch(err => console.error("ApiLog error:", err));

    const data = await res.json();

    if (!data.scoreCard || !data.matchHeader) return null;

    const header = data.matchHeader;
    const isComplete = header.state === "Complete" || data.isMatchComplete;

    // Extract winner
    const winner = header.result?.winningTeam || null;

    // Extract Man of the Match
    const mom = header.playersOfTheMatch?.[0]?.name || null;

    // Calculate total runs, sixes, fours across all innings
    let totalRuns = 0;
    let totalSixes = 0;
    let totalFours = 0;

    for (const innings of data.scoreCard) {
      totalRuns += innings.scoreDetails?.runs || 0;

      // Sum sixes and fours from batsmen data
      const batsmen = innings.batTeamDetails?.batsmenData || {};
      for (const key of Object.keys(batsmen)) {
        const bat = batsmen[key];
        totalSixes += bat.sixers || bat.sixes || 0;
        totalFours += bat.boundaries || bat.fours || 0;
      }
    }

    return {
      isComplete,
      winner,
      mom,
      totalRuns,
      totalSixes,
      totalFours,
      status: data.status,
      raw: data,
    };
  } catch (error) {
    console.error("RapidAPI scorecard error:", error);
    return null;
  }
}



/**
 * Fetch players for a specific team in a match from Cricbuzz via RapidAPI
 * Cached for 8 hours
 */
export async function getTeamPlayersRapidAPI(matchId, teamId, userEmail = "system") {
  await dbConnect();
  const db = mongoose.connection.db;

  const cacheKey = `team_players_${matchId}_${teamId}`;
  const cached = await db.collection("squadCache").findOne({ type: cacheKey });
  
  // 8 hour cache
  if (cached && Date.now() - new Date(cached.cachedAt).getTime() < 8 * 3600000) {
    return cached.players;
  }

  try {
    const startTime = performance.now();
    const endpoint = `/mcenter/v1/${matchId}/team/${teamId}`;
    
    const res = await fetch(
      `https://${RAPIDAPI_HOST}${endpoint}`,
      {
        headers: {
          "x-rapidapi-host": RAPIDAPI_HOST,
          "x-rapidapi-key": RAPIDAPI_KEY,
        },
        cache: "no-store",
      }
    );
    
    const responseTime = Math.round(performance.now() - startTime);
    
    await ApiLog.create({
      provider: "rapidapi",
      endpoint: "/mcenter/v1/.../team/...", 
      userEmail,
      status: res.status,
      responseTime
    }).catch(err => console.error("ApiLog error:", err));

    const data = await res.json();

    // The payload has a top-level "player" array.
    // Index 0 is usually category="Squad" and contains the actual "player" array.
    if (!data.player || !Array.isArray(data.player) || data.player.length === 0) {
       return [];
    }

    // Find the "Squad" category specifically, or fallback to the first element
    const squadCategory = data.player.find(cat => cat.category?.toLowerCase() === "squad") || data.player[0];
    
    if (!squadCategory || !squadCategory.player || !Array.isArray(squadCategory.player)) {
      return [];
    }

    // Extract team name from the root of the API endpoint if available
    const teamName = data.team?.name || "Squad";
    const parsedTeamId = data.team?.id || teamId; 
    
    // Attempt to salvage the Team Image Id if available in root, otherwise we use the FaceImageId of the player
    const teamImageId = data.team?.imageId || null;

    const players = squadCategory.player.map(p => ({
      id: p.id,
      name: p.name,
      role: p.role || "",
      teamName: teamName, // Injected for grouping UI
      teamId: parsedTeamId,
      imageId: p.faceImageId || teamImageId || null
    })) || [];

    // Cache the result
    await db.collection("squadCache").updateOne(
      { type: cacheKey },
      { $set: { players, cachedAt: new Date() } },
      { upsert: true }
    );

    return players;
  } catch (error) {
    console.error("RapidAPI team players error:", error);
    if (cached) return cached.players;
    return [];
  }
}
