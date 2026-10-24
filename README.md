# Eric Hsu — Structures & systems

A personal portfolio built for GitHub Pages, presented as an interactive skyscraper in a downtown city that follows the visitor's local time. The local skyline redesign combines a tall bundled landmark, twin antennae, 197 neighboring buildings, charcoal metal and tinted glass, warm windows, masonry streets, and a smooth sky with a daytime sun or nighttime moon and stars. Selecting the tower separates five closed, solid sections; selecting a section moves the same camera toward it while the facade opens to reveal an inhabited architectural model. The interiors, exposed plans, accessible reading views, and interface retain a lighter paper presentation. See [the skyline plan](./SKYLINE-PLAN.md), [outer-city plan](./CITY-OUTSKIRTS-PLAN.md) and [QA notes](./QA.md) for implementation and verification scope. The city and nighttime-reflection implementation was published in commit `62a2e8c`. Current release verification and explicitly deferred real-device testing are recorded in [QA.md](./QA.md).

The tower stands among foreground shopfronts, urban blocks, and outer neighborhoods on 188 parcels, with streets, sidewalks, crosswalks, and a smaller central plaza. The drafting grid and survey annotations are hidden. A lower opening camera fits the actual tower and key neighboring bounds; portrait phones emphasize the landmark, while the outer city continues beyond the frame. Three secondary towers rise to 60–76 units beneath the 148.5-unit landmark, increased 35% in height after the phase 3 checkpoint. Glass towers, masonry mid-rises, stepped landmarks, office slabs, workshops, and campus courts vary their bays, roofs, entrances, and setbacks. Building geometry shares five rendering layers. The city gently blurs behind expanded sections and interiors, then returns to sharp focus near the end of collapse. Dimensions use illustrative model units rather than surveyed real-world measurements.

The river crosses the foreground between curved quays, with two avenue bridges connecting both banks. Riverside paths add 28 trees, two pocket parks with four more trees, benches, lamps, moored boats and fixed reflection strokes. The river continues through the landscape to ±6,000 units, with simpler far-bank geometry and stronger haze on distant water. The waterfront uses five shared rendering batches and no textures or idle animation.

Beyond downtown, 136 additional low-rise buildings form northern and southern residential neighborhoods, western workshops and eastern civic blocks. Thirty-six peripheral street segments join downtown and both bridges, with sidewalks, crossings, front paths, gardens, transit shelters, a recreation court and a service yard. River approaches end in pedestrian links and bollards. Irregular woodland groves and low ridges complete the transition beyond the last blocks. Outer streets, planting and fixtures use four shared batches, without new textures or animation loops.

The district has four planted corners, a furnished campus quad and residential courtyard, street and foreground gardens, 46 trees, 14 benches, 16 streetlights, eight small shop signs and canopies, two parked cars, and restrained rooftop equipment and panel banks. An MFE / LAB workshop retains its roller door, canopy, and working apron. A second workshop supports a Poltergeist test loop with a static Formula-style car and sensor-equipped test vehicle. These are illustrative references, not simulated driving demonstrations. All character details use six shared rendering layers and add no ongoing animation or lighting loop; fixtures and service areas leave the shared roads and buildings clear.

Ground surfaces distinguish paving slabs, asphalt aggregate, grass and water ripples with subtle world-anchored shader detail that fades at distance. Paving fills the central blocks, continuous terrain removes the former tabletop edge, and bridge ramps connect the streets to the river crossings. Three additional parks provide a garden, fountain square and pergola lawn; 12 trees furnish those parks in three shared batches; outer woodland and avenue planting belong to the outskirts batches.

At 10am the scene shows morning daylight and a sun; at night it shows a moon, sparse stars, cooler streets and illuminated windows and lamps. Sky colors, exterior lights, haze, water and scenery tint share one local-clock state. Dawn blends from 5:30–7am and dusk from 5–7pm; this is an illustrative daily cycle, without location lookup, seasonal astronomy or weather. One minute-aligned timer refreshes visible scenes and catches up when a hidden tab returns. A time change invalidates the blurred-city cache without moving the camera or changing the current room. Interior lighting stays readable.

