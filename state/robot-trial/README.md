# First-Floor Robot Trial — Archived Verification

**Status:** Superseded. Both first-floor robots have been removed; see [robot-removal/](../robot-removal/README.md).

## Historical scope

The trial placed a walking robot in the About gallery and a stationary companion at the study desk. Movement respected reduced motion, room visibility, and a tab-local pause preference.

## Evidence

- [gallery.jpg](gallery.jpg), [study.jpg](study.jpg), and [motion-final.json](motion-final.json): final placement and continuous patrol.
- [motion.json](motion.json): pause/resume and offscreen behavior before the final patrol-lane adjustment.
- [focused.txt](focused.txt): five resident regressions, including animated mesh and furniture clearance.
- [check.txt](check.txt): 183 source/server tests and 77 module/reference checks.
- [integration.txt](integration.txt), [integration-desktop-final.txt](integration-desktop-final.txt): integration and final framing checks.
- WebGL reports: movement, pause, idle rendering, stable resources, budgets, and disposal.
- Accessibility reports: 31 views per layout with no automated A/AA violations.
- [production-console.json](production-console.json): browser warning/error log.

These artifacts describe the discontinued trial. Phone coverage uses simulated Chromium viewports.
