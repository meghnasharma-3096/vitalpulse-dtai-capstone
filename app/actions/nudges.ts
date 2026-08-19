"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth-server";
import { updateNudgeStatus, submitNudgeFeedback } from "@/lib/data";
import { generateNudgeForEmployee, type GeneratedNudgeResult } from "@/lib/subsystem-b";

export async function dismissNudgeAction(nudgeId: string) {
  const user = await getCurrentUser();
  const result = updateNudgeStatus(nudgeId, "dismissed", user);
  revalidatePath("/employee/dashboard");
  revalidatePath("/hr-admin/roi");
  return result;
}

export async function actOnNudgeAction(nudgeId: string) {
  const user = await getCurrentUser();
  const result = updateNudgeStatus(nudgeId, "acted_on", user);
  revalidatePath("/employee/dashboard");
  revalidatePath("/hr-admin/roi");
  return result;
}

export async function submitNudgeFeedbackAction(nudgeId: string, feedback: "helpful" | "not_helpful") {
  const user = await getCurrentUser();
  const result = submitNudgeFeedback(nudgeId, feedback, user);
  revalidatePath("/employee/dashboard");
  return result;
}

/** The only place Subsystem B's UI triggers the shared Gemini wrapper — a Next.js Server Action. */
export async function generateNudgeAction(employeeId: string): Promise<GeneratedNudgeResult> {
  const user = await getCurrentUser();
  const result = await generateNudgeForEmployee(employeeId, user);
  revalidatePath("/hr-admin/roi");
  revalidatePath(`/hr-admin/employees/${employeeId}`);
  revalidatePath("/employee/dashboard");
  return result;
}