The main tower uses physical window bays and fixed groups of warm windows. Neighboring glass, brick, limestone, bronze, and concrete elevations have distinct rhythms and baked warm/cool face shading. Lane markings and crossings have actual surface width. Baked directional silhouettes and soft contact shading anchor the city; camera-relative haze blends distant buildings into the sky. Stars, reflections, and baked shadows stay fixed in world directions during orbit. The sky uses high-precision gradient and star calculations with subtle dithering, without the earlier procedural cloud noise. The assembled city uses no image textures or shadow maps; focused views allocate two reusable blur targets at the main canvas resolution. Sky and terrain add two rendering layers. Floating controls and reading overlays use translucent frosted-glass surfaces, with denser reading panels and opaque accessibility fallbacks.

Internal tower plates share one draw per section, and room construction reuses box/cylinder geometry before batching. Small or short viewports use a lighter tower drawing and omit the minor grid and fine city strokes; the full solid profiles, cut-face plans, landmarks, furniture, and picking remain available. Phone drawing uses less than half the tower line segments of desktop. Raster work is capped at 2.4 million pixels, with a 1.35 pixel-ratio cap on compact screens and 1.75 on desktop. Detail restores automatically on resize, and inactive room styling avoids repeated material work.

Exposed cuts in the expanded tower carry schematic floor plans: inset walls, wing partitions with door swings, a lift/stair core, and section-specific furniture. Upper and lower cut faces are detailed, so the plans remain attached when viewed from above or below. The top section retains its flat roof and paired antennae; its broad lower cut carries About's plan. The drawings fade before the full interior opens and remain hidden on the assembled tower. Each section uses two batched line layers with no extra fonts, textures, or interactive controls.

See [the project roadmap](./ROADMAP.md) for phase completion and release verification.
See [the maintenance guide](./MAINTENANCE.md) for content updates, browser QA, sharing artwork, releases, and rollback.
See [the release verification](./QA.md) for measured WebGL budgets, accessibility results, and test scope.

## Preview

Use Node.js 24, matching CI:

```sh
npm run dev
```

Open `http://127.0.0.1:4173`. There is no build step and preview needs no package installation. `PORT` can select another port. The server binds only to the local computer.

Three.js 0.180.0 and OrbitControls are vendored under `assets/vendor/`, with their MIT license. All runtime assets are served locally; the website does not depend on a CDN, external fonts, a server backend, or a package installation on GitHub Pages.

## Explore

- **Left mouse drag:** orbit around the tower or interior. Click without dragging to select the tower, a section, or furniture. The browser context menu is suppressed only inside the canvas. **Scroll / middle drag:** zoom. **Reset view:** restore the framing for the current mode.
- **Touch:** one finger rotates; a tap selects; two fingers pinch to zoom.
- **Keyboard:** focus the canvas and use arrow keys to rotate, `+` / `-` to zoom, and Enter / Space to unfold. The section labels and room buttons are ordinary keyboard-accessible HTML controls.
- **Select the tower:** unfold its five height sections. Foreground city walls block selection of tower surfaces behind them. There are no section tabs on the opening screen.
- **Select a section:** the neighboring floors separate first, the camera approaches on a gentle raised path, then the facade opens before the reading panel settles into place. The scene stays 3D throughout.
- **Hover or focus a room:** preview its furniture and matching marker, with a named “Explore room” cue. Numbered controls and room buttons have 44px targets; captions give way at edges and collisions while the controls remain usable.
- **Select a room marker, room name, or its furniture:** move the camera into a close view, emphasize that room's furniture outlines, and display its portfolio content in a readable panel. On phones the panel sits below the model. Links and the résumé PDF remain normal HTML links.
- **Whole floor:** return to the complete interior while keeping the selected room's information open. Arrow keys, Home, and End also navigate the room names in the panel.
- **Escape:** step back from a room close-up to the whole floor, then to the expanded tower, then to the assembled tower. **Back to tower** returns directly to the expanded structure. Previous / next links move between interiors.

