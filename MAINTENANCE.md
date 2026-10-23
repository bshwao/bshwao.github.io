# Updating the portfolio

## Content and résumé

Edit profile, project, experience, education, and skill data in `assets/content.js` and the room narratives in `assets/floor-content.js`. Preserve section IDs and room IDs so existing links keep working. Keep project status, personal contributions, demos, and measured results factual; add new results when they are available rather than estimating them.

Put project images in `assets/projects/`, supply accurate dimensions and useful alternate text, and keep the full original available through its gallery link. Replace `assets/eric-hsu-resume.pdf` when a new résumé is ready. Check contact, repository, demo, and résumé links whenever their destinations change.

Run `npm run reading` after changing shared content. The generated `reading.html` is the complete portfolio and remains usable without JavaScript or WebGL.

## Validation

Use Node.js 24 for the same runtime as CI:

```sh
npm ci
npm run check
npm test
npm run dev
```

The checks cover page assets and room URLs, generated content, watertight model geometry, city boundaries and shading, compact/full detail, raster budgets, room picking and framing, sharing metadata, and the social image. Integration runs cover desktop, portrait, reduced motion, room deep links, and initial WebGL failure; they also verify hidden-tab suspension, idle rendering, resize preservation, cancellation, context-loss cleanup, and navigation.

With the preview server running, open these local QA pages:

- `http://127.0.0.1:4173/scripts/shadow-study.html` (baked versus bounded directional-shadow comparison; dispose both scenes when finished)
- `http://127.0.0.1:4173/scripts/skyline-qa.html` (neutral architecture study)
- `http://127.0.0.1:4173/scripts/time-qa.html` (actual local time or dawn/morning/afternoon/evening/night; switch while a floor stays open)

- `http://127.0.0.1:4173/scripts/browser-qa.html?width=1280&height=720`
- `http://127.0.0.1:4173/scripts/browser-qa.html?width=390&height=844&dpr=3`
- `http://127.0.0.1:4173/scripts/browser-qa.html?width=844&height=390&dpr=3`
- `http://127.0.0.1:4173/scripts/browser-qa.html?width=3840&height=2160&dpr=2`
- `http://127.0.0.1:4173/scripts/accessibility-qa.html` (also accepts `width` and `height`)
- `http://127.0.0.1:4173/scripts/frame-qa.html` (also accepts `width`, `height`, diagnostic-only `delay=28`, and `contextLoss=1` to verify real WebGL context-loss fallback after timing)
- `http://127.0.0.1:4173/scripts/frame-probe.html?webgl=off` (diagnostic initial WebGL failure; use the normal entry page for production)
- `http://127.0.0.1:4173/scripts/color-review.html` (view/viewport selectors and diagnostic grayscale, protanopia, deuteranopia, and tritanopia filters)

The WebGL harness exercises every floor and a room close-up, checks draw/raster budgets, detects continued idle rendering or growing GPU allocations, and verifies disposal. Its injected clock defaults to 10am; add `hour=22` for night. Every run also cycles through night, dawn, evening and morning and checks that geometry, textures and programs are reused. The full-app frame probe and timing pages accept diagnostic-only `hour=10` or `hour=22`; production has no time override. The accessibility harness uses the development-only axe dependency and checks thirteen settled views at WCAG A/AA tags, including every section's reading dialog. It requires `npm ci` and is intended for local preview. Automated checks supplement visual and keyboard inspection; they do not certify a screen reader or physical device.

The frame-timing harness loads the actual app with its HTML overlays and exercises continuous keyboard orbit, unfolding, floor entry, and room focus. Keep the tab foregrounded. It reports rendered-frame intervals and JavaScript callback time; callback duration excludes asynchronous GPU work and browser layout/paint after the callback. Results describe the connected machine and browser. `delay=28` deliberately adds 28ms of CPU work after each rendered frame to verify quality retention; it is not a slower-GPU benchmark or evidence of a frame-rate improvement.

