import { NextResponse } from "next/server";
import admin from "@/lib/firebase/admin";

export async function POST(req: Request) {
  try {
    const { uid } = await req.json();

    if (!uid) {
      return NextResponse.json(
        { error: "Missing uid" },
        { status: 400 }
      );
    }

    await admin.auth().updateUser(uid, {
      disabled: false,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Enable user error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to enable user" },
      { status: 500 }
    );
  }
}
