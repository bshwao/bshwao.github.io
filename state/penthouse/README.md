# Penthouse Geometry — Initial Verification

**Checkpoint:** October 25, 2026.

**Status:** Historical implementation checkpoint.

## Scope and automated results

The initial penthouse added a sixth tower section, bringing the site to 23 rooms. Its four rooms contained 47 interactive objects.

[check.txt](check.txt) records 122 source tests and 65 module/reference checks passing. [integration.txt](integration.txt) records all five DOM/camera integration modes. The integration harness uses production geometry and cameras with a stub renderer; its frame counts are scheduler observations rather than performance measurements.

[inventory.json](inventory.json) records rooms, objects, and features. Other focused logs document intermediate geometry and furnishing checks.

## Rendering estimates

[cpu-draw-inventory-desktop.json](cpu-draw-inventory-desktop.json) and [cpu-draw-inventory-phone.json](cpu-draw-inventory-phone.json) estimate visible geometry groups, frustum/layer filtering, and rendering passes.

```sh
node --experimental-vm-modules scripts/spatial.test.mjs --draw-inventory
node --experimental-vm-modules scripts/spatial.test.mjs --draw-inventory --mobile
```

These estimates do not establish GPU timing, allocation behavior, or physical-device performance.

## Geometry previews

`penthouse-geometry.png` and `room-1-geometry.png` through `room-4-geometry.png` are software projections of production meshes. Their SVG counterparts are geometry projections. They do not verify browser layout, shaders, picking, or animated state.

To regenerate them, provide Sharp through `NODE_PATH` or a local installation, then run `node state/penthouse/render-preview.mjs` from the repository root. Sharp is a preview-only dependency.

The browser runtime was unavailable at this checkpoint. Subsequent browser, accessibility, and activity verification is recorded in [penthouse-experiences/](../penthouse-experiences/README.md) and [QA.md](../../QA.md).
