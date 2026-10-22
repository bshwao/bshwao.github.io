# Release verification

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
