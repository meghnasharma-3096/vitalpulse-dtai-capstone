// Pure arithmetic, deliberately free of server-only imports so the live ROI
// calculator can recompute instantly on the client with no round trip per slider tick.

export interface RoiAssumptions {
  avgAnnualClaimsCostINR: number;
  avgAbsenteeismDaysPerAtRiskEmployee: number;
  absenteeismDailyCostINR: number;
  avgAttritionCostINR: number;
  engagementRatePercent: number; // 0-100, the live-adjustable slider
}

export const DEFAULT_ROI_ASSUMPTIONS: RoiAssumptions = {
  avgAnnualClaimsCostINR: 42000,
  avgAbsenteeismDaysPerAtRiskEmployee: 6,
  absenteeismDailyCostINR: 3500,
  avgAttritionCostINR: 220000,
  engagementRatePercent: 35,
};

const ATTRITION_AVOIDANCE_FACTOR = 0.25;
const CLAIMS_REDUCTION_FACTOR = 0.15;

export interface RoiContext {
  atRiskEmployeeCount: number;
  avgProgramCostPerEmployeeINR: number;
  totalRemainingBudgetINR: number;
}

export interface RoiResult {
  attritionsAvoided: number;
  absenteeismDaysAvoided: number;
  claimsSavingsINR: number;
  attritionSavingsINR: number;
  absenteeismSavingsINR: number;
  totalSavingsINR: number;
  programCostINR: number;
  netSavingsINR: number;
  roiMultiple: number;
  exceedsBudget: boolean;
  budgetOverrunINR: number;
}

/** Guards against negative/NaN/Infinity at the extremes (0% and 100% engagement). */
export function calculateRoi(assumptions: RoiAssumptions, ctx: RoiContext): RoiResult {
  const engagementRate = Math.min(100, Math.max(0, assumptions.engagementRatePercent)) / 100;
  const engagedCount = ctx.atRiskEmployeeCount * engagementRate;

  const attritionsAvoided = engagedCount * ATTRITION_AVOIDANCE_FACTOR;
  const absenteeismDaysAvoided = engagedCount * assumptions.avgAbsenteeismDaysPerAtRiskEmployee;
  const claimsSavingsINR = engagedCount * assumptions.avgAnnualClaimsCostINR * CLAIMS_REDUCTION_FACTOR;
  const attritionSavingsINR = attritionsAvoided * assumptions.avgAttritionCostINR;
  const absenteeismSavingsINR = absenteeismDaysAvoided * assumptions.absenteeismDailyCostINR;

  const totalSavingsINR = Math.max(0, claimsSavingsINR + attritionSavingsINR + absenteeismSavingsINR);
  const programCostINR = Math.max(0, engagedCount * ctx.avgProgramCostPerEmployeeINR);
  const netSavingsINR = totalSavingsINR - programCostINR;
  const roiMultiple = programCostINR > 0 ? totalSavingsINR / programCostINR : 0;

  const budgetOverrunINR = Math.max(0, programCostINR - ctx.totalRemainingBudgetINR);
  const exceedsBudget = budgetOverrunINR > 0;

  return {
    attritionsAvoided,
    absenteeismDaysAvoided,
    claimsSavingsINR,
    attritionSavingsINR,
    absenteeismSavingsINR,
    totalSavingsINR,
    programCostINR,
    netSavingsINR,
    roiMultiple,
    exceedsBudget,
    budgetOverrunINR,
  };
}
