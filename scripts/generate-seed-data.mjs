// One-time seed data generator for /data — run with `node scripts/generate-seed-data.mjs`.
// Re-run only if you intend to regenerate the whole dataset; hand edits to /data/*.json
// after the first run will be overwritten.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");

const rand = (seedState => {
  // Deterministic PRNG (mulberry32) so the dataset is stable across re-runs.
  let a = seedState;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})(20260819);

function pick(arr) {
  return arr[Math.floor(rand() * arr.length)];
}
function randInt(min, max) {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function randFloat(min, max, dp = 2) {
  return Number((rand() * (max - min) + min).toFixed(dp));
}
function dateBetween(startISO, endISO) {
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();
  const t = start + rand() * (end - start);
  return new Date(t).toISOString().slice(0, 10);
}
function daysAgo(n) {
  const d = new Date("2026-08-19T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}
function mondayOf(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

// ---------- Departments ----------
const DEPARTMENTS = [
  { id: "DEPT-ENG", name: "Engineering", headcount: 18, budgetAllocatedINR: 900000, budgetUsedINR: 860000 },
  { id: "DEPT-SALES", name: "Sales", headcount: 22, budgetAllocatedINR: 700000, budgetUsedINR: 668000 },
  { id: "DEPT-CS", name: "Customer Success", headcount: 15, budgetAllocatedINR: 520000, budgetUsedINR: 497000 },
  { id: "DEPT-MKT", name: "Marketing", headcount: 10, budgetAllocatedINR: 380000, budgetUsedINR: 355000 },
  { id: "DEPT-OPS", name: "Operations", headcount: 14, budgetAllocatedINR: 460000, budgetUsedINR: 430000 },
  { id: "DEPT-FIN", name: "Finance", headcount: 8, budgetAllocatedINR: 300000, budgetUsedINR: 275000 },
  { id: "DEPT-HR", name: "HR", headcount: 6, budgetAllocatedINR: 240000, budgetUsedINR: 215000 },
  { id: "DEPT-PROD", name: "Product", headcount: 7, budgetAllocatedINR: 260000, budgetUsedINR: 240000 },
  { id: "DEPT-DESIGN", name: "Design", headcount: 3, budgetAllocatedINR: 120000, budgetUsedINR: 54000 },
];

const ROLE_TITLES = {
  "DEPT-ENG": ["Engineering Manager", "Senior Software Engineer", "Software Engineer", "QA Engineer", "DevOps Engineer", "Engineering Team Lead"],
  "DEPT-SALES": ["Sales Manager", "Account Executive", "Sales Development Rep", "Regional Sales Lead", "Sales Operations Analyst"],
  "DEPT-CS": ["Customer Success Manager", "Customer Success Associate", "Support Engineer", "Onboarding Specialist"],
  "DEPT-MKT": ["Marketing Manager", "Content Strategist", "Growth Marketer", "Brand Designer", "Marketing Analyst"],
  "DEPT-OPS": ["Operations Manager", "Operations Analyst", "Facilities Coordinator", "Vendor Relations Specialist"],
  "DEPT-FIN": ["Finance Manager", "Financial Analyst", "Accounts Payable Specialist", "FP&A Analyst"],
  "DEPT-HR": ["HR Manager", "HR Business Partner", "People Ops Specialist", "Recruiter"],
  "DEPT-PROD": ["Product Manager", "Product Analyst", "Product Ops Specialist"],
  "DEPT-DESIGN": ["Design Manager", "Product Designer", "UX Researcher"],
};

const FIRST_NAMES = ["Ananya","Rohan","Priya","Karan","Devika","Aditya","Meera","Vikram","Sneha","Arjun","Ishaan","Kavya","Rahul","Neha","Aman","Pooja","Siddharth","Riya","Nikhil","Tanvi","Varun","Divya","Sahil","Ritika","Aarav","Simran","Yash","Ananya","Manish","Shreya","Kabir","Nisha","Gaurav","Anjali","Rajat","Swati","Harsh","Pallavi","Vivek","Sanya","Dev","Ira","Om","Tara","Kunal","Bhavna","Rishi","Alisha","Naveen","Preeti"];
const LAST_NAMES = ["Iyer","Malhotra","Nair","Verma","Rao","Sharma","Kapoor","Gupta","Menon","Reddy","Chatterjee","Bose","Pillai","Joshi","Kulkarni","Desai","Mehta","Agarwal","Bhatt","Chawla","Chopra","Dutta","Ghosh","Kaur","Khan","Mishra","Nambiar","Pandey","Rana","Saxena","Sinha","Trivedi","Yadav","Zaveri","Bajaj","Chandra","Dixit","Fernandes","Grover","Hegde"];

const PERSONA_WEIGHTS = [
  ["standard", 0.55],
  ["high_performer", 0.17],
  ["at_risk", 0.16],
  ["new_parent", 0.12],
];
function weightedPersona() {
  const r = rand();
  let acc = 0;
  for (const [tag, w] of PERSONA_WEIGHTS) {
    acc += w;
    if (r <= acc) return tag;
  }
  return "standard";
}

function riskForPersona(tag) {
  switch (tag) {
    case "at_risk": return randFloat(0.62, 0.9);
    case "high_performer": return rand() < 0.2 ? randFloat(0.58, 0.78) : randFloat(0.08, 0.35);
    case "new_parent": return randFloat(0.28, 0.5);
    default: return randFloat(0.05, 0.4);
  }
}

const employees = [];
const usedEmails = new Set();
let empCounter = 1;

function nextEmpId() {
  return `EMP-${String(empCounter++).padStart(4, "0")}`;
}
function makeEmail(first, last) {
  let base = `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, "");
  let email = `${base}@meridiananalytics.com`;
  let n = 1;
  while (usedEmails.has(email)) {
    email = `${base}${n}@meridiananalytics.com`;
    n++;
  }
  usedEmails.add(email);
  return email;
}

// Fixed, named persona showcase employees (guaranteed one of each, referenced by credentials.json)
const NAMED_PERSONAS = [
  { first: "Ananya", last: "Iyer", dept: "DEPT-ENG", personaTag: "new_parent", disengagementRiskScore: 0.38, lastCheckIn: daysAgo(22), optedOut: false, hireDate: "2022-03-14" },
  { first: "Rohan", last: "Malhotra", dept: "DEPT-SALES", personaTag: "high_performer", disengagementRiskScore: 0.74, lastCheckIn: daysAgo(78), optedOut: false, hireDate: "2021-06-01" },
  { first: "Priya", last: "Nair", dept: "DEPT-CS", personaTag: "at_risk", disengagementRiskScore: 0.83, lastCheckIn: daysAgo(91), optedOut: false, hireDate: "2020-11-09" },
  { first: "Karan", last: "Verma", dept: "DEPT-MKT", personaTag: "standard", disengagementRiskScore: 0.21, lastCheckIn: daysAgo(9), optedOut: false, hireDate: "2023-01-20" },
  { first: "Devika", last: "Rao", dept: "DEPT-OPS", personaTag: "standard", disengagementRiskScore: 0.4, lastCheckIn: daysAgo(45), optedOut: true, hireDate: "2022-08-11" },
];

const namedPersonaEmployeeIds = {};

for (const dept of DEPARTMENTS) {
  const deptManagerId = nextEmpId();
  const managerTitle = ROLE_TITLES[dept.id][0];
  const mFirst = pick(FIRST_NAMES);
  const mLast = pick(LAST_NAMES);
  employees.push({
    id: deptManagerId,
    name: `${mFirst} ${mLast}`,
    email: makeEmail(mFirst, mLast),
    departmentId: dept.id,
    roleTitle: managerTitle,
    hireDate: dateBetween("2017-01-01", "2021-01-01"),
    managerId: "EMP-0000",
    personaTag: "standard",
    optedOut: false,
    disengagementRiskScore: randFloat(0.05, 0.25),
    lastCheckIn: daysAgo(randInt(1, 20)),
  });
  dept.managerId = deptManagerId;

  const namedForThisDept = NAMED_PERSONAS.filter(p => p.dept === dept.id);
  const regularSlots = dept.headcount - 1 - namedForThisDept.length;

  for (const np of namedForThisDept) {
    const id = nextEmpId();
    namedPersonaEmployeeIds[`${np.first}_${np.last}`] = id;
    employees.push({
      id,
      name: `${np.first} ${np.last}`,
      email: makeEmail(np.first, np.last),
      departmentId: dept.id,
      roleTitle: pick(ROLE_TITLES[dept.id].slice(1)),
      hireDate: np.hireDate,
      managerId: deptManagerId,
      personaTag: np.personaTag,
      optedOut: np.optedOut,
      disengagementRiskScore: np.disengagementRiskScore,
      lastCheckIn: np.lastCheckIn,
    });
  }

  for (let i = 0; i < regularSlots; i++) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const personaTag = weightedPersona();
    const optedOut = rand() < 0.045;
    const risk = riskForPersona(personaTag);
    employees.push({
      id: nextEmpId(),
      name: `${first} ${last}`,
      email: makeEmail(first, last),
      departmentId: dept.id,
      roleTitle: pick(ROLE_TITLES[dept.id].slice(1)),
      hireDate: dateBetween("2018-01-01", "2026-05-01"),
      managerId: deptManagerId,
      personaTag,
      optedOut,
      disengagementRiskScore: risk,
      lastCheckIn: risk > 0.6 ? daysAgo(randInt(60, 140)) : daysAgo(randInt(1, 55)),
    });
  }
}

// ---------- Wellness programs (Subsystem A owns the business logic, seed data still needed) ----------
// costPerEmployeeINR is an annual per-enrolled-employee cost (matches the annual
// horizon of the ROI calculator's claims/attrition/absenteeism assumptions).
const wellnessPrograms = [
  { id: "PROG-001", name: "MindEase Therapy Sessions", category: "mental_health", provider: "MindEase Wellness", capacity: 60, enrolledCount: 47, costPerEmployeeINR: 22000 },
  { id: "PROG-002", name: "CultFit Corporate Membership", category: "fitness", provider: "CultFit", capacity: 100, enrolledCount: 88, costPerEmployeeINR: 18000 },
  { id: "PROG-003", name: "NutriWell Diet Coaching", category: "nutrition", provider: "NutriWell", capacity: 40, enrolledCount: 22, costPerEmployeeINR: 12000 },
  { id: "PROG-004", name: "FinWise Retirement Planning", category: "financial_wellness", provider: "FinWise Advisors", capacity: 50, enrolledCount: 19, costPerEmployeeINR: 9000 },
  { id: "PROG-005", name: "Mindful Mornings Meditation", category: "mental_health", provider: "MindEase Wellness", capacity: 80, enrolledCount: 61, costPerEmployeeINR: 6000 },
  { id: "PROG-006", name: "Yoga & Flexibility Circuit", category: "fitness", provider: "FlexFit Studios", capacity: 45, enrolledCount: 45, costPerEmployeeINR: 10000 },
  { id: "PROG-007", name: "New Parent Support Circle", category: "mental_health", provider: "MindEase Wellness", capacity: 25, enrolledCount: 11, costPerEmployeeINR: 15000 },
  { id: "PROG-008", name: "Budgeting & Debt Clinic", category: "financial_wellness", provider: "FinWise Advisors", capacity: 35, enrolledCount: 14, costPerEmployeeINR: 7000 },
  { id: "PROG-009", name: "Ergonomics & Desk Health", category: "fitness", provider: "CultFit", capacity: 100, enrolledCount: 52, costPerEmployeeINR: 4000 },
  { id: "PROG-010", name: "Nutrition for Night Shifts", category: "nutrition", provider: "NutriWell", capacity: 30, enrolledCount: 8, costPerEmployeeINR: 12000 },
];

// ---------- Nudges (Subsystem B) ----------
const nudges = [];
let nudgeCounter = 1;
function nextNudgeId() {
  return `NUDGE-${String(nudgeCounter++).padStart(4, "0")}`;
}

const rohanId = namedPersonaEmployeeIds["Rohan_Malhotra"];
const priyaId = namedPersonaEmployeeIds["Priya_Nair"];
const ananyaId = namedPersonaEmployeeIds["Ananya_Iyer"];
const karanId = namedPersonaEmployeeIds["Karan_Verma"];

// Rohan: high performer disengaging, dismissed several nudges in a row -> nudge fatigue rule should trigger.
nudges.push(
  { id: nextNudgeId(), employeeId: rohanId, type: "reengagement", content: "You crushed Q2 targets, Rohan — your CultFit streak has lapsed for 6 weeks. Jump back in this week?", sentDate: daysAgo(35), status: "dismissed", feedback: "not_helpful" },
  { id: nextNudgeId(), employeeId: rohanId, type: "new_program", content: "Based on your past fitness engagement, MindEase's new performance-coaching track might fit your schedule.", sentDate: daysAgo(24), status: "dismissed", feedback: null },
  { id: nextNudgeId(), employeeId: rohanId, type: "check_in", content: "Quick pulse check, Rohan — how's the pace been these last few weeks?", sentDate: daysAgo(13), status: "dismissed", feedback: "not_helpful" },
);

// Priya: at-risk, department (Customer Success) is high-risk on burnout radar -> conflict rule should suppress new_program nudges.
nudges.push(
  { id: nextNudgeId(), employeeId: priyaId, type: "check_in", content: "Hi Priya, just checking in — no pressure to respond, we're here if you need anything this week.", sentDate: daysAgo(10), status: "sent", feedback: null },
  { id: nextNudgeId(), employeeId: priyaId, type: "check_in", content: "We noticed things have been heavy lately, Priya. Want to grab 15 minutes with HR, no agenda?", sentDate: daysAgo(28), status: "acted_on", feedback: "helpful" },
);

// Ananya: new parent, flexibility-framed nudges, cold start on programs.
nudges.push(
  { id: nextNudgeId(), employeeId: ananyaId, type: "new_program", content: "Welcome back, Ananya! The New Parent Support Circle meets on flexible evening slots if that works better right now.", sentDate: daysAgo(15), status: "sent", feedback: null },
  { id: nextNudgeId(), employeeId: ananyaId, type: "check_in", content: "Easing back in can take time — want us to hold off on program suggestions for a couple weeks?", sentDate: daysAgo(40), status: "acted_on", feedback: "helpful" },
);

// Karan: standard/baseline, healthy state, light nudge history.
nudges.push(
  { id: nextNudgeId(), employeeId: karanId, type: "new_program", content: "Karan, your team's been active in the Yoga & Flexibility Circuit — spots just opened up if you'd like to join.", sentDate: daysAgo(18), status: "acted_on", feedback: "helpful" },
);

// Sprinkle nudges for ~20 more random non-opted-out employees to make the company-wide list feel populated.
const eligibleForRandomNudges = employees.filter(e => !e.optedOut && ![rohanId, priyaId, ananyaId, karanId].includes(e.id));
for (let i = 0; i < 24; i++) {
  const emp = pick(eligibleForRandomNudges);
  const type = pick(["reengagement", "new_program", "check_in"]);
  const status = pick(["sent", "sent", "dismissed", "acted_on"]);
  const feedback = status === "sent" ? null : pick(["helpful", "not_helpful", null, null]);
  const templates = {
    reengagement: `We miss seeing you around, ${emp.name.split(" ")[0]} — your last program check-in was a while back. Anything we can do to make it easier to jump back in?`,
    new_program: `${emp.name.split(" ")[0]}, based on your recent activity we think you'd like ${pick(wellnessPrograms).name}.`,
    check_in: `Quick check-in, ${emp.name.split(" ")[0]} — how are you feeling about your workload this week?`,
  };
  nudges.push({
    id: nextNudgeId(),
    employeeId: emp.id,
    type,
    content: templates[type],
    sentDate: daysAgo(randInt(1, 60)),
    status,
    feedback,
  });
}

// ---------- Burnout snapshots (Subsystem C owns the logic; seed data respects the privacy floor) ----------
const burnoutSnapshots = [];
const BURNOUT_PROFILES = {
  "DEPT-ENG": { start: 0.4, delta: 0.0, trend: "stable" },
  "DEPT-SALES": { start: 0.42, delta: 0.035, trend: "worsening" },
  "DEPT-CS": { start: 0.55, delta: 0.045, trend: "worsening" },
  "DEPT-MKT": { start: 0.58, delta: -0.045, trend: "improving" },
  "DEPT-OPS": { start: 0.28, delta: 0.0, trend: "stable" },
  "DEPT-FIN": { start: 0.22, delta: 0.0, trend: "stable" },
  "DEPT-HR": { start: 0.4, delta: 0.01, trend: "stable" },
  "DEPT-PROD": { start: 0.35, delta: -0.02, trend: "improving" },
  // DEPT-DESIGN intentionally omitted: headcount 3 < 5, below the privacy floor.
};
const WEEKS_BACK = 6;
for (const dept of DEPARTMENTS) {
  const profile = BURNOUT_PROFILES[dept.id];
  if (!profile) continue; // privacy floor: no snapshot generated at all
  for (let w = WEEKS_BACK - 1; w >= 0; w--) {
    const weekOf = mondayOf(daysAgo(w * 7));
    const weeksElapsed = WEEKS_BACK - 1 - w;
    const risk = Math.min(0.95, Math.max(0.05, profile.start + profile.delta * weeksElapsed + randFloat(-0.02, 0.02)));
    burnoutSnapshots.push({
      departmentId: dept.id,
      weekOf,
      riskScore: Number(risk.toFixed(2)),
      trend: profile.trend,
      headcount: dept.headcount,
    });
  }
}

// ---------- Interventions (Subsystem C's audit trail; seeded for consistency) ----------
const csHead = employees.find(e => e.departmentId === "DEPT-CS" && e.roleTitle === "Customer Success Manager");
const salesHead = employees.find(e => e.departmentId === "DEPT-SALES" && e.roleTitle === "Sales Manager");
const hrHead = employees.find(e => e.departmentId === "DEPT-HR" && e.roleTitle === "HR Manager");
const interventions = [
  { id: "INT-001", departmentId: "DEPT-CS", aiDraftedBrief: "Customer Success has trended upward in burnout risk for 3 consecutive weeks, driven by sustained after-hours ticket volume. Recommend temporary staffing support and a review of on-call rotation.", status: "pending", actedBy: null, timestamp: `${daysAgo(2)}T09:15:00Z`, escalationReason: null },
  { id: "INT-002", departmentId: "DEPT-SALES", aiDraftedBrief: "Sales burnout risk is rising alongside quarter-end quota pressure. Recommend a manager check-in cadence and deferring optional training modules until next quarter.", status: "approved", actedBy: salesHead ? salesHead.id : null, timestamp: `${daysAgo(9)}T14:02:00Z`, escalationReason: null },
  { id: "INT-003", departmentId: "DEPT-HR", aiDraftedBrief: "HR risk score has stayed elevated but flat; no acute trigger identified. Recommend monitoring only, no intervention this cycle.", status: "rejected", actedBy: hrHead ? hrHead.id : null, timestamp: `${daysAgo(15)}T11:40:00Z`, escalationReason: null },
  { id: "INT-004", departmentId: "DEPT-CS", aiDraftedBrief: "Customer Success risk has now exceeded the high-risk threshold for 2 consecutive weeks without HR action. Recommend escalating to leadership for immediate resourcing review.", status: "escalated", actedBy: null, timestamp: `${daysAgo(1)}T08:00:00Z`, escalationReason: "Pending longer than the 5-business-day auto-escalation threshold with no HR action taken." },
  { id: "INT-005", departmentId: "DEPT-MKT", aiDraftedBrief: "Marketing's burnout risk has improved for 3 consecutive weeks following the campaign crunch. Recommend closing this watch item and returning to standard monitoring.", status: "approved", actedBy: csHead ? csHead.id : null, timestamp: `${daysAgo(20)}T16:30:00Z`, escalationReason: null },
  { id: "INT-006", departmentId: "DEPT-ENG", aiDraftedBrief: "Engineering risk is stable within normal range. No intervention recommended this cycle.", status: "pending", actedBy: null, timestamp: `${daysAgo(4)}T10:05:00Z`, escalationReason: null },
];

// ---------- Credentials ----------
const DEMO_PASSWORD = "Demo@2026";
const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);

const engHead = employees.find(e => e.departmentId === "DEPT-ENG" && e.roleTitle === "Engineering Manager");
const designHead = employees.find(e => e.departmentId === "DEPT-DESIGN" && e.roleTitle === "Design Manager");

const credentials = [
  { id: "CRED-CFO", email: "cfo@meridiananalytics.com", name: "Elena Fischer", role: "cfo", departmentId: null, employeeId: null, passwordHash },
  { id: "CRED-HRADMIN", email: "hradmin@meridiananalytics.com", name: "Divya Kulkarni", role: "hr_admin", departmentId: null, employeeId: null, passwordHash },
  { id: "CRED-MGR-ENG", email: "manager.eng@meridiananalytics.com", name: engHead.name, role: "dept_manager", departmentId: "DEPT-ENG", employeeId: engHead.id, passwordHash },
  { id: "CRED-MGR-SALES", email: "manager.sales@meridiananalytics.com", name: salesHead.name, role: "dept_manager", departmentId: "DEPT-SALES", employeeId: salesHead.id, passwordHash },
  { id: "CRED-MGR-DESIGN", email: "manager.design@meridiananalytics.com", name: designHead.name, role: "dept_manager", departmentId: "DEPT-DESIGN", employeeId: designHead.id, passwordHash },
  { id: "CRED-EMP-NEWPARENT", email: "ananya.iyer@meridiananalytics.com", name: "Ananya Iyer", role: "employee", departmentId: "DEPT-ENG", employeeId: ananyaId, passwordHash },
  { id: "CRED-EMP-HIGHPERF", email: "rohan.malhotra@meridiananalytics.com", name: "Rohan Malhotra", role: "employee", departmentId: "DEPT-SALES", employeeId: rohanId, passwordHash },
  { id: "CRED-EMP-ATRISK", email: "priya.nair@meridiananalytics.com", name: "Priya Nair", role: "employee", departmentId: "DEPT-CS", employeeId: priyaId, passwordHash },
  { id: "CRED-EMP-STANDARD", email: "karan.verma@meridiananalytics.com", name: "Karan Verma", role: "employee", departmentId: "DEPT-MKT", employeeId: karanId, passwordHash },
  { id: "CRED-EMP-OPTEDOUT", email: "devika.rao@meridiananalytics.com", name: "Devika Rao", role: "employee", departmentId: "DEPT-OPS", employeeId: namedPersonaEmployeeIds["Devika_Rao"], passwordHash },
];

// ---------- Write files ----------
const files = {
  "departments.json": DEPARTMENTS.map(({ id, name, managerId, headcount, budgetAllocatedINR, budgetUsedINR }) => ({ id, name, managerId, headcount, budgetAllocatedINR, budgetUsedINR })),
  "employees.json": employees,
  "wellness-programs.json": wellnessPrograms,
  "nudges.json": nudges,
  "burnout-snapshots.json": burnoutSnapshots,
  "interventions.json": interventions,
  "credentials.json": credentials,
};

for (const [filename, content] of Object.entries(files)) {
  writeFileSync(path.join(dataDir, filename), JSON.stringify(content, null, 2) + "\n", "utf-8");
  console.log(`Wrote ${filename} (${Array.isArray(content) ? content.length : "?"} records)`);
}

console.log(`\nTotal employees: ${employees.length}`);
console.log(`Demo password for all seeded accounts: ${DEMO_PASSWORD}`);
