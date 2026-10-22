# Multicolor architectural portfolio plan

Status: all five phases are complete locally and release-ready. The palette, model, city, UI, reading, fallback, icon, and sharing artwork are implemented and verified. Source checks, all five DOM/camera integration modes, 39 browser accessibility views, real WebGL resource checks, frame timing, and adaptive-quality verification pass. The redesign and earlier performance changes are unpublished.

## Visual direction

Graphics correction — 2026-10-22: the user requested the original drawing quality after reviewing a screen recording. Automatic resolution/detail reduction is removed; the original viewport-based render budget is retained. Duplicate district roof lids and assembled tower cut faces are eliminated from rendering, and camera depth precision now follows zoom distance. Earlier adaptive-tier evidence below records the previous implementation rather than the current quality policy. Current repair evidence is in `state/graphics-repair-qa.json`.

Use the supplied architectural drawing as the reference: warm ivory paper, fine graphite construction lines, and muted teal, coral, mustard, and blue surfaces. Color should describe materials, rooms, and navigation while the tower remains the visual focus. Keep the existing architectural typography, drafting frame, exploded geometry, and furnished cutaways.

The recommended treatment is a **warm architectural atlas**: mostly neutral paper and structure, with several clearly visible colored surfaces in each principal view. Start around 75–80% neutral and 20–25% colored area, then tune from screenshots. This is a composition guide, not a measured property of the reference.

- Tower: ivory structure, teal glazing, warm gray edges, selected coral and ochre architectural details.
- Exploded view: gently colored floor plates, graphite cut outlines, and distinguishable furnishings on the exposed plans.
- Interiors: pale floors, teal screens/glazing, warm furniture, restrained coral equipment and upholstery, and graphite details.
- District: pale stone buildings, sage foliage, occasional terracotta roofs, and warm gray streets. Keep its saturation below the tower's.
- Website: graphite reading text, warm paper panels, colored section accents, and consistent hover, focus, and selected states.

Use flat opaque color washes, existing lighting, and baked shading. A subtle paper tint is enough to establish the reference's warmth; distressed paper texture is optional later work.

## Starting palette

These are proposed colors inspired by the image, not exact pixel samples. Final rendered colors require tuning under the scene's lights and display color management.

| Role | Starting color | Application |
| --- | --- | --- |
| Paper | `#F4F1E8` | Page, canvas clear color, atmospheric fade target |
| Raised paper | `#FBF8F1` | Reading panels, labels, light model surfaces |
| Graphite | `#414842` | Body text, primary outlines, headings |
| Draft gray | `#A5AAA1` | Secondary construction lines; darker variants for small text |
| Teal | `#72AAA3` | Glazing, selected furniture, About accent |
| Dusty blue | `#849CB8` | Technical equipment, Projects accent |
| Terracotta | `#C78979` | Selected roofs/equipment, Experience accent |
| Mustard | `#C4AA6B` | Timber/brass details, Résumé accent |
| Muted rose | `#BC8F9C` | Upholstery and limited details, Contact accent |
| Sage | `#9EAE90` | Trees, planted courtyards |

Use pale derivatives for broad fills and darker derivatives for interactive text and borders. The midtone swatches above are decorative colors, not approved small-text colors. Section names, numbers, shapes, and selected-state indicators remain visible alongside color.

All sections should contain a coherent mixture of material colors. The section accent supplies an additional navigation cue through the slab edge, label marker, active room control, and heading rule.

## Implementation phases

| Phase | Scope | Complexity | Reviewable result |
| --- | --- | --- | --- |
| 1 | Palette, shared tokens, and paper/graphite foundation | Moderate | Warm page and canvas, coordinated controls, palette sheet and comparison screenshots |
| 2 | Multicolor tower and exposed cross-sections | High | Assembled and exploded tower with teal glazing, tinted plates, and readable colored cap plans |
| 3 | Furnished interiors and supporting district | High | Material-colored rooms and a quieter multicolor city |
| 4 | Complete website and interaction consistency | Moderate | Matching labels, reading views, selected/hover/focus states, fallback and static portfolio |
| 5 | Performance, accessibility, and release verification | Moderate | Tested redesign with evidence at full and reduced quality; a release-ready change |

### Phase 1 — palette and foundation

