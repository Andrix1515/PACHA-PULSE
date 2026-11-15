## Reserve actual map control space - 2026-11-15

Use a shared vertical flow for map context instead of independent top offsets. Collapse terrain detail until requested. A measured fit observes the companion, context and drawers to bound scrollable controls and keep the confirmation action accessible at smaller viewport sizes. Keep the private environment at the existing backend/.env lookup path; ignore all custom *.env filenames rather than broadening application configuration to arbitrary files. Verify Gemini independently of local NDVI inference.

## MODIS/ML implementation decisions - 2026-11-15

Follow FINAL_PRODUCTION_SPEC_MODIS_ML_INGESTION locally, with explicit scientific corrections: HTTP triggers enqueue work rather than training; crop family/cover implies only an IPM review opportunity, not measured pesticide reduction; generic fixation does not imply purchased nitrogen savings. Use exact query-point model coverage, QA-preserving nulls, full historical weather features, chronological target purging, persistence gating and non-executable hashed JSON artifacts. Growers receive a small number of crop cards and a focused satellite lesson; agronomists retain complete observations and validation. Fix simulation identity memoization and calculate geometric quadrant areas independently of decorative plants. See MODIS_ML_IMPLEMENTATION.md.

# Decisions

## 3D parcel simulator, cloud bubble, and role-differentiated UX - 2026-11-15

1. **Interactive 3D Parcel Simulator with Scientific Boundaries**: Divide the normalized 3D parcel footprint into 4 centroid-quadrant zones (`NW`, `NE`, `SW`, `SE`) whose areas (`ha`) sum to the user's spherical polygon area. Combine selected crop, planted zone area (`ha`), campaign duration (`days`), and sowing month with loaded NASA POWER observations and FAO-56/ECOCROP catalog bounds. Label all simulator outputs as illustrative/derived references; never invent crop yields, financial returns, or guaranteed suitability.
2. **Role-Differentiated Guidance (`grower` vs. `agronomist`)**: Keep a single shared scientific calculation engine while tailoring presentation density and typography. `grower` mode uses larger text and plain-language summaries; `agronomist` mode exposes spatial/temporal resolutions, soil depth intervals, sequence rule metrics, and expands technical `<details>` sections by default.
3. **Animated Cloud Bubble & Non-Overlapping Layout**: Replace the rectangular speech card with `.pacha-cloud-bubble` and compute Pacha's 3D stage coordinates from the rendered bubble bounding box so character, bubble, and scene controls never collide across desktop or mobile viewports.

## Map depth and character travel - 2026-11-15

- Keep precise 2D editing, and add a separate 3D inspection of the same saved polygon. Flat ground and plant stages are explicitly illustrative; actual compared sequences can drive crop/campaign selection. This avoids importing unverified simulation values from the team's mockups.
- Add explicit country/region place search with Photon/OpenStreetMap, capped/cached through a separate backend route. Choosing a result moves the camera, never the field point. Manual controls survive service failure. The public Nominatim endpoint was not integrated.
- Offer a cited preliminary crop-reference grouping instead of an unsupported country-wide can/cannot-grow decision. Missing context remains unknown; no existing crop selection is blocked.
- Move the same live Pacha actor independently of the speech card using short curved transitions. Add travel/point/curious poses and retain pause, reduced motion and quiet drawing. Keep mobile controls unobstructed.
- Replace ornamental serif headings with locally hosted Nunito Sans; retain the established green/cream/paper palette and include the font's OFL license.
- Check GitHub heads read-only. Both remote heads remained at 94f2ee8, so write a concrete integration/contract plan rather than claim to have merged unseen teammate changes. No Git write or publication is performed.

## Guided scenes - 2026-11-15

1. Work locally on TetoFan; do not change main or the other team's Project_Farm copy. The existing implementation was backed up under ignored `.local/before-guided-scenes`.
2. Keep forest green, moss, cream and paper, while replacing the permanent dashboard sidebar with a floating cloud Menu and scenes containing one main task.
3. Present role choice, immersive field map, field questions, weather lessons, three planting sequences, focused charts and findings. Keep legacy hashes/API views compatible and show reasons for menu prerequisites.
4. Use authored contextual teaching without a Gemini dependency. Gemini receives optional scene/question context and can interpret evidence or prepare deterministic charts when asked; model actions and chart arithmetic remain bounded.
5. Build an actual procedural Three.js Pacha from the selected character, loaded dynamically. Preserve the existing SVG as a loading/unsupported fallback. Use brief purposeful gestures, quiet drawing, global pause and reduced-motion support, rather than perpetual roaming.
6. Remember confirmed profile, query point, role and progress in validated same-tab sessionStorage. Do not persist AI chat or scientific results as current evidence. Keep the polygon's existing localStorage schema.
7. Add only backward-compatible optional assistant context/proposal fields and scene/view validation. No scientific algorithm, data archive, model provider, key handling or deployment configuration change is needed.
8. Raise secondary text contrast and avoid tiny decorative text on mobile. Preserve keyboard/coordinate alternatives, native menu focus handling, source captions, exact tables and manual operation without AI.

