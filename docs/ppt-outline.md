# PPT Outline & Script — VitalPulse (for Alisha)

This is submitted as a file, not presented live, so it needs to be **more self-explanatory than a normal deck** — assume the reader has no one to ask questions of. Write full sentences in the speaker-notes-equivalent for each slide, not just bullet fragments, since this doc has to carry weight a live presenter normally would.

Follow whatever the official 17-section board-presentation structure from the instruction sheet requires for section headers/order — this outline gives you the *content* to slot into that structure, focused on making sure every feature we built actually gets surfaced. Cross-check section numbering against the instruction sheet before finalizing slide order.

---

## Core narrative to carry through the whole deck
VitalPulse isn't three separate features sharing a login page — it's one platform where wellness matching, disengagement prediction, and burnout governance actively reason about each other (e.g., an at-risk employee doesn't get new-program nudges). Every section should reinforce "integrated," not "three apps."

---

## Content to include, section by section

**Company/problem framing:** Meridian Analytics Pvt. Ltd., a fictional ~950-employee company. India's corporate wellness market is roughly $2.5-2.6B (2025) heading toward ~$4B — this sits on an already-funded budget line, the product is the missing analytics/intelligence layer, not a new spend category.

**Use case definition:** *"This application matches employees to the wellness interventions most likely to work for them, predicts which employees and departments are disengaging or heading toward burnout, and quantifies program ROI in real dollars, so that HR can act early and prove the value of wellness spend to the CFO."*

**AI capability:** rule-based/statistical risk scoring (disengagement + burnout) combined with generative AI (Gemini) for personalized nudges, program recommendations, and AI-drafted intervention briefs — always with human sign-off before action.

**Personas — cover all four, with a visual for each:**
- CFO/Exec — company-wide ROI rollup, "with AI platform vs. without" comparison
- HR Admin — full operational control across all three subsystems
- Department Manager — same tools, scoped to their own team
- Employee (multiple samples — new parent, high performer disengaging, at-risk/flagged, standard, opted-out) — show that different employees genuinely get different AI outputs

**Feature walkthrough — make sure every one of these gets an explicit slide or bullet, don't let any get folded away as "and more":**
1. Unified employee profile (the integration story)
2. Program matching + underutilization flag
3. Disengagement prediction + personalized nudges + live ROI calculator
4. Burnout radar with the hard privacy floor (a department under 5 people is never individually or aggregately reported — show this explicitly, it's a strong governance beat)
5. AI-drafted intervention briefs requiring human approval, with a full audit trail
6. Consent/opt-out — an employee who opted out gets zero tracking, zero nudges, shown explicitly
7. Explainability — "why am I seeing this" on AI outputs
8. Time-simulation control — shows the platform is predictive/trend-aware, not just a static dashboard
9. Budget-aware recommendations — the ROI calculator and intervention briefs respect real department budgets
10. Escalation on inaction — an ignored high-risk flag automatically escalates to leadership
11. Trend reversal — at least one department improving, not just worsening (the tool isn't only ever bad news)
12. Nudge fatigue + feedback loop — the system adapts when nudges aren't landing

**Business model & KPI:** B2B SaaS sold to HR, justified to Finance — reframes wellness spend as a productivity/absenteeism/attrition investment. Revenue model: per-employee/month platform fee. The CFO "with AI vs. without" savings comparison is your single strongest business-impact visual — give it real screen time.

**Governance/limitations slide (be upfront, don't bury this):** synthetic/seeded data rather than live HRIS integration (deliberate choice for the build timeline); demo authentication rather than production auth; transparent rule-based risk scoring rather than a trained ML model, chosen specifically for explainability within the project timeline. State these as documented, considered decisions — not omissions you're hoping no one asks about.

**Live URL + credentials slide:** include the deployed URL and the demo login buttons/credentials clearly, since there's no live click-through — the reader needs to be able to try it themselves. 
Note: credentials are now behind a "Need demo credentials?" toggle on the login page — screenshot it in the expanded state so credentials are visible in the deck, since the reader can't click through.

---

## Tone note
Since this reads without you presenting it, write every slide's supporting text as if answering "why should I believe this works," not just "what we built." Where possible, tie a feature back to the specific rubric line it answers (AI understanding, governance, business impact) — a grader reading a static deck responds well to a document that clearly knows what it's being graded on.
