# Subsystem A: Wellness Matching & Marketplace — Build Spec

**Paste this whole document into a fresh Claude or Gemini chat to start building.** You're building one piece of a larger team project — read Section 1 before anything else so you understand what you're plugging into.

---

## 1. Platform context (read first)

You're building one of three subsystems inside **VitalPulse**, a corporate wellness intelligence platform for a fictional company, Meridian Analytics Pvt. Ltd. (~950 employees, seeded to ~100 for the prototype, across 9 departments). Someone else is building the base framework (login, navigation, the overall look), and two other subsystems: **Disengagement Prediction + ROI** (nudges employees, predicts who's disengaging, gives HR/CFO a live ROI number) and **Burnout Radar** (predicts team-level burnout risk with strict privacy rules, drafts intervention briefs for HR to approve). Your job — **Wellness Matching & Marketplace** — is the piece that recommends the right wellness program to the right employee and tracks how well that's working.

**One-sentence use case for your subsystem:** This subsystem matches employees to wellness programs based on inferred need and life-stage/role context, tracks program capacity and utilization, so that employees find relevant programs and HR can see which programs are actually working.

---

## 2. The shared technical contract (do not deviate from this — it's how your code plugs into everyone else's)

- **Framework/stack:** Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui components, Recharts for any charts. No other libraries for these purposes.
- **Getting the logged-in user:** call `useCurrentUser()` from `lib/auth.ts` — it returns `{ id, name, role, departmentId? }`. Role is one of `'cfo' | 'hr_admin' | 'dept_manager' | 'employee'`. **You never build your own login/auth logic.** If `useCurrentUser()` returns `null` or a role that shouldn't see your page, redirect to `/login` — don't build your own gate.
- **Calling AI:** import `generateProgramRecommendation(employeeContext)` from `lib/llm.ts`. That's the only AI function you touch. **You never call the Gemini SDK directly and you never see or need an API key** — locally this function returns a mocked response automatically when no key is configured, so you can build and test without any credentials.
- **Your routes:** you own `/hr-admin/programs` (HR Admin/CFO view: full program catalog, capacity, utilization) and you contribute to `/employee/dashboard` (the employee's own matched programs — this route is shared with Subsystem B, coordinate what section of that page is yours) and to a "matches" section inside the unified employee profile (shared with the other subsystems, on `/hr-admin/employees/[id]`).
- **Off-limits:** `lib/auth.ts`, `lib/llm.ts`, `lib/data.ts` (shared data-loading helpers), and anything inside `components/shared/`. If you think one of these needs to change, flag it — don't edit it yourself.
- **Data schema (do not change field names or structure — if you need a new field, ask first):**

```json
// data/wellness-programs.json — YOU OWN THIS FILE
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

You'll also **read** (not restructure) `data/employees.json` for matching logic — each employee has `personaTag`, `departmentId`, `optedOut`, and `disengagementRiskScore`, which you'll use for matching and for the conflict rule below.

---

## 2b. What the other two subsystems do (so your feature fits into the whole)

- **Subsystem B (Disengagement + ROI)** sends nudges to employees and shows HR/CFO a live ROI calculator. It reads your program data to know what it's nudging people toward.
- **Subsystem C (Burnout Radar)** flags departments (never individuals, never below 5 people) as at-risk and drafts intervention briefs for HR approval.

**Conflict rule you must implement:** if an employee's `disengagementRiskScore` is high, OR their department currently shows as burnout-flagged, **do not recommend a new program to them** — show a message like "Currently not recommending new programs — flagged for reduced load" instead. This is a deliberate, visible rule, not a bug — it's the platform showing the three subsystems reasoning about each other, not running independently.

Terminology to keep consistent: department names and employee ID format (`EMP-####`) come from the shared `employees.json`/`departments.json` — don't invent your own.

---

## 3. Your subsystem in full detail

### Personas and what they see
- **HR Admin / CFO:** full program catalog (`/hr-admin/programs`) — every program, capacity, current enrollment, cost, and an **underutilization flag** (a program heavily recommended but rarely taken up — surfaces a "why isn't this working" signal)
- **Department Manager:** same catalog view, but any utilization stats shown are scoped to their own department's employees only (filtering happens server-side via `lib/data.ts` helpers, not in your component)
- **Employee:** sees their own matched programs on `/employee/dashboard`, each with a one-line AI-generated "why this was recommended" explanation (this is the explainability requirement — don't skip it, it matters for grading)

### Core use cases
1. Employee logs in → sees 2-3 recommended programs with explanations, generated via `generateProgramRecommendation()`
2. HR Admin views the program catalog → sees capacity/enrollment/utilization at a glance, sortable/filterable
3. HR Admin sees an underutilization flag on a specific program and can click through to see who was recommended it vs. who enrolled

### Edge cases you must handle (these are graded, not optional polish)
- **Provider at capacity:** if `enrolledCount >= capacity`, the recommendation engine must not recommend that program — show it as full and suggest an alternative, don't just fail silently
- **Cold start — new employee, minimal history:** seed at least one employee with almost no engagement history; your recommendation logic should degrade gracefully to a broader/generic recommendation rather than erroring or showing nothing
- **Opted-out employee:** if `employees.json` shows `optedOut: true`, that employee gets NO recommendations and NO tracking anywhere in your subsystem — verify this explicitly, it's a governance feature the grading rubric rewards
- **Underutilization signal:** at least one seeded program should be recommended often but have low actual enrollment, so this flag has something real to show
- **The conflict rule above** — verify it actually suppresses recommendations for at least one seeded high-risk/flagged employee

### UI/UX spec
Follow `design.md` exactly: primary color `#2D6A4F`, risk/status colors `#52B788` (good/available) / `#F4A261` (near capacity/caution) / `#E63946` (full/blocked), Inter font, shadcn/ui `Card`, `Badge`, `Table` components — don't build custom equivalents. Keep your pages visually indistinguishable in style from the rest of the app; if you're unsure how something should look, check what's already been built in the base framework rather than improvising.

---

## 4. If you're behind — cut in this order

1. Cut the underutilization flag last-resort visual polish (keep the data, drop the fancy indicator)
2. Cut the cold-start special handling (fall back to always showing generic recommendations if you run out of time — just don't let it error)
3. **Do not cut:** the opted-out enforcement or the conflict rule — these are governance features specifically called out as important to the grading rubric
4. **Do not cut:** the explainability tooltip on employee recommendations

---

## 5. Git workflow reminder

- Branch name: `feature/subsystem-a-matching`
- Never push directly to `main` — open a PR, one of the two approvers (Meghna or Shubhro) merges it
- Check the Vercel preview link on your PR before asking for it to be merged — make sure it actually builds and looks right, not just that it runs locally
