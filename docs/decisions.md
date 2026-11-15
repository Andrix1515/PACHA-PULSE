# Decisions

## Current delivery - 2026-11-14

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
