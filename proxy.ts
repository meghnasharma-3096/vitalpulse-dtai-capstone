import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "vp_session";

type Role = "cfo" | "hr_admin" | "dept_manager" | "employee";

const ROLE_HOME: Record<Role, string> = {
  cfo: "/cfo/dashboard",
  hr_admin: "/hr-admin/dashboard",
  dept_manager: "/dept-manager/dashboard",
  employee: "/employee/dashboard",
};

const ROLE_PREFIX: Record<Role, string> = {
  cfo: "/cfo",
  hr_admin: "/hr-admin",
  dept_manager: "/dept-manager",
  employee: "/employee",
};

function decodeSession(raw: string | undefined): { credentialId: string; role: Role } | null {
  if (!raw) return null;
  try {
    const json = Buffer.from(raw, "base64url").toString("utf-8");
    const payload = JSON.parse(json);
    if (payload && typeof payload.role === "string" && typeof payload.credentialId === "string") {
      return payload;
    }
    return null;
  } catch {
    return null;
  }
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = decodeSession(req.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/login") {
    if (session) {
      return NextResponse.redirect(new URL(ROLE_HOME[session.role], req.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL(session ? ROLE_HOME[session.role] : "/login", req.url));
  }

  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const allowedPrefix = ROLE_PREFIX[session.role];
  const isOwnArea = pathname.startsWith(allowedPrefix);
  // Dept Manager gets "the same views as HR Admin but scoped server-side to their
  // own department only" (system-design.md Section 4) for the employee directory
  // and ROI calculator specifically — lib/data.ts enforces the department scoping,
  // this just grants route access.
  const isScopedHrAdminView =
    session.role === "dept_manager" && (pathname.startsWith("/hr-admin/employees") || pathname.startsWith("/hr-admin/roi"));

  if (!isOwnArea && !isScopedHrAdminView) {
    return NextResponse.redirect(new URL(ROLE_HOME[session.role], req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
