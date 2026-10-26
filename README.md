# Eric Hsu — Structures & Systems

An interactive portfolio for Eric Hsu, an electrical engineering student at McGill University. Visitors explore a three-dimensional city, unfold its central tower, and enter rooms containing projects, experience, education, and contact information.

The site is a static application built with JavaScript and Three.js, hosted on GitHub Pages. A separate reading view provides the complete portfolio without requiring WebGL.

[Live portfolio](https://bshwao.github.io/) · [Reading view](https://bshwao.github.io/reading.html)

## Features

- **Six floors and 23 rooms:** five portfolio sections and a visitor penthouse, with distinct interiors and interactive furnishings.
- **Island setting:** a connected city, residential neighborhoods, river crossings, coastline, ocean, forests, and varied mountain terrain.
- **Local-time environment:** coordinated sky, exterior lighting, illuminated windows, and a device-local clock.
- **Penthouse activities:** an audio-reactive music visualizer, local audio import, Snake, 2048, Sudoku, noughts and crosses, a bedroom desktop, atmosphere presets, and an interactive star atlas.
- **Accessible navigation:** keyboard and touch controls, shareable room URLs, reduced motion, a low-graphics setting, and a complete reading fallback.

Included music is original synthesized audio released under CC0. Imported audio remains on the visitor's device. The star atlas uses an offline catalog; it does not represent a location-specific live sky.

## Local development

Use **Node.js 24**, matching the repository's CI configuration.

```sh
npm ci
npm run dev
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173). The preview server binds to the local computer. There is no production build step, and runtime assets are served from the repository.

If port 4173 is occupied, select another port. In PowerShell:

```powershell
$env:PORT = 4175
npm run dev
```

Then open [http://127.0.0.1:4175](http://127.0.0.1:4175). The 3D experience requires a browser with WebGL 2 support; the reading page remains available when 3D rendering is unavailable.

## Navigation

| Input or control | Action |
| --- | --- |
| Left mouse drag or one-finger drag | Orbit the current view |
| Mouse wheel, middle-button drag, or pinch | Zoom within the current view's limits |
| Click or tap | Select the tower, a floor, a room, or an object |
| Arrow keys with the canvas focused | Orbit |
| `+` / `-` | Zoom |
| Enter / Space with the canvas focused | Unfold the tower |
| Escape | Return through room, floor, and tower views |
| Reset view | Restore the current view's default framing |
| Reading view | Open an accessible section view |

Settings contains motion, graphics, and introductory guidance preferences. Room panels also provide named keyboard controls for interactive objects.

### Direct links

| Section | Route |
| --- | --- |
| Expanded tower | `#explore` |
| About | `#about` |
| Projects | `#projects` |
| Experience | `#experience` |
| Résumé | `#resume` |
| Contact | `#contact` |
| Penthouse | `#penthouse` |

Room links append a stable room ID, such as `#projects/b`. Browser history, refresh, and the **Copy link** control preserve these destinations.

## Repository structure

| Location | Purpose |
| --- | --- |
| [assets/content.js](assets/content.js), [assets/floor-content.js](assets/floor-content.js) | Portfolio content and room assignments |
| [assets/tower-geometry.js](assets/tower-geometry.js), [assets/tower-model.js](assets/tower-model.js), [assets/interiors.js](assets/interiors.js) | Tower geometry, furnishings, and object batches |
| [assets/scene-3d.js](assets/scene-3d.js), [assets/spatial-app.js](assets/spatial-app.js) | Rendering, cameras, navigation, and interface state |
| `assets/city-*.js` | City layout, landscape, environment, and scenery rendering |
| `assets/penthouse-*.js` | Music, games, bedroom tools, atmosphere, and star atlas |
| [assets/vendor/](assets/vendor/README.md) | Vendored Three.js modules and license |
| [scripts/](scripts/) | Preview server, generators, automated tests, and browser diagnostics |
| [.github/workflows/check.yml](.github/workflows/check.yml) | CI checks |
| [state/](state/README.md) | Recorded verification reports and screenshots |

Edit shared portfolio content in `assets/content.js` and `assets/floor-content.js`. Regenerate the reading page after content changes:

```sh
npm run reading
```

Theme changes originate in `assets/color-theme.js`; regenerate its CSS and icon with `npm run theme`. See [MAINTENANCE.md](MAINTENANCE.md) for geometry, rendering, content, and release procedures.

## Validation

```sh
npm run check
npm test
```

- `npm run check` validates modules, local assets, generated files, content, geometry, layouts, and feature behavior.
- `npm test` runs DOM and camera integration checks for desktop, mobile layouts, reduced motion, direct room links, and WebGL failure.

With the preview server running, use [browser-qa.html](scripts/browser-qa.html) for WebGL budgets, navigation, idle rendering, resource reuse, and disposal. Use [accessibility-qa.html](scripts/accessibility-qa.html) for automated accessibility checks.

Recorded results and their browser/device scope are documented in [QA.md](QA.md). Simulated phone layouts and automated accessibility checks supplement physical-device and manual accessibility testing.

## Deployment

GitHub Pages serves `main` from the repository root. Deployment uses the committed static files; no build output or runtime package installation is required.

Before publishing, run the checks, confirm generated files are current, and follow the release procedure in [MAINTENANCE.md](MAINTENANCE.md). Verify CI and the published site after pushing. Saved deployment reports describe their recorded commit, rather than automatically certifying the current branch.

## Documentation and credits

- [Roadmap](ROADMAP.md): completed scope, remaining verification, and optional enhancements.
- [Maintenance guide](MAINTENANCE.md): implementation conventions and release procedures.
- [Verification history](QA.md): dated test results and limitations.
- [Evidence index](state/README.md): reports, screenshots, and historical checkpoints.
- [Three.js license](assets/vendor/LICENSE): MIT license for the vendored library and controls.
- [Music credits](assets/audio/penthouse/LICENSE.md): CC0 dedication and audio provenance.
