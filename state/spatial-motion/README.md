# Tower and Room Motion

Local implementation checkpoint, October 26, 2026.

## Changes

- Floors unfold in a short top-down cascade and reassemble from the base upward, without spring overshoot.
- Cameras follow a shallow orbital arc around the moving target. Viewing angles take the shortest route and zoom uses logarithmic distance interpolation.
- Direct room links open the floor and approach the room in one 1,850 ms sequence, removing the previous separate 760 ms camera move after entry.
- Room-to-room moves blend the actual room-surface colors, preserving the current palette and camera pose when interrupted. The replacement camera path retains a bounded amount of incoming motion.
- Resize continues from the rendered pose without replaying the architectural reveal or reintroducing surrounding floors. The furniture framing correction ramps into newly selected bounds to avoid a first-frame snap during late entry retargets.
- Room text has a short fade/slide entrance. Reduced motion completes the 3D transition immediately and cancels the text entrance effect.

No geometry, texture, lighting, camera destination, or render budget was added. Saved outdoor views, hard zoom limits, furniture containment, route history, cancellation, and idle rendering remain covered by regression checks.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Source/server suite | 199 passed | `source-check.txt` |
| Syntax and local references | 82 modules passed | `source-check.txt` |
| Motion/interior unit checks | 17 passed | `motion-check.txt` |
| Desktop integration | Passed, including new continuity assertions | `retarget-desktop.txt` |
| Mobile integration | Passed, including new continuity assertions | `retarget-mobile.txt` |
| Reduced motion | Passed | `retarget-reduced.txt` |
| Direct room link integration | Passed | `retarget-deep-link.txt` |
| WebGL failure recovery | Passed; simulated failure message is expected | `retarget-no-webgl.txt` |
| Desktop WebGL, 1280×720 | All 31 views, budgets, idle, resource stability, and disposal passed | `webgl-desktop.json` |
| Simulated portrait WebGL, 390×844 | All 31 views, budgets, idle, resource stability, and disposal passed | `webgl-portrait.json` |
| Production and WebGL harness consoles | No warnings or errors | `console.json` |

The new integration assertions require direct room entry to follow `scene → idle`, with no second room flight. They compare camera position, orientation, and actual room material colors synchronously and on the first replacement frame; verify intermediate color blending; and check final room framing. A late same-floor room change during section entry is also covered. Existing coverage exercises resize, hidden-page suspension, cancellation, restored camera views, reduced motion, and idle rendering.

Native browser review opened and closed the tower, entered Projects, and focused its simulation room. The PNG files record the unfolding, floor overview, room approach, and final arrival. Static captures document individual states rather than animation timing. Responsive browser checks simulate Chromium layouts; physical-device and other-engine testing remain separate work.

## Reproduction

Run `npm run check` and `npm test`. For visual review, serve the repository, unfold the tower, open a floor, and switch between room controls. Use a direct route such as `#projects/b` to verify the continuous entry. The browser sweeps are available at:

```text
/scripts/browser-qa.html?width=1280&height=720
/scripts/browser-qa.html?width=390&height=844
```
