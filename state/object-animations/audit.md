# Room object animation verification

Goal: Add hover and click animations to various objects inside all rooms.

| Requirement | Current evidence |
| --- | --- |
| Every room participates | All five floors and all 19 rooms have 14–29 named targets each, totaling 363. Each of the three `webgl-*.json` reports contains all 19 `objectChecks`. |
| Hover animates individual objects | `interiors.test.mjs` exercises every target's isolated highlight. `spatial.test.mjs` raycasts actual solid faces and sends pointer hover in all 19 close-ups, checking the object identity and named hint. |
| Click animates individual objects | Every target is activated and restored in the source tests; piano key motion, plant sway, isolation, retriggering and reduced motion are inspected. The WebGL harness activates all objects in each room and verifies actual animation frames. |
| Existing navigation works | The five integration modes cover room routes, camera framing, dragging, touch gestures, reading views, history, context loss and idle rendering. Every close-up checks that object clicks preserve its route and do not restart the camera; dragging does not activate an object. |
| Keyboard and motion preferences work | Each target has a named native button in its room's disclosure. Focus/activation are tested in every room; reduced-motion source and integration checks pass. Native Enter activation was manually verified on the Grand piano button with the correct hint and unchanged `#about/c` route. |
| Animation remains bounded | The WebGL reports show no resource growth during interaction, no frames after settling or while holding a settled hover, stable navigation/resize allocations and complete geometry/texture disposal. Peak draws are 84 desktop, 82 portrait and 82 landscape, within the unchanged ceilings. |
| Rendered UI and accessibility verified | `piano-interaction.png` shows the finished model, warm piano highlight, named controls and matching hint. `accessibility-desktop.json` passes 14 views, including expanded object controls, with no automated WCAG A/AA violations. Production warning/error logs are empty. |

`check.log`: 50 syntax/reference checks, generated theme/reading checks and 78 source tests pass. `integration.log`: desktop, mobile, reduced-motion, fresh-room-link and unavailable-WebGL modes pass. WebGL reports cover 1280×720/day, 390×844/requested DPR 3/night and 844×390/requested DPR 3/day, with all 19 room animations checked in each run. Viewport simulations do not establish physical-phone performance. This change remains local; no deployment was requested or performed.
