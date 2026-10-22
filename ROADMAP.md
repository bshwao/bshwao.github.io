# Portfolio roadmap

## Completed

- Core 3D tower, furnished interiors, room navigation, project stories and galleries, and section reading mode.
- Blueprint city phase 1: ground grid, plaza, streets, sidewalks, crosswalks, twelve parcels, and survey annotations.
- Blueprint city phase 2: twelve low-rise apartment, office, workshop, and campus buildings with varied massing, solid white surfaces, pale blue facade details, and clear setbacks around the tower.
- Blueprint city phase 3: planted plaza corners, furnished campus and residential courtyards, 24 trees, 12 benches, eight streetlights, roof details, an MFE / LAB workshop, and a Poltergeist vehicle test loop with two static vehicle models.
- Blueprint city phase 4: responsive city and expanded tower framing, independent orbit/zoom restoration for both outdoor views, early city clearance and delayed return during interior transitions, foreground city selection occlusion, and collision-aware section labels with a portrait phone dock.
- Blueprint city phase 5: stronger building edges and curbs, quieter facade and grid lines, filled lane/crossing markings and travel arrows, baked blue face washes, soft contact shading, camera-relative atmospheric fading, and white screen margins behind navigation.
- Blueprint city phase 6: batched internal tower plates, shared room-construction primitives, compact phone linework and city detail, a 2.4-million-pixel raster budget, stable GPU allocation across navigation and resize, idle/hidden-tab checks, and verified disposal.
- Cleaned the exposed cross-section profiles.
- Cross-section floor-plan detail: inset walls, wing partitions, elevator/stair cores, and distinct furniture on the exposed upper and lower cut faces, with fading into the furnished interiors.

## Cross-section floor-plan detail — complete

The exploded tower now includes simplified architectural plans on its exposed cuts:

- An outer wall outline inset from the facade.
- A central elevator and stair core.
- Room partitions following the tower's three wings.
- Sparse furniture silhouettes suited to each section: study furniture for About, workstations for Projects, lab benches for Experience, shelving for Résumé, and lounge seating for Contact.
- Thin, light-blue linework that keeps the section labels and tower silhouette clear.
- Plans that stay attached to the 3D caps as the tower rotates and expands, then clear away when the full furnished interior is revealed.

The pointed spire stays intact; About's broad lower cut carries its plan. Geometry is clipped to the cut outlines and batched into two line layers per section.

## Release checklist

All six numbered city phases are implemented.

- [x] **Final quality pass:** automated and real WebGL checks, representative portrait/landscape layouts, keyboard navigation, no-JavaScript entry, and accessibility audit. Evidence and test scope are recorded in `QA.md`.
- [ ] **Deployment verification:** publish the checked release through the existing GitHub Pages branch and verify its workflow and live assets.
- [x] **Search and sharing:** a 1280 × 720 social preview image, canonical page metadata, structured profile data, sitemap, and crawler configuration.
- [x] **Maintenance setup:** content/update instructions, reproducible QA pages, automated repository checks, and a release/rollback guide in `MAINTENANCE.md`.

Content maintenance continues when projects, experience, résumé, links, demos, or measured results change. A custom domain is optional and has not been requested; the existing HTTPS GitHub Pages address remains canonical.
