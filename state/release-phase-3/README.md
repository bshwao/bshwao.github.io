# Phase 3: deployment and live verification

Completed October 28, 2026. The portfolio is published at [bshwao.github.io](https://bshwao.github.io/).

## Published release

Content release: [`1ee09f58da9a64fe64b3aebfdb2b91eacdb08b93`](https://github.com/bshwao/bshwao.github.io/commit/1ee09f58da9a64fe64b3aebfdb2b91eacdb08b93).

The reviewed candidate was committed and pushed to the existing `main` branch deployment. Both workflows passed for that exact revision:

- [Portfolio checks](https://github.com/bshwao/bshwao.github.io/actions/runs/40761001565)
- [Pages build and deployment](https://github.com/bshwao/bshwao.github.io/actions/runs/40761000611)

The published-file verifier compares all committed runtime assets, including mobile styles, penthouse modules, vendor files, gallery images and the three bundled audio tracks. It checks 116 files against committed content, normalizing text line endings and comparing binary files by exact SHA-256. Image, PDF and audio MIME checks pass. Requests run in batches of eight.

The [deployment record](../deployment.json) and `content-verification.json` retain the content-release SHA. Subsequent commits record verification evidence and documentation; the content-release record is intentionally not rewritten to refer to itself. The final post-closeout HEAD comparison is saved locally in ignored `.preview/final-live-verification.json` after the evidence commit deploys.

## Live checks

| Area | Result | Evidence |
| --- | --- | --- |
| Published files | 116 comparisons pass | `content-verification.json` |
| GitHub workflows | Source/integration checks and Pages deployment succeed for the content release | `workflows.json` |
| Introduction and tower | Enter, unfold and return to assembled city | `live-intro.png`, `live-expanded.png`, `live-city.png` |
| Floors and room routes | All six floor entries work; Projects/b survives reload | `desktop-checks.json` |
| Reading and links | Reading overlay returns to the selected room; full page has all seven sections, current LinkedIn destination and résumé links | `desktop-checks.json`, `live-reading.png` |
| Games | Dashboard opens and a Blackjack hand completes | `desktop-checks.json` |
| Music | Bundled track time advances and the analyser reports nonzero audio energy; playback paused after testing | `desktop-checks.json`, `live-music.png` |
| Bedroom desktop | Simulated terminal responds to help | `desktop-checks.json` |
| Telescope | Atlas search and Rigel selection work | `desktop-checks.json` |
| Browser console | No warnings or errors in the live desktop check | `desktop-checks.json` |
| Physical iPhone/Safari | User confirms the live intro/navigation, pinch/orbit, reading/résumé, penthouse activity and return-from-background checks pass after refresh | `iphone-safari.json` |

Fourteen desktop checks pass. The iPhone/Safari result is a user attestation, not an emulated-browser result or a new performance benchmark. The earlier measured phone run remains in `state/device-runs/`.

## Maintenance

Phases 1, 2 and 3 are complete. Future content or implementation changes should repeat the appropriate local checks and verify the newly published revision. Keep the existing `main` branch Pages process. Follow [MAINTENANCE.md](../../MAINTENANCE.md) for deployment verification and rollback.
