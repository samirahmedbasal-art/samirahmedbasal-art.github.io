# Ironlog Gemini Worker

This optional Cloudflare Worker keeps the Google Gemini API key on the server. It accepts InBody report extraction and the two analysis routes used by Ironlog, requires a separate access token, restricts browser requests to the Ironlog GitHub Pages origin, and does not store request bodies or responses.

## Deploy on the Cloudflare free plan

1. Install Node.js and Wrangler, then sign in to your Cloudflare account:

   ```powershell
   npx wrangler login
   ```

2. From this folder, deploy the Worker:

   ```powershell
   npx wrangler deploy
   ```

3. Add secrets interactively. Create a **new** Gemini key after revoking any key shared in chat or screenshots. Paste the Gemini key only into the local Wrangler prompt, never into Ironlog, GitHub, or chat:

   ```powershell
   npx wrangler secret put GEMINI_API_KEY
   npx wrangler secret put IRONLOG_ACCESS_TOKEN
   ```

   Use a long, random access token (at least 32 characters) for `IRONLOG_ACCESS_TOKEN`. It is separate from the Gemini key.

4. In Ironlog → Settings → Gemini connection, enter the Worker URL and the `IRONLOG_ACCESS_TOKEN`. The app stores that access token only in this browser's local storage, separately from backups.

## Privacy and free-tier limits

The free Gemini API tier has model and rate limits that Google may change. Google's pricing page currently says free-tier content may be used to improve Google products; paid-tier content is not used for that purpose. Ironlog asks for confirmation before each upload. Only the selected InBody readings or selected two-photo comparison are sent. The Worker does not persist them, but Google receives the request under the Gemini API terms.

Avoid photos with faces, other people, labels, or location details. The browser resizes selected photos to JPEG before sending, which removes camera metadata. Results are general fitness observations, not medical advice. Measurements and photos remain in the app's local storage unless a user starts an AI analysis.

Official docs: [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing), [Gemini API key security](https://ai.google.dev/gemini-api/docs/api-key), and [Cloudflare Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/).

