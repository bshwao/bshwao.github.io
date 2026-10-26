# Portfolio roadmap

## Current release

The city, complete interiors and nighttime reflections were published in `62a2e8c` on October 23, 2026 (Toronto time). CI and Pages succeeded for that commit. The final light content review, documentation cleanup and live verification are tracked in [QA.md](./QA.md); the recorded content release is in `state/deployment.json`.

## Completed website

- A 148.5-unit bundled landmark with two antennae and five portfolio sections: About, Projects, Experience, Résumé and Contact.
- All 19 rooms occupy their full floor bays, with furnishings, partitions, doors, windows, an aligned lift/stair core and shared circulation. Corridor benches remain on About and Contact only.
- A 197-building city on 188 parcels, including 136 low-rise outer buildings, 36 connected peripheral street segments, two river bridges, public gardens, transit shelters, a recreation court, a service yard, woodland and distant terrain.
- Smooth visitor-local day/night sky, coordinated city lighting and windows, a live device-time clock with an EST fallback, and subdued solar reflections at night. Unfolded closed sections retain outdoor lighting; actual furnished interiors retain readable lighting.
- Slight full-resolution city blur behind the tower and interiors, frosted-glass controls and reading overlays, and opaque accessibility fallbacks.
- Shared room URLs, back/forward navigation, project stories and image galleries, a complete reading page, résumé access, keyboard/touch controls, reduced motion and WebGL-failure/context-loss fallback.
- Original viewport-based graphics quality, a 2.4-million-pixel raster cap, compact phone linework, cached scenery, idle/hidden-tab suspension and complete GPU disposal.
- Canonical metadata, a 1280 × 720 sharing card, structured profile data, sitemap, crawler rules, automated repository checks and release/rollback instructions.

## Current verification and release checklist

- [x] Implementation checks: 76 source tests, 49 module checks and five DOM/camera integration modes at the city/reflection checkpoint. Re-run the commands for the release being published.
- [x] Connected Chromium graphics evidence: all 26 views on desktop and simulated phone layouts; bounded drawing/raster work, stable allocation and disposal. See `state/city-outskirts/` and `state/reflection-time/`.
- [x] Existing city/reflection release: CI and Pages passed for `62a2e8c`.
- [x] Light content/link review, current documentation, source/integration checks and expanded live-file verification: cleanup commit `e446760` is deployed, CI/Pages passed, and all 66 file comparisons pass. The content release is recorded in `state/deployment.json`.
- [ ] Fresh local/live Chromium smoke checks: **blocked by the disconnected browser connector after the app restart**. The Browser panel reconnection has been requested; full cleanup acceptance remains open until these visual checks run. Earlier screenshots are historical evidence, not a fresh smoke pass.
- [ ] Real-device/cross-engine testing: **deferred at the user's request**. Physical iPhone/Safari and the user's regular Edge session are outside the recorded Chromium scope. This is not a gate for the requested cleanup release.

## Historical design checkpoints

These plans preserve the original scope, measurements and screenshots of each completed redesign. Their old geometry counts and rendering policies describe those versions. Publication status is governed by the current QA overview.

| Checkpoint | Evidence |
| --- | --- |
| Original six-phase blueprint district | Earlier sections of `QA.md` and `state/browser-qa.json` |
| Multicolor design and original-quality correction | [COLOR-PLAN.md](./COLOR-PLAN.md), `state/multicolor-qa.json`, `state/graphics-repair-qa.json` |
| Shared polygonal tower and room migration | [MASSING-PLAN.md](./MASSING-PLAN.md), `state/massing-qa.json` |
| Dense downtown skyline | [SKYLINE-PLAN.md](./SKYLINE-PLAN.md), `state/skyline-final-qa.json` |
| Riverfront, local-time environment, full interiors and glass UI | Named checkpoints in `QA.md` and their `state/` directories |
| Complete city/outskirts and nighttime reflections | [CITY-OUTSKIRTS-PLAN.md](./CITY-OUTSKIRTS-PLAN.md), `state/city-outskirts/`, `state/reflection-time/` |

## Ongoing maintenance

Future penthouse enhancement: optional first-person seating in the sky lounge, with a seated view over the city and a clear return to the normal orbit controls. The current release keeps the interactive telescope atlas and defers this camera mode.

Update project status, factual contributions, screenshots, experience, résumé and external links when the underlying information changes. Keep stable section/room IDs. A custom domain, additional city features and new services are optional and are not part of this release. See [MAINTENANCE.md](./MAINTENANCE.md).
