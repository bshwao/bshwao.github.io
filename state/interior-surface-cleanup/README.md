# Interior surface cleanup

Local verification, October 27, 2026. All six floors and 23 rooms retain overhead orbit navigation.

Joined box panels now use one exposed surface within each independently animated object. Piano keys remain separate groups. The existing four material batches and outline batch per room are preserved. This removes buried panel faces and repeated shelf, chair, cabinet and workbench strokes without joining unrelated objects.

Authored clearance fixes cover visitor-seat cushions, narrow bookshelves, penthouse chair arms, workbench aprons, monitor supports, maker tools and task lighting, simulator pedals, network storage, diagnostic cables, inspection-car tires and platform, and the Contact lounge furniture. The car's tires and hubs continue to share one animation transform.

## Validation

- `npm run check`: 208 passing source/server tests and 83 module/reference checks.
- `npm test`: desktop, simulated mobile, reduced motion, fresh room link and unavailable-WebGL integration modes.
- [Geometry audit](geometry-audit.json): 408 interaction targets across six floors, with zero same-facing coplanar triangle intersections above the documented tolerance. The scan compares actual batched position and normal buffers; it does not use room-wall occlusion to dismiss conflicts. Separately animated objects remain separate, with targeted clearance regressions for the corrected compositions.
- [Four-angle manifest](views.json): 98 native Chromium captures, comprising six whole-floor views and four orbital angles for every room. [Penthouse](penthouse-review.jpg), [About](about-review.jpg), [Projects](projects-review.jpg), [Experience](experience-review.jpg), [Résumé](resume-review.jpg) and [Contact](contact-review.jpg) sheets collect those actual captures.
- Native WebGL sweeps pass all 31 views and object responses in all 23 rooms at [1280×720 standard/day](webgl-desktop.json) and [390×844 low/night, requested DPR 3](webgl-portrait.json). Peak draws are 82 and 78. Both settle to zero idle frames, retain stable resources after warmup and dispose their GPU resources.
- [Browser console record](browser-console.json): no warnings or errors in the production view, visual review or either rendering sweep. [Production screenshot](production-study.png) records the study after exercising its chair through the keyboard control.

These checks use desktop Chromium and simulated viewport sizes. Physical touch behavior, device performance and Safari on Apple hardware remain pending. Changes are local; this record does not establish deployment status.

## Reproduce

Run `npm run check` and `npm test` from the repository root. The standalone broad geometry scan is:

```powershell
node state/interior-surface-cleanup/audit-flat-faces.mjs
```

With the preview server running, open `/scripts/interior-surface-qa.html`. Its selector covers all 98 views; Next view advances through them, and Animate room objects exercises the current room. It uses the production scene and existing keyboard orbit handler. Save full-page browser screenshots to `raw/view-00.png` through `raw/view-97.png`, then run `python state/interior-surface-cleanup/make-contact-sheets.py` with Pillow installed. Raw captures are ignored by Git; the assembled review sheets are retained.
