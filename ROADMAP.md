# Portfolio Roadmap

This document summarizes the implemented website and the remaining verification work. Detailed measurements and historical checkpoints are recorded in [QA.md](QA.md).

## Implemented scope

- Six tower sections and 23 furnished rooms: About, Projects, Experience, Résumé, Contact, and Penthouse.
- An island city with residential neighborhoods, connected roads, river crossings, coastline, ocean, forests, and surrounding mountain terrain.
- An introductory sequence, bounded camera zoom, room-focused navigation, shareable URLs, and browser-history support.
- Visitor-local day/night lighting, a live clock, exterior window lighting, and cached scenery behind opened interiors.
- Penthouse music playback and audio-reactive visualizers, local audio import, a seven-game dashboard including Blackjack, Word Guess and mini crosswords, bedroom atmosphere controls, a simulated desktop, and a telescope star atlas.
- Keyboard and touch controls, reduced motion, low graphics, accessible reading views, and WebGL-failure recovery.

The first-floor robot experiment has been removed. Its evidence remains archived under `state/`.

## Recorded verification

The October 28, 2026 [iPhone 13 / Safari check](state/device-runs/README.md) completes the mobile recheck: the user saved successful orbit/zoom, room navigation, orientation, reading and background-return checks and confirmed that mobile works well. The automatic preview benchmark completed with orbiting near 60 FPS and zero idle frames in its final 500ms. Results apply to this tested device and preview size.

The October 27, 2026 [phone-feedback fixes](state/mobile-usability/phone-feedback/README.md) address selection, control placement, touch sensitivity and camera limits from the initial iPhone review. They pass 213 source/server tests, five integration modes, 178 rendered usability cases and eight settings/control layouts. A physical iPhone/Safari recheck remains pending.

The October 27, 2026 [mobile usability](state/mobile-usability/README.md) checkpoint adds Scene/Split/Read room panels, larger mobile controls, phone-landscape and tablet-portrait layouts, and safe-area spacing. It passes 212 source/server tests, 85 module/reference checks, five integration modes, 281 simulated usability cases, a 36-view accessibility sweep and a landscape WebGL sweep. Physical-device and Safari verification remain separate pending work.

The October 26, 2026 [tower and room motion](state/spatial-motion/README.md) checkpoint passes 199 source/server tests, 82 module/reference checks, all five DOM/camera modes, and desktop/portrait WebGL sweeps. It adds explicit camera and material continuity checks for interrupted navigation and direct room entry.

The October 26, 2026 [games dashboard](state/game-dashboard/README.md) checkpoint passes 190 source/server tests, 81 module/reference checks, all five DOM/camera integration modes, and 24 responsive game/library accessibility and overflow checks. Its report includes native game interaction evidence and environment limits.

The October 26, 2026 [bedroom layout](state/bedroom-layout/README.md) and [room copy review](state/room-copy/README.md) checkpoints record:

| Check | Result |
| --- | --- |
| Source and server tests | 179 passed |
| Module and local-reference checks | 76 passed |
| DOM and camera integration | All five modes passed |
| Desktop WebGL sweep | All 31 views passed; stable resources and complete disposal |
| Production browser review | No warnings or errors recorded |

Other feature checkpoints include simulated portrait and landscape Chromium layouts, accessibility audits, audio playback, and activity-dialog interaction. Their measurements apply to the versions and environments described in each report.

## Release phases

The iPhone 13/Safari recheck and saved performance review are complete. The remaining release work proceeds in three phases.

### Phase 1 — Desktop browser verification

- [x] Check the normal Edge session: introduction, tower expansion/collapse, all floors, room navigation, zoom and resizing.
- [x] Exercise music playback/import, the visualizer, games, bedroom desktop and telescope atlas.
- [x] Check reading views, room links, browser history and return from another tab.
- [x] Fix any failures and record browser/version and results in QA.md.

Complete when these flows work in Edge and any discovered functional defects are resolved.

Completed October 28, 2026 in Edge 156 on Windows. The [Phase 1 report](state/release-phase-1/README.md) records the UI checks, local audio import, all 31 rendered views and object responses in all 23 rooms. No application changes were required by this pass. Phase 2 remains next.

### Phase 2 — Accessibility and release preparation

- [ ] Manually review keyboard navigation, visible focus, dialog focus/return, readable contrast and browser zoom.
- [ ] Check reduced motion and the complete reading fallback.
- [ ] Verify résumé downloads, contact links, project links and content accuracy.
- [ ] Run the source and integration checks on the final candidate and record results.

Complete when required content and controls are usable, links work and the final candidate passes its checks.

### Phase 3 — Deployment and live verification

- [ ] Publish the approved release candidate through the repository's deployment process.
- [ ] Confirm the published commit and successful deployment checks.
- [ ] Check the live introduction, tower/room routes, reading page, résumé, links and penthouse activities on desktop and iPhone/Safari.
- [ ] Update the deployment report and QA.md with the verified revision and results.

Complete when the intended revision is live and the production checks pass. These phases describe the release plan; publishing remains a separate action.

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
