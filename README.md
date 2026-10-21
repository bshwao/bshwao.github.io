# Eric Hsu — Structures & systems

A personal portfolio built for GitHub Pages, presented as a real, interactive 3D blueprint skyscraper. The blue linework, white surfaces, stepped wings, and needle spire are procedural geometry, viewable from every side. Selecting the tower separates five closed, solid sections; selecting a section moves the same camera toward it while the facade is cut away to reveal an inhabited architectural model.

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
- **Select the tower:** unfold its five height sections. There are no section tabs on the opening screen.
- **Select a section:** the neighboring floors separate first, the camera approaches on a gentle raised path, then the facade opens before the reading panel settles into place. The scene stays 3D throughout.
- **Hover or focus a room:** preview its furniture and matching marker, with a named “Explore room” cue. Numbered controls and room buttons have 44px targets; captions give way at edges and collisions while the controls remain usable.
- **Select a room marker, room name, or its furniture:** move the camera into a close view, emphasize that room's furniture outlines, and display its portfolio content in a readable panel. On phones the panel sits below the model. Links and the résumé PDF remain normal HTML links.
- **Whole floor:** return to the complete interior while keeping the selected room's information open. Arrow keys, Home, and End also navigate the room names in the panel.
- **Escape:** step back from a room close-up to the whole floor, then to the expanded tower, then to the assembled tower. **Back to tower** returns directly to the expanded structure. Previous / next links move between interiors.

The interiors are distinct: About has a study, grand piano with individual keys, strings and bench, and a conversation area; Projects has development workstations, vented server racks with cables, and a simulation analysis desk and reference library for Poltergeist; Experience has oscilloscopes, probes, circuit boards, network racks, and a Formula-style inspection model; Résumé has document cabinets and reference shelves; Contact has a reception counter and furnished lounge. These are illustrative architectural models; portfolio copy comes from the supplied résumé and project repositories.

Close-ups keep other floors hidden and quiet the surrounding rooms, perimeter and core. Hovering another room restores its detail for a preview; Whole floor gradually restores the context. Each room's static primitives are batched by surface material, preserving picking while limiting the detailed interiors to 21–26 draw calls per floor. Room camera framing fits actual workspace bounds rather than an enclosing sphere.

`#explore` opens the exploded assembly; `#about`, `#projects`, `#experience`, `#resume`, and `#contact` open their interiors directly. Selecting a room adds its stable ID to the URL, for example `#projects/b` opens the Systems lab. **Copy link** copies the current room or floor URL; if clipboard access is unavailable, it reveals a selectable link instead. Browser back / forward and refresh restore the linked view. The document title identifies the selected floor and room.

Transitions can be interrupted and restarted from the current pose. Reduced motion skips camera flights and orbital inertia, including when the preference changes while the site is open. Rendering stops when the scene is still or the tab is hidden.

Room markers adapt to the available space and avoid piling up at the edges when the model rotates or zooms. A room that is outside the camera view remains available through the panel. Camera framing reserves space for the text panel and heading; short landscape phone screens use a side panel. Phone panels scroll as one reading surface, including their links, with room selection returning to the top. Resizing preserves the viewing angle and relative zoom, including while a room flight is in progress. Multi-touch gestures and drags that return to their starting point cannot accidentally open a section.

**Reading view** is available only inside a section. It opens that section's accessible floor plan over the live 3D scene, with previous/next section navigation. **3D view** returns to the same section, room, and camera without reloading; **Back to tower** returns to the expanded 3D structure. Escape closes the reading view first. The old SVG tower has been removed. If WebGL 2 cannot initialize or its context is lost, a text notice links to the complete portfolio and the corresponding section.

**Full portfolio** opens `reading.html`, a complete text portfolio with all projects, experience, education, skills, activities, contact links, and the résumé PDF. It works without JavaScript, has section anchors and print styles, and is linked from the no-JavaScript entry page. Both pages include share/search metadata using the GitHub Pages address.

Project rooms include personal context, engineering challenges, and image galleries. flowst8 includes the supplied dashboard and wearable images plus the Devpost submission. Poltergeist uses existing project captures; captions distinguish synthetic dashboard demonstrations from the CARLA camera capture. Test-Shell describes source-verified features and learning goals without claiming unrecorded test results. Gallery links open the complete original images, including full-page dashboard captures.

## Edit

- `assets/content.js` and `assets/floor-content.js`: profile, projects, experience, skills, and the rooms containing that information. Keep the existing section IDs and room ordering.
- `assets/tower-geometry.js`: shared tower dimensions, setbacks, footprints, and room positions.
- `assets/tower-model.js` and `assets/interiors.js`: capped section meshes, structural plates, floor slabs, furniture, and picking targets.
- `assets/scene-3d.js`: the renderer, OrbitControls, room-focused camera framing, continuous transitions, clipping planes, raycasting, and render scheduling.
- `assets/spatial-layout.js`: the shared visible camera region and collision-aware room marker placement.
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

The integration harness runs the actual camera controller and OrbitControls with jsdom and a test renderer at desktop and phone dimensions, plus reduced motion and a fresh room deep link. It verifies staged facade entry, hidden neighboring floors throughout room flights, pointer/keyboard room preview, left-drag controls, room close-ups, highlighting, portrait/landscape framing, resize preservation, gesture rejection, navigation, clipboard success/fallback, content links, cancellation, keyboard input, idle rendering, section reading mode, returning to the retained 3D scene, and the text fallback. It does **not** validate WebGL pixels or replace visual browser testing. Node's VM module warning during these tests is expected.

Local browser QA has covered the assembled and expanded tower, Projects overview and Systems lab close-up, the detailed electronics bench and grand piano, room URL refresh/back/forward, copying a link, and the text portfolio. The updated section reading mode was checked for floor-plan presentation, section navigation, and returning to 3D. Earlier representative layouts were inspected at the default desktop size, 390 × 844 portrait, and 650 × 390 landscape, including phone panel scrolling. This is a representative visual check rather than a device/performance benchmark.

## GitHub Pages

Push this repository and use **Settings → Pages → Deploy from a branch**, selecting the intended branch and `/(root)`. `.nojekyll` lets GitHub serve the files directly. Keep the vendored modules and local assets committed; `node_modules/` and `.preview/` are ignored.

These edits are prepared locally. Committing and pushing publishes them through the existing GitHub Pages configuration.
