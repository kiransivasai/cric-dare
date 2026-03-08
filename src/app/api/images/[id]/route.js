import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import TeamImage from "@/models/TeamImage";

export const dynamic = "force-dynamic";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "cricbuzz-cricket.p.rapidapi.com";

export async function GET(request, { params }) {
  const { id } = params;

  if (!id) {
    return new NextResponse("Missing Image ID", { status: 400 });
  }

  try {
    await dbConnect();
    
    // Check if image handles cached in Mongo mapped by its original numeric string identifier
    let cachedImage = await TeamImage.findOne({ imageId: id });
    
    if (cachedImage) {
      // Decode base64 stored image back to buffer
      const buffer = Buffer.from(cachedImage.base64Data, "base64");
      
      // Serve the image stream back to browser securely and efficiently!
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": cachedImage.contentType,
          "Cache-Control": "public, max-age=31536000, immutable", // Tell browser to cache this 1 yr
        },
      });
    }

    // Uncached - Hit RapidAPI Serverlessly 
    const endpoint = `https://${RAPIDAPI_HOST}/img/v1/i1/c${id}/i.jpg`;
    
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": RAPIDAPI_KEY,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(`Failed to fetch image ${id} from RapidAPI, status: ${res.status}`);
      return new NextResponse(`Image not found on source ${id}`, { status: res.status });
    }

    // Process and convert upstream array stream correctly
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const base64Str = buffer.toString("base64");

    // Cache indefinitely (Until Admin explicitly clears this db)
    await TeamImage.create({
      imageId: id,
      contentType: contentType,
      base64Data: base64Str,
    });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });

  } catch (err) {
    console.error(`Internal error proxying Image API for ${id}`, err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
