# Combining the main functionality and TetoFan experience

## What was actually checked

On 2026-11-15, local `main`, local `TetoFan`, and the public GitHub heads for both branches pointed to `94f2ee8359cbf167acc5edab2c22aff1782a6877`. The remote check used read-only `git ls-remote`. No fetch, checkout, merge, commit or push was performed.

The new guided experience and map-depth work currently live as uncommitted local changes in Farm_Project. Recent work by the main owner is not visible in the checked references. It may be in another working copy, branch or repository. Actual conflict resolution needs that version first; there is no verified latest-main functional diff to resolve yet.

The pre-task local state was copied to ignored `.local/before-map-depth-v2`. This is a backup, not a substitute for a team checkpoint.

## Combine the ideas before combining the files

| Capability | Keep as the shared source of truth | Presentation / adapter |
| --- | --- | --- |
| Field geometry | One validated saved WGS84 polygon, point, approximate area and GeoJSON contract | 2D editing and read-only 3D inspection of the same outline |
| Climate | Main owner's verified observations, missing-value rules and provenance | Simple weather stories and 3D context; no synthetic climate |
| Rotations | Main owner's comparison input/result contract and formulas | Sequential editor; actual compared crop IDs drive 3D campaigns |
| Soil / moisture / growth | Real typed metrics if main supplies and validates them; otherwise unavailable | Clearly labelled unknown states. Current stages/plants are illustrations |
| Crop filtering | Published reference + exact scope + selected point/period | Preliminary temperature-reference groups; no country-wide approve/ban list |
| Pacha | Confirmed typed actions and trusted evidence | Contextual teaching, travel director, poses and expressions |
| Search | Place label/geometry from the geocoder, with attribution | Move the camera only; country centroids never become a saved farm automatically |

Do not accept an entire App.tsx or types file from either branch just to remove a conflict. Preserve main's new functions, then connect the scene components through a small adapter where its data shape differs. Missing metrics must stay null/unavailable, not placeholder zero values.

## Files to reconcile deliberately

- `frontend/src/app/App.tsx`: both teams may change state ownership and navigation. Keep one field/profile/climate/comparison store. Add the scene shell and map/3D callbacks around the maintained functions.
- `frontend/src/types/index.ts`: reconcile main's API types. Current `AssistantContext.journey` and navigation `scene` are optional compatibility additions. No new AppView or assistant scene enum was introduced for the 3D subview; `journey.detail` uses `exploring_3d`.
- `backend/app/assistant/schemas.py` and `service.py`: preserve main's provider/evidence work and merge optional scene context plus the short 3D/reference teaching instructions. Existing tools and user confirmation remain authoritative.
- `backend/app/main.py`: preserve all main routes and include the independent places router once. The new route module is `backend/app/api/routes/places.py`.
- `frontend/src/features/map/LocationMap.tsx`: retain geometry validation and natural polygon closure, then add explicit PlaceSearch, 3D and reference entry points. The scale uses its own top-right position.
- `features/field3d`, `features/crops`, `features/journey`, `PlaceSearch.tsx`, `Pacha3D.tsx`, `pachaModel.ts`, and `public/fonts`: mostly presentation additions. Connect to main's real data; never replace its calculations with illustrative meshes.
- `styles.css`, `journey.css`, `depth.css`: the scene/depth layers currently override the established shared styles. Reconcile overlapping rules; do not copy both full application shells into one page.
- `package.json` / lockfile: retain both teams' required dependencies and regenerate the lockfile with the chosen package manager if it conflicts. Do not choose one lockfile while discarding the other's requirements. Three.js is already pinned.
- `backend/.env.example`: optional Photon endpoint documentation only. Keep each person's real `.env` private and outside the merge.

## Suggested manual integration workflow

These commands are instructions for the team to run later, not actions executed by this delivery. They create a local integration branch and do not publish it.

1. Agree which repository and commit contain the main owner's finished work. Preserve both working copies and create a local checkpoint of the current TetoFan changes before switching branches. Review `git status` and staged files; never include `.env`, caches or `.local` backups.

   ```powershell
   # Currently on TetoFan; only when ready to checkpoint this local work:
   git add frontend backend docs README.md
   git diff --cached --stat
   git commit -m "Guided Pacha experience and interactive field explorer"
   ```

2. When the teammate's chosen main commit is available in the agreed remote, explicitly update references and create a separate integration branch:

   ```powershell
   git fetch Pacha-Pulse
   git switch -c integration/pacha-experience Pacha-Pulse/main
   git merge TetoFan
   ```

   Do not run this while uncommitted work is still exposed to a branch switch. If changes arrive as an archive instead, inspect it in a separate local reference folder and reconcile the contracts above; do not overwrite the current checkout wholesale.

3. Resolve overlaps by responsibility, using the table above. Add adapters for renamed fields/endpoints. A textual merge with no conflicts is not proof that the two flows still agree.
4. Run backend pytest, frontend TypeScript/Vite build, and Playwright using free ports. Check a real API response, map draw/save/export, all three rotations, source provenance, search failure, 3D campaigns, profile confirmation, mobile/keyboard use and reduced motion. Verify actual Gemini separately with the owner's private configuration.
5. Both teammates review the integration branch before the main owner decides when to merge/publish. No force-push is needed for this workflow. Keep the visual branch available for later adjustments.

For future work, agree on the geometry and metric contracts first, split feature ownership, and use short integration checkpoints. This avoids repeatedly merging two different application shells.
