# Physical-device verification

## iPhone 13 / Safari — October 28, 2026

The user ran the local device benchmark, saved all five manual checks as successful, and confirmed that mobile works well after the touch and layout fixes.

- [Automatic measurement](device-af6b4792-ec84-4e91-bceb-2a6762d0e948.json)
- [Saved manual checks](device-ea1c7c50-463e-4068-9f08-d7f92d1430f0.json), device label `iphone 13 safari`

| Manual check | Result |
| --- | --- |
| Orbit and zoom | Pass |
| Open floors and numbered rooms | Pass |
| Orientation changes and reachable controls | Pass |
| Reading view and return | Pass |
| Switch apps/tabs and return | Pass |

The automatic run completed without visibility or resize interruptions, using standard graphics on Apple GPU. Orbiting averaged 59.6–59.8 FPS; unfolding 55.9 FPS; opening Projects 44.8 FPS; room flight 57.2 FPS. Its final 500ms recorded no idle frames.

The browser viewport was 390×739 CSS pixels, with a 390×498 embedded app preview and a 526×672 drawing buffer. These timings describe that preview, rather than sustained full-screen or multi-device performance. The OS reports reduced motion enabled; the benchmark's app-level Full motion requirement permits a manual override. Manual checkboxes record the user's observations and do not constitute a comprehensive accessibility or cross-browser audit.
