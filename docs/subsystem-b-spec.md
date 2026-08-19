# Subsystem B: Disengagement Prediction & ROI Engine — Build Spec

**Paste this whole document into a fresh VS Code / Claude / Gemini chat to start building.** This is your own subsystem, but written in the same self-contained format as the other two so you (or a teammate helping you later) can work from it without needing the full system design doc open at all times.

---

## 1. Platform context (read first)

You're building the flagship piece of **VitalPulse**, a corporate wellness intelligence platform for a fictional company, Meridian Analytics Pvt. Ltd. (~950 employees, seeded to ~100 for the prototype, across 9 departments). You're also building the base framework (login, navigation, shared utilities) that the other two subsystems — **Wellness Matching** (recommends programs) and **Burnout Radar** (predicts department-level risk, requires human sign-off on interventions) — plug into. This doc covers Subsystem B specifically; the framework/auth/schema/design-system details live in your System Design doc (file 01) — build the framework pieces from there first, then use this file for Subsystem B's business logic.

**One-sentence use case:** This subsystem predicts which employees are at risk of disengaging from wellness programs, sends them personalized nudges, and gives HR/CFO a live ROI calculator, so that outreach is targeted and the business case for wellness spend is concrete, not hand-wavy.

This is the subsystem carrying your strongest CFO-facing story — the live ROI calculator is likely to be the single most memorable moment in the walkthrough video, so it's worth the extra polish.

---

## 2. The shared technical contract (you're building this too, but keep it consistent for the other two subsystems)

