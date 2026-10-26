# Exterior Rain and Night Lighting — Verification

## Scope

Rainy Night applies a 22:00 city state and renders rain in the exterior composite before drawing the occupied floor. Room geometry occludes the rain, while the city darkens and illuminated windows remain visible. The previous window-overlay implementation is superseded.

## Recorded results

| Artifact | Coverage |
| --- | --- |
| [rainy-night.jpg](rainy-night.jpg) | Chromium capture of the bedroom and rainy nighttime exterior |
| [pixels.json](pixels.json) | WebGL pixel comparisons in standard and low graphics |
| [behavior.json](behavior.json) | Reduced-motion freeze, local-time restoration, and lamp reset |
| [check.txt](check.txt) | 178 source/server tests and 76 module/reference checks |
| [integration.txt](integration.txt) | All five integration modes |

The pixel comparison records 2,259 changing exterior pixels and no changes in the sampled interior. Nighttime exterior luminance is 54.5% of the daytime sample. Clearing the effect restores the original pixels; repeated changes reuse resources and disposal releases them.

[The diagnostic page](../../scripts/outdoor-rain-qa.html) reproduces the pixel check through the preview server. Rain uses bounded redraws; clearing weather, hiding the page, leaving the floor, or disposing the scene stops them.

Results describe the recorded Chromium environment, not a physical-phone benchmark.
