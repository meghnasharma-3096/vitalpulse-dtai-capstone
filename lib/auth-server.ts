import "server-only";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import credentials from "@/data/credentials.json";
import employeesSeed from "@/data/employees.json";
import type { Employee } from "@/lib/data";

const employees = employeesSeed as Employee[];

export type Role = "cfo" | "hr_admin" | "dept_manager" | "employee";

export interface CurrentUser {
  id: string;
  name: string;
  role: Role;
  departmentId?: string;
  employeeId?: string;
}

export const SESSION_COOKIE = "vp_session";

interface SessionPayload {
  credentialId: string;
  role: Role;
}

interface Credential {
  id: string;
  email: string;
  name: string;
  role: Role;
  departmentId: string | null;
  employeeId: string | null;
  passwordHash: string;
}

const CREDENTIALS = credentials as Credential[];

function toCurrentUser(cred: Credential): CurrentUser {
  return {
    id: cred.id,
    name: cred.name,
    role: cred.role,
    departmentId: cred.departmentId ?? undefined,
    employeeId: cred.employeeId ?? undefined,
  };
}

/** Server-only: resolves the logged-in user from the session cookie. Returns null if not logged in. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(raw, "base64url").toString("utf-8"));
  } catch {
    return null;
  }

  const cred = CREDENTIALS.find(c => c.id === payload.credentialId);
  if (!cred) return null;
  return toCurrentUser(cred);
}

export function encodeSession(payload: SessionPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
}

/** Quick, password-less login used by the one-click demo buttons. */
export function findCredentialById(credentialId: string): Credential | null {
  return CREDENTIALS.find(c => c.id === credentialId) ?? null;
}

/** Manual login path for the "demo credentials" fallback form. */
export async function verifyCredentials(email: string, password: string): Promise<Credential | null> {
  const cred = CREDENTIALS.find(c => c.email.toLowerCase() === email.trim().toLowerCase());
  if (!cred) return null;
  const ok = await bcrypt.compare(password, cred.passwordHash);
  return ok ? cred : null;
}

export function credentialToCurrentUser(cred: Credential): CurrentUser {
  return toCurrentUser(cred);
}

export function listDemoAccounts() {
  return CREDENTIALS.map(c => ({
    id: c.id,
    email: c.email,
    name: c.name,
    role: c.role,
    departmentId: c.departmentId,
  }));
}

export function getEmployeeRecordForUser(user: CurrentUser) {
  if (!user.employeeId) return null;
  return employees.find(e => e.id === user.employeeId) ?? null;
}