- **Stack:** Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Recharts.
- **`useCurrentUser()`** (from `lib/auth.ts`, which you're building) returns `{ id, name, role, departmentId? }`, role one of `'cfo' | 'hr_admin' | 'dept_manager' | 'employee'`.
- **AI calls:** you're building `lib/llm.ts` itself — for Subsystem B, it should expose `generateNudge(employeeContext): Promise<string>`. Same rules apply to you as to the other two subsystems: cache on repeated input, fall back to a pre-written string on API failure/timeout, and the real Gemini key exists only as a Vercel environment variable — never hardcoded, never in a client-side bundle.
- **Your routes:** `/hr-admin/roi` (HR Admin/CFO — the live ROI calculator and company-wide disengagement view), plus your contribution to `/employee/dashboard` (an employee's own nudges) and to the unified employee profile at `/hr-admin/employees/[id]`.
- **Data schema you own:**

```json
// data/nudges.json
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

You also **add** `disengagementRiskScore` to each record in `employees.json` (already reserved in the shared schema — don't rename it).

---

## 2b. What the other two subsystems do (so your feature fits into the whole)

- **Subsystem A (Matching)** recommends wellness programs and reads your disengagement risk score as part of its conflict rule — a high-risk employee shouldn't get pushed a new-program nudge. Make sure `disengagementRiskScore` is readable and meaningfully populated (not always 0) so their rule has something real to check against.
- **Subsystem C (Burnout Radar)** works at the department level, not individual — related conceptually (both are "risk" signals) but operates on separate data. **Its flag is always department-level** (`burnout-snapshots.json` has a `departmentId`, never an employee ID — this is a deliberate privacy-floor design, not an oversight). The unified employee profile page pulls a summary from both your subsystem and theirs, so keep your data shape predictable for whoever builds that combined view.

---

## 3. Your subsystem in full detail

### Personas and what they see
- **CFO/Exec:** the **"with AI platform vs. without" comparison** — this is the single most important screen in the whole platform for the business-impact story. Company-wide disengagement trend, projected savings/cost avoidance.
- **HR Admin:** the full live ROI calculator with adjustable assumptions (avg claims cost, absenteeism rate, attrition cost) — the number visibly updates as they change inputs. Also sees the company-wide list of at-risk employees with nudge status.
- **Employee:** sees their own nudges on `/employee/dashboard`, each with a "why am I seeing this" explanation (explainability requirement).

### Core use cases
1. HR Admin opens the ROI calculator, adjusts an assumption slider/input, watches the projected savings number update live
2. System identifies at-risk employees (based on engagement history, self-reported signals) and generates personalized nudges via `generateNudge()`
3. Employee sees and can dismiss/act on a nudge; dismissal or "not helpful" feedback is logged
4. CFO sees the aggregate "with AI vs. without" comparison

### Edge cases you must handle (graded, not optional polish)
- **Nudge personalization by persona:** the new-parent employee and the high-performer-disengaging employee should get visibly different nudge framing (flexibility-framed vs. performance-framed) — don't let this collapse into one generic template
- **Nudge fatigue:** an employee who's dismissed several nudges in a row should get fewer nudges or a different approach next time, not endless repetition — a simple rule (e.g. skip nudging for N cycles after 2+ dismissals) is enough, doesn't need real ML
- **Feedback loop:** a "not helpful" action on a nudge is logged in `feedback`, and referenced (even just narratively/in a tooltip: "this employee marked similar nudges unhelpful before") the next time a nudge is generated for that person
- **ROI calculator edge inputs:** check the number stays sane at the extremes — zero engagement, 100% engagement — don't let it go negative or break
- **Conflict rule enforcement:** two separate checks feed this, don't conflate them — (1) your own subsystem's `disengagementRiskScore` on the employee, and (2) whether the employee's *department* is currently flagged by Subsystem C's burnout radar (`isDepartmentFlaggedHighRisk(departmentId)` — look up the employee's `departmentId` and check that, never an individual employee-level burnout flag, since Subsystem C never produces one). If either is true, don't send a "new program" style nudge — a lighter check-in nudge is fine, but not a push toward more commitment. Since Subsystem C may not be merged yet when you build this, stub the department-flag check (see note below) rather than blocking on it.
- **Opted-out employee:** zero nudges, zero risk scoring shown, anywhere — verify this explicitly
- **Budget-aware note:** the ROI calculator should reflect that recommended interventions aren't unlimited — tie back to each department's budget figures where relevant, so the number isn't just abstract

### Building before Subsystem C exists
Since Subsystem C's real burnout-radar data may not be merged yet when you get to the conflict rule, stub a fake `isDepartmentFlaggedHighRisk(departmentId): boolean` in `lib/data.ts` (clearly marked temporary, with a TODO comment), hardcoded to return true for 1-2 seeded department IDs — don't have it read from a file. Keep the signature (`departmentId` in, boolean out) identical to what Subsystem C's real implementation will need, so swapping the stub body for the real read later doesn't require touching any call sites.

### UI/UX spec
Follow `design.md`: primary color `#2D6A4F`, risk colors `#52B788`/`#F4A261`/`#E63946` for low/medium/high disengagement risk — reuse the exact same color mapping Subsystem C uses for burnout risk, so risk means the same thing visually everywhere in the app. Inter font. shadcn/ui `Card`, `Badge`, `Slider` or `Input` (for the ROI calculator's adjustable assumptions), `Table`. The ROI number itself should be the largest, most visually prominent element on its screen — it's your headline moment.

---

## 4. If you're behind — cut in this order

1. Cut the nudge-fatigue rule's sophistication (a flat "don't nudge more than once every N days" is fine if you don't have time for anything smarter)
2. Cut budget-tie-in polish on the ROI calculator (keep the core adjustable-assumption calculator, drop the department-budget cross-reference if pressed)
3. **Do not cut:** the live, adjustable ROI calculator itself — it's your single highest-value screen
4. **Do not cut:** the conflict rule (no new-program nudges to flagged employees/departments) and opted-out enforcement — governance features the rubric rewards

---

## 5. Git workflow reminder

- Branch name: `feature/base-framework` for the shell/auth/LLM-utility work, `feature/subsystem-b-roi` for the ROI/nudge business logic — keep these as separate commits/PRs if possible so a review of "does auth work" isn't tangled up with "does the ROI number update correctly"
- You and Shubhro are the two approvers — for your own PRs, have Shubhro review rather than self-merging where possible, even though you technically can
