# Portfolio Roadmap

This document summarizes the implemented website and the remaining verification work. Detailed measurements and historical checkpoints are recorded in [QA.md](QA.md).

## Implemented scope

- Six tower sections and 23 furnished rooms: About, Projects, Experience, Résumé, Contact, and Penthouse.
- An island city with residential neighborhoods, connected roads, river crossings, coastline, ocean, forests, and surrounding mountain terrain.
- An introductory sequence, bounded camera zoom, room-focused navigation, shareable URLs, and browser-history support.
- Visitor-local day/night lighting, a live clock, exterior window lighting, and cached scenery behind opened interiors.
- Penthouse music playback and audio-reactive visualizers, local audio import, games, bedroom atmosphere controls, a simulated desktop, and a telescope star atlas.
- Keyboard and touch controls, reduced motion, low graphics, accessible reading views, and WebGL-failure recovery.

The first-floor robot experiment has been removed. Its evidence remains archived under `state/`.

## Recorded verification

The October 26, 2026 checkpoint in [state/bedroom-layout/](state/bedroom-layout/README.md) records:

| Check | Result |
| --- | --- |
| Source and server tests | 179 passed |
| Module and local-reference checks | 76 passed |
| DOM and camera integration | All five modes passed |
| Desktop WebGL sweep | All 31 views passed; stable resources and complete disposal |
| Production browser review | No warnings or errors recorded |

Other feature checkpoints include simulated portrait and landscape Chromium layouts, accessibility audits, audio playback, and activity-dialog interaction. Their measurements apply to the versions and environments described in each report.

## Remaining work

- [ ] Validate the current published commit with a fresh live-site smoke review and an updated deployment report.
- [ ] Complete physical-device and cross-engine testing, including iPhone/Safari and the regular Edge session. This work was previously deferred.
- [ ] Review manual accessibility and actual phone performance alongside the existing automated and simulated-layout checks.

Local Chromium verification is complete for the latest recorded checkpoint. The earlier browser-connection issue is historical and is no longer an active local-testing blocker.

## Optional enhancement

First-person seating in the sky lounge remains deferred. A future implementation should provide a seated view over the city and an accessible return to orbit controls. The interactive telescope atlas is already implemented.

## Release records and maintenance

The saved [deployment report](state/deployment.json) verifies commit `e446760` from October 24, 2026. It does not establish the deployment status of later commits. Confirm the published revision and CI results when preparing a release.

Keep project status, contributions, screenshots, résumé details, and external links current. Preserve stable section and room IDs. See [MAINTENANCE.md](MAINTENANCE.md) for update and release procedures.

Historical design plans are retained for reference:

- [Color system](COLOR-PLAN.md)
- [Tower geometry](MASSING-PLAN.md)
- [Downtown skyline](SKYLINE-PLAN.md)
- [City outskirts](CITY-OUTSKIRTS-PLAN.md)
