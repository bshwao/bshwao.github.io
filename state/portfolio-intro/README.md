# Portfolio intro verification

The introduction uses the existing paper/serif/mono visual language with an original lightweight SVG tower illustration. Entry is manual; the rendered city appears through a finite 850ms sheet reveal. Reduced motion enters immediately. Direct room/floor links and completed tab sessions bypass it; Settings provides a replay. Rendering failure cancels the dialog and preserves the complete reading fallback.

- `check.txt`: all 117 source tests, 63 syntax/local-reference checks and generated-file checks pass.
- `intro-tests.txt`: twelve focused lifecycle tests pass.
- `integration.txt`: desktop, phone, reduced motion, fresh room link and no-WebGL modes pass.
- `responsive-layouts.json`: four viewport sizes, visible entry/reading controls, 44px targets and restored city interaction. The harness also rejects horizontal and vertical scrolling.
- `view-controls.json`: all eight existing phone/desktop control layouts pass.
- `accessibility-desktop.json` / `accessibility-phone.json`: 18 views each, no automated WCAG A/AA violations.
- `production-console.json`: no warnings or errors during manual review.
- Screenshots show desktop, portrait, short-landscape and the revealed city.

The temporary preview used port 4175 and was stopped after verification. Phone results are browser viewport simulations.
