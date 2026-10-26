# Six distinct interior directions

Local work, October 25, 2026. The six existing floors and all 23 rooms now have individual palettes, finishes and restaged furnishings. The scene retains 405 named interactive objects (47 in Penthouse), stable room routes and the playable penthouse game. Nothing was published.

## Requirements and evidence

- Every floor has a separate visual direction: the actual app overviews are saved as `<floor>-overview.jpg`. `six-floor-comparison.jpg` is a browser screenshot of `review.html`, which crops those six captures for comparison.
- Every room has an individual palette and finish: `inventory.json` records the actual rendered material colors, physical floor/wall colors, patterns, geometry bounds, placement, scale, triangle counts and object names for all 23 rooms. Regenerate with `node state/interior-identities/inventory.mjs`.
- Furniture style and placement change across the floors: the production helpers now use cached closed bevel solids, timber spindle chairs/open shelves, metal cross-bracing, low utility stools, library arches, café tables and an L-shaped lounge. All compositions are restaged and refitted with reserved doorway landings. The inventory records their actual positions/bounds, and source tests inspect distinctive silhouettes and focal orientations.
- The penthouse is warm and soft: its four material palettes have warm color balance; actual upholstery has curved bevel normals. `penthouse-bedroom.jpg` and `penthouse-bedding-response.jpg` show the production room and its active bedding control.
- All prior content/interaction behavior remains exercised: `check.txt` passes 126 source tests and 67 syntax/reference checks; `integration-final.txt` passes desktop, simulated phone, reduced motion, fresh link and unavailable-WebGL modes. The fallback mode intentionally logs a startup failure before asserting text access. Other focused logs show development subsets and may predate final refinements.

## Browser verification

`webgl-desktop.json` and `webgl-phone.json` are real WebGL reports from the existing browser harness at 1280×720 standard/morning and 390×844 low/requested DPR 3/night. Each covers 31 scene views and object responses in all 23 rooms, plus zoom stops, live time/quality switches, navigation, resize, idle rendering and complete disposal. Budget assertions remain unchanged.

The final runs record 57/55 opening draws, 141,194/129,773 opening triangles, 89/78 peak draws and zero idle frames. All three measured navigation cycles stay at 248 geometries in both runs; final resize and repeated quality switches also remain stable.

One initial phone check observed a single first upload on a restored tower-to-Projects route: 246 geometries became 247, then stayed at 247 for both later cycles. `webgl-phone-lazy-upload.txt` retains that diagnostic. The harness now warms that exact route once before measuring three further cycles, records the before/after warmup and every cycle's geometry count, and still rejects any growth across the measured cycles. This distinguishes the newly visible static buffer's first upload from ongoing allocation. No production geometry creation was added to navigation.

`accessibility-desktop.json` and `accessibility-phone.json` each audit 20 views with no automated WCAG A/AA violations, including the game and reading dialogs. Viewport simulations do not establish physical-phone frame timings or screen-reader behavior. Full screenshots retain surrounding app controls; the comparison gallery explicitly crops them.
