# Dense skyline redesign plan

Status: phases **1–7 complete locally**, 2026-10-22. The architecture, sunset materials/environment, street detail, responsive integration, performance/accessibility checks, and sharing artwork are implemented and verified. [state/skyline-final-qa.json](./state/skyline-final-qa.json) indexes the current requirement-by-requirement evidence. Earlier reports remain historical baselines. The redesign is unpublished; actual Edge and physical-iPhone measurements are outside the recorded Chromium scope.

Height follow-up: the main tower is **148.5 units tall, a 35% increase from 110**, with its footprint and furniture scale retained. Shared section, roof, antenna, cut-plan, material-zone, and camera elevations follow the taller geometry. The initial phase 3 and height reports record the earlier architecture checkpoints; the final report covers the completed sunset city.

## Visual direction

The subsequent [city and outskirts completion](./CITY-OUTSKIRTS-PLAN.md) extends the riverfront checkpoint with lower outer neighborhoods, connected peripheral streets, public spaces and woodland. Its current evidence is recorded separately under `state/city-outskirts/`; the original seven-phase reports below remain historical baselines.

Turn the spacious architectural model into a convincing downtown skyline at golden hour. The reference's defining qualities are a dominant dark stepped tower, connected rectangular shafts, thin antennae, substantial neighboring towers, older masonry buildings, layered street fronts, warm reflected sunlight, blue sky, and softly lit clouds.

The finished scene should feel like a view into a larger city. Buildings overlap at different depths and continue beyond the opening frame. Move the opening camera lower and closer so the tower feels tall, with enough sky above its antennae. Keep full 3D orbit and the existing portfolio interactions.

Use the photograph for composition, architectural character, materials, and light. Build the environment as a coherent 3D scene that works from multiple angles. Refine the main tower into a dark cluster of unequal rectangular volumes with a restrained pair of antennae; its previous L-shaped footprint can evolve where the new composition requires it. Preserve the five portfolio sections, all 19 rooms, existing content and URLs, accessible reading views, and keyboard navigation.

## Starting baseline (before phase 1)

- Twelve surrounding buildings occupied widely spaced parcels; their heights were below 17 model units, compared with the 110-unit portfolio tower.
- A broad central plaza and exposed drafting grid made the scene read as a tabletop master plan.
- Pale materials, coral roofs, paper-colored atmospheric fading, and the elevated camera reinforced that presentation.
- The existing polygon profiles, shared room layouts, batched district layers, camera transitions, and resource checks are useful foundations.
- Baseline desktop tower/explore rendering used 56/70 draw calls and 23,578/24,034 triangles. See `state/massing-qa.json` for the complete baseline and measurement scope.

## Initial architecture checkpoint (historical)

- **Phase 1:** 38 buildings occupy 29 parcels, with eight inner street fronts, nine distant volumes, and three secondary towers at 60–76 units. The plaza half-width is reduced from 36 to 24 units; four axial approaches and the streets remain clear. The lower opening camera fits actual geometry and gives the landmark about 74–80% of usable view height across representative desktop, portrait, and short-landscape layouts. Neutral opening, side, rear, and overhead views are saved in `state/skyline-phase3-views/neutral-city.jpg`.
- **Phase 2:** a substantial podium supports long connected shafts terminating at 44, 70, 96, and 99.5 units, with unequal antennae reaching 110 and 107.6. Shared profiles still drive the closed sections, cut plans, aligned core, all 19 furnished rooms, reading maps, and picking. Solidity and navigation regression checks pass.
- **Phase 3:** glass, brick, limestone, landmark, workshop, and campus families have distinct masses, facade rhythms, rooflines, and entrances. Cornices, parapets, setbacks, supported roof plant, courts, passages, and shopfront canopies add architectural scale. Shared lot/volume data supplies generated architecture and camera envelopes; existing ground details and actual building selection remain clear and tested. The 38 buildings retain five shared rendering layers.

All 56 source tests and five integration modes pass. Real WebGL budgets, idle behavior, stable allocation, and disposal pass at three viewport sizes. Desktop tower/explore rendering uses 52/66 draws and 42,532/42,988 triangles. These are preservation checks for the architecture checkpoint; the complete integration, performance, accessibility, and final-artwork passes remain in phases 6–7.

## Final sunset-city checkpoint

