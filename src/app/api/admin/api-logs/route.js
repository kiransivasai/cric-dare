import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import ApiLog from "@/models/ApiLog";
import User from "@/models/User";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Check if user is admin
    const user = await User.findById(session.user.id).lean();
    if (!user || user.isAdmin !== true) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Aggregate counts by provider
    const counts = await ApiLog.aggregate([
      {
        $group: {
          _id: "$provider",
          count: { $sum: 1 },
          avgResponseTime: { $avg: "$responseTime" }
        }
      }
    ]);

    const stats = {
      cricapi: { count: 0, avgResponseTime: 0 },
      rapidapi: { count: 0, avgResponseTime: 0 }
    };

    counts.forEach(c => {
      if (c._id === "cricapi") {
        stats.cricapi.count = c.count;
        stats.cricapi.avgResponseTime = Math.round(c.avgResponseTime || 0);
      } else if (c._id === "rapidapi") {
        stats.rapidapi.count = c.count;
        stats.rapidapi.avgResponseTime = Math.round(c.avgResponseTime || 0);
      }
    });

    // Fetch the 50 most recent logs for a table/timeline view
    const recentLogs = await ApiLog.find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Aggregate counts by endpoint
    const endpointCounts = await ApiLog.aggregate([
      {
        $group: {
          _id: { provider: "$provider", endpoint: "$endpoint" },
          count: { $sum: 1 },
          avgResponseTime: { $avg: "$responseTime" }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const formattedEndpointCounts = endpointCounts.map(c => ({
      provider: c._id.provider,
      endpoint: c._id.endpoint,
      count: c.count,
      avgResponseTime: Math.round(c.avgResponseTime || 0)
    }));

    return NextResponse.json({ stats, recentLogs, endpointCounts: formattedEndpointCounts });
  } catch (error) {
    console.error("API Logs GET error:", error);
    return NextResponse.json({ error: "Failed to fetch API logs" }, { status: 500 });
  }
}
