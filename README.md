# Eric Hsu — Structures & systems

A personal portfolio built for GitHub Pages, presented as a real, interactive 3D blueprint skyscraper. The local multicolor redesign uses graphite linework, ivory structure, teal glazing, muted architectural accents, stepped wings, and a needle spire, all procedural geometry viewable from every side. Selecting the tower separates five closed, solid sections; selecting a section moves the same camera toward it while the facade is cut away to reveal an inhabited architectural model.

The tower stands on a world-space blueprint master plan: a fading drafting grid, central plaza, streets, sidewalks, crosswalks, twelve numbered parcels, surveying marks, a dimension chain, and a north arrow. The opening camera fits the tower and surrounding parcels into the available screen area; portrait phones keep the tower and plaza prominent with the outer district as context. Low-rise apartments, stepped offices, gabled and sawtooth workshops, and campus buildings fill the twelve parcels. Open courtyards, varied rooflines, and generous setbacks keep the skyscraper prominent. White surfaces and pale blue elevations are batched into five rendering layers for the whole district. The plan, buildings, and landscaping quiet during expansion, clear before the interior facade opens, and return near the end of the trip back to the tower. Dimensions use illustrative model units rather than surveyed real-world measurements.

The district includes four planted plaza corners, a furnished campus quad and residential courtyard, 24 trees, 12 benches, eight streetlights, and restrained rooftop equipment and panel banks. An MFE / LAB workshop has a roller door, canopy, and outdoor workbenches. A second workshop is a support garage beside a Poltergeist test loop with a static Formula-style car and a sensor-equipped test vehicle. These are illustrative references, not simulated driving demonstrations. Parcel numbers sit in the margins so they stay clear of occupied courtyards and the test yard. All character details use six shared rendering layers and add no ongoing animation or lighting loop.

The city drawing separates stronger building edges and curbs from lighter facade, paving, and grid lines. Lane dashes, stop bars, travel arrows, and striped plaza crossings have actual surface width. Baked warm face washes and one shared mesh of soft contact shading anchor buildings, trees, and the tower. Camera-relative atmospheric fading quiets the far side as the view rotates and zooms, while the tower retains its own ink contrast. The screen margins fade toward warm paper behind the navigation. These effects use local geometry, vertex colors, and a small material shader extension; no textures, shadow maps, or postprocessing are needed. The city and its shading clear together during interior entry.

Internal tower plates share one draw per section, and room construction reuses box/cylinder geometry before batching. Small or short viewports use a lighter tower drawing and omit the minor grid and fine city strokes; the full solid profiles, cut-face plans, landmarks, furniture, and picking remain available. Phone drawing uses less than half the tower line segments of desktop. Raster work is capped at 2.4 million pixels, with a 1.35 pixel-ratio cap on compact screens and 1.75 on desktop. Detail restores automatically on resize, and inactive room styling avoids repeated material work.

Exposed cuts in the expanded tower carry schematic floor plans: inset walls, wing partitions with door swings, a lift/stair core, and section-specific furniture. Upper and lower cut faces are detailed, so the plans remain attached when viewed from above or below. The spire retains its pointed top; its broad lower cut carries About's plan. The drawings fade before the full interior opens and remain hidden on the assembled tower. Each section uses two batched line layers with no extra fonts, textures, or interactive controls.

See [the project roadmap](./ROADMAP.md) for phase completion and release verification.
See [the maintenance guide](./MAINTENANCE.md) for content updates, browser QA, sharing artwork, releases, and rollback.
See [the release verification](./QA.md) for measured WebGL budgets, accessibility results, and test scope.

## Preview

With Node.js 20.11 or newer:

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

Close-ups keep other floors hidden and quiet the surrounding rooms, perimeter and core. Hovering another room restores its detail for a preview; Whole floor gradually restores the context. Each room's static primitives are batched by surface material, preserving picking while limiting the detailed interiors to 21–26 draw calls per floor. Room camera framing fits actual workspace bounds rather than an enclosing sphere.

