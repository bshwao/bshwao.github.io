# Facade seam fix

The four structural base slab sides were coplanar with the facade of the section below. Raycasts measured zero separation at all four joins. Recessing the slab perimeter by .08 model units gives the exterior wall one visible surface while retaining each solid slab in unfolded/interior views.

`before.png` and `after-front.png` use the same close camera. `after-side.png`, `after-unfolded.png` and `after-floor.png` cover other affected views. `massing.txt` records the new geometric clearance/raycast regression; `check.txt` and `integration.txt` record all 105 source tests and five integration modes passing. Both WebGL reports pass 26 views, resource reuse, rendering budgets, idle checks and disposal. `production-console.json` is empty.

The temporary port 4175 preview was stopped after verification. Phone coverage is a browser viewport simulation.
