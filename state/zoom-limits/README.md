# Camera Zoom Limits — Verification

## Scope

This checkpoint verifies near and far zoom limits for the city, expanded tower, floors, and room close-ups. Bounds adapt to the viewport and allow scripted camera flights to complete before user limits resume.

At this checkpoint, the city near limit is 55% of its fitted distance, with a minimum of 140 model units; its far limit fits the island. The expanded tower uses 65–220% of its fitted distance. Floor and room near limits vary with their radius, with far limits of 190% and 180%, respectively.

## Recorded results

| Artifact | Coverage |
| --- | --- |
| [check.txt](check.txt) | 104 source tests, 60 module/reference checks, and generated-file checks |
| [integration.txt](integration.txt) | Five integration modes; input methods, endpoints, resize, and idle behavior |
| [webgl-desktop.json](webgl-desktop.json), [webgl-phone-low.json](webgl-phone-low.json) | 26 views, eight endpoint checks, 19 object-response checks, resource reuse, and disposal |
| [ui-endpoints.json](ui-endpoints.json) | Inspection bay endpoint distances and disabled zoom buttons |
| [production-console.json](production-console.json) | No warnings or errors recorded |

The PNG captures show city and room views at both zoom limits.

These measurements describe this checkpoint. Phone coverage uses simulated Chromium viewports. See [QA.md](../../QA.md) for subsequent verification.