The interiors are distinct: About has a study, grand piano with individual keys, strings and bench, and a conversation area; Projects has development workstations, vented server racks with cables, and a simulation analysis desk and reference library for Poltergeist; Experience has oscilloscopes, probes, circuit boards, network racks, and a Formula-style inspection model; Résumé has document cabinets and reference shelves; Contact has a reception counter and furnished lounge. These are illustrative architectural models; portfolio copy comes from the supplied résumé and project repositories.

All 19 rooms also have paneled backdrops, numbered plaques, framed displays, modeled light fixtures and floor finishes. The study adds a miniature tower, task lamps, a music stand and a language library; the workshop adds prototype tools, network patch panels and simulator controls; the laboratory adds component drawers, test leads, brake hubs and pit tools. The archive has catalogue drawers, brochure trays, drafting instruments and a printer, while the lounge adds a reception terminal, charging dock, tea service and consultation globe. Static details join the existing four surface batches per room, without extra textures, real-time lights or animation. Room floor plates fit the full furnishing footprint.

Close-ups keep other floors hidden and quiet the surrounding rooms, perimeter and core. Hovering another room restores its detail for a preview; Whole floor gradually restores the context. Each room's static primitives are batched by surface material, preserving picking and keeping the sharp floor/close-up model below 45 draws. The complete frame, including an uncached city and blur passes, has a 75-draw test ceiling. Room camera framing fits actual workspace bounds rather than an enclosing sphere.

`#explore` opens the exploded assembly; `#about`, `#projects`, `#experience`, `#resume`, and `#contact` open their interiors directly. Selecting a room adds its stable ID to the URL, for example `#projects/b` opens the Systems lab. **Copy link** copies the current room or floor URL; if clipboard access is unavailable, it reveals a selectable link instead. Browser back / forward and refresh restore the linked view. The document title identifies the selected floor and room.

Transitions can be interrupted and restarted from the current pose. Reduced motion skips camera flights and orbital inertia, including when the preference changes while the site is open. Rendering stops when the scene is still or the tab is hidden. A minute-aligned timer updates scene lighting; a separate DOM-only clock shows the device time each second, with an EST fallback, without redrawing the scene. Hidden clocks catch up on return.

The assembled city and expanded tower remember their own viewing angle and zoom. The first unfold raises the view to show the cut plans; the city and sky blur behind the sharp tower and remain visible through floor and room navigation. The scenery follows the camera in a separate background pass, so nearby buildings cannot cover an unfolded floor. Returning from an interior restores the expanded view; collapsing restores the sharp assembled city view. Outdoor orbit stops above street level, including in short landscape layouts. Reset view restores the default framing for the current mode. Section labels avoid collisions and remain available when their floors move off screen: portrait phones use a fixed five-button dock, and short landscape screens use compact labels. Label leaders follow the projected model anchors and disappear when the anchors are too far away.

Room markers adapt to the available space and avoid piling up at the edges when the model rotates or zooms. A room that is outside the camera view remains available through the panel. Camera framing reserves space for the text panel and heading; short landscape phone screens use a side panel. Phone panels scroll as one reading surface, including their links, with room selection returning to the top. Resizing preserves the viewing angle and relative zoom, including while a room flight is in progress. Multi-touch gestures and drags that return to their starting point cannot accidentally open a section.

**Reading view** is available only inside a section. It opens that section's accessible floor plan over the live 3D scene, with previous/next section navigation. **3D view** returns to the same section, room, and camera without reloading; **Back to tower** returns to the expanded 3D structure. Escape closes the reading view first. The old SVG tower has been removed. If WebGL 2 cannot initialize or its context is lost, a text notice links to the complete portfolio and the corresponding section.

**Full portfolio** opens `reading.html`, a complete text portfolio with all projects, experience, education, skills, activities, contact links, and the résumé PDF. It works without JavaScript, has section anchors and print styles, and is linked from the no-JavaScript entry page. Both pages include share/search metadata using the GitHub Pages address.

Project rooms include personal context, engineering challenges, and image galleries. flowst8 includes the supplied dashboard and wearable images plus the Devpost submission. Poltergeist uses existing project captures; captions distinguish synthetic dashboard demonstrations from the CARLA camera capture. Test-Shell describes source-verified features and learning goals without claiming unrecorded test results. Gallery links open the complete original images, including full-page dashboard captures.

