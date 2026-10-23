# Portfolio roadmap

## Completed

- Core 3D tower, furnished interiors, room navigation, project stories and galleries, and section reading mode.
- Blueprint city phase 1: ground grid, plaza, streets, sidewalks, crosswalks, twelve parcels, and survey annotations.
- Blueprint city phase 2: twelve low-rise apartment, office, workshop, and campus buildings with varied massing, solid white surfaces, pale blue facade details, and clear setbacks around the tower.
- Blueprint city phase 3: planted plaza corners, furnished campus and residential courtyards, 24 trees, 12 benches, eight streetlights, roof details, an MFE / LAB workshop, and a Poltergeist vehicle test loop with two static vehicle models.
- Blueprint city phase 4: responsive city and expanded tower framing, independent orbit/zoom restoration for both outdoor views, early city clearance and delayed return during interior transitions, foreground city selection occlusion, and collision-aware section labels with a portrait phone dock.
- Blueprint city phase 5: stronger building edges and curbs, quieter facade and grid lines, filled lane/crossing markings and travel arrows, baked blue face washes, soft contact shading, camera-relative atmospheric fading, and white screen margins behind navigation.
- Blueprint city phase 6: batched internal tower plates, shared room-construction primitives, compact phone linework and city detail, a 2.4-million-pixel raster budget, stable GPU allocation across navigation and resize, idle/hidden-tab checks, and verified disposal.
- Cleaned the exposed cross-section profiles.
- Cross-section floor-plan detail: inset walls, wing partitions, elevator/stair cores, and distinct furniture on the exposed upper and lower cut faces, with fading into the furnished interiors.

## Cross-section floor-plan detail — complete

The exploded tower now includes simplified architectural plans on its exposed cuts:

- An outer wall outline inset from the facade.
- A central elevator and stair core.
- Room partitions following the shared main-block and side-wing occupied regions.
- Sparse furniture silhouettes suited to each section: study furniture for About, workstations for Projects, lab benches for Experience, shelving for Résumé, and lounge seating for Contact.
- Thin, light-blue linework that keeps the section labels and tower silhouette clear.
- Plans that stay attached to the 3D caps as the tower rotates and expands, then clear away when the full furnished interior is revealed.

The pointed spire stays intact; About's broad lower cut carries its plan. Geometry is clipped to the cut outlines and batched into two line layers per section.

## Release checklist

All six numbered city phases are implemented.

- [x] **Final quality pass:** automated and real WebGL checks, representative portrait/landscape layouts, keyboard navigation, no-JavaScript entry, and accessibility audit. Evidence and test scope are recorded in `QA.md`.
- [x] **Deployment verification:** published through the existing HTTPS GitHub Pages branch; CI, Pages, live file hashes, room deep links, sharing, and reading mode are verified. Evidence is recorded in `QA.md` and `state/deployment.json`.
- [x] **Search and sharing:** a 1280 × 720 social preview image, canonical page metadata, structured profile data, sitemap, and crawler configuration.
- [x] **Maintenance setup:** content/update instructions, reproducible QA pages, automated repository checks, and a release/rollback guide in `MAINTENANCE.md`.

Content maintenance continues when projects, experience, résumé, links, demos, or measured results change. A custom domain is optional and has not been requested; the existing HTTPS GitHub Pages address remains canonical.

## Multicolor redesign — complete locally

The supplied architectural reference establishes a new direction: warm paper, graphite drafting lines, and muted teal, dusty blue, terracotta, mustard, and rose accents. Carry material colors through the tower, exposed plans, furnished interiors, district, and website controls. Preserve the existing automatic rendering budget and room navigation.

These are new redesign phases, separate from the six completed city phases:

1. **Palette and foundation — moderate:** shared color tokens, warm page/canvas backgrounds, graphite text, five section accents, and comparison screenshots.
2. **Tower and cross-sections — high:** teal glazing, pale structural surfaces, accented floor plates, colored cap plans, and coordinated transition states.
3. **Interiors and district — high:** material-colored furniture and rooms, quieter city colors, and palette-aware focus, shading, and fading.
4. **Website consistency — moderate:** section/room controls, reading dialogs, static portfolio, fallback, responsive styling, and sharing artwork.
5. **Verification and release readiness — moderate:** accessibility, full/adaptive-quality comparisons, frame timing, stable GPU resources, and final QA evidence.

All five redesign phases are complete. The detailed palette, implementation areas, completion criteria, and performance constraints are in [COLOR-PLAN.md](./COLOR-PLAN.md). Source checks, five integration modes, 39 browser accessibility views, responsive and color-vision review, real WebGL resource/disposal checks, and frame/adaptive-quality runs pass. See `state/multicolor-qa.json` and `QA.md` for evidence and scope. The redesign and preceding performance optimizations are release-ready locally and remain unpublished.

Graphics correction after the user's recording: original drawing quality is restored without automatic resolution/detail drops. Roof and tower cut-face overlap, plus insufficient camera depth precision, are addressed. See `state/graphics-repair-qa.json` for current verification; earlier adaptive-tier runs describe the superseded policy. Actual Edge/iPhone device checks remain a separate follow-up.

## Natural facade and tower-shape follow-up

The facade now uses continuous limestone/glazing material zones, restrained fixed pane variation, and a warmer base. Its color assignment no longer repeats every three wings or resets at section boundaries. Assembled floor edges stay neutral; section accents appear as the structure unfolds.

All four shape phases in [MASSING-PLAN.md](./MASSING-PLAN.md) are complete locally: a neutral four-view study, shared polygonal footprints, room/navigation migration, and the material/performance pass. The flower plan is replaced by a chamfered L-shaped main block and shorter side wing, unequal setbacks, an aligned recessed service core, and an off-center crown. All 19 rooms, cut drawings, reading maps, camera fits and flights use the new geometry. Source/integration checks, 39 accessibility views, real WebGL budgets/disposal at three viewport sizes, frame timing, and original-quality retention pass. See `state/massing-qa.json` and `QA.md`. Actual Edge/iPhone verification remains separate; the work is unpublished.

## Dense skyline redesign — all seven phases complete locally

The city-photo direction is implemented: a 148.5-unit bundled dark tower with twin antennae; 38 neighboring buildings across six architectural families; layered street fronts; warm glazing reflections; blue sky with procedural clouds; cool distance haze; and coherent directional/contact shading. Street detail includes 46 trees, 14 benches, 16 lamps, varied shop signs/canopies, parked cars, and the existing engineering/workshop references.

All five sections and 19 furnished rooms retain their maps, picking, stable routes, and accessible content. The city clears early during unfolding, the first expanded view exposes its cut plans, outdoor orbit remains above street level, and phone reading maps use numbered hotspots without overlapping names. Independent views, history, touch/keyboard, interrupted/resized transitions, reduced motion, reading mode, and fallback remain covered.

All **58 source tests**, **five integration modes**, **39 accessibility views**, and **36 WebGL samples at three viewport sizes** pass. Frame timing, original quality under deliberate slow frames, real context loss, no-script/no-WebGL entry, color-vision review, stable allocation and disposal are recorded. Desktop tower/explore use **54/46 draws and 50,657/18,682 triangles**. The sharing PNG is regenerated from the finished production city at 1280 × 720.

[SKYLINE-PLAN.md](./SKYLINE-PLAN.md), [QA.md](./QA.md), and [state/skyline-final-qa.json](./state/skyline-final-qa.json) contain the completion gates, evidence, budget comparison, and device scope. Chromium phone sizes are simulated; actual Edge/physical-iPhone measurements remain separate. The redesign is complete locally and has not been committed, pushed, or deployed.
