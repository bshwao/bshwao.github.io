# Two-robot trial — Level 01 / About

- `gallery.jpg` and `motion-final.json`: final visible patrol lane behind the front benches. Native app samples show the walking robot changing position without an interaction.
- `study.jpg`: the stationary robot at the existing study desk/chair.
- `motion.json`: native pause/resume and study-close-up checks; the walker stops while out of view. These samples precede the final lane visibility adjustment.
- `focused.txt`: five resident regressions. The whole animated mesh is checked over a complete loop against its swept envelope, all actual furnishing bounds and the room floor.
- `check.txt`: 183 source/server tests, 77 syntax/reference checks.
- `integration.txt`: five DOM/camera modes. `integration-desktop-final.txt` reruns the final patrol framing on desktop.
- `webgl-desktop.json` and `webgl-phone.json`: real Chromium/WebGL sweeps with explicit live movement/pause tests, no new GPU resources during movement, zero paused idle frames, unchanged render budgets and successful disposal. The walker adds one mesh; the desk companion stays in the existing chair batch.
- `accessibility-desktop.json` and `accessibility-phone.json`: 31 views each, no automated A/AA violations.
- `production-console.json`: native production warning/error log.

The prototype is confined to About. Motion follows the global reduced-motion preference and the visible gallery; pause is remembered only for this tab. Physical-device and cross-engine benchmarks are outside these Chromium viewport checks. No external character assets or dependencies were added.