## Edit

- `assets/content.js` and `assets/floor-content.js`: profile, projects, experience, skills, and the rooms containing that information. Keep the existing section IDs and room ordering.
- `assets/tower-geometry.js`: shared tower dimensions, setbacks, footprints, and room positions.
- `assets/city-environment.js`: high-precision local-time sky, analytic sun/moon, fixed stars, terrain, and physical tower glazing. Focused views retain the environment in the blurred backdrop.
- `assets/city-time.js`: visitor-local time state, daily light/color transitions, and one minute-aligned lifecycle-managed clock.
- `assets/city-palette.js`: base city colors and the direction used for baked face/contact shading.
- `assets/city-layout.js`: shared district dimensions, 188 parcels, 197 building lots, park/river plans, six architectural families, solid part descriptors, and actual skyline envelopes. North is the negative Z direction.
- `assets/city-landscape.js`: garden, fountain square and pergola lawn in three static batches.
- `assets/city-outskirts.js`: connected outer streets, gardens, public spaces, woodland and ridges in four shared batches.
- `assets/ground-materials.js`: world-anchored paving, asphalt, grass and water detail with derivative-based distance filtering.
- `assets/interior-details.js`: room backdrops, floor finishes, fixtures and section-specific props, merged by `interiors.js` into the existing room batches.
- `assets/district-ground.js`: batched ground surfaces, sidewalks, street markings, optional drafting layers, and presentation fading, using the shared district plan.
- `assets/district-buildings.js`: the lot-based architecture, supported roof terraces, pitched roofs, facade bays, cornices, parapets, entrances, five shared rendering layers, and presentation fading. All geometry stays within its assigned lot and below the main landmark.
- `assets/district-details.js`: plaza and courtyard furnishings, trees, streetlights, workshop frontage, the vehicle test yard, rooftop details, and their shared presentation fade. The ground module's `appendDraftingText` supplies vector signage without fonts or textures.
- `assets/district-style.js`: baked face washes, camera-relative city depth fading, and the single shared contact-shading mesh.
- `assets/tower-model.js` and `assets/interiors.js`: capped section meshes, structural plates, floor slabs, furniture, and picking targets.
- `assets/cap-plans.js`: schematic cut-face plans, clipped to each inset footprint, with section-specific furniture and presentation fading.
- `assets/scene-3d.js`: the renderer, OrbitControls, room-focused camera framing, continuous transitions, clipping planes, raycasting, and render scheduling.
- `assets/camera-framing.js`: bounds-based assembled city and expanded tower camera framing, with space reserved for navigation.
- `assets/city-waterfront.js`: curved river surface, quays, two bridges, riverside planting, furniture and boats. Its footprint follows the shared river plan; peripheral streets belong to the outskirts module.
- `assets/render-budget.js`: compact/full drawing selection and the shared raster budget.
- `assets/city-backdrop.js`: camera-matched scenery blur, two bounded offscreen targets, cached background reuse, and explicit GPU cleanup. Tower geometry and UI never enter the blurred layer.
- `assets/spatial-layout.js`: the shared visible camera regions, responsive section label placement, and collision-aware room marker placement.
- `assets/spatial-app.js` and `assets/spatial.css`: routes, projected labels, room content, focus management, and responsive presentation. `assets/app.js` is the entry point.
- `assets/routes.js`: shared floor and room URL parsing for 3D and section reading mode.
- `assets/project-story.js` and `assets/project-story.css`: shared stories and galleries for the 3D panels, SVG plans, and reading page. Story entries use `title` / `text`; images use local `src`, descriptive `alt` / `caption`, and original `width` / `height`. Use `preview: 'top'` only for a tall image that needs a cropped thumbnail; the full original remains linked. Keep source images under `assets/projects/`.
- `scripts/reading.mjs` and `assets/reading.css`: the text portfolio generator and styles. After editing shared content, run `npm run reading` to refresh `reading.html`; the check command detects stale content.
- `assets/floor-view.js`, `assets/floor-view.css`, and `assets/floor-plans.js`: section-only reading mode and accessible floor-plan layouts.
- `assets/eric-hsu-resume.pdf`: the résumé download.

