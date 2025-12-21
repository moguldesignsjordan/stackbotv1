import { NextResponse } from "next/server";
import admin from "@/lib/firebase/admin";

export async function POST(req: Request) {
  const { uid } = await req.json();

  await admin.auth().updateUser(uid, { disabled: true });

  return NextResponse.json({ success: true });
}
