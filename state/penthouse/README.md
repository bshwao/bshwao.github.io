# Visitor penthouse verification

Local implementation, October 25, 2026. Six tower sections / 23 rooms; the visitor penthouse contains four rooms and 47 interactive objects. All 122 source tests, 65 syntax/reference checks and five integration modes pass. No publishing was performed.

## Automated checks

- `check.txt`: `npm run check` — syntax/local references, generated theme/reading content and source regressions.
- `integration.txt`: `npm test` — desktop, simulated phone, reduced motion, fresh room link and unavailable-WebGL modes. This harness uses jsdom, the production scene and real Three.js camera/geometry with a stub renderer. It does not visually render WebGL.
- `inventory.json`: section/room counts and named penthouse object/feature inventory.
- `furnishing-supported-art.txt`: focused interior/structure checks after the last furnishing update.
- Other focused logs record intermediate passing subsets; `check.txt` and `integration.txt` are the final full checks.

The final integration run records 33,494 desktop, 34,164 phone, 6,167 reduced-motion and 33,500 direct-link frames, plus the initial unavailable-WebGL fallback. These are simulated scheduler/renderer frames, not frame-rate measurements. The final mode intentionally logs a startup error before asserting the fallback; it is an expected test fixture.

## Rendering estimate

`cpu-draw-inventory-desktop.json` and `cpu-draw-inventory-phone.json` come from:

```sh
node --experimental-vm-modules scripts/spatial.test.mjs --draw-inventory
node --experimental-vm-modules scripts/spatial.test.mjs --draw-inventory --mobile
```

The optional harness counts visible geometry groups with camera frustum/layer filtering, transparent double-sided passes and background passes in each frame. It traverses all six floors and 23 rooms in standard and low graphics. Desktop is 1280×720; phone is a simulated 390×844 viewport. Standard opening estimates are 57/55 calls with 141,194 triangles, unfolded views 82/80, settled interior peaks 72/71 and transition peaks 91/99. These estimates do not establish real GPU behavior, frame rate, memory allocation or physical-device performance. Existing WebGL budget assertions remain unchanged.

## Geometry previews and browser limitation

`penthouse-geometry.png` and `room-1-geometry.png` through `room-4-geometry.png` are software projections of the actual production meshes. `render-preview.mjs` uses per-pixel depth testing and flat directional shading, then encodes PNGs through the bundled Sharp runtime. Companion SVGs are geometry projections. These artifacts are **not browser/WebGL screenshots** and do not validate the DOM layout, shader appearance, picking or animated state.

To regenerate the previews, make Sharp available through `NODE_PATH` or a local installation, then run `node state/penthouse/render-preview.mjs` from the repository root. Sharp is only a preview dependency; production does not load it.

The computer-use and browser runtime failed before browser actions with `failed to write kernel assets: The system cannot find the path specified. (os error 3)`, including a fresh session. Live visual, browser layout and axe verification are therefore outstanding. The updated browser harness has 31 scene views (tower, unfolded tower, six floors and 23 rooms); the accessibility harness also visits the game. Historical browser evidence elsewhere in `state/` predates this floor.