1. Establish one authoritative palette source, such as `assets/color-theme.js`, containing paper, ink, material, and section roles. Generate a small shared CSS token file from it so the static reading page also works without JavaScript. Add a generated-file drift check.
2. Apply the neutral foundation to the page, canvas, labels, reading panels, scene vignette, and district fade target. Coordinate the HTML and WebGL background colors to avoid visible seams.
3. Establish section accents on the five section labels and a restrained drafting legend. Keep the legend subordinate to navigation and usable within existing phone layout space.
4. Capture assembled, exploded, and Projects-floor screenshots as a comparison set. Use the current local performance changes as the baseline for later phases.

Completion: warm paper and graphite are consistent, all five accents are represented, and the proposed palette can be reviewed in context. Navigation and geometry remain stable. The main 3D material-color work follows in phases 2 and 3.

### Phase 2 — tower and exposed cuts

1. Introduce material roles for the shell, glazing, structural edges, slabs, and cap-plan furniture. Start with broad flat washes and preserve the existing tower silhouette.
2. Keep large structural surfaces pale. Use teal glazing and a small number of coral/ochre details to make the assembled tower visibly multicolored. Use existing geometry and color attributes where possible.
3. Give each section a light floor tint and a stronger accent edge that connects it to its HTML label. Keep its cut outline legible above both the floor fill and furnishings.
4. Extend cap-plan colors to distinguish partitions, cores, and furniture while retaining their existing attachment to upper/lower cut faces.
5. Update transition and hover colors together. Colors must survive expansion, clipping, floor isolation, and returning to the tower.

Implementation areas: `assets/tower-model.js`, `assets/scene-3d.js`, and `assets/cap-plans.js`.

Completion: assembled tower, exploded sections, and exposed plans all show the new palette. Full and compact line modes convey the same material and section identities.

### Phase 3 — interiors and city

1. Replace the interior's current paper/blue/ink/glass assumptions with material roles. Reuse its limited batched surface groups; use vertex colors where additional variation would otherwise require many separate draws.
2. Apply pale timber/ochre to selected work surfaces, teal to glazing/screens, muted rose or terracotta to selected seating and equipment, and graphite to technical details.
3. Preserve each room's original material colors through active-room, hover, focus, and context-fading effects. Returning from a close-up must restore the exact base palette without cumulative tinting.
4. Recolor district face washes, glazing, roofs, planting, paving, and contact shadows. Coordinate the atmospheric fade and shading with warm paper instead of pure white and blue.
5. Keep the district lighter and less saturated than the tower so it remains supporting context during both outdoor views.

Implementation areas: `assets/interiors.js`, `assets/district-buildings.js`, `assets/district-details.js`, `assets/district-ground.js`, and `assets/district-style.js`.

Completion: every floor reads as a furnished space with several material colors, while the city remains visually subordinate. Room selection, batching, and disposal still work.

### Phase 4 — complete website and interaction states

1. Carry the palette through section headings, room markers, navigation, buttons, tags, links, scrollbars, share controls, and reading dialogs.
2. Use the section accent consistently for selected states. Use darker ink variants and visible outlines/underlines for hover and keyboard focus; reserve light pastels for fills.
3. Apply the same system to `reading.html`, no-JavaScript content, and the unavailable-3D fallback. Regenerate the reading document through its existing content pipeline.
4. Audit the CSS cascade, including later marker overrides and responsive styles. Recheck cached label dimensions when borders, text styles, and selected states change.
5. Refresh the social preview after the in-site palette is settled so shared links reflect the redesign.

Implementation areas: `assets/styles.css`, `assets/spatial.css`, `assets/reading.css`, `assets/floor-view.css`, `assets/project-story.css`, `assets/spatial-app.js`, and the reading/social generators.

Completion: the whole website uses the multicolor system, including reading and failure paths. Color complements the existing labels and accessible states.

### Phase 5 — verification and release readiness

