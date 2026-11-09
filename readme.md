# Commentorchive

[Open the live app](https://commentorchive.vercel.app/)

A private collection of comments, quotes, links and screenshots you want to revisit. Capture, organise and retrieve; no public feed or social graph.

## Current features

- Bulk capture up to 30 links, pasted text, and up to 20 PNG/JPEG/WebP screenshots (8 MB each).
- Cards show short excerpts from pasted text and on-device screenshot OCR. Images keep their thumbnails and originals even when OCR cannot read them.
- Public article URLs are sent to Jina Reader for extraction. Links with recognized credential parameters are saved without automatic reading.
- Article links retain the captured paragraphs, original URL, and publication date when supplied by the reader. The installed Android web app can receive links from the share menu.
- **YouTube is the only supported live comment source.** Instagram and X links are bookmarks. Paste the text or add a screenshot to capture their contents.
- YouTube cards show an excerpt and author. Opening one shows the exact public comment and available video and parent context. User-supplied copies can be saved on the same card for offline reference.
- Favourites, archive/unarchive, editable tags, custom categories, search, and a daily, weekly, or monthly Resurface rotation. Resurface shows up to five active saves and excludes archived items.
- Three independent background/text pairs: page, navigation, cards/dialogs. Save requires 4.5:1 text contrast.
- Empty starts for new archives. The previous personal reading seed is no longer distributed to every visitor. Existing local data is preserved.
- Separate IndexedDB workspaces for guest and each signed-in user. Guest content only enters an account through the explicit copy button.
- Preferences and custom categories are stored per workspace; signed-in sync stores them as a private metadata row.
- Deletion requires confirmation. Timestamp-based cloud merge and deletion markers prevent stale records from replacing newer edits or reviving deletions.
- JSON backup/restore. Local storage is browser/origin specific; export before changing browsers or hosting domains.

## Run and verify

Serve `dist` with any static server, for example `python -m http.server 5187 --directory dist`.

Run `node tests/archive.cjs` and `node --check dist/personal.js`.

## Firebase cloud sync

Create a dedicated Firebase project with a Firestore database and register a Web app. Enable Google sign-in and add the production hostname under Authentication → Settings → Authorized domains. Deploy the owner-scoped rules with `npx -y firebase-tools@latest deploy --only firestore:rules --project YOUR_PROJECT_ID`.

Set `FIREBASE_WEB_API_KEY`, `FIREBASE_WEB_AUTH_DOMAIN`, `FIREBASE_WEB_PROJECT_ID`, and `FIREBASE_WEB_APP_ID` to the Firebase Web app configuration before building. These values identify the Web app. Firebase Authentication and Firestore rules enforce archive access.

After signing in, use **Copy this device’s guest archive into my account** to move existing guest captures into the cloud account. For an archive on a different browser origin or in an older account, export it there and import the JSON backup while signed in to Firebase.

## Deployment

`vercel.json` serves `dist` and runs the live YouTube lookup from `api/youtube-comment.js`. Enable YouTube Data API v3 and set a server-side `YOUTUBE_DATA_API_KEY` restricted to that API on the Vercel project. Lookup results are displayed live and excluded from archive storage and the service worker cache. The original Sites identity is preserved in `.openai/hosting.json`. A new hosting origin has separate browser storage, so use JSON export/import to move a local archive.

MIT licensed.

The live app is hosted at https://commentorchive.vercel.app. The original ChatGPT Sites deployment is a separate archive origin. Use JSON export and import if you want to move records stored on that device to the live app.
