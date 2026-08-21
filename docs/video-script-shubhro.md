# Walkthrough Video Script — VitalPulse (for Shubhro)

This video is the primary demo now that there's no live presentation — treat it as if it's replacing the "3-minute live demo" the instruction sheet originally described, recorded as a backup. Aim for roughly that length, extended a bit if needed to genuinely show all four personas, since that's more valuable than hitting an exact time.

**Practical note:** get a live walkthrough from Meghna (or whoever finished each subsystem) before you record — this script tells you what to show and say, but you should actually click through the real, deployed app once yourself first so nothing surprises you mid-recording. Record from the deployed Vercel URL, not localhost, so it matches what a grader would see.

---

## Shot list & narration

**0:00–0:15 — Cold open**
Show the login page. Narrate: *"This is VitalPulse — a corporate wellness intelligence platform for Meridian Analytics, a company of about 950 employees. It brings together wellness program matching, disengagement prediction, and burnout risk governance into one integrated platform."* Point out the demo login buttons. Mention that credentials are also available via the "Need demo credentials?" toggle for anyone signing in manually.

**0:15–0:45 — CFO view**
Log in as CFO. Show the company-wide rollup and, specifically, the **"with AI platform vs. without" comparison** — this is your strongest business visual, don't rush past it. Narrate the projected savings number and what it's based on.

**0:45–1:30 — HR Admin: Wellness Matching**
Log in as HR Admin. Show the program catalog, capacity/enrollment, and the **underutilization flag** on at least one program. Click into an employee's matched programs — show the "why this was recommended" explanation. Then click into the **opted-out employee** and explicitly show they have zero recommendations — narrate that this is a deliberate consent feature, not a bug.

**1:30–2:15 — HR Admin: Disengagement + ROI**
Show at least two different employee personas side by side — e.g. the new parent and the high performer disengaging — and point out their nudges are genuinely different in tone/content. Open the **live ROI calculator** and adjust an assumption on screen so the number visibly moves. Narrate the CFO-facing logic behind it.

**2:15–3:00 — HR Admin: Burnout Radar**
Show the department-level burnout view with trend lines — point out one department that's **improving**, not just the worsening ones. Click into a flagged department, show the **AI-drafted intervention brief**, and actually click Approve (or Reject) on screen — narrate that this is a required human action, the AI never auto-applies anything. Then click into the deliberately small (under-5-person) department and show the **privacy floor message** — this is one of the most important 15 seconds in the whole video, don't cut it for time.

**3:00–3:20 — Time simulation**
Click the "Advance to next week" control and show a trend or nudge updating in response — narrate that this demonstrates the predictive, not just descriptive, nature of the platform.

**3:20–3:40 — Department Manager view**
Log out, log in as Department Manager. Show that they see the same *kind* of tools as HR Admin, but scoped to only their own department — point this out explicitly, it's the access-control story.
Show both tabs — Overview (department stats, at-risk table) and Wellness Programs (scoped catalog view).

**3:40–4:00 — Employee view + close**
Log in as an Employee. Show their personal dashboard — matched programs, their own nudges, nothing about anyone else. Close with the live URL on screen and a one-line summary: *"VitalPulse — matching, prediction, and governance, in one platform, live at [URL]."*

---

## Things to explicitly narrate somewhere in the video (don't let these get lost)
- Why a lightweight seeded/versioned JSON data file was used instead of a live database — say this is a deliberate, documented choice for the build timeline, not an oversight
- That role-based data access is enforced server-side, not just hidden in the UI
- That the human-approval step on intervention briefs is mandatory, never skippable

## Git note (since you're also a PR-merge approver)
Make sure the version you're recording from is the actual merged, deployed `main` branch — not a stale preview or a branch that hasn't been merged yet. If you're reviewing/merging other people's PRs close to when you're recording, do the merge review first, confirm the live URL reflects it, then record.
