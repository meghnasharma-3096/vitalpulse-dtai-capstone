@AGENTS.md

# Claude Code-specific notes

Everything above (via the include) is the shared contract for any AI coding
assistant in this repo. A few things specific to working here with Claude
Code on Windows:

- **Killing stale dev/prod servers:** targeting a single PID from `netstat`
  can miss child Node processes and leave stale in-memory state around
  (misleading during manual testing of anything time-simulation or
  approval-flow related). Prefer `taskkill //F //IM node.exe` to clear all
  Node processes before starting a fresh `npm run dev` / `npm run build && npm start`.
- **Verifying UI changes:** this repo has no test suite, so `tsc`/`eslint`/
  `build` passing is necessary but not sufficient. Drive the actual page with
  Playwright (`playwright-core`, launched from a scratch script) — log in via
  `POST /api/auth/login` with a demo `credentialId` from `data/credentials.json`,
  navigate, and screenshot — before reporting a UI fix as done.
- **Production vs. dev parity:** the module-instance-splitting gotcha
  described in AGENTS.md reproduces in both `next dev` and a real
  `next build && next start`. Don't assume a fix verified only under `next dev`
  is verified for production — re-check under a production build for anything
  touching cross-invocation state.