Rendering retains the original viewport-based quality at all frame rates. The automatic quality tiers were removed at the user's request because their resolution/detail drops made the drawing too soft. Desktop linework stays full; the original phone detail and 2.4-million-pixel raster cap remain. `delay=28` can verify that slow frames no longer change the canvas resolution or detail. Cached label sizes, camera-only update savings, and idle/hidden-tab suspension remain in place.

Opening the tower now gently defocuses the city instead of replacing it with paper. `assets/city-backdrop.js` renders only scenery into two reusable offscreen targets matching the main canvas drawing buffer, including its capped device-pixel ratio and 2.4-million-pixel budget. Matching that resolution avoids pixelated enlargement with the light blur. Two Gaussian passes blur that layer before a simple full-screen composite and the sharp tower/interior render. Unchanged camera/projection/blur values reuse the texture. No blur targets are allocated for the initial assembled view; both are released with the scene. The main canvas retains its original resolution and detail.

Renderer metrics count all passes in the latest frame, including background work when its cache changes. The WebGL harness allows two blur textures, up to 75 draws for a focused view and 85 for all five unfolded floors (sharp model plus scenery and blur), with a 100-draw limit across transition/resize frames. It waits for a new rendered frame after navigation before accepting a settled view, and verifies disposal of both textures. Recorded original skyline-phase metrics predate this effect; newer evidence is grouped by change under `state/`.

The river and expanded neighborhoods share `assets/city-layout.js`: `riverPlan`, `riverCenter`, `riverEdges`, and 61 city lots on 52 parcels. `assets/city-waterfront.js` builds the water, quays, two avenue crossings, riverwalk furniture, parks, moored boats and peripheral streets in five batches. River geometry stays below 5,000 triangles, without reflection textures or animation. Keep occupied lots outside the water and riverwalk fixtures outside buildings and avenue crossings; the skyline regression checks those relationships. Remote extension buildings use coarse facades, existing building batches, contact shading and no rooftop equipment to keep the added district bounded. The waterfront is scenery in the shared blur pass and participates in assembled-city picking occlusion.

`assets/city-landscape.js` supplies three parks and planted edges in three static batches. `parkPlan` is shared with collision checks. `assets/ground-materials.js` chains surface detail onto the existing atmospheric shader: world-space slab joints, aggregate, grass variation and static water ripples use screen derivatives to filter distant detail. Keep fine grain low contrast and avoid image textures or additional passes. Ground fills stay below the tower, buildings remain dry, and trees stay clear of occupied volumes and avenues.

`assets/city-time.js` reads the visitor's local `Date`, using an illustrative dawn of 5:30–7am and dusk of 5–7pm. It does not request location or calculate seasonal sunrise or lunar phases. `scene-3d.js` shares that state across the sky, exterior lights, atmospheric tint, windows and lamps; interior light remains independent. One aligned timer updates each visible minute; hidden scenes catch up on visibility restoration. Clock changes invalidate the scenery cache, with no geometry/material/program rebuild. Dispose the clock with the scene. Use the injected `clock` factory option only for tests and diagnostics; keep the production default on real local time.

Camera clipping distances follow the orbit distance so thin architectural surfaces retain depth precision through zoom. Each district roof owns its top surface, and assembled tower modules hide their shared interior cut faces. Preserve these rules when editing geometry; duplicate colored planes can produce moving stripes even when both materials have the correct palette.

Inspect the opening and expanded views, upper/lower cross-sections, room captions, short landscape panels, long project stories and galleries, and the résumé link. Tab from the page into the reading bypass and canvas; Enter unfolds the tower, arrows rotate it, and Escape steps back through room/floor/tower navigation. Confirm reading mode returns to the same model, and check reduced motion when animation behavior changes.

## Search and sharing

The canonical site is `https://bshwao.github.io/`. Keep `index.html`, the metadata in `scripts/reading.mjs`, `robots.txt`, and `sitemap.xml` aligned if the public address changes. Hash routes share individual rooms; search engines get the complete content from the canonical reading page.

