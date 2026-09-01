"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth-server";
import {
  approveIntervention,
  rejectIntervention,
  escalateIntervention,
  createDraftIntervention,
  checkAutoEscalations,
} from "@/lib/subsystem-c";

export async function approveInterventionAction(interventionId: string) {
  const user = await getCurrentUser();
  const result = await approveIntervention(interventionId, user);
  revalidatePath("/hr-admin/burnout-radar");
  revalidatePath("/dept-manager/dashboard");
  revalidatePath("/cfo/dashboard");
  return result;
}

export async function rejectInterventionAction(interventionId: string) {
  const user = await getCurrentUser();
  const result = await rejectIntervention(interventionId, user);
  revalidatePath("/hr-admin/burnout-radar");
  revalidatePath("/dept-manager/dashboard");
  revalidatePath("/cfo/dashboard");
  return result;
}

export async function escalateInterventionAction(interventionId: string, reason: string) {
  const user = await getCurrentUser();
  const result = await escalateIntervention(interventionId, reason, user);
  revalidatePath("/hr-admin/burnout-radar");
  revalidatePath("/dept-manager/dashboard");
  revalidatePath("/cfo/dashboard");
  return result;
}

export async function draftInterventionAction(departmentId: string) {
  const user = await getCurrentUser();
  const result = await createDraftIntervention(departmentId, user);
  revalidatePath("/hr-admin/burnout-radar");
  revalidatePath("/dept-manager/dashboard");
  revalidatePath("/cfo/dashboard");
  return result;
}

export async function checkAutoEscalationsAction() {
  const user = await getCurrentUser();
  const result = await checkAutoEscalations(user);
  if (result.escalatedCount > 0) {
    revalidatePath("/hr-admin/burnout-radar");
    revalidatePath("/cfo/dashboard");
  }
  return result;
}
