# VitalPulse — Corporate Wellness Intelligence Platform
## System Design & Architecture — Master Document (Meghna's build)

---

## 0. Platform summary (use this verbatim wherever a short description is needed)

**VitalPulse** is a corporate wellness intelligence platform for a fictional mid-size company, **Meridian Analytics Pvt. Ltd.** (~950 employees, 8 departments). It solves three connected problems for HR and leadership: (1) matching employees to the right wellness programs, (2) predicting and preventing individual disengagement from those programs with personalized nudges and a live ROI calculator, and (3) predicting team-level burnout risk while enforcing strict privacy floors, with AI-drafted intervention briefs requiring human sign-off. All three subsystems share one login system, one data layer, and one design language, so it reads as a single product, not three bolted-together features.

**One-sentence master use case:** This application matches employees to wellness interventions, predicts individual disengagement and team-level burnout risk, and quantifies ROI in real dollars, so that HR and leadership can act early, personalize outreach, and prove the value of wellness spend to Finance.

---

## 1. The three subsystems and who owns them

| Subsystem | Name | Core function | Owner |
|---|---|---|---|
| A | **Wellness Matching & Marketplace** | Matches employees to programs based on inferred need; tracks capacity and underutilization | Teammate 2 (self-selected) |
| B | **Disengagement Prediction & ROI Engine** | Predicts individual disengagement risk, sends personalized nudges, live ROI calculator | **Meghna (you)** |
| C | **Burnout Radar & Governance** | Predicts department-level burnout risk with a hard privacy floor; AI-drafted intervention briefs requiring HR sign-off | Teammate 3 (self-selected) |

You also own: base framework, auth/persona shell, shared LLM utility, shared design system, README, design.md, and the 1-page Application Brief (content included at the end of this doc).

---

## 2. Tech stack (all subsystems build on this — no substitutions)