- **Phase 4:** charcoal/glass landmark, warm reflected elevations and grouped physical window bays; six neighboring material families; static world-direction blue sky/clouds, warm sun/cool fill, and sky-colored haze. The baked shading and 1024px directional-shadow prototype were compared. Baked shading retains zero textures/postprocessing; the prototype adds a shadow texture, two cached shader programs, a receiver draw, and a shadow depth pass. Opaque paper controls and light interiors preserve reading contrast.
- **Phase 5:** 46 trees, 14 benches, 16 lamps, foreground gardens, eight varied shop signs/canopies, two parked cars, existing workshop/test-loop references, and supported rooftop plant. Fixtures remain in six shared layers and leave actual buildings, roads, and approaches clear. Details use 8,456 triangles; contact/directional shading uses 3,021 in one layer. Their bounded source ceilings were revised to 9,000/3,500 to accommodate the new street/shadow geometry while staying well below the whole-city budget.
- **Phase 6:** the first unfold raises the camera to expose plans. City/sky clear during the first 24% of unfolding and return after 66% of collapse, protecting moving sections and labels. Opening and orbit stay above street level, including short landscape. Phone reading maps use clear numbered hotspots, with full names in accessible controls and content. All five sections and 19 rooms, pointer/keyboard/touch, reading return, history, deep links, independent outdoor views, interrupted flights, resize, and reduced motion retain passing coverage.
- **Phase 7:** 58 source tests, five integration modes, 39 accessibility views, 36 real WebGL samples at three sizes, normal desktop/phone-layout timings, a deliberate 28ms load run, real context loss, fallback and color-vision review pass. Desktop tower/explore use 54/46 draws and 50,657/18,682 triangles; textures stay zero, the raster cap holds, allocations stabilize and disposal releases GPU geometry. Final opening/orbit/floor/room/reading screenshots and the regenerated 1280 × 720 sharing PNG are saved. See the final report and QA.md for raw evidence and limitations.

## Phases

### 1. Skyline composition and neutral blockout

**Status: complete locally.**

**Complexity: high.** Establish the city silhouette and opening view together.

- Lay out foreground street fronts, middle-distance blocks, and a receding skyline. Reduce the empty apron around the main tower while retaining a clear entrance and usable circulation.
- Start with approximately 30–40 individual buildings, including two or three secondary towers. This is a composition target to tune in the blockout, rather than a requirement to fill a count with duplicates.
- Use a deliberate height hierarchy: main tower about 110 units; secondary landmarks approximately 55–80; mid-rise blocks 22–50; foreground buildings 8–22. Vary widths, depths, setbacks, alignment, and gaps as well as heights.
- Establish a lower, upward-looking opening view. Aim for the main tower to occupy roughly 65–80% of the usable opening image height, while retaining the antennae, adjacent landmarks, and a readable street layer.
- Replace camera assumptions about 17-unit scenery with actual building bounds. Compose representative desktop, portrait, and short-landscape views from the start.

**Completion:** neutral opening, side, rear, and overhead views show a layered city; the main tower is dominant, neighbors have meaningful scale, and streets/plaza remain physically clear. Review the blockout against the supplied reference before adding facade detail.

### 2. Main tower architecture

**Status: complete locally.**

**Complexity: high.** Give the portfolio landmark the reference's strong architectural presence.

- Develop connected rectilinear shafts with unequal terminations, a substantial base/podium, clear vertical structure, and two slender antennae with different proportions.
- Favor a few strong volume changes over repeated small steps. Check the silhouette from every orbit direction and keep the main shaft visually taller than neighboring landmarks.
- Continue using explicit shared floor profiles. Any footprint change must update occupied regions, the aligned service core, furniture placement, exposed cuts, reading maps, and picking geometry together.
- Keep all five separated sections closed and solid, with supported horizontal ledges and clean cap surfaces.

**Completion:** assembled and unfolded tower views are coherent from all sides; all 19 rooms fit their revised boundaries; cap topology, room routes, and picking pass their existing checks.

### 3. Surrounding architecture and street density

**Status: complete locally.**

**Complexity: high.** Replace the uniform low-rise ring with varied urban blocks.

- Build several distinct families: older stone/brick mid-rises, broad office slabs, slender glass towers, stepped masonry landmarks, and lower shopfront/podium buildings.
- Create continuous street edges with occasional passages and courtyards. Allow foreground buildings to overlap distant buildings naturally, while protecting the composed opening sightlines to the portfolio landmark.
- Vary rooflines and facade rhythms by building family; include cornices, recessed upper floors, parapets, roof equipment, and entrances where their scale makes them visible.
- Extend the sense of the city with inexpensive distant volumes. Keep those volumes coherent during orbit, rather than relying on one flat skyline facing the opening camera.
- Derive building envelopes, sidewalks, street furniture, and collision/selection bounds from the same updated district layout.

**Completion:** the city has recognizable foreground, middle, and background layers; buildings occupy valid lots and support their roofs; the result reads as an urban district from the opening view and during rotation.

### 4. Materials, sky, and golden-hour lighting

**Status: complete locally.**

**Complexity: high.** Establish the reference's color, contrast, and atmosphere.

- Use charcoal metal and dark tinted glazing on the main tower, with warm reflected light on selected elevations. Give neighboring buildings complementary limestone, concrete, brick, bronze, and cooler glass materials.
- Make window grids follow architectural bays and storeys. Use deterministic, restrained variation and coherent groups of warm windows, with different rhythms for different building families.
- Add a blue sky, softly lit cloud forms, warm directional sunlight, cooler ambient fill, and distance haze that blends with the environment.
- Replace paper-colored exterior fading with an atmosphere appropriate to the sky. Let sky, sun direction, reflection cues, and shadows agree as the camera rotates.
- Compare inexpensive baked shading and a bounded directional-shadow approach before choosing the final treatment. Record the rendering cost of any new textures, shadows, or postprocessing.
- Keep navigation and portfolio text readable through opaque, contrast-checked interface surfaces. Exposed floor plans and interiors can retain a lighter architectural presentation.

