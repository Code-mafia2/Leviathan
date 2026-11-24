# Deploy Deepsea Leviathan to Vercel

The Vite frontend calls `POST /api/register` on its own origin. Vercel runs `api/register.mjs`, which exports the existing Express registration app from `server/registration.mjs`. The function reads its private settings from `process.env` and forwards registrations to your current Apps Script deployment. The Google Forms submission and linked Sheets destination remain controlled by your existing Apps Script.

## Project files and build settings

Keep the repository root as the Vercel project root. It contains `api/register.mjs`, `server/registration.mjs`, `shared/registration.ts`, `public/`, `src/`, `package.json`, `package-lock.json`, and `vercel.json`.

The committed configuration specifies these settings.

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Root directory | Repository root |
| Node.js version | 22.x |
| Install command | npm ci |
| Build command | npm run build |
| Output directory | dist |
| Registration function | api/register.mjs |
| Function maximum duration | 60 seconds |

Vercel serves the frontend and public assets from the build output and maps the root API file to `/api/register`. This single-page site uses anchor navigation, so there is no catch-all SPA rewrite. The API route stays available to the function. The function exports the app without starting a listening server. Local `npm start` continues to serve the standalone Node app.

The 60-second function duration gives the existing 35-second Google timeout room to return its structured error. The frontend allows 45 seconds. Cold starts and upstream failures can still cause uncertain outcomes. Retry the same details so the existing request ID can recover an accepted response.

[Vercel Node runtime documentation](https://vercel.com/docs/functions/runtimes/node-js) · [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite) · [Function duration configuration](https://vercel.com/docs/functions/configuring-functions/duration)

## Check locally

Use Node 22.18 or newer within the 22.x release line. The shared TypeScript validator can then run in the standalone Node server as well as the Vercel bundle.

```powershell
npm ci
npm test
npm run build
npm run dev
```

Keep your existing private `.env` settings for local development. If starting from a fresh clone, copy `.env.example` to `.env` and fill in the values yourself. Restart Vite after changing them. Development and preview use the same registration app through Vite middleware.

```powershell
Copy-Item .env.example .env
```

The example contains blank placeholders. A valid registration receives HTTP 503 when either required server setting is missing. With real settings in place, valid local submissions reach your production Google Form.

## Push the prepared changes when ready

From the project root, review the diff, then commit and push the deployment files.

```powershell
git status --short
git diff
git add api/register.mjs vercel.json server/registration.mjs package.json package-lock.json .env.example .gitignore tests/vercel.test.mjs VERCEL_DEPLOYMENT.md
git commit -m "Prepare Vercel registration deployment"
git push origin main
```

The private `.env`, `.env.local`, other `.env.*` files and `.vercel/` are ignored. Only `.env.example` is tracked. Check this before pushing.

```powershell
git check-ignore .env .env.local .vercel
```

## Import the repository

1. Sign in to Vercel and choose **Add New → Project**.
2. Connect GitHub and import **Code-mafia2/Leviathan**.
3. Use the repository root. Confirm the Vite preset and build settings in the table above. The file `vercel.json` provides the install, build, output and function settings.
4. Confirm Node **22.x** in project settings.
5. Add the private environment variables below before deploying.
6. Click **Deploy**. When it completes, open the generated HTTPS URL.

## Set private environment variables

In **Project → Settings → Environment Variables**, add these two values for **Production**. Add them to Preview only when you intend preview registrations to reach the same live form.

| Variable | Value to supply |
| --- | --- |
| GOOGLE_APPS_SCRIPT_URL | Copy the current working HTTPS URL ending in /exec from your local .env |
| REGISTRATION_API_SECRET | Copy your current server secret, matching the existing Apps Script Script Property |

Use the current URL already working in your local configuration. The handler requires this setting and has no old deployment fallback. Keep both settings free of surrounding quotes in the Vercel dashboard. Redeploy after changing environment variables.

The frontend uses `/api/register` and receives no private credentials. Neither variable uses a `VITE_` prefix. The function logs no registration payloads or secrets. Keep payloads private when inspecting browser tools or sharing logs.

## Rate limits

The shared handler keeps its 30-attempt, ten-minute client limit and eight-call concurrency cap **per warm function instance**. Counters reset on a cold start and are independent across instances. These limits do not provide a global traffic cap.

On Vercel, the limiter keys clients using the edge-provided `x-vercel-forwarded-for` header, with IPv6 subnet normalization. Local requests continue to use Express client IP handling. Vercel needs no `TRUSTED_PROXY_IP` setting for this implementation.

For a deployment-wide limit, configure a Vercel Firewall rate-limit rule for `/api/register` if available on your plan, or add a shared external rate-limit store. Apps Script's existing script lock and duplicate checks continue to serialize website submissions independently of the Node instances.

[Vercel request headers](https://vercel.com/docs/headers/request-headers)

## Verify the deployment

Start with a read-only API routing check. It returns HTTP 405, a JSON error and an `Allow: POST` header, confirming the function is reached.

```powershell
curl.exe -i https://YOUR-VERCEL-DOMAIN/api/register
```

A malformed request can safely check validation without submitting a Google response.

```powershell
curl.exe -i -X POST https://YOUR-VERCEL-DOMAIN/api/register -H "Content-Type: application/json" --data "{}"
```

Expect HTTP 400 and an invalid-request-ID error. This check does not verify Google connectivity. The automated suite mocks Google responses, including success, duplicate names, authentication failure, timeouts, invalid JSON and retries.

Open the production page and inspect images, the footer, music and registration form on desktop and mobile. Music attempts autoplay, then starts after a permitted interaction if blocked by the browser. The deployed audio URL is `/assets/audio/dragon.mp3`. The mute control and preference work as before.

For a controlled end-to-end test, explicitly authorize one test registration using organizer-controlled details, then submit through the website. Verify the network response contains `ok: true` and a nonempty `responseId`. Confirm one matching response under **Google Form → Responses** and one matching row in the existing linked spreadsheet. Confirm the success panel and WhatsApp invite appear. Treat an unconfirmed request as uncertain and retry the same details before creating another entry.

## Inspect runtime logs and resolve errors

In Vercel, open **Project → Logs**, select the deployment and filter for `/api/register`. Inspect function errors, status codes and duration. Build failures appear in the deployment's build logs.

| Result | Action |
| --- | --- |
| 404 or HTML at /api/register | Check the API file is in the repository root's api directory and the correct commit was deployed. Remove dashboard rewrites that intercept /api paths. |
| 503 with valid input | Check both server environment settings and the existing Apps Script deployment. |
| 502 | Check Apps Script authentication, accessibility and structured JSON response. |
| 504 or function timeout | Inspect runtime duration and Google availability. Confirm maxDuration is 60 seconds and retry the same details. |
| 429 | Wait for the instance rate window or inspect your Firewall rule. |
| Duplicate-name error | Retry unchanged details after an uncertain result, or choose a different name for a new team. |
| Asset 404 | Confirm public assets were included and the Vercel project uses the repository root. |

## Redeploy after changes

After you review, commit and push changes to the production branch, Vercel's Git integration creates a new deployment. For environment-only updates, use **Deployments → latest deployment → Redeploy**. Check that the deployment uses the intended branch and environment.

This setup changes no Google resources and requires no Apps Script redeployment. Successful local tests and builds establish local readiness. Production routing, audio playback and a live Forms-to-Sheets registration must still be verified on the deployed domain.
