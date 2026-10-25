# Zoom-limit verification

The city uses a minimum of 55% of its fitted distance (at least 140 model units) and a far stop that fits the whole island. The expanded tower uses 65–220% of its fit. Floors and rooms use a near stop of 65–90% based on their radius, with far stops of 190% and 180% respectively. Limits recalculate when the view or viewport changes. Scripted navigation remains free to complete its camera flight before user bounds resume.

- `check.txt`: 104 passing source tests, 60 syntax/reference checks and generated-file checks.
- `integration.txt`: all five modes pass; endpoints cover every floor and room, all zoom input methods, resize and idle behavior.
- `webgl-desktop.json` / `webgl-phone-low.json`: passing real WebGL sweeps, 26 views, eight endpoint checks, 19 object-animation checks, stable memory and disposal.
- `ui-endpoints.json`: production Inspection bay reaches both exact bounds and disables the matching button.
- `production-console.json`: no warnings or errors during the production review.
- Screenshots show the city and room at their close and far stops.

Preview used port 4175 and was stopped after verification. Browser tabs were temporary. Phone coverage is viewport simulation on the connected Chromium host.
