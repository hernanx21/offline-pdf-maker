# Offline PDF Maker: project instructions

## Project shape

- This is a static, offline-first PWA. Keep it framework-free and do not add a build step, backend, or CDN dependency unless the user explicitly approves an architectural change.
- Run it locally with `python3 -m http.server 8765` and open `http://localhost:8765`.
- Preserve the script order in `index.html`: jsPDF, AutoTable, `db.js`, `pdf.js`, then `app.js`.

## Data compatibility

- IndexedDB is the source of truth for saved fichas and photo blobs. Preserve existing records and the `true | false | null` toggle convention.
- Read legacy `aguaTipo` values through the compatibility helpers already provided in `app.js` and `pdf.js`.
- Do not change the database name, object stores, keys, or stored field meanings without an explicit migration and backward-compatibility test.

## Offline behavior and dependencies

- Keep jsPDF and AutoTable vendored under `js/libs/`; do not replace them with CDN URLs.
- When an app asset changes or is added, ensure `sw.js` lists every runtime asset and bump `CACHE_NAME` so installed clients receive the update.
- Development-only files such as `AGENTS.md`, `CLAUDE.md`, and `README.md` do not belong in the service-worker asset list.

## Verification

- Before handing off a change, serve the app over HTTP and check home loading, ficha creation and autosave, persistence after reload, photo attachment, PDF export, JSON export/import, and offline reload when the affected code can influence them.
- Keep the Spanish user interface and existing data behavior unchanged unless the task explicitly requests a product change.
- Never commit exported fichas, photos, credentials, tokens, browser profiles, or other user data.
- Work on a review branch. Do not push or merge directly to `main` without explicit user authorization.
