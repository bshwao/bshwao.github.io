# Wall and texture polish audit

Goal: polish wall textures across all walls, remove overlapping surfaces and smooth the other scene textures. Reference: the supplied screenshot's circled perimeter/corner joints on the Projects floor.

| Requirement | Evidence |
| --- | --- |
| Correct the marked corner joins on all floors | Intersecting chamfer posts are consolidated and tall/low rail junctions retain full-height support. The structural regression rejects overlapping post footprints on every floor. `projects-reverse.png` shows the same side of the workshop as the reference. |
| No competing wall surfaces | The fixed architecture and all 19 paneled backdrops are built from exposed box skins with deterministic ownership of coplanar joins. Tests independently intersect the actual rendered triangles in their common plane and reject positive-area overlaps. Duplicate, touching and intersecting solids also match their analytic exposed surface areas. |
| Smooth, consistent outlines and finishes | Internal face seams are omitted; collinear/repeated/partially overlapping guide and outline strokes are merged. The regression checks the rendered architectural line buffers on all five floors. Hall finishes are above the slab, and physical raycasts verify the finish while allowing raised door thresholds. |
| Polish the remaining procedural textures | Window masks use screen derivatives and a stable subpixel average. Paving variation, grass detail and water ripples fade before their frequencies become unresolved. `exterior-filtered.png` and the real WebGL runs exercise these materials. No new raster textures or idle effects were introduced. |
| Preserve the full site and interactions | `check.log` passes 51 syntax/reference checks, theme/reading generation checks and 81 source tests. `integration.log` passes all five modes. Every WebGL report covers 26 scene views, all 19 room close-ups and all 363 object responses, with unchanged draw/raster ceilings, resource reuse, idle suspension and GPU disposal. |
| Verify the actual appearance | Settled screenshots cover About, Projects, Experience, Résumé and Contact. The workshop is inspected from the reverse angle and the assembled exterior is reviewed. Production and WebGL warning/error logs are empty. |

`inventory.json` records current room/post/triangle/outline/object counts. The three `webgl-*.json` reports were saved after their page reported PASS. Desktop peak draws: 84; portrait: 82; landscape: 82. Each records zero idle frames over 250ms. Viewport simulations are not physical-phone performance measurements. No deployment was requested or performed. A separate server on port 4175 was used so the user's normal 4173 preview was left alone.