## Check

```sh
npm run check
```

This checks syntax, both pages' local assets and anchors, text portfolio synchronization, room URLs, watertight section geometry, city lots/fixtures/roof ownership, selection from all azimuths, distinct furnished rooms, furniture raycasts and geometry budgets, room positions, focus/preview material restoration, and screen/marker layouts. Install development dependencies with npm ci before running the checks.

For DOM and camera integration checks:

```sh
npm ci
npm test
```

The integration harness runs the actual camera controller and OrbitControls with jsdom and a test renderer at desktop and phone dimensions, plus reduced motion and a fresh room deep link. It verifies staged facade entry, city blur and restoration, hidden neighboring floors throughout room flights, foreground city occlusion, independent outdoor camera restoration, responsive section navigation, pointer/keyboard room preview, left-drag controls, room close-ups, highlighting, portrait/landscape framing, resize preservation, gesture rejection, navigation, clipboard success/fallback, content links, cancellation, keyboard input, idle rendering, section reading mode, returning to the retained 3D scene, and the text fallback. It does **not** validate WebGL pixels or replace visual browser testing. Node's VM module warning during these tests is expected.

The harness also simulates initial WebGL failure and hidden-tab suspension. Real GPU budgets, repeated navigation/resize, and disposal can be checked with `scripts/browser-qa.html`; `scripts/accessibility-qa.html` audits settled views using axe after `npm ci`. These are developer checks, excluded from crawler discovery. The repository workflow runs the Node checks on pushes and pull requests.

Local browser QA has covered the assembled and expanded tower, Projects overview and Systems lab close-up, the detailed electronics bench and grand piano, room URL refresh/back/forward, copying a link, and the text portfolio. The updated section reading mode was checked for floor-plan presentation, section navigation, and returning to 3D. Earlier representative layouts were inspected at the default desktop size, 390 × 844 portrait, and 650 × 390 landscape, including phone panel scrolling. This is a representative visual check rather than a device/performance benchmark.

City phase 4 was visually checked at 1280 × 720, with live 390 × 650 portrait and 650 × 390 landscape viewports for the section dock and compact labels. The portrait dock was also used to enter Projects and return to the expanded structure.

City phase 5 was checked at the same desktop and phone viewport sizes for line hierarchy, street markings, face/contact shading, atmospheric fading, and white margins behind navigation. Geometry checks cover upward-facing road marks, street boundaries, opaque surface depth, contact-wash budgets, and material restoration; integration checks cover zoom-relative fading and shading visibility during entry and interrupted returns.

## GitHub Pages

The existing GitHub Pages deployment serves `main` from `/(root)`. Keep that configuration when publishing updates. `.nojekyll` lets GitHub serve the files directly. Keep the vendored modules and local assets committed; `node_modules/` and `.preview/` are ignored.

Committing and pushing publishes changes through the existing GitHub Pages configuration. The `Portfolio checks` workflow validates pushes and pull requests; the [maintenance guide](./MAINTENANCE.md) describes release verification and rollback.

## Current status and historical checkpoints

The palette, bundled tower, complete furnished floors, 197-building city, riverfront and wooded outskirts are implemented. The original drawing quality, bounded raster resolution, full-resolution slight background blur, glass UI, live clock and time-dependent reflections are retained. The current local suite has 76 source tests and five integration modes; release results and device scope belong in [QA.md](./QA.md).

[COLOR-PLAN.md](./COLOR-PLAN.md), [MASSING-PLAN.md](./MASSING-PLAN.md) and [SKYLINE-PLAN.md](./SKYLINE-PLAN.md) preserve the earlier design checkpoints. Their old counts, screenshots and timing results describe those versions. The latest city and reflection evidence is under `state/city-outskirts/` and `state/reflection-time/`. Actual Edge/Safari and physical-phone testing is deferred; simulated Chromium viewports do not replace it.
