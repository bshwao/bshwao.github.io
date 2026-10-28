# Mobile usability

Local implementation and Chromium verification, October 27, 2026.

The subsequent [physical-phone feedback checkpoint](phone-feedback/README.md) supersedes the toolbar placement and zoom behavior described below. It records fixes prompted by the first iPhone review and their local regression results.

## Changes

- Mobile rooms provide Scene, Split and Read views. The scene can remain visible, or the room details can expand without recreating activity controllers or losing live form content.
- Room tabs use larger type and touch targets. Selecting an offscreen tab scrolls it into view. A single content scroll area includes room details, sharing and adjacent-floor links; the view controls and room tabs remain available above it.
- Short phone landscapes reserve a wider side panel. Portrait tablets up to 1000px use the stacked layout. Resizing back to desktop restores content access and moves focus out of controls that become hidden.
- Toolbar labels fit small phones, text fields use at least 16px type, and controls/dialogs account for safe-area insets. The mobile clock sits below the toolbar without the palette swatches; the reading view and introduction also respect the insets.
- Canvas instructions include touch and zoom-button alternatives. Blackjack card containers now have valid named group roles.

## Verification

`npm run check` passes 212 source/server tests and 85 module/reference checks. `npm test` passes all five integration modes: desktop, simulated mobile, reduced motion, fresh room link and unavailable WebGL. New focused regressions cover retained live content, collapsed-content focus exclusion, desktop focus recovery, horizontal tab visibility and camera regions in phone landscape/tablet portrait.

The native [mobile harness](../../scripts/mobile-qa.html) checks actual rendered target sizes, viewport bounds, hit testing, horizontal overflow, selected-room visibility, reachable footer links, all seven games and the four penthouse activities. Reports:

| Viewport | Cases | Result |
| --- | ---: | --- |
| [320×568](usability-320x568.json) | 46 | Pass |
| [390×844](usability-390x844.json) | 46 | Pass |
| [844×390](usability-844x390.json) | 46 | Pass |
| [932×430](usability-932x430.json) | 46 | Pass |
| [768×1024](usability-768x1024.json) | 46 | Pass |
| [568×320 activities](usability-568x320.json) | 17 | Pass |
| [390×844 simulated insets](usability-390x844-safe.json) | 17 | Pass |
| [844×390 simulated insets](usability-844x390-safe.json) | 17 | Pass |

That is 281 usability cases with no runtime errors. Inset tests explicitly simulate 47px top/34px bottom in portrait and 44px side/21px bottom in landscape; they do not establish actual iPhone behavior.

The [automated accessibility sweep](accessibility-390.json) passes all 36 views with no WCAG A/AA rule violations. Its incomplete/manual contrast findings remain available in the report; this is not a manual accessibility certification.

The [844×390 low-graphics WebGL sweep](webgl-landscape.json) passes all 31 views and object responses in all 23 rooms. Peak draws remain 78, idle frames are zero, warmed resources stay stable and GPU disposal completes. These are desktop Chromium render-budget checks, not phone frame-time measurements.

Manual native review checks all three panel states, landscape resizing, return to desktop, and the introduction at 320×568. [Scene](portrait-scene.png), [Split](portrait-split.png), [Read](portrait-read.png), [landscape](landscape-split.png), [small introduction](intro-320.png) and [desktop](desktop-regression.png) captures record the result.

The [city HUD measurement](city-hud.json) also verifies that the refreshed mobile clock overlaps neither the toolbar nor the collapse control. [City entry](city-portrait.png) and [floor selection](floor-selector-portrait.png) captures record the 390px layout.

Physical-phone touch behavior, browser chrome/keyboard behavior, actual device performance and Safari remain to be tested. No deployment is included in this checkpoint.

## Reproduce

Run `npm run check` and `npm test`. With the preview server running, open `/scripts/mobile-qa.html?width=390&height=844`; substitute the dimensions above. Add `&activities=1` for the short activity-only run and `&safe=1` to simulate the documented insets. `/scripts/accessibility-qa.html?width=390&height=844` runs the accessibility sweep. The existing device harness remains available for later physical-device measurements.
