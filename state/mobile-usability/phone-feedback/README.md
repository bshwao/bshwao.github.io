# Mobile touch feedback

Local fixes and Chromium verification, October 27, 2026, following the user's first physical iPhone/Safari review.

## Changes

- The scene, navigation chrome and device-test iframe suppress native text selection and iOS touch callouts. Room reading content, activity dialogs, inputs and notes retain native text selection. Controls inside those surfaces remain unselectable.
- The mobile clock and camera controls share a top row. Settings uses a named slider icon, the back action occupies the left corner on floors, and the floor heading is smaller. Scene/Split/Read remains in the bottom panel; the duplicate top Read button is hidden on mobile. City actions occupy one bottom area with a small name badge.
- Touch orbit speed is 0.3, compared with 0.65 for the mouse; its damping settles faster. Each pointer start selects its own settings, including when switching between touch and mouse on the same device.
- Mobile tower distance ranges from 28% of fitted distance (with a 45-unit lower bound) to 160%. Expanded floors use 40–145%; floor interiors use 40–145%; focused rooms use 35–145%. These limits apply to buttons, keys, wheel and pinch and are reapplied after orientation changes. Desktop retains its island overview.

## Verification

All 213 source/server tests and 85 module/reference checks pass. Desktop, mobile, reduced-motion, direct-room-link and unavailable-WebGL integration modes pass. Mobile integration compares the same actual OrbitControls drag under touch and mouse, restores mouse sensitivity after touch, and checks real camera boundaries on every floor and room. The forced-distance clearance test now verifies the mobile city stop; desktop still tests clearance at distant mountain regions.

The rendered mobile harness checks 44px targets, viewport bounds, hit testing, non-overlapping chrome, horizontal overflow, selection styles, native notes selection, reachable footer navigation, all games and activities, and both city zoom stops.

| Viewport | Cases | Report |
| --- | ---: | --- |
| Portrait 390×844 | 49 | [Pass](390x844.json) |
| Landscape 844×390 | 49 | [Pass](844x390.json) |
| Small phone 320×568 | 20 | [Pass](320x568.json) |
| Embedded view 390×520 | 20 | [Pass](390x520.json) |
| Portrait with simulated safe insets | 20 | [Pass](390x844-safe.json) |
| Landscape with simulated safe insets | 20 | [Pass](844x390-safe.json) |

That is 178 rendered cases with no runtime errors. The separate [settings/control harness](view-controls.json) passes eight phone/desktop layouts, including open settings, controls hints and low graphics. [Floor selection](floor-selector.png) and [room controls](room-controls.png) show the revised portrait layout.

The reported selection problem also involved the embedding test page, so both the app and its iframe shell are protected. For the next phone review, refresh the device page and use **Open full portfolio** to test the full-height site, then check the embedded preview as well. Confirm long presses, ordinary taps, slow orbiting, pinch limits and orientation changes. Native Safari touch/callout behavior still requires that physical recheck; these are Chromium and DOM/camera results.
