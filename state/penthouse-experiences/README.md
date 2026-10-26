# Penthouse Activities — Verification

**Checkpoint:** October 26, 2026.

## Scope

This directory records the initial browser acceptance checks for music, games, bedroom tools, and the telescope atlas. Two behaviors were subsequently revised: music playback is now confined to the listening nook, and bedroom rain is rendered in the exterior scene. The earlier screenshots retain the initial implementation.

## Feature evidence

| Feature | Recorded evidence |
| --- | --- |
| Compact player and full-screen visualizer | [visualizer.jpg](visualizer.jpg), [player-phone.jpg](player-phone.jpg), [phone-layouts.json](phone-layouts.json); dialog sizing and focus restoration |
| Original included music | Three reproducible CC0 recordings; [audio provenance](../../assets/audio/penthouse/LICENSE.md) and track tests |
| Audio-reactive visualization | [visualizer-signal.json](visualizer-signal.json), [playback-seek.json](playback-seek.json); changing analyser samples across four visual styles |
| Local audio import | File-picker playback and drop-event integration; file validation, limits, and ObjectURL disposal |
| Snake, 2048, and Sudoku | Browser controls, keyboard interaction, conflict feedback, and game-rule tests; [sudoku.jpg](sudoku.jpg) |
| Bedroom atmosphere | [atmosphere.json](atmosphere.json), [rainy-bedroom.jpg](rainy-bedroom.jpg); preset state and floor-exit reset |
| Bedroom desktop | [bedroom-desktop.jpg](bedroom-desktop.jpg); terminal, notes persistence, window controls, and sandboxed editor preview |
| Telescope atlas | [star-atlas.jpg](star-atlas.jpg); star selection, constellation filtering, zoom, and keyboard pan |

Imported audio remains on the visitor's device. First-person sky-lounge seating remains optional future work in [ROADMAP.md](../../ROADMAP.md).

## Recorded validation

- [check.txt](check.txt): 183 source/server tests and 75 module/reference checks passed.
- [integration.txt](integration.txt): all five integration modes passed. The unavailable-WebGL fixture intentionally logs its startup error before checking the reading fallback.
- [accessibility-desktop.json](accessibility-desktop.json) and [accessibility-phone.json](accessibility-phone.json): 31 views each, with no automated WCAG A/AA violations.
- [webgl-desktop.json](webgl-desktop.json) and [webgl-phone.json](webgl-phone.json): 31 views, object responses in 23 rooms, stable resources, zero idle scene frames, and complete disposal.

The preview server's full, HEAD, and byte-range audio responses were also verified. Phone results are simulated Chromium layouts, not physical-device benchmarks.

See [outdoor-rain/](../outdoor-rain/README.md) for the corrected exterior weather and [QA.md](../../QA.md) for subsequent checkpoints.
