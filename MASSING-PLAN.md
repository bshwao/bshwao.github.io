# Tower shape redesign plan

Status: all four phases complete locally (2026-10-22). The asymmetric shell, shared floor layouts, furnished interiors, cameras, cut/reading drawings, natural materials, and sharing card are implemented. Verification is indexed in `state/massing-qa.json`; changes remain unpublished.

## Direction

Replace the three-lobed, nearly rotationally symmetric flower plan with an **asymmetric stepped tower**. Use an elongated main volume, one shorter attached side wing, and a recessed service core. Favor a stepped rectangular or L-shaped plan with a few chamfered/rounded corners. Carry a clear vertical spine upward, with unequal setbacks and an off-center crown.

Keep the warm architectural drawing style, quiet glazing/stone materials, the five portfolio sections, furnished rooms, and the surrounding district. The new silhouette should feel designed from a few connected volumes, rather than from three repeated petals or random bumps.

## Implementation sequence

| Step | Work | Complexity | Completion evidence |
| --- | --- | --- | --- |
| 1. Massing study | Create a simple neutral blockout of the recommended main-volume/side-wing/core arrangement. Tune the base, mid-height setbacks, and crown together. | Moderate | Top, front, side, and three-quarter views; the silhouette and floor plate no longer repeat every 120 degrees. |
| 2. Shared footprint | Replace the Gaussian wing-radius outline with explicit floor-plate polygons and height-dependent setbacks. Keep consistent perimeter ordering and closed cap/side surfaces. | High | Assembled and exploded models remain watertight, with no self-intersections, floating terraces, or overlapping cut faces. |
| 3. Floors and navigation | Derive usable room regions, station positions, cut-plan walls/furniture, and bounds from the new footprint. Update camera fits, labels, picking, and reading-plan outlines together. | High | Every floor and room is furnished inside its new boundary and reachable on desktop and both phone orientations. |
| 4. Material and performance pass | Map the continuous facade materials onto the new elevations; inspect setbacks, roof surfaces, transitions, and full-quality rendering. Refresh sharing artwork after the shape settles. | Moderate | Rotation/zoom show stable colors and depth, resource/disposal checks pass, and final comparison screenshots document the new shape. |

## Geometry and layout decisions

- Establish a small set of deliberate floor profiles rather than subtracting arbitrary lobes from the current radial function. Start with profiles that contain the service core and have no holes; this keeps caps and cut drawings straightforward.
- Make the primary volume visibly longer than the side wing. Their widths, alignment, and setback heights must differ. Keep the tower inside its existing plaza clearance and approximately its current overall height.
- Preserve a consistent correspondence between perimeter samples at adjacent heights. Build explicit horizontal setback ledges and closed walls instead of connecting mismatched corners across a gap.
- Introduce one shared floor-layout description for the outline, occupied regions, core, and room anchors. Replace the current three-spoke station placement with positions suited to the actual new floor plate.
- Keep existing section IDs, room IDs, deep links, content, keyboard behavior, and reading/fallback entry points. Update the schematic reading drawings where their outline or room placement would otherwise contradict the new model.
- Fit cameras from the new corner/extrema and furniture bounds, rather than assuming the current flower radius. Recheck every view during intermediate transitions, not just its final camera pose.

## Likely implementation areas

`assets/tower-geometry.js` owns the explicit floor profiles, occupied rectangles, aligned service core, and room anchors. These drive `tower-model.js`, `interiors.js`, `cap-plans.js`, `camera-framing.js`, `floor-plans.js`, and `floor-view.js`. `facade-materials.js` retains continuous material zones with deterministic physical-bay variation. The social card has been regenerated from the completed model.

## Acceptance gates

- The top view has a clear main volume and unequal attached volumes; it does not read as a symmetrical flower.
- The tower remains convincing from every orbit angle, with intentional setbacks and a coherent crown.
- All five exposed cuts, caps, rooms, and furniture fit the same shared geometry. No regression to the stray cross-section lines or competing roof/cut surfaces already fixed.
- Natural material colors stay stable during orbit, unfolding, isolation, and returning to the assembled tower.
- Preserve original viewport-based graphics quality, the raster cap, cached label measurements, idle/background suspension, and stable GPU allocation/disposal. Additional geometry/draw costs require a recorded comparison.
- Check desktop, portrait, and short landscape layouts, keyboard navigation, deep links, reading mode, context loss, and fallback. Distinguish simulated viewports from actual Edge/iPhone measurements.

## Completion evidence

1. **Massing study:** seven deliberate, nested profiles form a chamfered L base, unequal setbacks, and an offset lantern/needle at the original 110-unit height. `scripts/massing-qa.html` shows the production shell in neutral top, front, side, and three-quarter views. See `state/massing-views/neutral-study.jpg`.
2. **Shared footprint:** all detail levels retain the actual polygon corners. Vertical walls and horizontal polygon-difference terraces replace the radial lobes. Tests prove nested nonintersecting plates, exact exposed terrace area, upward normals, no degenerate shell faces, and closed cap/shell edge topology. Face normals and terrace linework avoid diagonal roof shading and competing surfaces.
3. **Floors/navigation:** all 19 rooms fit separate occupied regions with uniformly scaled furniture and clear circulation/core space. The elevator/stair core stays aligned between occupied floors. Rails use inward edge offsets at the L recess. Cut drawings and reading maps use the same outlines, room counts, and anchors; reading cards remain readable beneath the map. Original routes, keyboard/picking behavior, content, history, and fallback remain covered. Actual slab/furniture extrema drive the cameras; integration checks inspect destination furniture at 25/50/75% of room flights, late floor entries, and both phone orientations.
4. **Materials/performance:** stable glazing/stone colors follow the new elevations. Assembled tower/explore draws remain 56/70 on desktop; tower triangles decrease from 33,362 to 23,578. Complete interior geometry increases by 768 triangles (3.2%) for the additional shared cores/room enclosures, with batched stairs limiting draws. Real WebGL resource/disposal checks, accessibility, frame timing, and deliberate slow-frame quality retention are recorded in `state/massing-views/`. The inspected sharing card is 1280 × 720.

All results are local Chromium/WebGL and simulated viewport measurements. Actual Edge and physical iPhone checks remain separate; no publication is implied.
