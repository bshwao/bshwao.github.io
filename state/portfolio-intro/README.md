# Portfolio Introduction — Verification

## Scope

The introduction uses the portfolio's paper, serif, and monospace styling with an original SVG tower illustration. Selecting the entry action reveals the city over 850 ms. Reduced motion enters immediately; direct floor/room links and completed tab sessions bypass the introduction. Settings provides a replay action.

Rendering failure closes the introduction and preserves access to the reading portfolio.

## Recorded results

| Artifact | Coverage |
| --- | --- |
| [check.txt](check.txt) | 117 source tests, 63 module/reference checks, and generated files |
| [intro-tests.txt](intro-tests.txt) | 12 lifecycle tests |
| [integration.txt](integration.txt) | All five integration modes |
| [responsive-layouts.json](responsive-layouts.json) | Four viewport sizes, 44 px targets, entry controls, overflow, and restored interaction |
| [view-controls.json](view-controls.json) | Eight desktop and phone control layouts |
| [accessibility-desktop.json](accessibility-desktop.json), [accessibility-phone.json](accessibility-phone.json) | 18 views per layout, with no automated WCAG A/AA violations |
| [production-console.json](production-console.json) | No warnings or errors recorded |

Screenshots include desktop, portrait, short-landscape, and revealed-city views. Phone results use simulated Chromium viewports. See [QA.md](../../QA.md) for later checkpoints.
