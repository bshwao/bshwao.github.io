# Phase 1: desktop browser verification

Completed October 28, 2026 in the user's connected Edge profile on Windows, against the local working tree at `http://127.0.0.1:4177/`. Base commit: `a50cfbbdf5ebe69ec1547ffddfc147da4ced5847`. Existing mobile/device-test changes were preserved. This checkpoint adds documentation and evidence; it does not publish the website.

The browser reports `Edg/156.0.0.0` in its user agent. Normal browser UI controls were exercised through the Edge extension. The WebGL harness runs in the same browser.

## Results

| Area | Verified behavior | Evidence |
| --- | --- | --- |
| Introduction and tower | Enter the city, unfold, return from a floor, collapse, orbit, zoom and reset | `intro.png`, `expanded.png`, `checks.json` |
| Floors and rooms | Six floor overviews, all 23 room selections and their routes/content | `rooms.json`, the six floor captures |
| Reading and routes | Six reading overlays, complete reading page and its Penthouse anchor, direct room reload, Back/Forward | `reading.png`, `checks.json` |
| Resizing | Room/content preserved at 1440×900, 1000×700 and 1280×720; fresh 1280×720 visual recheck | `resized-projects-recheck.png`, `checks.json` |
| Tab return | Switching to a reading tab and returning preserves the tower view; arrow-key orbit still renders | `checks.json` |
| Music | Bundled playback, four visualization styles with nonzero analyser signal, next/previous tracks | `visualizer.png`, `checks.json` |
| Audio import | Existing CC0 `night-bus.wav` selected from disk, local-track label, advancing playback and reactive visualization | `audio-import.png`, `audio-import.json` |
| Games | Blackjack, Word Guess, mini crossword, Snake, 2048, Sudoku and noughts and crosses; state retained across dashboard visits | `games.png`, `games.json`, `checks.json` |
| Bedroom | Terminal help, saved/reopened notes, project explorer, working sandboxed editor, move/minimize/restore; rainy-night preset | `desktop.png`, `checks.json` |
| Star atlas | Zoom, pan after zoom, connection toggle, Rigel search/selection and Orion filter | `star-atlas.png`, `checks.json` |
| Renderer | All 31 views, object responses in all 23 rooms, zoom stops, repeated navigation/resizing, graphics switching and disposal | `edge-webgl.json` |
| Console | No warnings or errors in the app, responsive recheck or WebGL harness | `browser-console.json` |

The renderer records a peak of 82 draw calls and zero idle frames over its final 250ms. Geometry allocation remains stable after warm-up: 248 for repeated navigation and 254 after the resize routes are warmed. Disposal assertions pass for canvases, uploaded geometry and scenery textures. These are functional/resource checks, not a sustained frame-rate benchmark.

## Resolved testing obstacles

The local preview server was restarted after the browser session resumed. Audio import initially failed because the browser extension lacked file-URL access. After the user enabled that permission, file selection, playback and analyser response passed without application changes. The fixture is the repository's existing bundled audio, not a personal file.

An initial resize capture did not show the scene. A fresh tab and settled 1280×720 capture confirm the model, selected room and controls render correctly; `resized-projects.png` now contains the verified capture, also retained as `resized-projects-recheck.png`. No persistent rendering failure was reproduced.

## Scope and reproduction

Start the repository preview with `$env:PORT='4177'; node scripts/serve.mjs` in PowerShell. Open the portfolio in Edge for UI checks and `/scripts/browser-qa.html?width=1280&height=720` for the automatic renderer sweep. The harness finishes with a visible PASS status and JSON results.

The import check uses `assets/audio/penthouse/night-bus.wav`; playback is verified through advancing media time and actual analyser data. Bedroom notes were restored to their original empty value, the editor sample was restored, and playback was paused. Temporary viewport overrides were reset.

Tab selection, retained state and resumed controls were checked. Automation reports document visibility as visible, so this checkpoint does not measure OS suspension or background throttling. The separate user-saved iPhone/Safari report covers the phone's background-return check. Source/integration checks on the final release candidate, accessibility review, content/link verification and deployment remain in Phases 2 and 3.
