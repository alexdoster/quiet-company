# Audio credits

All tracks from [BigSoundBank](https://bigsoundbank.com) (Joseph Sardin),
licensed [CC0](https://creativecommons.org/publicdomain/zero/1.0/) —
public domain, no attribution required. Credited here anyway as good
practice and so the source is traceable if a track ever gets swapped.

| File | Source |
|---|---|
| `temple-bowl.mp3` | https://bigsoundbank.com/detail-1109-tibetan-bowl-singing.html |
| `horizon-waves.mp3` | https://bigsoundbank.com/sound-0698-sea-waves.html |
| `hammock-cicadas.mp3` | https://bigsoundbank.com/sound-3002-cicadas.html |
| `hammock-campfire.mp3` | https://bigsoundbank.com/big-branching-fire-3-s0989.html |

None are natural seamless loops (real-world recordings, not designed for
looping) — the app crossfades overlapping copies at playback time
(`AmbienceEngine` in `app.js`) rather than needing the files themselves
edited into loop points.

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
| `yoga-restorative-penumbra.mp3` | Restorative / Yin / Savasana | https://www.scottbuckley.com.au/library/penumbra/ |
| `yoga-restorative-meanwhile.mp3` | Restorative / Yin / Savasana | https://www.scottbuckley.com.au/library/meanwhile/ |
| `yoga-flow-amberlight.mp3` | Slow Flow / Hatha | https://www.scottbuckley.com.au/library/amberlight/ |
| `yoga-flow-echoes-of-home.mp3` | Slow Flow / Hatha | https://www.scottbuckley.com.au/library/echoes-of-home/ |
| `yoga-vinyasa-born-of-the-sky.mp3` | Vinyasa / Active Flow | https://www.scottbuckley.com.au/library/born-of-the-sky/ |
| `yoga-vinyasa-convergence.mp3` | Vinyasa / Active Flow | https://www.scottbuckley.com.au/library/convergence/ |

Unlike the ambient beds above, these are full compositions with real
musical structure, not loop-scheduled texture — played as whole tracks
via a plain `<audio loop>` element, not `AmbienceEngine`. Not precached
by the service worker (67MB across all six at 320kbps is too much to
force onto every install) — cached automatically on first play instead,
same as everything else the fetch handler sees.
