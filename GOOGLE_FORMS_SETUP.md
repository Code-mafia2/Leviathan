# Deepsea Leviathan registration setup

Students register on the website. The browser sends JSON to `POST /api/register` on the same origin. Node validates the request and forwards it over HTTPS to Apps Script. Apps Script submits a genuine Forms response and returns its Google response ID. Google Forms maintains the linked response sheet. A sheet update can follow the Forms confirmation.

## Install the handler in the existing Apps Script project

1. Sign in as the organizer who owns the deployment and can edit the existing form. Open the Apps Script project used to create it.
2. The complete, paste-ready code is in [apps-script/RegistrationAPI.gs](apps-script/RegistrationAPI.gs). Copy the **entire file**. If that project already has the older registration handler, replace the contents of its registration-only file. Otherwise select **Files → + → Script**, name it **RegistrationAPI**, and paste the code. Keep the form creator. If the old handler shares a file with the creator, remove just the superseded registration declarations and handlers. There must be one `doGet`, one `doPost`, and one set of `REG_*` declarations in the project.
3. Generate a random secret of at least 32 characters using a password manager. In **Project Settings → Script properties**, add `REGISTRATION_API_SECRET` with this value. The website server needs the identical secret.
4. Save, select **verifyRegistrationForm** in the function selector, and click **Run**. Authorize Google Forms access for the deploying account when prompted. This read-only function checks all questions, their required flags, the confirmation choice, whether the form is open, and its response destination. Inspect **Executions** for the result. Existing creator code can affect the permissions Google requests for the overall project. Leave the creator function unexecuted.
5. Verify these IDs if the check reports a mismatch. The Forms service uses the editor ID `1wBwsA9ZTMQt19oQ9lnJzwlitFYMGf3EW6h9PqGvsU0s`. The linked spreadsheet ID must be `1OlbUc33Wf2Cs_ZUs6WneCjv3eeZ1XL5cmyJ9IkzZUto`. No spreadsheet write permission or sharing change is needed by the registration handler. [Google Forms service reference](https://developers.google.com/apps-script/reference/forms/form)

### Question mapping

The public responder page displays the numbers **as part of the question titles**. The handler verifies the exact numbered titles below, skips layout items, and uses the resolved Google item objects for reads and writes. Questions may move without breaking the mapping.

| Website payload | Existing Google Form item | Answer |
| --- | --- | --- |
| teamName | 1. Team Name | Required text |
| leader.fullName | 2. Team Leader — Full Name | Required text |
| leader.phone | 3. Team Leader — WhatsApp Number | Required text |
| leader.email | 4. Team Leader — Email Address | Required text |
| leader.college | 5. Team Leader — College | Required text |
| leader.department | 6. Team Leader — Department | Required text |
| leader.year | 7. Team Leader — Year of Study | Required text |
| member2.fullName | 8. Member 2 — Full Name | Required text |
| member2.phone | 9. Member 2 — Phone Number | Required text |
| member2.email | 10. Member 2 — Email Address | Required text |
| member3.fullName | 11. Member 3 — Full Name | Optional text |
| member3.phone | 12. Member 3 — Phone Number | Optional text |
| member3.email | 13. Member 3 — Email Address | Optional text |
| acceptedCrewRules | 14. Confirmation — I have read the crew rules | Required checkbox |

The checkbox answer is a one-element array containing “I confirm that I have read and understood the crew rules, and that the information submitted for my team is accurate.” For a two-member crew the website sends `member3: null`, and the handler skips all three optional answers. Phones stay strings, including leading zeros.

## Update the web app deployment

1. Open **Deploy → Manage deployments** and edit the existing Web app using the pencil icon. Choose **New version**, select **Execute as me** (the organizer), and set access to **Anyone** where the Workspace policy allows anonymous web apps. The server authenticates registration POSTs with the shared secret. Students need no Google login. If domain policy prohibits anonymous access, ask the Workspace administrator about a permitted deployment before launch.
2. Click **Deploy**. Copy the deployed Web app URL ending in `/exec`. For the existing deployment, the URL you supplied is:

   ```text
   https://script.google.com/macros/s/AKfycbykH1EJAYmPo58yfeQsVRh9VT9st7OCpLogOECVEFaSTaQ58REb6t_R5L73CszPZB2f/exec
   ```

3. Open that URL in a signed-out browser. The expected health response is `{"ok":true,"service":"registration","version":1}`. This checks anonymous reachability only. The editor verification above checks the actual form and spreadsheet link. The website API follows Google’s ContentService redirect using a GET without the secret. [Google Web Apps guide](https://developers.google.com/apps-script/guides/web) · [Google Content Service guide](https://developers.google.com/apps-script/guides/content)
4. After every handler change, save the project and deploy a **new version of the same deployment**. This keeps the existing URL. Use **Manage deployments** for every update.

## Run locally

Use Node **22.18 or newer** with built-in TypeScript type stripping. From the project root in PowerShell:

```powershell
npm ci
Copy-Item .env.example .env
```

Set `GOOGLE_APPS_SCRIPT_URL` in `.env` to the deployed HTTPS `/exec` URL above and set `REGISTRATION_API_SECRET` to the value in Script Properties. Keep both on the server. Real environment files are gitignored. Then run:

```powershell
npm run dev
```

Open the local URL printed by Vite. Development and preview mount the actual Node API as same-origin middleware. Restart after editing environment settings. With empty settings the page loads, but valid registrations receive a service-unavailable error. Configuring the real deployment makes local submissions **live**.

## Deploy the production website and API

Use a Node web service with one persistent process for this event. Provide the repository source including `server/`, `shared/` and the lockfile. Use a supported Node runtime as above. Configure both environment variables in the host’s private runtime settings. Build and start from the project root:

```sh
npm ci
npm test
npm run build
npm start
```

The Express process serves `dist/` and `/api/register` on the same port. It uses the host’s `PORT` or defaults to 3000. Route the public HTTPS domain to this process and allow at least 45 seconds for the registration request. Uploading only `dist/` to static hosting leaves the API unavailable. Keep request-body logging disabled in your host and reverse proxy.

The API limits JSON bodies to 12 KiB, limits each client IP to 30 requests per ten minutes, and allows at most eight Google calls in flight per process. If using a reverse proxy, set the optional server environment variable `TRUSTED_PROXY_IP` to its trusted address or CIDR and configure the proxy to replace untrusted forwarding headers. Otherwise the limiter sees the proxy as one client. Directly exposed servers can leave this unset. Rate limits reset on restart. Multi-instance deployments need a shared rate-limit store or an equivalent limit at the edge.

## Retry behavior

The form locks during submission. On failure the entered fields remain available. Retrying the same normalized details reuses the request ID. When tab storage is available, the same tab can recover the ID after a reload if the student re-enters the same details. The tab stores only a digest, ID and timestamp.

Apps Script serializes website submissions with a script lock and checks existing Forms responses using a case-insensitive, whitespace-normalized team name. Before committing, it stores a digest and request ID in Script Properties. If a reply is lost after Google accepts the response, the next attempt can recover its response ID under the lock. Following an uncertain write, an immediate retry may ask the student to wait one minute. Receipts last up to 48 hours, with a cap of 600 records and oldest completed receipts evicted first. After expiry, the existing team-name check still prevents another website registration with that name. Public Google Form submissions bypass the script lock and website validation, so uniqueness across every registration route cannot be guaranteed.

## Controlled verification after deployment

Automated tests use local mocks. For a live check, have the organizer authorize one distinctive test team whose inclusion in the response sheet is acceptable.

1. Open the website, enter organizer-controlled details, leave Member 3 blank, select the crew confirmation, and submit once. Check for **Logging your crew...** and the original success panel. The browser’s network panel should show one website POST returning `ok: true` and a nonempty `responseId`. Keep registration payloads private.
2. In the existing form editor, open **Responses → Individual** and find that team. Verify the leader and second member, unanswered Member 3 questions, and the exact confirmation choice.
3. Open the linked response spreadsheet from **Responses**. Check for one matching row and timestamp. If the row takes time to appear, refresh the sheet before retrying.
4. The WhatsApp button uses the existing `whatsappUrl` in `src/event.config.ts`. It becomes actionable when the organizer supplies the invite URL.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| API returns 404 or HTML | The public origin must route both the site and `/api/register` to the Node service. |
| Signed-out health check asks for login | Check web app access, execution identity, and the deployed `/exec` URL. |
| Temporary unavailability or authentication failure | Check both runtime settings and the matching Script Property. Restart Node and verify the Apps Script deployment version. |
| Schema or destination problem | Run `verifyRegistrationForm` in the editor for the specific mismatch. Check title numbering, em dashes, item types, required flags, checkbox wording and linked sheet ID. Preserve existing responses and consult the organizer before changing Google resources. |
| Registration closed | Check the form’s accepting-responses setting. |
| Duplicate team name | Choose another name for a new crew. After an uncertain submission, retry the original details in the same tab first. |
| Busy, timeout, or no confirmation | Retry the same details. Check Apps Script **Executions** for quota or concurrency issues. Look for a genuine Forms response before making a manual entry. |
| HTTP 429 | Wait ten minutes. Verify trusted proxy settings if several unrelated clients share a limit. |
| Google Form shows the response but the sheet has no row | Confirm the configured destination ID, allow for Forms-to-Sheets propagation, and inspect the linked response tab. Avoid making a second submission. |