- **Framework:** Next.js (App Router), TypeScript
- **Styling:** Tailwind CSS, using the design tokens in Section 6 — no ad hoc colors/fonts
- **Component library:** shadcn/ui (keeps visual consistency across three people's code without a heavy design system)
- **Charts:** Recharts (for ROI calculator, burnout trend lines, utilization charts)
- **Deployment:** Vercel, one project, one live URL
- **Data layer:** structured JSON files committed to the repo (Section 5) — no external database. This is a deliberate choice for a 2-day beginner-Git build; call this out explicitly in the Application Brief and video script as a documented limitation, not an oversight.
- **AI:** Google Gemini API (Gemini Pro), called only through the shared utility in Section 7 — no subsystem calls the Gemini SDK directly, and no one but Meghna ever touches the raw API key.

---

## 3. Repo structure (freeze this before anyone starts business logic)

```
vitalpulse/
├── app/
│   ├── login/
│   ├── cfo/dashboard/
│   ├── hr-admin/
│   │   ├── dashboard/
│   │   ├── employees/          ← Subsystem A + B touch this
│   │   ├── programs/           ← Subsystem A owns this
│   │   ├── roi/                ← Subsystem B owns this
│   │   └── burnout-radar/      ← Subsystem C owns this
│   ├── dept-manager/dashboard/ ← Subsystem C primarily, scoped view
│   └── employee/dashboard/     ← Subsystem A + B touch this
├── components/
│   ├── shared/                 ← OFF LIMITS to subsystem owners except via PR review
│   └── [subsystem]/            ← each subsystem's own components live here
├── lib/
│   ├── auth.ts                 ← OFF LIMITS — Meghna only
│   ├── llm.ts                  ← OFF LIMITS — Meghna only, subsystems call exported functions only
│   └── data.ts                 ← shared data-loading helpers, OFF LIMITS except via PR review
├── data/
│   ├── employees.json
│   ├── departments.json
│   ├── wellness-programs.json
│   ├── nudges.json
│   ├── burnout-snapshots.json
│   ├── interventions.json
│   └── credentials.json
└── design.md, README.md, application-brief.md
```

**Guardrail (process failure mode #1 — schema drift):** the `data/` folder schemas below are frozen before any subsystem owner writes business logic. If a schema genuinely needs to change mid-build, that change goes through Meghna and gets announced to everyone immediately — no one edits another subsystem's data file's structure unilaterally.

**Guardrail (process failure mode #5 — key exposure):** the real Gemini API key lives only as a Vercel environment variable that Meghna sets. No teammate ever receives the raw key. Locally, `lib/llm.ts` falls back to a mocked response when no key is present, so subsystem owners can build and test without ever needing real credentials.

---

## 4. Auth & persona shell (Meghna builds this first, before her own subsystem's business logic — process failure mode #2)

**Build order matters:** commit the *interface* (function signatures, even with stubbed/fake data) before the real implementation, so subsystem owners aren't blocked waiting for your full subsystem to finish.

### Roles
1. **CFO / Exec** — company-wide rollup view across all three subsystems, no operational detail
2. **HR Admin** — full company-wide access across all three subsystems
3. **Department Manager** — same views as HR Admin but scoped server-side to their own department only
4. **Employee** — sees only their own matches, nudges, and profile; multiple sample employee accounts exist (Section 8)

### Login page requirements
- One-click "Log in as [Role]" buttons — no typed credentials required for the demo
- Demo credentials also displayed in plain text beneath the buttons, clearly labeled **"For demo/grading purposes"**, so a professor grading without you present can get in unassisted
- Session persists across page refresh (store role/session client-side, e.g. via a cookie or localStorage-backed context — NOT actual browser localStorage inside any React artifact context, this is a real Next.js app so standard cookies/session storage are fine here)

### `useCurrentUser()` hook — the contract every subsystem calls
```ts
// lib/auth.ts
type Role = 'cfo' | 'hr_admin' | 'dept_manager' | 'employee';
interface CurrentUser {
  id: string;
  name: string;
  role: Role;
  departmentId?: string; // present for dept_manager and employee
}
function useCurrentUser(): CurrentUser | null
```
Subsystem owners call this hook to get the logged-in user — they never build their own auth logic, never read cookies directly, never duplicate role-checking logic.

### Server-side data filtering (process guardrail — role-based access must be enforced server-side, not just hidden in UI)
Every data-fetching function in `lib/data.ts` takes the current user's role and department as parameters and filters server-side before returning data — e.g. `getDepartmentBurnoutData(user)` returns only the caller's department if they're a Dept Manager, all departments if HR Admin/CFO, and throws/returns empty if Employee. This is enforced in the data layer, not by hiding UI elements client-side, so it can't be bypassed by inspecting network requests.

### Credentials storage
`data/credentials.json` stores each demo account's role, display name, email, and a **hashed** password (not plaintext) — the login page's plaintext instructions are separate UI copy, not a reflection of what's stored.

---

## 5. Shared data schemas (frozen — do not change without announcing to the whole team)

### `employees.json`
```json
{
  "id": "EMP-0142",
  "name": "string",
  "email": "string",
  "departmentId": "DEPT-ENG",
  "roleTitle": "string",
  "hireDate": "YYYY-MM-DD",
  "managerId": "EMP-0009",
  "personaTag": "new_parent | high_performer | at_risk | standard",
  "optedOut": false,
  "disengagementRiskScore": 0.0,
  "lastCheckIn": "YYYY-MM-DD"
}
```
Target volume: **~100 employees across 8 departments** (see Section 8 for department list and headcounts).

### `departments.json`
```json
{
  "id": "DEPT-ENG",
  "name": "Engineering",
  "managerId": "EMP-0009",
  "headcount": 18,
  "budgetAllocatedINR": 450000,
  "budgetUsedINR": 210000
}
```

### `wellness-programs.json`
```json
{
  "id": "PROG-001",
  "name": "string",
  "category": "fitness | mental_health | nutrition | financial_wellness",
  "provider": "string",
  "capacity": 40,
  "enrolledCount": 37,
  "costPerEmployeeINR": 1200
}
```

### `nudges.json` (Subsystem B)
```json
{
  "id": "NUDGE-0031",
  "employeeId": "EMP-0142",
  "type": "reengagement | new_program | check_in",
  "content": "AI-generated string",
  "sentDate": "YYYY-MM-DD",
  "status": "sent | dismissed | acted_on",
  "feedback": "helpful | not_helpful | null"
}
```

### `burnout-snapshots.json` (Subsystem C — privacy floor enforced in code, not just in this schema)
```json
{
  "departmentId": "DEPT-ENG",
  "weekOf": "YYYY-MM-DD",
  "riskScore": 0.0,
  "trend": "worsening | stable | improving",
  "headcount": 18
}
```
**Hard rule:** no snapshot is ever generated or displayed for a department with headcount < 5. At least one seeded department must be under this threshold to prove the rule holds, not just get described.

### `interventions.json` (audit trail — process guardrail #4)
```json
{
  "id": "INT-014",
  "departmentId": "DEPT-ENG",
  "aiDraftedBrief": "string",
  "status": "pending | approved | rejected | escalated",
  "actedBy": "EMP-0009 | null",
  "timestamp": "ISO 8601",
  "escalationReason": "string | null"
}
```

---

## 6. Design system

See `design.md` at the repo root — that's the canonical, current design system
(color tokens, elevation, radius scale, type scale, icon usage, chart styling,
the "pulse" signature element) and supersedes the short sketch that used to
live in this section. Still true regardless of edits there: use shadcn/ui
components (Card, Badge, Table, Dialog, Tabs) — no custom-built equivalents —
that's the single biggest thing keeping three independently-built subsystems
visually consistent.

---

## 7. Shared LLM utility (`lib/llm.ts`) — the only place any subsystem touches Gemini

```ts
async function generateNudge(employeeContext: object): Promise<string>
async function generateInterventionBrief(departmentContext: object): Promise<string>
async function generateProgramRecommendation(employeeContext: object): Promise<string>
```

**Every function:**
1. Checks an in-memory/file-based cache first (same input → cached output, don't re-call the API)
2. On cache miss, calls Gemini with a fixed prompt template
3. On API failure or timeout (>5s), returns a graceful **pre-written fallback string** relevant to that context, rather than an error state — this must never visibly break during grading
4. Never exposes the API key to client-side code — all calls happen in Next.js server actions/API routes

Subsystem owners import and call these three functions only. They never write their own prompt, never touch the Gemini SDK, never see the API key (which exists only as a Vercel env var Meghna sets).

---

## 8. Company, departments, and personas (invented, for consistency across all subsystems)

**Company:** Meridian Analytics Pvt. Ltd., ~950 employees (seed ~100 for the prototype)

**Departments (8):** Engineering (18), Sales (22), Customer Success (15), Marketing (10), Operations (14), Finance (8), HR (6), Product (7) — note HR at 6 and Product at 7 are close to but above the privacy floor; **seed one additional department, e.g. "Design" at 3 people**, specifically to sit *below* the floor and prove the suppression rule works.

**Sample employee personas (seed at least one of each, feature all of them explicitly in the PPT/video):**
- **New parent** — recently returned from leave, flexibility-framed nudges, cold-start on programs (little history)
- **High performer, disengaging** — high past engagement, recent drop-off, performance-framed nudges
- **At-risk / flagged by burnout radar** — currently should NOT receive new-program nudges (conflict rule, Section 9)
- **Standard/baseline** — average engagement, unremarkable, used to show the "healthy" state isn't just crisis mode
- **Opted-out** — has opted out of tracking/matching; system must visibly show no data/nudges for this person anywhere

---

## 9. Cross-cutting features (ALL must be present — call out explicitly in Brief, PPT, and video)

1. **Unified employee profile** — a single view (HR Admin/Dept Manager) pulling together an employee's program matches (A), disengagement/nudge history (B), and whether their department is currently flagged (C)
2. **Conflict rule** — an employee whose department (or, better, whose individual risk score) is currently flagged high-risk does NOT receive new-program nudges; the system visibly suppresses this rather than nudging blindly
3. **Consent/opt-out** — enforced everywhere, for the seeded opted-out employee
4. **Explainability** — a "why am I seeing this" tooltip/expandable note next to every AI-generated output
5. **Audit trail** — every intervention brief approval/rejection logged with who and when (`interventions.json`)
6. **Time-simulation control** — visible only to HR Admin/CFO, labeled clearly as a demo control (e.g. "Advance to next week →"), advances a mock clock and updates trend data. Chosen over pre-baked-only trend data because the earlier attendance project's strength was interactive, explorable edge cases during a live click-through — this gives the video/live-URL the same quality: a real interaction, not just a static screenshot.
7. **Budget-aware ROI** — the ROI calculator and intervention briefs respect each department's `budgetAllocatedINR` vs `budgetUsedINR`; a recommendation that would exceed budget is flagged, not silently allowed
8. **Search/filter** on the HR Admin employee/department lists
9. **Escalation** — an intervention with `status: pending` past a seeded threshold auto-escalates to `escalated`, visible to CFO
10. **Trend reversal** — at least one seeded department improving, not just worsening
11. **Nudge fatigue + feedback loop** — an employee who's dismissed several nudges gets fewer/different nudges; a "not helpful" action is logged and referenced in future nudge generation (can be a simple rule, doesn't need real ML)
12. **CFO "with AI platform vs. without" comparison** — the single clearest business-impact visual; projected savings/cost avoidance, prominently on the CFO dashboard

---

## 10. Process guardrails (from our failure-mode review — enforce these, don't skip them)

- **Build order:** Meghna commits the auth shell + LLM utility *interfaces* (stubbed) before writing her own subsystem's business logic, so subsystems 2/3 aren't blocked.
- **Merge windows are staggered**, not simultaneous — agree explicit times so two subsystems aren't merging into `main` at once on night 2.
- **PR-merge rights:** only Meghna and Shubhro can merge to `main`. Agree specific windows when Shubhro is available for this, separate from his video-editing time, so subsystem owners aren't blocked waiting on an approver who's mid-edit.
- **Feature freeze:** announce an explicit date/time to the whole team after which no new features are added — only bug fixes — so Alisha (PPT) and Shubhro (video) have something stable to work from.
- **Cut-list discipline:** each subsystem spec (files 02 and 03) includes a "cut this first if behind" list — use it rather than shipping something broken.
- **No one but Meghna touches the real Gemini key**, ever.

---

## 11. Application Brief content (for the required 1-page submission — use this as-is)

**Use case:** VitalPulse helps HR leadership at a mid-size company match employees to wellness programs, predict and prevent individual disengagement, and identify department-level burnout risk before it escalates — unifying three previously disconnected wellness functions into one governed platform.

**AI capability used:** A combination of rule-based/statistical risk scoring (disengagement and burnout prediction) and generative AI (Google Gemini) for personalized nudge text, program recommendations, and AI-drafted intervention briefs — with human sign-off required before any intervention brief is actioned.

**Data inputs:** Employee profile and engagement history, department structure and budgets, wellness program catalog and capacity, self-reported and inferred engagement signals, historical nudge interaction data.

**Key output:** Role-specific dashboards (CFO, HR Admin, Department Manager, Employee) showing personalized program matches, disengagement risk and nudges, department burnout trends with a strict privacy floor, and a live ROI calculator.

**Business KPI addressed:** Wellness program ROI and utilization, disengagement/attrition risk reduction, and burnout-driven cost avoidance (absenteeism, attrition, claims cost) — framed for a CFO audience.

**Known limitations:** Uses seeded/synthetic data rather than a live HRIS integration or production database (JSON-file data layer, documented deliberately for the prototype timeline); demo authentication rather than production-grade auth; burnout/disengagement scoring uses transparent rule-based logic rather than a trained ML model, chosen for explainability within the project timeline.
