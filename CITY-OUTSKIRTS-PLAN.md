# City and outskirts completion

The downtown tower, furnished interiors, local-time sky and riverfront already exist. Complete the surrounding city in every orbit direction, preserving those features and portfolio navigation.

## Work

1. Connect the peripheral streets to downtown and both existing bridges. Finish intersections, sidewalks, crossings and road ends; keep occupied lots, parks and the river clear.
2. Add recognizable outer neighborhoods: lower northern and southern residential blocks, western workshops and eastern civic buildings. Vary buildings and roofs, taper heights away from downtown, and give every new block street access.
3. Finish neighborhood public spaces, street planting, lighting, small service/parking areas and the transition into wooded outskirts. Continue the river through the outer landscape rather than ending it beside the last buildings.
4. Keep the tower dominant and the city coherent from the opening, side, rear and overhead views, by day and night. Preserve the slight background blur and all five furnished portfolio floors.
5. Verify actual geometry placement, connected streets, drawing/raster budgets, idle suspension, stable GPU allocation, disposal, responsive framing and existing navigation. Record screenshots, measured costs and a requirement audit under `state/city-outskirts/`.

Use static shared geometry and existing materials. No new animation loop, texture download, shadow map or publishing is needed. Distant houses and planting should be simpler than downtown architecture.

Status: implementation completed and published in commit `62a2e8c`. Verification and the final requirement audit are recorded under `state/city-outskirts/` and in `QA.md`. The production city has 197 buildings, including 136 new outer buildings, with 36 connected peripheral street segments, public spaces and wooded edges. The four new detail batches retain the existing raster, transition and interior limits. Current release verification and deferred real-device testing are recorded in `QA.md`.
