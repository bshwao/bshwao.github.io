# Road line verification

Request: add road lines to the roads shown in the city screenshot.

- Yellow double center dividers and white edge lines cover four full downtown roads, all 36 outer streets and both bridges. `inventory.json` records 42 marked sections and 840 paint quads.
- Paint stays within the asphalt, stops before perpendicular intersections and preserves the plaza crosswalk/stop-bar gaps. Tests raycast the actual road surfaces below every paint patch, including the bridge ramps.
- The formerly blank stretches beyond the old 108-unit paint boundary are explicitly raycast in the regression. Existing arrows and pedestrian crossings remain.
- Paint joins existing rendering batches. Outskirts geometry is 18,876 triangles, below its unchanged 20,000-triangle ceiling.
- `check.log`: 83 source tests, 52 syntax/reference checks and generated theme/reading checks pass. `integration.log`: all five modes pass.
- `webgl-desktop.json`, saved after PASS: 26 views, all 19 room animation checks, 84 peak draws, 112,121 opening triangles, no idle frames, resource reuse and GPU disposal. Console warning/error logs are empty.
- `city-road-lines.png` shows the rendered overhead result. The temporary port 4175 preview was stopped; the usual port 4173 was not used. No publishing was requested or performed.
