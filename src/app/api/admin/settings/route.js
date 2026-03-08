import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Settings from "@/models/Settings";
import User from "@/models/User";

// GET: Fetch admin settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !session.user.id) {
      console.log("[DEBUG API GET] No session found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Check if user is admin
    const user = await User.findById(session.user.id).lean();
    
    if (!user || user.isAdmin !== true) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const settings = await Settings.find({});
    const settingsMap = {};
    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    return NextResponse.json({
      settings: {
        apiProvider: settingsMap.apiProvider || "rapidapi",
        ...settingsMap,
      },
    });
  } catch (error) {
    console.error("Admin settings GET error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

// POST: Update admin settings
export async function POST(request) {
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

    const body = await request.json();
    console.log("[DEBUG API POST] Received body:", body);
    const { key, value } = body;

    if (!key) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }

    console.log("[DEBUG API POST] Updating via findOneAndUpdate:", { key, value });
    const result = await Settings.findOneAndUpdate(
      { key },
      { value, updatedAt: new Date(), updatedBy: session.user.id },
      { upsert: true, new: true }
    );
    console.log("[DEBUG API POST] Update success:", !!result);

    return NextResponse.json({ message: "Setting updated", key, value });
  } catch (error) {
    console.error("[DEBUG API POST] Critical error:", error.message, error.stack);
    return NextResponse.json({ error: "Failed to update setting: " + error.message }, { status: 500 });
  }
}
