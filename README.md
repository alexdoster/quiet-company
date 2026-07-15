# Quiet Company

A quiet companion for breathing sessions. A single illustrated character
sits and breathes on a seamless video loop; you pick a session length,
press Begin, and sit with them.

Static PWA — no backend, no accounts, no build step. Installed on iPhone
via Safari's Add to Home Screen. Hosted on GitHub Pages.

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

## Adding a scene

1. Drop the approved loop in `assets/video/`.
2. Add an entry to `SCENES` at the top of `app.js`.
3. Add the file path to `PRECACHE` in `sw.js` and bump the `CACHE` version
   string so installed clients pick it up.

Project context, art pipeline lessons, and the scene roster live in the
parent folder's CLAUDE.md (not part of this repo).
