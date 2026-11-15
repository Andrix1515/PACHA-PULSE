# Deploy Pacha Pulse for the jury

This guide deploys **this Farm_Project version**, with both the React/Vite frontend and the FastAPI backend. Deploying only `frontend` would leave NASA requests, comparisons and Gemini chat without their API.

The root `vercel.json` uses [Vercel Services](https://vercel.com/docs/services), currently Beta and documented as available on all plans. Two services share one public domain: `/api/*` goes to `api`, and other requests go to `web`. See the [configuration reference](https://vercel.com/docs/services/config-reference) and [routing documentation](https://vercel.com/docs/services/routing). No cloud deployment has been executed during this local implementation.

## 1. Prepare your GitHub repository

Use `C:\Users\ANTONY\Documents\ANTONY\Farm_Project`, not the separate `Project_Farm` version. Push this version to your chosen repository, such as `Andrix1515/PACHA-PULSE`, using your own Git workflow. The repository root must contain:

```text
vercel.json
.vercelignore
frontend/package.json
frontend/package-lock.json
frontend/public/art/panorama.jpg
frontend/src/
backend/requirements.txt
backend/.python-version
backend/app/
backend/data/demo/power-mantaro-2025-01.raw.json
backend/data/demo/power-mantaro-2025-01.source.json
```

Keep `.env`, `.venv`, `node_modules`, `.local`, caches and tokens out of Git. The supplied design archive is a local reference, not an application dependency; the required panorama has already been copied into `frontend/public/art`. Do not force-push over the other team's work. Confirm that the latest changes actually appear on GitHub before importing the repository.

## 2. Create the Vercel project

1. Sign in to Vercel and select **Add New → Project**.
2. Connect GitHub if needed, grant access to the correct repository, and choose **Import** for `PACHA-PULSE`.
3. Set the project name, for example `pacha-pulse`. **Root Directory must stay at the repository root (`.`), not `frontend` or `backend`.**
4. Keep root build, install and output-directory overrides unset. The committed service configuration owns these settings: web uses `npm ci`, `npm run build`, and `dist`; API uses FastAPI with `app.main:app`.
5. Use Node.js 24 LTS if a Node version is requested. `backend/.python-version` requests Python 3.12. Do not enter an `uvicorn` start command or use the Windows launcher on Vercel; Vercel runs the ASGI app as a function.

If the import screen guesses a single frontend project, reset the root directory and its overrides. The root service configuration must be used. If the build explicitly reports that Services is unavailable for your account or CLI version, check the current [Services documentation](https://vercel.com/docs/services) and account availability rather than deleting the API service or deploying a nonfunctional frontend-only demo.

## 3. Configure Gemini on the server

Create an API key privately in [Google AI Studio](https://aistudio.google.com/api-keys). Do not paste it into chat, source files, screenshots or frontend variables.

Add these in the Vercel project's **Settings → Environment Variables**, or the import screen's environment section:

| Name | Value | Type / target |
| --- | --- | --- |
| `GEMINI_API_KEY` | Your private Gemini API key | Secret, Production; also Preview if you will test preview deployments |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | Config, matching environments |

Keep the key name exactly `GEMINI_API_KEY`. Never prefix it with `VITE_`; that would expose it to browser assets. The backend reads it at runtime. The model is configurable; use one supported by your Google account. Check the [current Gemini model list](https://aistudio.google.com/docs/models) if access or model errors occur. Environment value changes require a new deployment to take effect. See [Vercel environment variables](https://vercel.com/docs/environment-variables).

Google quota, billing and regional availability depend on your account. This project does not activate a paid account or provide credentials. Without a key, the site, NASA example, rotation comparison and authored guided tour still work; AI chat reports that it is unavailable.

## 4. Deploy and check both services

Select **Deploy**, then inspect the build logs. Both `web` and `api` should be built. When Vercel reports Ready, use the project's **Production** domain, for example `https://your-project.vercel.app`. That is an example format, not a deployment created here.

Open these on your actual domain:

1. `/` — English guided role-selection scene. The informational page is at `/#project`.
2. `/api/v1/health` — JSON containing `status: "ok"` and the legacy compatibility ID `service: "agroshift-api"`.
3. `/api/v1/assistant/status` — JSON with `configured: true` if the key is set. This confirms configuration presence, not a successful Google response.
4. `/#climate` — open the authentic Mantaro January 2025 example. Expect 31 rows, displayed mean 9.4 °C and rainfall total 60.6 mm. The exact exported values are 9.41 °C and 60.64 mm.
5. `/#rotations` — compare three sequences, then try 70% rainfall. With that saved climate, the scenario is 42.45 mm before one-decimal display rounding. This is hypothetical, not a forecast.
6. `/#charts` - prepare a manual rainfall or temperature chart, try 7-day groups and export exact values. Charts work without Gemini.
7. **Ask Pacha** — send “Explain the available rainfall in simple terms.” Confirm a real answer arrives. Ask "Create a 7-day rainfall bar chart from my loaded observations" and verify that the chart appears in Charts with its source and period. Then send “My current crop is maize and my field area is 2 hectares.” Review a proposed update and confirm it; check About my field afterward. A structured model response may ask a clarifying question instead of proposing an edit.
8. On a phone, open the cloud Menu, answer the field questions, open/close the companion, and export a report. Test actual touch and keyboard behavior where relevant.

The repository's Gemini tests use synthetic provider replies. **A real Google request is still required after you configure your key.** Do not present mocked test success or `configured:true` as proof of live Gemini access.

## 5. Give the jury a public link

Open the production URL in an incognito/private window where you are not signed in to Vercel. If a Vercel login or protection screen appears, review **Settings → Deployment Protection** and ensure the intended production deployment permits jury access. Change only the protection scope required for your public demo. See [Deployment Protection](https://vercel.com/docs/deployment-protection).

Share the production project page and optionally its `/#demo` link. Keep the saved NASA example available for a reliable demonstration if the upstream provider is slow. It is explicitly labelled as historical saved data, not live local weather.

## Operational limits and troubleshooting

- **API returns HTML or 404:** confirm Root Directory is `.` and that `vercel.json` plus the entire backend reached GitHub. Confirm both services were built and that `/api/*` is routed to `api` before the web catch-all.
- **Missing saved file:** ensure both `backend/data/demo/*.json` files are committed. API function configuration explicitly includes them.
- **Read-only filesystem / SQLite:** cloud cache defaults to `/tmp/pacha-pulse/observations.sqlite`. Do not point `CLIMATE_CACHE_PATH` at the deployed source directory. This cache is temporary, instance-local and can disappear at any time. It is not user-account storage.
- **GAEZ data directory:** `backend/data/gaez/` is an optional read-only location for bundled raster files. Provider initialization must not create or modify this directory; serverless function code is read-only. Runtime-writable temporary files belong under `/tmp`.
- **AI unavailable:** check environment scope, redeploy after changes, verify key/model access and Google quota, then inspect API function logs. No key is returned by the status endpoint. Avoid sharing logs containing secrets.
- **AI cannot see previously fetched live climate:** another function instance may lack that cache entry. The assistant states the evidence is unavailable. Load the climate again or use the authentic saved example for a repeatable explanation.
- **NASA timeout:** use the labelled saved example. Its coordinates and dates intentionally replace the query point. No fabricated observations are substituted for a failed live request.
- **Public chat usage:** the API has a per-instance guard of 30 requests per client address per hour, bounded messages/history and at most three Google requests per submitted message (four nonterminal local tools, a 48-second overall agent deadline). This is not a distributed cost limit. Before public sharing, configure an appropriate Vercel Firewall rate limit for `/api/v1/assistant/chat` and Google project quotas/spend alerts. Settings and limits depend on your account; no paid security service is activated by this project.
- **Data persistence:** only the saved field outline is retained in that browser. Profile, conversations and computed results clear on reload; export a report/GeoJSON before leaving. There is no shared farm database or sign-in.

For future updates, push your changes to the configured production branch and inspect Vercel's new deployment. Re-run the checks above before giving the jury the updated URL.

## Guided-scene branch note (2026-11-15)

This local visual delivery is on TetoFan. Select the intended branch/commit before creating a deployment. The frontend and optional assistant schema extensions must be deployed together; no root service configuration change is required. Run `npm ci` to install the pinned Three.js dependency. The model loads lazily and has an SVG fallback if WebGL 2 is unavailable. A Vite chunk-size advisory for the 3D bundle is informational; the production build completes.

The public `/` route now starts role selection, followed by a full-screen map, field questions and focused weather/planting scenes. `/#demo` is an entry alias; `/#project` retains the information page. Use **Menu** to navigate and change motion/guidance preferences. Confirmed profile, query point and progress survive same-tab reload; scientific results and chat do not. No new environment variable or external provider was added.

## Map-depth additions

Place search is a backend route, so deploy the frontend and updated API together. It uses the public Photon demo by default and needs no key. `PHOTON_SEARCH_URL` may select an operator-controlled HTTPS-compatible endpoint. Searches are explicit, bounded and cached per process; for many cloud instances, use an appropriate provider/shared limiter. Check a real country search and source attribution after deployment. Manual map coordinates remain a fallback.

The field's 3D view is lazy and illustrative, with SVG fallback. Self-hosted font files must remain under `frontend/public/fonts` alongside their license. No new terrain or crop-growth service is configured. A successful 3D display is not evidence of soil/growth measurements. No deployment was run as part of this local change.


## Offline observation worker and model artifacts

The **Check NASA for this period** option now uses POST /api/v1/observations/vegetation/sync (HTTP 202) and read-only progress polling. This also requires the separate worker and shared durable storage: a 202 response confirms queueing, not a completed NASA download. Without that worker a deployment can still show the bundled pilot history, but newly requested periods remain queued. Historical downloads run outside Vercel request lifetimes and do not train models.

The new local updater is a separate process, not a Vercel request task. Do not run the Windows polling launcher inside a serverless function. Production synchronization needs a separately supervised worker and durable shared observation/queue storage; ephemeral /tmp is not an ingestion database. The current local model artifacts are ignored under backend/models. Build and verify an explicit artifact distribution/storage workflow before claiming current forecasts on the deployed URL. If an artifact or series is absent, the API returns an unavailable state. The authentic MODIS archive is bundled under backend/data/demo; it can demonstrate historical vegetation independently of a current ML model. See MODIS_ML_IMPLEMENTATION.md. No deployment was performed in this task.
