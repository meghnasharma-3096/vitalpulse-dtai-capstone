# VitalPulse — Corporate Wellness Intelligence Platform

VitalPulse is a corporate wellness intelligence platform built for a **fictional
mid-size company, Meridian Analytics Pvt. Ltd.** (~950 employees, seeded to
~100 across 9 departments). It unifies three connected problems into one
governed product:

1. **Matching** employees to the right wellness programs
2. **Predicting and preventing individual disengagement** with personalized
   nudges and a live ROI calculator
3. **Predicting team-level burnout risk** while enforcing a strict privacy
   floor, with AI-drafted intervention briefs that always require human
   sign-off

**One-sentence use case:** VitalPulse matches employees to wellness
interventions, predicts individual disengagement and team-level burnout risk,
and quantifies ROI in real dollars, so HR and leadership can act early,
personalize outreach, and prove the value of wellness spend to Finance.

**Live URL:** [https://vitalpulse-dtai-capstone.vercel.app/login](https://vitalpulse-dtai-capstone.vercel.app/login)

---

## Tech stack

- **Framework:** Next.js 16 (App Router), TypeScript
- **Styling:** Tailwind CSS v4, using the design tokens in [design.md](design.md) — no ad hoc colors/fonts
- **Components:** shadcn/ui (`Card`, `Badge`, `Table`, `Dialog`, `Tabs`, `Slider`, `Input`) — no custom-built equivalents
- **Charts:** Recharts
- **Auth:** Session-cookie based, credentials hashed with `bcryptjs` (`lib/auth-server.ts`, `lib/auth.tsx`)
- **AI:** Google Gemini, called only through `lib/llm.ts`; falls back to a mocked response locally when no API key is configured
- **Data layer:** structured JSON files in `data/` — no external database. This is a deliberate choice for the prototype timeline, not an oversight.
- **Deployment:** Vercel

---

## Running locally

```bash
npm install
npm run dev      # http://localhost:3000
```

Other scripts:

```bash
npm run build    # production build
npm start        # serve the production build (after npm run build)
npm run lint      # eslint
npx tsc --noEmit  # typecheck
```

No environment variables are required to run locally — `lib/llm.ts` returns a
mocked response for every AI call when `GEMINI_API_KEY` isn't set, so the app
is fully explorable without credentials. Set `GEMINI_API_KEY` (Vercel env var
in production) to use the real Gemini API.

### Logging in

The `/login` page has one-click "Log in as [Role]" buttons and lists demo
credential IDs in plain text underneath, labeled for demo/grading purposes —
no typed password needed. Roles: **CFO/Exec**, **HR Admin**, **Department
Manager**, **Employee** (several sample employee personas exist — new parent,
high performer disengaging, at-risk/flagged, standard, opted-out).

---

## Repo structure

```
app/
├── login/
├── cfo/dashboard/                 CFO rollup: AI-vs-without comparison, quick links
├── hr-admin/
│   ├── dashboard/                 company-wide overview
│   ├── employees/                 unified employee profile (Subsystems A + B + C)
│   ├── programs/                  Subsystem A — program catalog
│   ├── roi/                       Subsystem B — live ROI calculator
│   └── burnout-radar/             Subsystem C — company-wide radar (HR Admin + CFO)
├── dept-manager/dashboard/        Subsystem C's scoped view, plus A + B sections
├── employee/dashboard/            Subsystem A + B — matches and nudges
├── actions/                       Server Actions (nudges, interventions)
└── api/                           Route Handlers (auth, nudges, time-simulation)

components/
├── shared/                        cross-subsystem UI (nav, risk badges, app shell) — off-limits except via PR
├── ui/                            shadcn/ui primitives
├── subsystem-a/                   Wellness Matching components
├── subsystem-b/                   Disengagement + ROI components
└── subsystem-c/                   Burnout Radar + Governance components

lib/
├── auth-server.ts                 server-side session/user resolution — off-limits except via PR
├── auth.tsx                       client useCurrentUser() hook/context — off-limits except via PR
├── data.ts                        shared data-loading + role-filtering helpers — off-limits except via PR
├── llm.ts                         the only place any subsystem touches Gemini — off-limits except via PR
├── subsystem-a.ts / subsystem-b.ts / subsystem-c.ts   each subsystem's own business logic
└── roi-math.ts                    ROI calculation helpers

data/                              seeded JSON — employees, departments, programs, nudges,
                                    burnout snapshots, interventions, credentials

proxy.ts                           Next.js 16's replacement for middleware.ts — route-level role gating
docs/                              build specs and process docs (source of truth for intent/history)
design.md                          design system — the source of truth for how VitalPulse looks
```

---

## The three subsystems

| # | Name | Core function | Routes owned |
|---|---|---|---|
| A | **Wellness Matching & Marketplace** | Matches employees to programs based on inferred need; tracks capacity, utilization, and underutilization | `/hr-admin/programs`, contributes to `/employee/dashboard` and the unified employee profile |
| B | **Disengagement Prediction & ROI Engine** | Predicts individual disengagement risk, sends personalized nudges, live ROI calculator, CFO "with AI vs. without" comparison | `/hr-admin/roi`, contributes to `/cfo/dashboard`, `/employee/dashboard`, unified employee profile |
| C | **Burnout Radar & Governance** | Predicts department-level burnout risk with a hard privacy floor; AI-drafted intervention briefs requiring human sign-off; escalation on inaction | `/hr-admin/burnout-radar` (HR Admin + CFO, read-only for CFO), scoped section of `/dept-manager/dashboard` |

Base framework, auth/persona shell, the shared LLM utility, shared design
system, and shared data layer are owned by Meghna, independent of any single
subsystem — see [AGENTS.md](AGENTS.md) for the contracts every subsystem
builds against.

---

## Key features

- **Role-based access control**, enforced server-side (not just hidden in the
  UI) — `cfo`, `hr_admin`, `dept_manager`, `employee`, gated in both
  `proxy.ts` (route-level) and `lib/data.ts`/`lib/subsystem-c.ts` (data-level)
- **Privacy floor** — no burnout snapshot is ever generated or shown for a
  department with headcount below 5; at least one seeded department sits
  below this threshold to prove the suppression rule holds
- **Human sign-off on AI-drafted interventions** — an intervention brief is
  never auto-applied; a human must approve, reject, or escalate it, with an
  audit trail (`data/interventions.json`) recording who and when. The one
  system-driven exception is auto-escalation of a `pending` intervention past
  a seeded SLA threshold — itself a required, spec'd edge case, and still
  logged with a distinct `actedBy` value rather than a blank one
- **Conflict rule** — an employee whose disengagement risk score or
  department burnout flag is currently high does not receive new-program
  nudges; the system visibly suppresses this instead of nudging blindly
- **Consent/opt-out** — an opted-out employee gets zero nudges, zero
  recommendations, and zero risk scoring shown anywhere
- **Explainability** — every AI-generated recommendation/nudge/brief carries
  a "why am I seeing this" explanation
- **Time-simulation control** — visible only to HR Admin/CFO, advances a
  simulated clock and updates trend/escalation data live, for an interactive
  demo rather than a static screenshot
- **CFO "with VitalPulse vs. without" comparison** — the headline
  business-impact visual on the CFO dashboard
- **Nudge fatigue + feedback loop** — repeated dismissals reduce/change
  future nudges; "not helpful" feedback is logged and referenced later

---

## Further reading

- [design.md](design.md) — design system, source of truth for styling
- [docs/system-design.md](docs/system-design.md) — original architecture and process guardrails
- [docs/subsystem-a-spec.md](docs/subsystem-a-spec.md), [docs/subsystem-b-spec.md](docs/subsystem-b-spec.md), [docs/subsystem-c-spec.md](docs/subsystem-c-spec.md) — per-subsystem build specs
- [AGENTS.md](AGENTS.md) — contracts and rules for AI coding assistants working in this repo