**Completion:** the scene reads as warm evening city architecture; dark buildings retain depth and detail; colors are stable through orbit and transitions; controls remain readable against sky and buildings.

### 5. Street foreground and environmental detail

**Status: complete locally.**

**Complexity: moderate.** Give the city a believable base and scale.

- Add grouped street trees, sidewalks, lamp posts, entrances, awnings, restrained signs, and a small number of parked/static vehicles.
- Concentrate detail where it contributes to the opening foreground and pedestrian scale; simplify distant fixtures.
- Integrate the existing engineering/workshop references into appropriate blocks, with entrances and service areas that fit the new streets.
- Keep roads and walking routes clear. Use shared geometry/material batches for repeated objects and maintain consistent contact shadows.

**Completion:** foreground streets anchor the skyline and add scale without obscuring navigation or crowding entrances; repeated details stay within their assigned areas and measured resource budget.

### 6. Portfolio transitions and responsive integration

**Status: complete locally.**

**Complexity: high.** Make the denser city work with the portfolio.

- Refine opening/reset framing from the actual skyline and chosen composition. Keep portrait focused on the landmark with neighboring buildings as context; retain usable short-landscape controls.
- Update scenery occlusion and tower picking for tall neighbors. A foreground building should not select a hidden tower surface behind it.
- Quiet and clear nearby city volumes during unfolding/interior entry so they cannot cut through sections, hide rooms, or cover labels. Restore the city coherently on return.
- Recheck section labels, room markers, camera paths, and text-panel clearance throughout movement, including interrupted flights and resize.
- Preserve independent outdoor views, deep links, browser history, touch controls, reduced motion, reading mode, and context-loss fallback.

**Completion:** every floor and room is reachable by pointer, keyboard, and touch; sampled transitions and settled views fit desktop and both phone orientations; tall scenery never traps the user or competes with active portfolio content.

### 7. Performance, final QA, and release artwork

**Status: complete locally.**

**Complexity: high.** Verify the completed city and document its cost.

- Batch geometry by material/building family and instance repeated fixtures where useful. Use viewport-appropriate facade/detail density while retaining the skyline's important silhouettes.
- Preserve the original viewport-based graphics quality, 2.4-million-pixel raster cap, cached label measurements, idle/hidden-tab suspension, stable allocation, and complete disposal.
- Use provisional ceilings of 85 assembled and 100 unfolded draw calls, with interior views retaining the current 45-call ceiling after scenery clears. Aim below 150,000 rendered triangles in the assembled city. Validate these targets against the blockout and measured frame timings; document any revision with its visual benefit and before/after evidence.
- Replace obsolete low-rise-only tests with checks for the new height hierarchy, valid envelopes, roof ownership, actual camera bounds, correct occlusion, and navigation. Preserve meaningful topology, room, accessibility, and resource regression coverage.
- Run source tests, all integration modes, real WebGL resource/disposal checks, frame timings, accessibility audits, and visual/keyboard review. Test context loss, reading/fallback entry, reduced motion, and interrupted/resized transitions.
- Record desktop and simulated phone evidence separately from actual Edge and physical iPhone measurements. Identify any unavailable device testing explicitly.
- Save final before/after opening and orbit views, all five section views, representative room close-ups, and reading layouts. Regenerate the sharing card from the finished city and update README, roadmap, QA, and the completion report.

**Completion:** the city matches the agreed reference direction, all portfolio behavior passes, rendering costs and device scope are recorded, and final artwork/documentation reflect the implemented scene. Publication remains a separately identified release action.

## Sequence and checkpoints

Implement phases **1 → 2 → 3 → 4 → 5 → 6 → 7**. Update shared bounds and preserve working navigation throughout; phase 6 is the complete integration/polish pass. Capture a neutral skyline comparison after phase 1, an architectural comparison after phase 3, and a finished-lighting comparison after phase 4. These checkpoints prevent detailed facade work from locking in a weak city composition.

All seven implementation phases are complete locally. The scene now uses charcoal metal, tinted glazing, warm reflections, blue sky and procedural clouds, directional/contact shading, and expanded street scenery. Publication is a separate release action; future actual Edge/iPhone checks should be recorded separately from the simulated Chromium viewports.

## Main implementation areas

`assets/district-ground.js`, `district-buildings.js`, and `district-details.js` own the district layout and building/detail generation. `district-style.js`, `facade-materials.js`, `color-theme.js`, and `scene-3d.js` own the exterior appearance and lighting. `tower-geometry.js` and its existing model/interior/cut/reading consumers must stay synchronized when the landmark changes. `camera-framing.js`, `spatial-layout.js`, and the scene's picking/transition logic need actual taller-building bounds. Update model/layout/theme/integration tests and the browser/resource/frame/accessibility harnesses alongside the new behavior; keep the prior evidence as an explicit baseline.
