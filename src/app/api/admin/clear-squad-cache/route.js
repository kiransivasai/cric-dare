import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import mongoose from "mongoose";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findById(session.user.id).lean();
    if (!user || user.isAdmin !== true) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const db = mongoose.connection.db;
    await db.collection("squadCache").deleteMany({});

    return NextResponse.json({ message: "Squad cache cleared" });
  } catch (error) {
    console.error("Clear squad cache error:", error);
    return NextResponse.json({ error: "Failed to clear squad cache" }, { status: 500 });
  }
}