`assets/social-preview.png` is the 1280 × 720 sharing card. Open `/scripts/social-preview.html` on the local preview server at a 1280 × 720 browser viewport. Wait for “READY — production skyline sharing artwork” in `#status`, then save a viewport screenshot. This page uses the actual production city, local-time sky, and fixed HTML typography; `scripts/social-card.js` is its browser module. Export/validate a captured file with `python scripts/render-social.py PATH_TO_SCREENSHOT` (Python with Pillow), then inspect `/scripts/social-card.html`. Keep the source capture with the QA evidence. `npm run check` verifies the PNG format, dimensions, size, and page metadata. The existing sharing image is static and is not loaded by the 3D experience.

## Release and rollback

Commit reviewed changes and push to `main`. The `Portfolio checks` workflow runs automatically on pushes and pull requests. GitHub Pages uses the existing branch deployment; verify both checks and the `pages build and deployment` run for the published commit, then inspect the live home page, a room deep link, reading page, résumé, sharing card, and sitemap.

After Pages finishes, run `node scripts/verify-live.mjs` to compare the canonical live pages, model/style modules, binary assets, sitemap, crawler setup, and release documentation against the committed `HEAD` snapshot. Text comparisons normalize Windows line endings; PNG/PDF comparisons use the exact bytes. `--record` saves the evidence to `state/deployment.json` for a subsequent documentation commit.

For a regression, use `git revert <commit>` and publish the revert through the same checks. This preserves history and provides a reproducible rollback. `node_modules/` and `.preview/` are local-only and stay ignored.

Periodic content review is ongoing maintenance: revisit project status, experience, résumé, external links, demos, and measured results when they change. No unattended account changes or recurring notification jobs are configured.

## Color system

`assets/facade-materials.js` derives the tower's stone/glazing zones and subtle pane variation from the shared palette. Its coordinates are whole-building azimuth, height, and physical bays, so materials stay continuous across section cuts. Keep all variation deterministic and baked into the existing vertex-color attribute. The assembled model uses neutral structural edges; section colors fade in with unfolding. All four footprint/silhouette phases in `MASSING-PLAN.md` are complete locally.

`assets/tower-geometry.js` is authoritative for deliberate polygon profiles, room rectangles, the aligned occupied-floor service core, and concave-safe insets. Keep neighboring profiles nested and preserve all corners at every sampling level. Terrace surfaces must triangulate the outer-minus-inner polygon, rather than connecting corresponding concave corners. `tower-model.js` subdivides clean corner triangles at facade bays to preserve watertight seams without zero-area slivers. Cameras fit actual slab/furniture extrema and contain destination bounds during room flights. Run the massing/interior/reading tests and all integration modes after changing these contracts. Inspect the four neutral views at `scripts/massing-qa.html` plus assembled, unfolded, cutaway, and reading views; current evidence is in `state/massing-qa.json`.

Edit palette, material, lighting, and section roles in `assets/color-theme.js`, then run `npm run theme` to regenerate `assets/theme.css` and the icon. The same palette feeds WebGL and the static reading generator. Use `scripts/palette.html` to inspect material swatches, darker interactive inks, section tints, and the sharing illustration. Re-run `npm run reading` if the paper/theme metadata changes, and regenerate the sharing artwork after a visual palette change. `npm run check` catches generated-file drift and tests text contrast on every proposed paper/tint background.

Real-browser checks are still required: automated palette contrast does not account for every composited backdrop or prove the final layout. Check all five floors, hover/focus/selected states, reading dialogs and fallback, both phone orientations, full and compact viewport detail, frame timings, stable GPU memory, and disposal. Record results under `state/` with their browser/device scope.

The color-review page applies filters to its embedded portfolio only. `scripts/vision-simulation.js` uses linear-RGB transforms with CVD coefficients from [Chromium's Machado-model implementation](https://chromium.googlesource.com/chromium/src/+/HEAD/third_party/blink/renderer/core/css/vision_deficiency.cc). A unit check covers the essential ink/paper combinations under those transforms. These are diagnostic approximations; inspect the actual controls and labels in the browser as well.
