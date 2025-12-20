import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Checkout temporarily disabled" },
    { status: 503 }
  );
}
