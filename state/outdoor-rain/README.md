# Outdoor Rainy Night correction

Rainy Night sets the city's clock to 22:00. The city's existing composite shader darkens the outdoor view while preserving warm windows, then draws animated rain before the sharp occupied floor. Room geometry therefore occludes every rain streak. The old projected-window SVG layer and its CSS have been removed.

- `rainy-night.jpg`: actual portfolio in Chromium, with a dry bedroom and dark rainy city outside.
- `pixels.json`: real WebGL output comparison. Exterior rain changes 2,259 sampled pixels between frames; the checked interior remains pixel-identical in both graphics modes. Outdoor night luminance is 54.5% of day. Clearing weather restores the original pixels. Weather changes reuse two geometries; standard uses two textures, low graphics one. Disposal releases all resources.
- `behavior.json`: native app shows frozen rain time 0 with reduced motion, then restores the local morning/clear exterior and disables lamp illumination on leaving the penthouse. The previous motion preference was restored afterward.
- `check.txt`: 178 source/server tests and 76 module/reference checks pass.
- `integration.txt`: all five integration modes pass, including scene-level 22:00 city state, outdoor-only weather, reduced-motion freeze and local-time restoration.

`scripts/outdoor-rain-qa.html` reproduces the pixel test. Active rain uses a bounded redraw timer with a cached city image; clear weather, hidden pages, disposal and floor departure stop that timer. This evidence uses Chromium on this machine, not a physical phone benchmark.
