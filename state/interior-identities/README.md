# Interior Design — Verification

**Checkpoint:** October 25, 2026.

## Scope

All six floors and 23 rooms received individual palettes, architectural finishes, and furniture arrangements. This checkpoint contains 405 named interactive objects, including 47 penthouse furnishings, with stable routes and the penthouse game.

## Evidence

| Artifact | Coverage |
| --- | --- |
| `<floor>-overview.jpg` | Production browser captures for each floor |
| [six-floor-comparison.jpg](six-floor-comparison.jpg), [review.html](review.html) | Comparison layout using cropped floor captures |
| [inventory.json](inventory.json) | Room materials, finishes, bounds, placement, scale, triangles, and object names |
| [penthouse-bedroom.jpg](penthouse-bedroom.jpg), [penthouse-bedding-response.jpg](penthouse-bedding-response.jpg) | Bedroom appearance and bedding response |
| [check.txt](check.txt) | 126 source tests and 67 module/reference checks |
| [integration-final.txt](integration-final.txt) | All five integration modes |

Regenerate the inventory from the repository root with `node state/interior-identities/inventory.mjs`.

## Browser results

[webgl-desktop.json](webgl-desktop.json) and [webgl-phone.json](webgl-phone.json) cover 31 views and object responses in all 23 rooms. The recorded environments are 1280×720 standard/morning and 390×844 low graphics/night with requested DPR 3.

The runs record 57/55 opening draws, 141,194/129,773 opening triangles, 89/78 peak draws, zero idle frames, and stable geometry counts across measured navigation cycles. Both complete disposal checks.

An earlier phone diagnostic observed one first upload on a restored route. The final harness warms that route before measuring repeated cycles and continues to reject allocation growth. Intermediate logs are retained separately.

The accessibility reports cover 20 views per layout with no automated WCAG A/AA violations. Simulated viewports do not establish physical-device performance or screen-reader behavior.

This directory records a historical checkpoint. See [QA.md](../../QA.md) for subsequent changes.
