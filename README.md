# Quiet Company

A quiet companion for breathing sessions. A single illustrated character
sits and breathes on a seamless video loop; you pick a session length,
press Begin, and sit with them.

Static PWA — no backend, no accounts, no build step. Installed on iPhone
via Safari's Add to Home Screen.

**Live:** https://alexdoster.github.io/quiet-company/

## Structure

- `index.html` / `styles.css` / `app.js` — the whole app (vanilla, no framework)
- `assets/video/` — breathing loop videos (Midjourney stills animated in Kling)
- `sw.js` — service worker: precaches the shell and videos for offline use,
  with explicit Range-request handling so cached video plays in Safari
- `manifest.webmanifest`, `icons/` — PWA install metadata

## Run locally

Any static server from this folder, e.g.:

```
python -m http.server 8000
```

Then open http://localhost:8000. (Opening `index.html` directly via
`file://` also works for a quick look — the service worker just skips
registering.)

## Versioning

Two version tracks, both manual:

- **Code:** plain git history on `main`; every push to GitHub redeploys
  Pages automatically within a minute or two.
- **Installed clients:** the `CACHE` string at the top of `sw.js`
  (`quiet-company-vN`). The service worker serves everything cache-first,
  so an installed phone keeps running the old version until that string
  changes — bump it in any change you want deployed to existing installs,
  and the next launch fetches the new files and drops the old cache.
  `APP_VERSION` at the top of `app.js` should move in lockstep with it —
  that's what shows (small, bottom-right, home screen only) as the only
  on-screen way to confirm a phone picked up the latest build. Bump both
  numbers together on every deploy.

## Adding a scene

1. Drop the approved loop in `assets/video/`.
2. Add an entry to `SCENES` at the top of `app.js`.
3. Add the file path to `PRECACHE` in `sw.js` and bump the `CACHE` version
   string so installed clients pick it up.

Project context, art pipeline lessons, and the scene roster live in the
parent folder's CLAUDE.md (not part of this repo).
