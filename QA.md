# Release verification

The sections before “Multicolor redesign” record the earlier blue-site release and performance follow-up. Current redesign evidence is recorded separately in the final section and `state/multicolor-*.json`.

## Implementation gates

- `npm run check`: 31 passing geometry, layout, route, asset, metadata, and sharing checks; syntax and generated reading content also pass.
- `npm test`: desktop, portrait, reduced motion, room deep link, and initial WebGL failure pass. Coverage includes all floors and rooms, resize/cancellation, sharing fallback, keyboard behavior, idle rendering, hidden-tab suspension, reading mode, and context-loss cleanup.
- Real WebGL checks: all five floor overviews and close-ups pass the draw/raster budgets. Repeated navigation and compact/full resize cycles stop growing GPU allocations after the alternate detail is first uploaded. Idle scenes render zero additional frames over the measured 250 ms interval. Disposal releases all uploaded geometries.

## Observed rendering budgets

| Viewport | Requested device ratio | Actual pixel ratio | Tower draws | Expanded draws | Opening line segments |
| --- | --- | --- | --- | --- | --- |
| 1280 × 720 | 1 | 1 | 60 | 70 | 60,369 |
| 390 × 844 | 3 | 1.35 | 57 | 67 | 23,776 |
| 844 × 390 | 3 | 1.35 | 57 | 67 | 23,776 |
| 3840 × 2160 | 2 | 0.538 | 60 | 70 | 60,369 |

The compact opening drawing uses about 61% fewer line segments. Internal tower plates remove 22 separate draws through batching. Floor overviews use 27–33 draws in the observed scene, including the shell and furniture. WebGL textures remain at zero. Raw results, initialization observations, and stable allocation counts are in `state/browser-qa.json`.

These runs use Chromium 155 on this Windows host with real WebGL and representative viewport sizes; higher device ratios are simulated by the harness. They are not physical-phone, cross-engine, network-throttling, or FPS benchmarks. No other browser engine or physical phone is connected in this environment.

### Adaptive rendering follow-up (local changes)

The full app now samples active frame timing, reduces decorative line density and raster resolution under sustained load, and restores one quality tier after six healthy seconds. Camera-only orbit skips unchanged model presentation and projection updates. HTML labels receive cached sizes from ResizeObserver, removing synchronous size reads from the frame callback. Unchanged state attributes and progress values are no longer rewritten each frame. The WebGL context uses the browser's default power preference.

`scripts/frame-qa.html` measures the complete app with its DOM overlays. A single before/after run at 1280 × 720 on this host's RTX 2060 stayed near the 165Hz refresh ceiling in both versions. The observed Projects-entry callback p95 changed from 2.1ms to 1.7ms; one run is not sufficient to claim a reliable speedup, and callback time excludes asynchronous GPU work and subsequent browser layout/paint. Raw evidence and limitations are in `state/frame-qa.json`.

A separate run with a deliberate 28ms delay after each scene frame reached the lightest tier during tower orbit and retained navigation through the Projects floor and room close-up. This verifies the adaptation path, not a measured improvement on a slower GPU. Deterministic tests also cover recovery hysteresis, idle/background pauses, isolated spikes, very slow frames, unchanged floor framing, and retaining the learned tier after resize. The real WebGL budget harness still passes all floors, close-ups, idle, stable memory, and disposal at 1280 × 720. These follow-up changes have not been deployed or tested in the user's Edge session.

## Accessibility and visual inspection

axe 4.14.0 reports zero automated WCAG A/AA violations across thirteen settled views at each of 1280 × 720, 390 × 844, and 650 × 390. The views cover the opening/expanded tower, every floor, a room close-up, every section reading dialog, and the complete reading portfolio. Raw results, including manual-review findings, are in `state/accessibility-qa.json`.

The manual-review categories are contrast over SVG/canvas/overlapping drawing layers, symbolic controls, and the closed reading dialog's `aria-controls` reference. Functional controls use opaque paper backgrounds and darker blue text; the dialog target is checked to exist in every audit view. SVG drafting annotations are decorative and duplicated by the HTML room content. These checks are not a WCAG certification or a live assistive-technology test.

Browser inspection covered portrait expansion and its five-button dock, the short landscape Systems lab close-up and scrollable content panel, readable upper/lower cut-face plans, and no-JavaScript entry. Keyboard testing confirmed that the first Tab reveals the reading bypass and Enter opens the complete portfolio; the canvas accepts rotation and Enter to unfold. Existing navigation tests cover Escape, room arrows, reading-mode return, and interrupted flights. No shader warnings were observed during GPU checks.

## Search, sharing, and maintenance

Both canonical entry pages reference the validated 1280 × 720 PNG social card. The reading page includes structured profile data. `sitemap.xml` lists the home and complete reading pages; `robots.txt` advertises that sitemap and excludes developer QA pages. All referenced room images and résumé assets resolve locally, and the three linked project repositories were verified public and unarchived.

`MAINTENANCE.md` documents content/resume updates, regeneration, QA, sharing artwork, release checks, and rollback. Repository checks run on pushes and pull requests. Future content updates remain ongoing maintenance; a custom domain has not been requested.

## Deployment verification

