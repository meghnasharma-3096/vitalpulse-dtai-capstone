import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { advanceSimulatedWeek, getSimulatedDateISO } from "@/lib/data";

export async function GET() {
  return NextResponse.json({ date: getSimulatedDateISO() });
}

export async function POST() {
  const user = await getCurrentUser();
  const result = advanceSimulatedWeek(user);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 403 });
  }
  return NextResponse.json({ ok: true, date: result.date });
}
