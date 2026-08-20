# VitalPulse — Design Polish Addendum

This **replaces and expands** Section 6 (Design System) of file 01. Same palette family, same light theme — no dark mode — just executed with actual intention instead of framework defaults. Give this to Claude Code as a dedicated polish pass, ideally before teammates 2/3 start building, so their subsystems inherit the upgraded look rather than the current default one.

---

## Why this pass matters

The current build is functionally correct but visually reads as "assembled from defaults" — flat white cards with thin gray borders, uniform spacing, no icons, no depth. This addendum fixes that without touching architecture, data, or auth.

---

## Updated color tokens

| Token | Value | Use |
|---|---|---|
| Background | `#F7F9F6` | App background — a cooler, faintly minty off-white, not flat cream |
| Surface | `#FFFFFF` | Card/panel backgrounds |
| Primary | `#2D6A4F` | Brand teal — buttons, active states, key numbers |
| Primary tint | `#E8F3EE` | Light teal backgrounds for chips, active nav items, badges |
| Accent | `#F4A261` | Sparingly — nudges/alerts only, never backgrounds |
| Risk — low | `#52B788` | |
| Risk — medium | `#F4A261` | |
| Risk — high | `#E63946` | |
| Text primary | `#1B1F1D` | Headings, key numbers |
| Text secondary | `#5B655F` | Labels, captions, metadata |

## Elevation (replaces flat borders)

Cards get a soft, **teal-tinted** shadow instead of a gray border:
```css
/* resting state */
box-shadow: 0 1px 3px rgba(45,106,79,0.08), 0 8px 24px rgba(45,106,79,0.06);

/* hover/active state, where relevant */
box-shadow: 0 2px 6px rgba(45,106,79,0.10), 0 12px 32px rgba(45,106,79,0.10);
```
This alone is the single highest-impact change — it's what makes cards feel like they have physical depth instead of sitting flush on the page.

## Radius

- Cards, panels: `rounded-xl` (12px)
- Primary buttons, status badges, pills: `rounded-full`
- Inputs: `rounded-lg` (8px)

Be consistent — don't mix radius values across similar components.

## Type scale (still Inter — this is about hierarchy, not swapping fonts)

| Role | Size / weight | Example |
|---|---|---|
| Hero number | 48–56px, bold | The ROI figure, day-streak-style counters |
| Page title (H1) | 28–32px, semibold | "Executive Dashboard" |
| Section header (H2) | 18–20px, semibold | "Company-wide disengagement risk" |
| Body | 15px, regular | Card copy, table rows |
| Label / eyebrow | 12–13px, medium, uppercase, letter-spacing +0.05em | "MORNING BLOCK"-style small labels above a heading |

Right now most text sits close to one default size — the biggest visible fix here is making the important numbers dramatically bigger and the metadata dramatically smaller.

## Icons

Use `lucide-react` (already available via shadcn/ui) consistently:
- Every nav item gets a paired icon (currently none do)
- Every persona card on the login page gets an icon (CFO → a chart/trend icon, HR Admin → a shield/people icon, Dept Manager → a team icon, Employee → a person icon)
- Section headers on dashboards get a small leading icon

## Signature element (spend this in exactly one place — don't repeat it everywhere)

Since the product is literally called **VitalPulse**, use a small heartbeat/pulse-line motif or a soft glowing dot next to *live, currently-updating* numbers specifically — the ROI figure on the CFO dashboard, a disengagement risk score, anything driven by the time-simulation control. This ties the brand name to the platform's actual predictive/live behavior and gives you one memorable visual moment instead of decorating everything equally.

## Chart styling (Recharts)

- Bar charts: rounded top corners (`radius={[6, 6, 0, 0]}` on `<Bar>`)
- Area/line charts: light gradient fill under the line using primary teal at low opacity, not flat color
- Gridlines: lighter (`stroke="#E5E9E6"`), horizontal only, not a full grid
- Legend: styled as small rounded pill chips, not default Recharts legend markers

## Buttons

- Primary actions: `rounded-full`, solid primary teal, white text
- Secondary/outline actions: `rounded-full`, teal border, teal text, transparent fill
- Avoid sharp-cornered default buttons anywhere in the app

---

## Prompt to give Claude Code

```
I want a design polish pass across everything built so far — this changes visual
styling only, not functionality, routes, or data.

Read the attached Design Polish Addendum in full, then:

1. Update the global Tailwind theme/CSS variables to the new color tokens,
   shadow values, and radius scale specified.
2. Apply the new card elevation (shadow, not border) to every card component.
3. Add lucide-react icons to the nav, the login page's persona cards, and
   dashboard section headers.
4. Rework the type scale so hero numbers (ROI figure, any large stat) are
   dramatically larger/bolder, and labels/captions are smaller and lighter,
   per the scale in the addendum.
5. Restyle existing Recharts charts per the addendum — rounded bars, gradient
   fills, lighter gridlines, pill-style legend.
6. Add the "pulse" signature element (small heartbeat-line or glowing dot)
   next to exactly the live/time-simulation-driven numbers — the CFO ROI
   figure and any risk score — nowhere else.
7. Restyle all buttons to the rounded-full treatment described.

Don't touch routing, data fetching, auth logic, or component structure —
this is a styling-only pass. Show me a screenshot or describe the changed
files when done so I can review before committing.
```

Attach this file alongside file 01 when you give Claude Code that prompt.
