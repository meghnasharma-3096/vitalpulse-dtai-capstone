# Subsystem C: Burnout Radar & Governance — Build Spec

**Paste this whole document into a fresh Claude or Gemini chat to start building.** You're building one piece of a larger team project — read Section 1 before anything else so you understand what you're plugging into.

---

## 1. Platform context (read first)

You're building one of three subsystems inside **VitalPulse**, a corporate wellness intelligence platform for a fictional company, Meridian Analytics Pvt. Ltd. (~950 employees, seeded to ~100 for the prototype, across 9 departments). Someone else is building the base framework (login, navigation, the overall look), and two other subsystems: **Wellness Matching** (recommends programs to employees) and **Disengagement Prediction + ROI** (nudges employees, gives HR/CFO a live ROI number). Your job — **Burnout Radar & Governance** — predicts which teams are heading toward burnout, while enforcing a strict privacy rule, and drafts intervention recommendations that a human must approve before anything happens.

**One-sentence use case for your subsystem:** This subsystem predicts department-level burnout risk from anonymized team signals and drafts a recommended intervention, so that HR can act early on well-being risk while a licensed human decision-maker retains final approval authority.

This is the subsystem with the clearest **governance story** in the whole platform — the human-sign-off requirement is not a minor detail, it's the single feature most likely to earn credit on the "AI Understanding" and "AI Governance" parts of the grading rubric. Build it carefully.

---

## 2. The shared technical contract (do not deviate from this — it's how your code plugs into everyone else's)

- **Framework/stack:** Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui components, Recharts for trend charts. No other libraries for these purposes.
- **Getting the logged-in user:** call `useCurrentUser()` from `lib/auth.ts` — returns `{ id, name, role, departmentId? }`. Role is one of `'cfo' | 'hr_admin' | 'dept_manager' | 'employee'`. **You never build your own login/auth logic.**
- **Calling AI:** import `generateInterventionBrief(departmentContext)` from `lib/llm.ts`. That's the only AI function you touch. **You never call the Gemini SDK directly and never see or need an API key** — locally it returns a mocked response automatically.
- **Your routes:** you own `/hr-admin/burnout-radar` (HR Admin/CFO — company-wide) and contribute the scoped version to `/dept-manager/dashboard` (a Department Manager only ever sees their own department's burnout data — this filtering MUST happen server-side, in a `lib/data.ts` helper, not by hiding it in your component).
- **Off-limits:** `lib/auth.ts`, `lib/llm.ts`, `lib/data.ts`, and `components/shared/`. Flag if you think one needs to change — don't edit it yourself.
- **Data schemas (do not change field names/structure — ask first if you need something new):**

```json
// data/burnout-snapshots.json — YOU OWN THIS FILE
{
  "departmentId": "DEPT-ENG",
  "weekOf": "YYYY-MM-DD",
  "riskScore": 0.0,
  "trend": "worsening | stable | improving",
  "headcount": 18
}

// data/interventions.json — YOU OWN THIS FILE (this is your audit trail)
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

## 2b. What the other two subsystems do (so your feature fits into the whole)

- **Subsystem A (Matching)** recommends wellness programs and reads your burnout flags to suppress new-program recommendations for flagged departments/employees — you don't need to do anything extra for this, just make sure your risk flag is readable from the shared employee/department context.
- **Subsystem B (Disengagement + ROI)** nudges individual employees and shows HR a live ROI number — separate from your department-level view, but conceptually related (both are "risk" signals HR sees on the unified employee profile).

Terminology to keep consistent: department names and IDs, employee ID format (`EMP-####`), come from the shared `employees.json`/`departments.json` — don't invent your own.

---

## 3. Your subsystem in full detail

### THE PRIVACY RULE — this is the most important requirement in your entire build
**Never generate, store, or display a burnout snapshot for a department with headcount below 5.** No exceptions, no "just for testing." This needs to actually be enforced in code (a hard check before any snapshot is created or rendered), not just true by coincidence of the seed data. At least one seeded department (e.g. a small "Design" team of 3) must exist specifically to prove this rule holds — when someone clicks into it, they should see a clear message like "Team too small to report individually/in aggregate — privacy floor," not just empty data.

### Personas and what they see
- **HR Admin / CFO:** company-wide burnout radar (`/hr-admin/burnout-radar`) — all departments (above the privacy floor) shown with current risk score and **trend over time** (not just a single snapshot — this needs multiple weeks of seeded history per department so a line chart is meaningful)
- **Department Manager:** the exact same view, but scoped server-side to only their own department
- **Employee:** does not see this subsystem at all — no route, no data exposure

### Core use cases
1. HR Admin opens the burnout radar → sees all departments color-coded by risk (green/amber/red per `design.md`), each with a trend line
2. HR Admin clicks into a flagged department → sees the AI-drafted intervention brief (via `generateInterventionBrief()`) with an estimated budget and timeline
3. HR Admin **approves, rejects, or escalates** the brief — this action is logged to `interventions.json` with timestamp and who acted (the audit trail)
4. Department Manager sees only their own team's version of the same flow

### Edge cases you must handle (these are graded, not optional polish)
- **Sub-threshold department suppression** (above) — the single most important edge case in the app
- **Escalation on inaction:** if an intervention sits at `status: 'pending'` past a seeded time threshold (e.g. simulate 2+ "weeks" via the time-simulation control — coordinate with Meghna on how that control works), it auto-flips to `status: 'escalated'` and becomes visible to the CFO
- **Trend reversal:** at least one seeded department should show `trend: 'improving'`, not just worsening — the tool should visibly track success, not just crisis
- **Human sign-off is mandatory:** the AI-drafted brief is never auto-applied. There is always a required human action (approve/reject/escalate) before status changes from `pending`. Don't let this be skippable.

### UI/UX spec
Follow `design.md`: primary color `#2D6A4F`, risk colors `#52B788` (low) / `#F4A261` (medium) / `#E63946` (high) — used consistently for every risk indicator in your subsystem. Inter font. shadcn/ui `Card`, `Badge`, `Dialog` (for the approve/reject/escalate action), `Table`. Trend lines via Recharts. Keep it visually consistent with the rest of the app — check what's already built before improvising.

---

## 4. If you're behind — cut in this order

1. Cut the escalation-on-inaction automation last (can be a manual "escalate" button only, skip the auto-timer logic)
2. Cut fancy trend-line styling (a basic line chart is fine)
3. **Do not cut:** the sub-5-headcount privacy floor enforcement — this is the single most rubric-relevant feature in the entire platform
4. **Do not cut:** the human-approval requirement on intervention briefs — an AI that "just decides" defeats the entire governance story

---

## 5. Git workflow reminder

- Branch name: `feature/subsystem-c-burnout-radar`
- Never push directly to `main` — open a PR, one of the two approvers (Meghna or Shubhro) merges it
- Check the Vercel preview link on your PR before asking for it to be merged
