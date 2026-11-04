# Commentorchive

A private collection of comments, quotes, links and screenshots you want to revisit. Capture, organise and retrieve; no public feed or social graph.

## Current features

- Bulk capture up to 30 links, pasted text, and up to 20 PNG/JPEG/WebP screenshots (8 MB each).
- On-device screenshot OCR. Original images survive OCR errors. Blocked articles retain their links; links are read through r.jina.ai.
- Original text and images in the detail viewer; optional local summarisation with extractive fallback.
- Favourites, archive/unarchive, editable tags, custom categories, search and weekly resurfacing.
- Three independent background/text pairs: page, navigation, cards/dialogs. Save requires 4.5:1 text contrast.
- Empty starts for new archives. The previous personal reading seed is no longer distributed to every visitor. Existing local data is preserved.
- Separate IndexedDB workspaces for guest and each signed-in user. Guest content only enters an account through the explicit copy button.
- Preferences and custom categories are stored per workspace; signed-in sync stores them as a private metadata row.
- Timestamp-based cloud merge and deletion markers prevent stale records from replacing newer edits or reviving deletions.
- JSON backup/restore. Local storage is browser/origin specific; export before changing browsers or hosting domains.

## Run and verify

Serve `dist` with any static server, for example `python -m http.server 5187 --directory dist`.

Run `node tests/archive.cjs` and `node --check dist/personal.js`.

## Firebase cloud sync

Create a dedicated Firebase project with a Firestore database and register a Web app. Enable Google sign-in and add the production hostname under Authentication → Settings → Authorized domains. Deploy the owner-scoped rules with `npx -y firebase-tools@latest deploy --only firestore:rules --project YOUR_PROJECT_ID`.

Set `FIREBASE_WEB_API_KEY`, `FIREBASE_WEB_AUTH_DOMAIN`, `FIREBASE_WEB_PROJECT_ID`, and `FIREBASE_WEB_APP_ID` to the Firebase Web app configuration before building. These values identify the Web app. Firebase Authentication and Firestore rules enforce archive access.

After signing in, use **Copy this device’s guest archive into my account** to move existing guest captures into the cloud account. For an archive on a different browser origin or in an older account, export it there and import the JSON backup while signed in to Firebase.

## Deployment

`vercel.json` serves `dist` without a build step. The current release was deployed directly through Vercel because GitHub writes returned HTTP 403. GitHub still has the older source until write access is restored. A complete local release snapshot is committed under `.sites-runtime/release-20261030`. The original Sites identity is preserved in `.openai/hosting.json`; a new hosting origin has separate browser storage, so use JSON export/import to move a local archive.

MIT licensed.

Current production: https://commentorchive.vercel.app (Vercel deployment protection uses the team defaults). The original Sites URL still serves its previous version.