## Previous delivery - 2026-11-14

1. Rename the product to **Pacha Pulse** and use English throughout the current application and project documentation, following the latest user request. Keep legacy launcher filenames and the existing `agroshift-api` health identifier for compatibility with earlier clients.
2. Adapt the supplied `design.zip` visually: forest sidebar, warm paper surfaces, serif headings and original illustrated panorama. Do not execute archive tooling or import unrelated authentication/database scaffolding. Preserve our existing map, NASA and rotation functionality.
3. Reconcile the design's mock modules honestly. Soil scores, pest probabilities, irrigation requirements, vegetation indices, yield forecasts and economic estimates remain unavailable. Do not reproduce illustrative measurements as real outputs.
4. Separate Overview, My field, NASA climate, Rotation planner, Charts, Reports and Help. Grower and Agronomist are explanatory modes over shared calculations. Reduce initial density; keep tables and methods available.
5. Replace the provisional robot with a code-native SVG rabbit matching the team's Icon.jpeg: cream body, green screen, long striped ears and leaf details. Animate ears, greeting, blinking, thinking and celebration. Respect reduced-motion and provide a pause control. Use a modeless panel so the field remains reachable while reviewing suggestions, with keyboard close and focus return.
6. Integrate Gemini directly through the established FastAPI/HTTPX stack. Keep credentials and authoritative climate reconstruction server-side. Use a bounded Interactions tool-calling agent over the existing FastAPI stack: at most three model requests and four local data/chart tools, with typed final responses. Do not introduce another backend or executable plotting code. The default model is configurable.
7. Require explicit confirmation before applying a proposed profile or coordinate change. Never let AI edit field polygons or execute arbitrary tools. Keep a fully local guided tour available without a key.
8. Prepare, but do not publish, a single-domain Vercel Services configuration for React/Vite and Python/FastAPI. Services is currently Beta. Use temporary cloud cache storage and clearly document nonpersistent state. The user manages repository pushes, account secrets and deployment.
9. Retain the authentic NASA archive and its raw hash. Separate deterministic provider mocks and UI fixtures from observations. Live Gemini validation requires the owner's private key; no such key is bundled.

Earlier Spanish documents were backed up in the ignored `.local/before-english` workspace directory before this rewrite. The supplied design archive remains untouched.

10. Close a polygon naturally at the first vertex after at least three corners. Marker click/tap and Enter/Space share the existing validator, never append a duplicate closure node, and leave invalid drafts editable. Preserve the explicit button and coordinate alternatives.
11. Add a manual Charts workspace that works without AI. The model selects a supported chart configuration; the server computes all plotted values and provenance. Keep at most six labelled snapshots in session memory, separate from changing current-field state, and export them with reports.
12. Provider registration runs during FastAPI import on Vercel, where the deployed code directory is read-only. GAEZ initialization only records the optional raster directory and must not create it; optional deployment-time files belong in the bundle, and runtime temporary files belong under `/tmp`.


## Historical MODIS requests - 2026-11-15

Move explicit period downloads out of HTTP into the existing SQLite/offline-worker queue. POST /observations/vegetation/sync returns 202 with stored observations and a point/period-specific job; the legacy GET refresh flag also queues. Read-only GET polls every three seconds while this panel is open. Queue identity includes point, job kind and both dates, independently of the full POWER/MODIS/model update. Eight bounded batches cover the demonstrated 2023–2025 period; no training runs in a history-only job. Successful historical batches, including empty responses, have durable checkpoints. Failed chunks are retried explicitly; dates newer than the publication allowance are not permanently checkpointed. Keep the existing ten-date ORNL request limit. Increase offline MODIS read timeout to 90 seconds with three bounded attempts (connect 10 seconds), after a real single-composite response took about 30 seconds. This does not increase the browser wait for source retrieval. Preserve exact-point isolation, QA masks and nulls.

## Local branch integration - 2026-11-15

Integrate in a new local branch based on the fetched main head dd63dfa, merging TetoFan 12e640d with both histories preserved. Prioritize TetoFan for scene choreography and map interaction; prioritize main for provider URLs, WCS decoder/scaling, terrain sampling, crop rules and agent tools. Retain main's three attributed basemaps under Field tools. Provider queries are explicit rather than automatically firing for map changes. Do not deform the flat 3D model from aggregate terrain statistics. Keep model soil separate from farmer-entered soil. One narrow backend repair uses the existing canonical POWER cache_key in crop screening; no soil or elevation provider is edited. No push, deployment or original branch ref update is authorized or performed.
