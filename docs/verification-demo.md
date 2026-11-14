# Verification record - 2026-11-14

## Executed checks

| Check | Actual result |
| --- | --- |
| Backend: `.venv/Scripts/python.exe -m pytest -q` from `backend` | 50 passed; latest execution 2.66 seconds |
| Frontend: `npm run build` | Passed TypeScript checks and production Vite build |
| Browser full run: `npm run test:e2e` with free test ports 5175/8002 | 26 passed, 4 deliberately skipped duplicate device-independent geometry cases; 1.7 minutes |
| Focused follow-up: `node node_modules/@playwright/test/cli.js test --grep '320px|historical date'` | 4 passed across desktop and mobile; 27.6 seconds |
| Live NASA script: `backend/scripts/verify_power_integration.py` | HTTP 200, first delivery live, second cache, 31 complete daily rows; no mock |
| Vercel configuration rules | Passed published configuration rules with a Draft 7 validator; no cloud build or deployment executed |
| Restarted local launcher and proxy | Project page HTTP 200, API health HTTP 200, assistant status HTTP 200, authentic saved example HTTP 200 |
| Unconfigured assistant over the actual local proxy | Typed HTTP 503 `assistant_not_configured`; authored guide remains available |

The full browser run was followed by a focused check after adding the upstream-error/date test and making the 320px check exercise actual keyboard focus. Across these runs, all 28 distinct active browser/geometry cases in the current suite passed. Four pure geometry cases execute once on desktop and are intentionally skipped as duplicates in the mobile project. No claim is made that a root-font-size change alone verifies browser zoom or text resizing.

The published Vercel schema declares older draft metadata while using newer keywords in unused experimental trigger definitions. Strict schema meta-validation rejected that inconsistency. Evaluating the actual configuration against its published rules with the Draft 7 validator produced no errors. This is configuration validation, not proof of a successful Vercel cloud build.

## User-story coverage

- English landing page and six-module navigation on desktop and Pixel 7 emulation.
- Valid, blank, out-of-range and zero coordinates; unknown soil/water and profile-area validation.
- Polygon drawing through coordinates, map taps and keyboard-center controls; crossing and duplicate rejection, concave reference point, approximate area, validated GeoJSON draft import/export, reload persistence, delete and undo.
- Authentic saved NASA record and expanded Agronomist observation table; no invented source values.
- Three backend rotation comparisons at 100% and 70%, preserved editor state and invalidated stale results, plus reports/export.
- Synthetic Gemini browser reply showing that a profile stays unchanged until explicit confirmation, then updates the actual form.
- Missing-key/error handling, unchanged field data after chat errors, local guided steps, keyboard Escape/focus return, paused animation and reduced-motion preference.
- 320px page reflow and keyboard skip link, with no horizontal page scrolling in the checked views. Wide data tables scroll within their labelled regions.
- Automated axe checks with WCAG 2 A/AA, 2.1 AA and 2.2 AA tags on landing, overview, field editor, climate table, comparison, reports, help and companion states. The active-navigation and small step-number contrast issues found during the first run were corrected.

Gemini provider tests use explicitly synthetic HTTP responses. They cover missing keys, private status, correct Interactions headers/schema and disabled server conversation storage, invalid inputs/proposals, malformed replies, authentication/rate errors, timeout, server-resolved historical evidence, and recomputed scenario values. They do not prove real Google model access or eliminate natural-language hallucinations.

## Observation evidence

`docs/evidence/power-integration.json` records the fresh live NASA request retrieved at 2026-11-14T21:53:51.145195+00:00: API v2.10.3, 31 complete days, January 2025 at -12.05/-75.2, mean temperature 9.41 degrees C and rainfall total 60.64 mm. The authentic saved raw file and its SHA-256 remain unchanged. Its source manifest's explanatory limitations were translated to English.

Current screenshots use `pacha-landing-*`, `pacha-overview-*`, `pacha-field-*`, `pacha-climate-*` and `pacha-companion-*` under `docs/evidence`. Older differently named images describe previous interfaces. Desktop overview and mobile companion screenshots were also visually inspected.

## External checks still required

No private Gemini key is configured, so a real Gemini answer remains unverified. The owner's key must be entered privately, the API restarted/redeployed, and a real answer plus confirmed entry tested.

No Vercel deployment was created. Follow `VERCEL_DEPLOYMENT.md`, then verify both services, the real chat flow and public incognito access. Services is currently Beta and its cache is ephemeral. Manual screen-reader and farmer usability testing remains outside the automated check results.

Local delivery is running at http://localhost:5174 (API 8001). Test-only processes were stopped by Playwright. The separate Project_Farm version was not edited or stopped.