`#explore` opens the exploded assembly; `#about`, `#projects`, `#experience`, `#resume`, and `#contact` open their interiors directly. Selecting a room adds its stable ID to the URL, for example `#projects/b` opens the Systems lab. **Copy link** copies the current room or floor URL; if clipboard access is unavailable, it reveals a selectable link instead. Browser back / forward and refresh restore the linked view. The document title identifies the selected floor and room.

Transitions can be interrupted and restarted from the current pose. Reduced motion skips camera flights and orbital inertia, including when the preference changes while the site is open. Rendering stops when the scene is still or the tab is hidden.

The assembled city and expanded tower remember their own viewing angle and zoom. Returning from an interior restores the expanded view; collapsing restores the assembled city view. Reset view restores the default framing for the current mode. Section labels avoid collisions and remain available when their floors move off screen: portrait phones use a fixed five-button dock, and short landscape screens use compact labels. Label leaders follow the projected model anchors and disappear when the anchors are too far away.

Room markers adapt to the available space and avoid piling up at the edges when the model rotates or zooms. A room that is outside the camera view remains available through the panel. Camera framing reserves space for the text panel and heading; short landscape phone screens use a side panel. Phone panels scroll as one reading surface, including their links, with room selection returning to the top. Resizing preserves the viewing angle and relative zoom, including while a room flight is in progress. Multi-touch gestures and drags that return to their starting point cannot accidentally open a section.

**Reading view** is available only inside a section. It opens that section's accessible floor plan over the live 3D scene, with previous/next section navigation. **3D view** returns to the same section, room, and camera without reloading; **Back to tower** returns to the expanded 3D structure. Escape closes the reading view first. The old SVG tower has been removed. If WebGL 2 cannot initialize or its context is lost, a text notice links to the complete portfolio and the corresponding section.

**Full portfolio** opens `reading.html`, a complete text portfolio with all projects, experience, education, skills, activities, contact links, and the résumé PDF. It works without JavaScript, has section anchors and print styles, and is linked from the no-JavaScript entry page. Both pages include share/search metadata using the GitHub Pages address.

Project rooms include personal context, engineering challenges, and image galleries. flowst8 includes the supplied dashboard and wearable images plus the Devpost submission. Poltergeist uses existing project captures; captions distinguish synthetic dashboard demonstrations from the CARLA camera capture. Test-Shell describes source-verified features and learning goals without claiming unrecorded test results. Gallery links open the complete original images, including full-page dashboard captures.

## Edit

- `assets/content.js` and `assets/floor-content.js`: profile, projects, experience, skills, and the rooms containing that information. Keep the existing section IDs and room ordering.
- `assets/tower-geometry.js`: shared tower dimensions, setbacks, footprints, and room positions.
- `assets/district-ground.js`: district master-plan dimensions and parcel bounds, plus batched ground surfaces, linework, vector annotations, and presentation fading. North is the negative Z direction. Buildings use the shared `districtPlan.parcels` bounds.
- `assets/district-buildings.js`: the twelve parcel-based building schemes, solid massing, roofs, facade bays, shared rendering layers, and presentation fading. Buildings stay below 17 units and retain at least five units of clearance inside their parcels.
- `assets/district-details.js`: plaza and courtyard furnishings, trees, streetlights, workshop frontage, the vehicle test yard, rooftop details, and their shared presentation fade. The ground module's `appendDraftingText` supplies vector signage without fonts or textures.
- `assets/district-style.js`: baked face washes, camera-relative city depth fading, and the single shared contact-shading mesh.
- `assets/tower-model.js` and `assets/interiors.js`: capped section meshes, structural plates, floor slabs, furniture, and picking targets.
- `assets/cap-plans.js`: schematic cut-face plans, clipped to each inset footprint, with section-specific furniture and presentation fading.
- `assets/scene-3d.js`: the renderer, OrbitControls, room-focused camera framing, continuous transitions, clipping planes, raycasting, and render scheduling.
- `assets/camera-framing.js`: bounds-based assembled city and expanded tower camera framing, with space reserved for navigation.
- `assets/render-budget.js`: compact/full drawing selection and the shared raster budget.
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

