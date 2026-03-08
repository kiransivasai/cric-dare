import dbConnect from "./mongodb";
import mongoose from "mongoose";
import ApiLog from "@/models/ApiLog";

const CRICAPI_KEY = process.env.CRICAPI_KEY;

/**
 * Fetch upcoming matches — cached in MongoDB for 1 hour
 */
export async function getUpcomingMatches(userEmail = "system") {
  await dbConnect();
  const db = mongoose.connection.db;

  const cached = await db.collection("matchCache").findOne({ type: "upcoming" });
  if (cached && Date.now() - new Date(cached.cachedAt).getTime() < 3600000) {
    return cached.matches;
  }

  try {
    const startTime = performance.now();
    const endpoint = "/v1/currentMatches";
    
    const res = await fetch(
      `https://api.cricapi.com${endpoint}?apikey=${CRICAPI_KEY}&offset=0`,
      { cache: "no-store" }
    );
    
    const responseTime = Math.round(performance.now() - startTime);
    
    // Log API Usage
    await ApiLog.create({
      provider: "cricapi",
      endpoint,
      userEmail,
      status: res.status,
      responseTime
    }).catch(err => console.error("ApiLog error:", err));
    
    const data = await res.json();

    if (data.status !== "success") {
      // Return cached data if available, even if stale
      if (cached) return cached.matches;
      return [];
    }

    const matches = (data.data || [])
      .filter((m) => m.matchType && m.matchType !== "domestic")
      .map((m) => ({
        id: m.id,
        name: m.name,
        teams: m.teams || [],
        matchType: m.matchType,
        venue: m.venue,
        date: m.date,
        dateTimeGMT: m.dateTimeGMT,
        status: m.status,
        matchStarted: m.matchStarted,
        matchEnded: m.matchEnded,
      }));

    await db.collection("matchCache").updateOne(
      { type: "upcoming" },
      { $set: { matches, cachedAt: new Date() } },
      { upsert: true }
    );

    return matches;
  } catch (error) {
    console.error("CricAPI error:", error);
    if (cached) return cached.matches;
    return [];
  }
}

/**
 * Fetch final match result for resolution
 */
export async function getMatchResult(apiMatchId, userEmail = "system") {
  try {
    await dbConnect();
    const startTime = performance.now();
    const endpoint = "/v1/match_info";
    
    const res = await fetch(
      `https://api.cricapi.com${endpoint}?apikey=${CRICAPI_KEY}&id=${apiMatchId}`,
      { cache: "no-store" }
    );
    
    const responseTime = Math.round(performance.now() - startTime);
    
    // Log API Usage
    await ApiLog.create({
      provider: "cricapi",
      endpoint,
      userEmail,
      status: res.status,
      responseTime
    }).catch(err => console.error("ApiLog error:", err));

    return res.json();
  } catch (error) {
    console.error("CricAPI match result error:", error);
    return null;
  }
}
