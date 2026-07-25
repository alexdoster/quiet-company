# Audio credits

## Ambient beds — DELETED 2026-07-25

The four CC0 ambience files (`temple-bowl`, `horizon-waves`,
`hammock-cicadas`, `hammock-campfire`, ~14 MB total) were removed. The
ambience layer itself went in v40; the Hammock and Horizon scenes went in
v59; and the App Store decision makes bundle size real, so the "keep them
as candidate material" note that used to live here no longer paid for
itself. Nothing referenced them — no code, no service-worker precache.

All four were from [BigSoundBank](https://bigsoundbank.com) (Joseph
Sardin), [CC0](https://creativecommons.org/publicdomain/zero/1.0/) —
public domain, **no attribution was ever required**, so nothing is owed by
removing them. Recoverable from git history, and the sources were:
tibetan-bowl-singing (detail-1109), sea-waves (sound-0698), cicadas
(sound-3002), big-branching-fire-3 (s0989).

If ambient texture ever comes back it becomes an entry in the Music
section rather than its own mechanism (Alex's call). Note that real-world
recordings are not natural seamless loops — through a plain
`<audio loop>` they audibly cut at the seam. The old crossfade technique
(`AmbienceEngine`) is written up in `Quiet Company/CLAUDE.md` if it ever
needs rebuilding.

## Yoga soundtrack (added 2026-07-15)

Six tracks by [Scott Buckley](https://www.scottbuckley.com.au), licensed
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — free for any
use including commercial, **attribution required**. This is the one set
of files in this folder where crediting isn't optional; keep this
section if the tracks stay in the app.

Required credit per track, per Scott Buckley's stated format:
> '\[Title]' by Scott Buckley – released under CC-BY 4.0.
> www.scottbuckley.com.au

Not needle-drops of the copyrighted artists Alex referenced as taste
references (Eno, Einaudi, Tycho, East Forest, etc. — none of that is
legally embeddable in a public repo) — these are royalty-free
equivalents in the same three mood categories, picked to match, not to
imitate.

| File | Category | Source |
|---|---|---|
| `yoga-restorative-penumbra.m4a` | Restorative / Yin / Savasana | https://www.scottbuckley.com.au/library/penumbra/ |
| `yoga-restorative-meanwhile.m4a` | Restorative / Yin / Savasana | https://www.scottbuckley.com.au/library/meanwhile/ |
| `yoga-flow-amberlight.m4a` | Slow Flow / Hatha | https://www.scottbuckley.com.au/library/amberlight/ |
| `yoga-flow-echoes-of-home.m4a` | Slow Flow / Hatha | https://www.scottbuckley.com.au/library/echoes-of-home/ |
| `yoga-vinyasa-born-of-the-sky.m4a` | Vinyasa / Active Flow | https://www.scottbuckley.com.au/library/born-of-the-sky/ |
| `yoga-vinyasa-convergence.m4a` | Vinyasa / Active Flow | https://www.scottbuckley.com.au/library/convergence/ |

## Homemade slow-piano tracks (added 2026-07-22)

Anything exported from `../../../music/studio.html` is built from two
things, and only one of them carries an obligation:

- **The composition** — public domain, published 1930 or earlier. No
  credit required. Sources tracked in `../../../music/melodies.md`.
- **The piano samples** — Salamander Grand Piano V3 by Alexander Holm,
  [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
  **Attribution required.** The license has no carve-out exempting works
  made using the samples, so any track exported from that tool and
  shipped in the app needs this credit.

Required credit:
> Piano samples from Salamander Grand Piano V3 by Alexander Holm,
> licensed CC BY 3.0. https://github.com/sfzinstruments/SalamanderGrandPiano

No such track ships yet — this section is here so the obligation is
recorded before one does, not after.

---

Unlike the ambient beds above, these are full compositions with real
musical structure, not loop-scheduled texture — played as whole tracks
via a plain `<audio loop>` element, not `AmbienceEngine`. Not precached
by the service worker — cached automatically on first play instead, same
as everything else the fetch handler sees.

**Re-encoded 2026-07-25 (v60): 320 kbps MP3 → 128 kbps AAC (`.m4a`),
67 MB → 27 MB** across all six, for the App Store bundle. A/B'd on
`penumbra` (the longest and most dynamic) before committing. These are
placeholders regardless — Alex is producing his own tracks to replace
them, at which point this whole section goes.