- Run the repository checks and all five DOM/camera integration modes. Add palette consistency and color-restoration coverage where it verifies behavior.
- Inspect the assembled tower, exploded view, all five interiors, room close-ups, and reading views on desktop, portrait, and short landscape layouts.
- Check text, control, and focus contrast on the actual backgrounds. Inspect grayscale and color-vision simulations to confirm that section/room choices remain understandable.
- Run real WebGL resource checks and the complete-app frame benchmark against phase 1's baseline. Record timing variability and the browser/device scope honestly.
- Verify full detail, each adaptive tier, resize, interrupted transitions, hidden-tab return, and context loss. Section colors must remain useful when decorative lines disappear.
- Confirm stable GPU allocation and disposal, no extra idle rendering, and the existing raster cap. Preserve the original drawing quality under load, per the user's graphics correction.
- Review final screenshots and update QA evidence. Publish through the existing checked release workflow when deployment is requested.

Completion: performance and usability evidence accompany the visual redesign; the live release status is explicit.

## Performance constraints

- Prefer recoloring existing surfaces, existing batched layers, or vertex colors. Track any change in draw calls, GPU programs, and geometry allocation against the baseline.
- Keep opaque surfaces and existing lighting. New real-time shadows, reflections, postprocessing, and overlapping transparent color layers are outside this plan.
- Keep the original 2.4-million-pixel upper raster budget and viewport-based phone detail. Frame timing must not lower resolution or desktop detail.
- Generate colors and static styling once; avoid per-frame palette generation, material creation, or new DOM size reads.

## Source-specific risks to handle

- `scene-3d.js` currently reapplies blue shell/line colors and fades toward white during presentation updates. Changing only model construction colors would be overwritten.
- `district-style.js` bakes a blue shadow wash into vertex colors and fades shader output toward literal white. Both need palette-aware equivalents.
- `interiors.js` retains base colors for focus restoration. Those references must change with the material palette, not just the visible material at startup.
- `cap-plans.js` has its own blue line materials. Its drawings need coordination with the colored slabs.
- The main page, reading page, dialog, and fallback currently own overlapping color definitions. Shared tokens and a cascade audit prevent the redesign from stopping at the 3D canvas.

Recommended sequence: complete phases 1 and 2 first for a representative review, then extend the approved treatment through phases 3–5. Keep this redesign separate from the six completed city-construction phases.

## Implementation audit — 2026-10-22

- **Phase 1 — complete:** shared JS palette, generated CSS/icon, matched paper backgrounds, section accents, legend, and palette sheet. Assembled/exploded/Projects comparison screenshots are saved in `state/multicolor-views/`. The phone legend was moved clear of Reset during visual review.
- **Phase 2 — complete:** vertex-colored facade, section-tinted plates and edges, colored cap drawings, and palette-aware transitions. Geometry, picking, clipping/navigation, and compact-mode color preservation pass. Both outdoor views and exposed cuts were inspected in-browser.
- **Phase 3 — complete:** material-colored rooms, per-room equipment accents, warm district washes, sage planting, paper atmosphere, and exact material restoration. Every floor and representative room close-ups were inspected; real WebGL allocations remain stable.
- **Phase 4 — complete:** main/reading/dialog/fallback styling, selected/hover/focus colors, metadata, icon, and sharing image. All five floors were inspected at desktop, portrait, and short landscape sizes. Static reading, genuine no-script entry, initial WebGL failure, and context-loss fallback were verified. The palette no longer overwrites the accessible section description.
- **Phase 5 — complete:** 40 source checks and all five integration modes pass. axe reports zero automated violations in 39 views. WebGL budget/disposal checks pass at desktop, compact, simulated high DPR, and 4K sizes. Normal-load timing remains near this host's 165Hz ceiling; a deliberate-load trace exercises tiers 0–3. Grayscale and three CVD simulations retain readable labels and selected states.

The separate verification review found no release blockers. Its final documentation follow-up is closed: `QA.md` and `state/multicolor-browser-qa.json` now record the cached shader-program increases (tower 11→12, expanded 13→15, interiors 14→16), alongside unchanged draw/geometry counts and passing memory/disposal checks. No Phase 5 verification work remains.

`state/multicolor-qa.json` indexes the current evidence and limitations. Measurements describe Chromium on this Windows/RTX 2060 host, not the user's Edge session or a physical phone. Hidden-tab return, interrupted flights, and gradual quality recovery also have deterministic integration coverage. The sharing image is generated artwork; the screenshot set is captured from the browser. Publishing remains a separate, conditional release action.