Release `c030ae7022b6377c717e22195ca6722c3c0eeb4e` is published at [bshwao.github.io](https://bshwao.github.io/). Both [Portfolio checks](https://github.com/bshwao/bshwao.github.io/actions/runs/39716756840) and [Pages deployment](https://github.com/bshwao/bshwao.github.io/actions/runs/39716756623) completed successfully.

Workflow and step results are recorded in `state/workflows.json`; dependency installation, `npm run check`, and `npm test` all completed successfully on the hosted runner.

The live home/reading pages, model/style modules, sharing card, résumé, sitemap, crawler configuration, and release documentation returned HTTP 200 over HTTPS and matched the committed snapshot. PNG/PDF comparisons use exact bytes; text comparisons normalize line endings. Evidence is in `state/deployment.json`; the repeatable command is `node scripts/verify-live.mjs`.

Live browser checks confirmed `#projects/b` opens the Systems lab and its Test-Shell content, Copy link reports success, and Reading view opens the matching section dialog without console or shader warnings. The initial CI attempt exhausted a five-minute cold-install limit; the workflow now allows fifteen minutes, prefers the npm cache, and retains all checks.

## Multicolor redesign — complete locally (2026-10-22)

The current working tree uses a shared warm-paper/material palette through the facade, section slabs, exposed cap plans, furniture, city washes, UI, generated reading page, and fallback. The procedural sharing illustration is regenerated at 1280 × 720 (267,113 bytes) and was inspected with the image viewer. It is artwork, not a browser screenshot.

`npm run check` passes 40 tests plus syntax/asset checks and generated CSS/icon/reading drift checks. `npm test` passes desktop, portrait, reduced-motion, room-deep-link, and no-WebGL modes. New coverage includes text contrast across every paper/section-tint combination, base-color restoration, unchanged solid geometry and batched room/plan draw counts, facade colors preserved under compact detail, paper shader uniforms, and valid colors in every reading-plan SVG. Local HTTP checks returned 200 with appropriate MIME types for both entry pages and the theme/palette assets. `git diff --check` passes.

Browser access recovered after the user-confirmed restart. axe 4.14.0 now reports **zero automated WCAG A/AA violations across 39 multicolor views**, at 1280 × 720, 390 × 844, and 650 × 390. Each size includes the tower, expansion, every floor, room views, each section reading dialog, and the complete reading page. Raw results and retained manual-review findings are in `state/multicolor-accessibility-qa.json`. Dark text inks pass numeric contrast checks across all paper/section tints and under grayscale and three CVD transforms. Opaque controls, accessible symbolic names, and existing closed-dialog targets were reviewed manually; these checks are not a WCAG certification or screen-reader audit.

Real WebGL checks pass at 1280 × 720, 390 × 844 (DPR 1 and simulated DPR 3), and 3840 × 2160 (simulated DPR 2). Desktop tower/expanded counts remain **60/70 draws, 33,788 triangles, and 60,369/63,489 line segments**, matching the prior baseline. Compact linework retains 23,776 opening segments with 57/67 draws. The 2.4-million-pixel cap is preserved, textures remain zero, all five floor/room budgets pass, idle adds zero frames over 250ms, repeated navigation/resize allocations stabilize, and disposal releases every uploaded geometry. Raw evidence is in `state/multicolor-browser-qa.json`.

The multicolor material and vertex-color paths add compiled shader variants. Comparing the same ordered desktop samples gives:

| Sample | Earlier blue site | Multicolor site | Change |
| --- | --- | --- | --- |
| Tower | 11 | 12 | +1 |
| Expanded tower | 13 | 15 | +2 |
| Every interior and close-up | 14 | 16 | +2 |

These are total cached shader-program counts reported by the renderer at each sample, not draw calls. The cache remains at 16 throughout the remaining interior samples. All twelve paired desktop views retain the same draw, triangle, line, geometry, and texture counts; navigation/resize geometry allocations also match the baseline. The comparison is recorded in `state/multicolor-browser-qa.json` under `baselineComparison`.

The complete-app normal-load run stayed around **162.5–165 FPS** on this Chromium 155 / RTX 2060 host, near its 165Hz ceiling. Callback p95 ranged from 0.7–2.2ms. Earlier blue-site timing is near the same ceiling; a single run does not establish a reliable speedup. Callback CPU excludes asynchronous GPU work and later browser layout/paint. A separate deliberate 28ms frame-delay run reached quality tiers 0, 1, 2, and 3 with drawing buffers of 1280 × 720, 1088 × 612, 896 × 503, and 704 × 396. Navigation and material identity remain useful at the lightest tier. This is an adaptation test, not a slower-GPU benchmark. A real `WEBGL_lose_context` event released the canvas and exposed the reading fallback. See `state/multicolor-frame-qa.json`.

Visual review covered assembled/exploded views, every floor at all three layout sizes, representative room close-ups, selection/hover/focus, restored materials, reading dialogs, static reading, genuine no-script entry, and initial no-WebGL fallback. Grayscale, protanopia, deuteranopia, and tritanopia filters preserve readable section/room labels and non-color selected-state cues. Review caught and fixed the phone legend's overlap with Reset and a material-property collision in the accessible canvas description. The review harness now recreates its iframe when toggling sandbox permissions so fragment navigation cannot retain scripts in the no-script check.

The comparison and representative QA screenshots are in `state/multicolor-views/`; additional local captures are in the ignored `.preview/` directory. Interrupted transitions, background suspension/return, reduced motion, gradual quality recovery, and framing remain covered by the five deterministic integration modes. These browser observations describe this connected Chromium host and representative viewport/DPR scenarios; physical phones and the user's Edge session were not measured.

All five redesign phases are release-ready locally. `state/multicolor-qa.json` indexes the evidence. No multicolor commit, push, or deployment has been performed; the earlier live release remains distinct from this working tree.

Phase 5 closeout: the separate **Multicolor redesign verification** chat found no release-blocking gaps. Its sole documentation follow-up was the shader-program comparison above, which is now recorded in both the report and structured evidence. No Phase 5 gates remain open; publication remains a separate release action.
