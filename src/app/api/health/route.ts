import { NextResponse } from "next/server";
import { connectDB, isDbConnected } from "@/server/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    return NextResponse.json({
      ok: true,
      db: isDbConnected() ? "connected" : "connecting",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        db: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