This checks syntax, both pages' local assets and anchors, text portfolio synchronization, room URLs, watertight section geometry, selection from all azimuths, distinct furnished rooms, furniture raycasts and geometry budgets, room positions, focus/preview material restoration, and screen/marker layouts. No development dependencies are needed for these checks.

For DOM and camera integration checks:

```sh
npm ci
npm test
```

The integration harness runs the actual camera controller and OrbitControls with jsdom and a test renderer at desktop and phone dimensions, plus reduced motion and a fresh room deep link. It verifies staged facade entry and city clearance, hidden neighboring floors throughout room flights, foreground city occlusion, independent outdoor camera restoration, responsive section navigation, pointer/keyboard room preview, left-drag controls, room close-ups, highlighting, portrait/landscape framing, resize preservation, gesture rejection, navigation, clipboard success/fallback, content links, cancellation, keyboard input, idle rendering, section reading mode, returning to the retained 3D scene, and the text fallback. It does **not** validate WebGL pixels or replace visual browser testing. Node's VM module warning during these tests is expected.

The harness also simulates initial WebGL failure and hidden-tab suspension. Real GPU budgets, repeated navigation/resize, and disposal can be checked with `scripts/browser-qa.html`; `scripts/accessibility-qa.html` audits settled views using axe after `npm ci`. These are developer checks, excluded from crawler discovery. The repository workflow runs the Node checks on pushes and pull requests.

Local browser QA has covered the assembled and expanded tower, Projects overview and Systems lab close-up, the detailed electronics bench and grand piano, room URL refresh/back/forward, copying a link, and the text portfolio. The updated section reading mode was checked for floor-plan presentation, section navigation, and returning to 3D. Earlier representative layouts were inspected at the default desktop size, 390 × 844 portrait, and 650 × 390 landscape, including phone panel scrolling. This is a representative visual check rather than a device/performance benchmark.

City phase 4 was visually checked at 1280 × 720, with live 390 × 650 portrait and 650 × 390 landscape viewports for the section dock and compact labels. The portrait dock was also used to enter Projects and return to the expanded structure.

City phase 5 was checked at the same desktop and phone viewport sizes for line hierarchy, street markings, face/contact shading, atmospheric fading, and white margins behind navigation. Geometry checks cover upward-facing road marks, street boundaries, opaque surface depth, contact-wash budgets, and material restoration; integration checks cover zoom-relative fading and shading visibility during entry and interrupted returns.

## GitHub Pages

Push this repository and use **Settings → Pages → Deploy from a branch**, selecting the intended branch and `/(root)`. `.nojekyll` lets GitHub serve the files directly. Keep the vendored modules and local assets committed; `node_modules/` and `.preview/` are ignored.

Committing and pushing publishes changes through the existing GitHub Pages configuration. The `Portfolio checks` workflow validates pushes and pull requests; the [maintenance guide](./MAINTENANCE.md) describes release verification and rollback.

## Multicolor working-tree status

The shared palette lives in `assets/color-theme.js`; `npm run theme` generates the script-free CSS tokens and icon. `assets/color-system.css` applies material and section roles throughout the main, reading, and fallback experiences. All five redesign phases are complete locally. Source/integration tests, 39 accessibility views, responsive and color-vision review, real WebGL budgets/disposal, and frame/adaptive-quality checks pass. See `COLOR-PLAN.md`, `QA.md`, and `state/multicolor-qa.json` for evidence and machine-specific limitations. The redesign and preceding adaptive-performance work are release-ready and have not been published.
