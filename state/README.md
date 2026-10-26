# Verification Evidence

This directory contains test logs, browser reports, screenshots, inventories, and supporting diagnostics collected during development.

Each subdirectory represents a specific implementation checkpoint. Test counts, measurements, screenshots, and limitations describe that checkpoint; older files are retained for traceability and may show features that were later changed or removed.

## Latest recorded checkpoint

[Room copy review](room-copy/README.md) records the October 26, 2026 source, integration, factual-content comparison, and rendered review of all 23 rooms. Refer to [QA.md](../QA.md) for the verification timeline and [ROADMAP.md](../ROADMAP.md) for remaining work.

## Feature evidence

| Area | Evidence |
| --- | --- |
| Room descriptions and activity copy | [room-copy/](room-copy/README.md) |
| Bedroom furniture layout | [bedroom-layout/](bedroom-layout/README.md) |
| Penthouse activities | [penthouse-experiences/](penthouse-experiences/README.md) |
| Exterior rain and night lighting | [outdoor-rain/](outdoor-rain/README.md) |
| Floor and room identities | [interior-identities/](interior-identities/README.md) |
| Introduction and responsive entry | [portfolio-intro/](portfolio-intro/README.md) |
| Camera zoom limits | [zoom-limits/](zoom-limits/README.md) |
| Facade seams | [facade-seams/](facade-seams/README.md) |
| Island and ocean | [island-city/](island-city/) |
| Mountains and forests | [mountain-wilderness/](mountain-wilderness/) |
| Outer-island settlements | [island-settlements/](island-settlements/) |
| Original penthouse geometry | [penthouse/](penthouse/README.md) |

The `robot-trial/`, `robot-hover/`, `robot-redesign/`, and `robot-palette/` directories document a discontinued experiment.

## Interpreting results

- Source tests and DOM/camera integration do not substitute for visual WebGL review.
- Chromium viewport simulations do not establish physical-phone or cross-engine performance.
- Automated accessibility results supplement manual keyboard, screen-reader, and contrast review.
- Software-rendered geometry previews are identified separately from browser captures.
- [deployment.json](deployment.json) records a specific published commit and verification time; it is not a live deployment-status feed.

For new evidence, record the command or diagnostic page, viewport, graphics mode, browser/device scope, and relevant limitations. Keep final reports distinguishable from intermediate diagnostics.
