<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# VitalPulse — Guidance for AI Coding Assistants

VitalPulse is a corporate wellness intelligence platform (Next.js 16 App
Router, TypeScript, Tailwind v4, shadcn/ui, Recharts) with three independently
-built subsystems sharing one login system, one data layer, and one design
language. Read [README.md](README.md) for the project overview and
[docs/system-design.md](docs/system-design.md) for the full original spec —
this file is the condensed set of rules that must not be violated regardless
of which subsystem you're touching.

## The three subsystems

| # | Name | Owns |
|---|---|---|
| A | Wellness Matching & Marketplace | `/hr-admin/programs`, `data/wellness-programs.json`, `lib/subsystem-a.ts`, `components/subsystem-a/` |
| B | Disengagement Prediction & ROI Engine | `/hr-admin/roi`, `data/nudges.json`, `lib/subsystem-b.ts`, `components/subsystem-b/` |
| C | Burnout Radar & Governance | `/hr-admin/burnout-radar`, `data/burnout-snapshots.json` + `data/interventions.json`, `lib/subsystem-c.ts`, `components/subsystem-c/` |

Base framework, auth, the shared LLM utility, shared data layer, and shared
design system are outside all three subsystems and are the shared contracts
below.

## Shared contracts — off-limits except via PR review

- **`lib/auth-server.ts`** — server-side session resolution (`getCurrentUser()`, `Role`, `CurrentUser`). Never build parallel login/session logic; never read the session cookie directly from subsystem code.
- **`lib/auth.tsx`** — the client-side `useCurrentUser()` hook/context every subsystem calls to get the logged-in user.
- **`lib/data.ts`** — shared data-loading and role-filtering helpers. Every data-fetching function takes the current user and filters server-side before returning data (a Dept Manager only ever gets their own department back, an Employee gets only their own records, etc.) — this must be enforced in the data layer, not by hiding UI elements client-side.
- **`lib/llm.ts`** — the only place any subsystem touches Gemini: `generateNudge()`, `generateInterventionBrief()`, `generateProgramRecommendation()`. Never call the Gemini SDK directly, never touch a raw API key. Every function checks a cache first, and falls back to a graceful pre-written string on API failure/timeout (>5s) rather than an error state.
- **`components/shared/`** — cross-subsystem UI (nav config, app shell, risk badge, pulse dot). Reuse it; don't fork it.
- **`proxy.ts`** — Next.js 16's replacement for `middleware.ts`; route-level role gating. Extend the existing carve-out pattern (e.g. `isScopedHrAdminView`, `isCfoBurnoutRadarView`) rather than inventing a new gating mechanism.

If one of these genuinely needs to change, say so and make the change
explicitly — don't edit around it or duplicate its logic in subsystem code.

## Data schemas (`data/*.json`) — do not change field names/structure silently

- `employees.json` — `id` (`EMP-####`), `departmentId`, `personaTag` (`new_parent | high_performer | at_risk | standard`), `optedOut`, `disengagementRiskScore`, `lastCheckIn`
- `departments.json` — `id` (`DEPT-*`), `headcount`, `budgetAllocatedINR`, `budgetUsedINR`
- `wellness-programs.json` — `id` (`PROG-*`), `category`, `capacity`, `enrolledCount`, `costPerEmployeeINR`
- `nudges.json` — `id` (`NUDGE-####`), `employeeId`, `type`, `status` (`sent | dismissed | acted_on`), `feedback` (`helpful | not_helpful | null`)
- `burnout-snapshots.json` — `departmentId` (never an individual employee — department-level only, by design), `weekOf`, `riskScore`, `trend` (`worsening | stable | improving`), `headcount`
- `interventions.json` — `id` (`INT-###`), `departmentId`, `aiDraftedBrief`, `status` (`pending | approved | rejected | escalated`), `actedBy` (`EMP-#### | "system (auto-escalation)" | null`), `timestamp`, `escalationReason`
- `credentials.json` — role, display name, and a **hashed** password (`bcryptjs`) per demo account — never plaintext

If a new field is genuinely needed, propose it rather than adding it silently
— other subsystems and the shared data layer read these structurally.

## Rules that must never be relaxed

1. **Privacy floor** — never generate, store, or display a burnout snapshot
   for a department with headcount below 5. This is enforced in code
   (`PRIVACY_FLOOR_HEADCOUNT` in `lib/data.ts`), not by coincidence of seed
   data. At least one seeded department must sit below this threshold.
2. **Human sign-off** — an AI-drafted intervention brief is never
   auto-applied. A human action (approve/reject/escalate) is required before
   `status` changes from `pending`. The one system-driven exception is
   auto-escalation of a `pending` intervention that has sat past the seeded
   SLA threshold (`checkAutoEscalations()` in `lib/subsystem-c.ts`) — this is
   itself a spec'd edge case ("escalation on inaction"), and it must still
   write a distinct `actedBy` (e.g. `"system (auto-escalation)"`), never a
   blank/null value that would look like nobody acted.
3. **Server-side role enforcement** — role checks happen in `lib/data.ts` /
   `lib/subsystem-*.ts` and in `proxy.ts`, never only by hiding a UI element.
   A Department Manager's or Employee's restricted view must hold even if
   someone inspects network requests directly.
4. **Consent/opt-out** — an employee with `optedOut: true` gets zero
   nudges, zero recommendations, and zero risk scoring shown anywhere, in
   every subsystem, not just their own.
5. **Conflict rule** — an employee with a high `disengagementRiskScore`, or
   whose department is currently burnout-flagged, does not receive a
   new-program-style nudge/recommendation; the suppression is shown
   explicitly (e.g. "Currently not recommending new programs — flagged for
   reduced load"), not silently skipped.
6. **The simulated clock, not the wall clock** — any logic that reacts to
   "time passing" (e.g. SLA/escalation checks) must anchor to
   `getSimulatedDate()` in `lib/data.ts`, never `new Date()`. The demo's
   "Advance to next week" control (HR Admin/CFO only) is the only thing that
   should move that clock forward.
7. **No ad hoc styling** — use the design tokens and shadcn/ui components
   documented in [design.md](design.md); don't hardcode hex colors or build
   custom equivalents of `Card`/`Badge`/`Table`/`Dialog`/`Tabs`.

## Known architectural gotcha

Next.js 16 with Turbopack can give Route Handlers, Server Actions, and Server
Components separate module instances of the same imported file within a
single server process — confirmed to happen in both `next dev` and a
production `next build && next start`. A plain in-memory module-level object
(`const store = {...}`) can silently desync between these depending on which
execution path served a given request. If you add mutable state that needs to
survive across requests, persist it to disk (see the read-fresh /
write-through pattern already used for the simulated clock) rather than
holding it only in memory.

## Verifying a change

Before considering a change done: `npx tsc --noEmit`, `npx eslint <files>`,
and `npm run build`. For anything UI-visible, actually load it in a browser
(or via Playwright) rather than relying on types/lint/build alone — those
verify correctness, not that the feature works as intended.
