# VitalPulse — Design System

This is the single source of truth for how VitalPulse looks, superseding the short
Section 6 sketch in `docs/system-design.md`. It incorporates the full
`docs/design-polish-addendum.md` pass — same palette family, same light theme
(no dark mode), executed with actual intention instead of framework defaults.
Every subsystem (A, B, C) builds against this doc so three independently-built
areas read as one product.

**Component rule stands:** use shadcn/ui components (`Card`, `Badge`, `Table`,
`Dialog`, `Tabs`, `Slider`, `Input`) — no custom-built equivalents. That's still
the single biggest thing keeping three people's code visually consistent; this
doc governs how those components are *themed*, not whether to use them.

---

## 1. Color tokens

| Token | Value | Use |
|---|---|---|
| Background | `#F7F9F6` | App background — a cooler, faintly minty off-white, not flat cream |
| Surface | `#FFFFFF` | Card/panel backgrounds |
| Primary | `#2D6A4F` | Brand teal — buttons, active states, key numbers |
| Primary tint | `#E8F3EE` | Light teal backgrounds for chips, active nav items, badges |
| Accent | `#F4A261` | Sparingly — nudges/alerts only, never backgrounds |
| Risk — low | `#52B788` | Used consistently across ALL THREE subsystems for any risk indicator |
| Risk — medium | `#F4A261` | (burnout, disengagement, budget) |
| Risk — high | `#E63946` | |
| Text primary | `#1B1F1D` | Headings, key numbers |
| Text secondary | `#5B655F` | Labels, captions, metadata |

These live as CSS custom properties in `app/globals.css` (`--background`,
`--card`, `--primary`, `--primary-tint`, `--risk-low/medium/high`,
`--foreground`, `--muted-foreground`) and are exposed as Tailwind utilities
(`bg-primary`, `text-primary-tint`, `bg-risk-high`, etc.) via the `@theme
inline` block. Don't hardcode hex values in components — use the token.

There is **no dark mode**. Don't add a theme toggle or `.dark` variant styling;
if OS-level dark mode matters later, that's a deliberate future decision, not
an accidental one.

## 2. Elevation (replaces flat borders)

Cards get a soft, **teal-tinted** shadow instead of a gray border — this is the
single highest-impact change in the whole system. It's what makes cards feel
like they have physical depth instead of sitting flush on the page.

```css
/* resting state */
box-shadow: 0 1px 3px rgba(45,106,79,0.08), 0 8px 24px rgba(45,106,79,0.06);

/* hover/active state, where relevant */
box-shadow: 0 2px 6px rgba(45,106,79,0.10), 0 12px 32px rgba(45,106,79,0.10);
```

Exposed as `--shadow-card` / `--shadow-card-hover` in `globals.css`, applied by
the base `Card` component (`components/ui/card.tsx`) — every card in the app
inherits this automatically. Don't add `border` back onto a `Card`.

## 3. Radius

- Cards, panels: `rounded-xl` → 12px
- Primary buttons, status badges, pills: `rounded-full`
- Inputs: `rounded-lg` → 8px

Be consistent — don't mix radius values across similar components. The base
`--radius` token and `--radius-xl` are tuned in `globals.css` so the built-in
Tailwind radius scale hits these targets without one-off arbitrary values in
component code.

## 4. Type scale

Still Inter — this is about hierarchy, not swapping fonts. Two weights only:
regular (400) and semibold (600).

| Role | Size / weight | Example |
|---|---|---|
| Hero number | 48–56px, bold | The ROI figure, day-streak-style counters |
| Page title (H1) | 28–32px, semibold | "Executive Dashboard" |
| Section header (H2) | 18–20px, semibold | "Company-wide disengagement risk" |
| Body | 15px, regular | Card copy, table rows |
| Label / eyebrow | 12–13px, medium, uppercase, letter-spacing +0.05em | A small caps label above a heading |

The biggest visible win here is contrast: make the important numbers
dramatically bigger and the metadata dramatically smaller, rather than letting
everything sit close to one default size.

## 5. Icons

Use `lucide-react` (already a dependency via shadcn/ui) consistently:

- Every nav item gets a paired icon.
- Every persona card on the login page gets an icon (CFO → trend/chart icon,
  HR Admin → shield icon, Dept Manager → team icon, Employee → person icon).
- Section headers on dashboards get a small leading icon.

Keep icons at `size-4` (16px) inline with text unless a page explicitly calls
for something larger (e.g. a role card's leading icon).

## 6. Signature element — the "pulse"

Since the product is literally called **VitalPulse**, a small pulsing dot
appears next to *live, currently-updating* numbers specifically — the
CFO dashboard's "with VitalPulse vs. without" savings figure, and disengagement
risk scores anywhere they're shown. This ties the brand name to the platform's
actual predictive/live behavior.

**Spend this in exactly one place conceptually — don't repeat it on every
number in the app.** It marks "this is live/predictive," not "this is
important." The ROI calculator's adjustable-assumption figure (`/hr-admin/roi`)
does *not* get it — it's a manual what-if tool, not a live signal, even though
it's also a large number.

Component: `components/shared/pulse-dot.tsx`, used inside
`components/shared/risk-badge.tsx` (every risk score) and
`components/subsystem-b/ai-vs-without-chart.tsx` (the CFO headline figure)
only.

## 7. Chart styling (Recharts)

- Bar charts: rounded corners on the value end (`radius={[6, 6, 0, 0]}` for
  vertical bars, `radius={[0, 6, 6, 0]}` for horizontal bars).
- Area/line charts: light gradient fill under the line, using that series'
  own color at low opacity — not a flat fill.
- Gridlines: lighter (`stroke="#E5E9E6"`), solid, drawn only on the value axis
  (not a full grid in both directions).
- Legend: styled as small rounded pill chips (colored dot + label in a
  rounded-full container), not Recharts' default square/line markers.

## 8. Buttons

- Primary actions: `rounded-full`, solid primary teal, white text.
- Secondary/outline actions: `rounded-full`, teal border, teal text,
  transparent fill.
- No sharp-cornered default buttons anywhere in the app.

## 9. Layout (unchanged from the base framework)

- Persistent left sidebar nav (role-aware — only shows routes the current role
  can access), top bar with user name/role and logout.
- Sidebar sits on `Background`, main content sits on `Background`, cards sit on
  `Surface` and are lifted off both via the shadow in Section 2.
