# Tower Rubber-Band Motion

Local implementation checkpoint, October 26, 2026. This updates the earlier tower motion recorded in `state/spatial-motion/`.

Expanding the tower now has a short anticipation beat, an 18% positional overshoot, a smaller recoil, and an exact final settle. The crown leads the cascade. Collapse lands from the base upward and rebounds outward/upward before coming to rest. A vertical clearance pass transfers the landing bounce up the stack so floors never pass through the section below them.

The effect applies to the outdoor tower/exploded-view toggle. Camera travel and room transitions retain their smooth motion. Resize continues from the current pose without replaying the bounce, and reduced motion skips the effect. The animation remains finite at 1,300 ms, adds no geometry or textures, and leaves no residual displacement or idle animation.

| Check | Result | Evidence |
| --- | --- | --- |
| Source and HTTP server tests | 201 passed | `source-check.txt` |
| Syntax and local references | 82 modules passed | `source-check.txt` |
| Motion unit tests | 11 passed | `motion-check.txt` |
| DOM/camera integration | All five modes passed | `integration-check.txt` |

New tests check anticipation, bounded overshoot, recoil, exact endpoints, the ordering of the cascade, actual crown overshoot in the scene, upward landing rebound, floor clearance throughout collapse, and complete restoration of assembled transforms. Existing coverage retains cancellation, saved camera poses, room flights, resize, reduced motion, and idle rendering.

Native browser review exercised both toggles in the production page. The six PNG captures show intermediate and settling states; `capture-timing.json` records their surrounding screenshot sample times. These captures document the motion states rather than benchmark frame rate. `console.json` records the browser warning/error check.
