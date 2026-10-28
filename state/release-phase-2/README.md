# Phase 2: accessibility and release preparation

Completed October 28, 2026 in the connected Edge profile on Windows, using the repository preview at `http://127.0.0.1:4173/`. Candidate base commit: `809ab9be0eddff9f87bb58efc467d20d4e2623ef`, plus the changes recorded here. No commit or deployment was made during this completion pass.

## Changes

- The native clock retains its text, datetime and title without an unsupported accessible label.
- The Word Guess letter keyboard has a group role for its label.
- The accessibility harness loads the actual reading-page response into an isolated document with the original base URL. This repairs its stalled navigation while preserving the page's markup, styles and assets. Loading has a bounded failure timeout.
- LinkedIn links use the current public profile, `https://www.linkedin.com/in/erichsuu/`. The old `/in/erichsu07/` address redirects there. The complete reading page and its structured metadata were regenerated from shared content. The résumé PDF was preserved.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Final source/server suite | 216 passed; 87 module/reference checks; generated content current | `source-check.log` |
| Final DOM/camera integration | Desktop, mobile, reduced motion, fresh room link and unavailable-WebGL modes pass | `integration-check.log` |
| Edge accessibility sweep | 36 views, zero automated WCAG A/AA violations; all ARIA control IDs resolve | `accessibility-final.json` |
| Keyboard and focus | Intro entry, floor/room navigation, reading return and all four activity dialogs reviewed | Earlier progress review; `games-focus.png` |
| Reduced motion | Immediate floor/room navigation with the correct selection | Earlier progress review; integration log |
| Contrast | Night scene, reading overlay and activity controls reviewed; representative conservative ratios 4.98:1–6.91:1 | `contrast-review.json`, `night-contrast.png`, `night-reading.png`, `games-focus.png` |
| Actual browser zoom | Edge menu confirms 200%; DPR 2; intro, room controls, scrollable room tabs, Read mode, full reading page and activity controls work | `zoom-native-menu.txt`, `zoom-200-*.png`, `final-checks.json` |
| JavaScript disabled | Profile, projects, reading link, résumé and email remain exposed | `no-script.png` |
| WebGL unavailable | Reading link, section links and reload control remain exposed | `no-webgl.png` |
| Complete reading page | All seven sections present, normal top-level navigation, no horizontal overflow at 200% | `zoom-200-reading.png`, accessibility report |
| Résumé download | Actual Edge download matches the repository PDF by SHA-256; 127,160 bytes | `content-review.json`, `final-checks.json` |
| Contact and project links | GitHub and LinkedIn profiles verified in Edge; three repositories verified through GitHub; Devpost project verified; email agrees with the résumé | `content-review.json`, `final-checks.json` |
| Browser console | No warnings/errors in the app or audit | `browser-console.json` |

The downloaded PDF has SHA-256 `6a6680f52c21b05492c1f312fc36607d3abb10b580f5ec834c9e9790c3adb274`. The earlier content review inspected its text and all three rendered pages; core profile, education, experience metrics and skills agree with the site. Personal claims were not independently certified or rewritten. No email or other message was sent.

## Manual audit review

The clock and letter-keyboard labeling findings are absent from the final sweep. The remaining ARIA review item concerns the Reading view button's reference to a native dialog: the referenced ID exists, every harness ID-resolution check passes, and opening the reading view and returning focus were exercised by keyboard.

Automated contrast checks cannot resolve all text over the glass gradients and 3D scene. Visual inspection and conservative compositing supplement those checks. The toolbar's muted ink is 4.98:1 against its darkest glass fill over black; panel body copy is 6.91:1. Palette tests also verify essential reading colors. The complete static reading page has no remaining automated review items. These checks supplement accessibility review; they are not a screen-reader certification.

At 200%, the short responsive layout replaces the separate Reading view button with Scene/Split/Read controls. Room tabs scroll to the keyboard-selected tab. All seven game cards and the music player controls, including the file input and credits link, remain reachable by keyboard. Vertical scrolling is expected; the page does not overflow horizontally.

## Environment and cleanup

The earlier native-control interruption was resolved by using the shared portfolio tab in a normal Edge window. Its window had been minimized; restoring it exposed the address bar and native zoom menu. The browser menu confirmed the test zoom, and 100% was restored afterward. The user's port-4173 motion preference was left unchanged, playback remained paused and no new local audio was imported. The earlier port-4177 preference is confined to that separate preview origin.

The initial sandbox localhost EACCES run is retained as `source-check-sandbox.log`; the final suite runs with the loopback access its HTTP tests require. The unavailable-WebGL integration error is an intentional test fixture. `accessibility-before.json` and `accessibility-loader-failure.txt` are historical diagnostics, superseded by the passing final report.

Phase 3 remains pending: publish the approved candidate, verify the deployed revision and CI, and check the live site on desktop and iPhone/Safari.
