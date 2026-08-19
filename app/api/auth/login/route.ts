import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, encodeSession, findCredentialById, verifyCredentials } from "@/lib/auth-server";

const ROLE_HOME: Record<string, string> = {
  cfo: "/cfo/dashboard",
  hr_admin: "/hr-admin/dashboard",
  dept_manager: "/dept-manager/dashboard",
  employee: "/employee/dashboard",
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  let cred = null;

  if (typeof body.credentialId === "string") {
    // One-click demo login.
    cred = findCredentialById(body.credentialId);
  } else if (typeof body.email === "string" && typeof body.password === "string") {
    cred = await verifyCredentials(body.email, body.password);
  }

  if (!cred) {
    return NextResponse.json({ ok: false, error: "No matching demo account. Check the email and password." }, { status: 401 });
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, encodeSession({ credentialId: cred.id, role: cred.role }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ ok: true, role: cred.role, redirectTo: ROLE_HOME[cred.role] });
}
