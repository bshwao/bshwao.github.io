import * as T from '../../assets/vendor/three.module.min.js';
import { sections } from '../../assets/tower-geometry.js';
import { floorContent } from '../../assets/floor-content.js';
import { createInterior } from '../../assets/interiors.js';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Reuse the independent polygon intersection and rendered-triangle collection
// from the regression, without importing node:test or executing its fixtures.
const testSource = readFileSync(new URL('../../scripts/interior-overlap.test.mjs', import.meta.url), 'utf8');
const helperSource = testSource.slice(testSource.indexOf('function intersectionArea'), testSource.indexOf('function overlappingStrokes'))
  .replace('const overlaps = [];', 'let pairs = 0, area = 0; const overlaps = [];')
  .replace('if (intersectionArea(a, second) > 1e-5) overlaps.push(plane);',
    'const overlap = intersectionArea(a, second); if (overlap > 1e-5) { overlaps.push(plane); pairs++; area += overlap; }')
  .replace('return [...new Set(overlaps)];', 'return { planes: [...new Set(overlaps)], pairs, area };');
const auditFaces = new Function('T', 'rounded', `${helperSource}; return overlappingFaces;`)(T, value => Math.round(value * 1e5));

const floors = [], totals = { targets: 0, affectedTargets: 0, sameFacingOverlapPairs: 0 };
let piano;
for (const section of sections) {
  const interior = createInterior(section, floorContent[section.id]);
  const objects = interior.interactions.objects;
  const conflicts = objects.flatMap(object => {
    const result = auditFaces(object);
    return result.pairs ? [{ room: object.roomIndex, name: object.name, ...result }] : [];
  });
  floors.push({ floor: section.id, targets: objects.length, affectedTargets: conflicts.length,
    sameFacingOverlapPairs: conflicts.reduce((sum, object) => sum + object.pairs, 0), conflicts });
  totals.targets += objects.length;
  totals.affectedTargets += conflicts.length;
  totals.sameFacingOverlapPairs += floors.at(-1).sameFacingOverlapPairs;

  if (section.id !== 'about') continue;
  const controls = interior.interactions, object = objects.find(object => object.name === 'Grand piano');
  const keyParts = object.parts.filter(part => part.key !== undefined);
  const groups = [...new Set(keyParts.map(part => part.key))].sort((a, b) => a - b);
  controls.activate(object, 0); controls.update(320);
  let maxKeyDeltaError = 0, maxBodyMovement = 0;
  for (const part of object.parts) {
    const positions = part.geometry.attributes.position.array;
    const expectedDip = part.key === undefined ? 0 : -object.pulse * .065 * (.6 + .4 * Math.sin(part.key * 1.7 + object.wave * 3));
    for (let vertex = 0; vertex < part.count; vertex++) for (let axis = 0; axis < 3; axis++) {
      const delta = positions[(part.start + vertex) * 3 + axis] - part.rest[vertex * 3 + axis];
      if (part.key === undefined) maxBodyMovement = Math.max(maxBodyMovement, Math.abs(delta));
      else maxKeyDeltaError = Math.max(maxKeyDeltaError, Math.abs(delta - (axis === 1 ? expectedDip : 0)));
    }
  }
  controls.update(2000);
  let maxRestoreError = 0;
  for (const part of object.parts) for (let index = 0; index < part.rest.length; index++) {
    maxRestoreError = Math.max(maxRestoreError,
      Math.abs(part.geometry.attributes.position.array[part.start * 3 + index] - part.rest[index]));
  }
  piano = { groups, solidKeyRanges: keyParts.filter(part => part.normals).length,
    outlineKeyRanges: keyParts.filter(part => !part.normals).length,
    allGroupsHaveSolidAndOutline: groups.every(key => keyParts.some(part => part.key === key && part.normals)
      && keyParts.some(part => part.key === key && !part.normals)), maxKeyDeltaError, maxBodyMovement, maxRestoreError };
}

const sourceFiles = ['assets/interiors.js', 'assets/interior-details.js', 'assets/penthouse-details.js',
  'assets/surface-geometry.js', 'assets/furniture-shapes.js', 'scripts/interior-overlap.test.mjs'];
const report = {
  command: 'node state/interior-surface-cleanup/audit-flat-faces.mjs',
  method: {
    geometry: 'Actual rendered batched position/normal buffers, grouped by interaction target across all six floors.',
    normals: 'Triangles whose three vertex normals agree within dot-product .999999; same-facing planes quantized to 1e-5.',
    overlap: 'Independent 2D triangle clipping; positive intersection area greater than 1e-5 local square units.',
    exclusions: 'No scene-ray occlusion filter. Separate objects are not unioned or compared; this scan does not reject intentional physical intersections of plant leaves, wires, or curved components.',
  },
  postBoxUnionBeforeRoundedFixes: {
    targets: 408, affectedTargets: 4, sameFacingOverlapPairs: 38, summedPairOverlapArea: .11214,
    residuals: [
      { floor: 'penthouse', room: 2, name: 'Listening chair', pairs: 6, area: .04036 },
      { floor: 'penthouse', room: 3, name: 'Window lounge chair', pairs: 6, area: .02178 },
      { floor: 'penthouse', room: 3, name: 'Second lounge chair', pairs: 6, area: .02136 },
      { floor: 'experience', room: 2, name: 'Diagnostic suite: instrument lockers, calibration worktable and technician seat', pairs: 20, area: .02864 },
    ],
    interpretation: 'In-memory provenance tagging identified every residual as box-union panels against rounded ExtrudeGeometry. Target-only rays confirmed real exterior object faces. Scene-wall occlusion was not used to dismiss them.',
    fixes: [
      'Penthouse cushionChair arms preserve their front edge -.58 while ending at z=.48; rounded backs begin at .50, leaving .02 separation.',
      'Workbench rear aprons move .02 inward from the rounded tabletop back plane, removing the shared exposed plane.',
    ],
  },
  final: { ...totals, floors },
  piano,
  sourceSha256: Object.fromEntries(sourceFiles.map(path => [path,
    createHash('sha256').update(readFileSync(new URL(`../../${path}`, import.meta.url))).digest('hex')])),
};
writeFileSync(new URL('./geometry-audit.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ final: totals, floors: floors.map(({ floor, targets, sameFacingOverlapPairs }) =>
  ({ floor, targets, sameFacingOverlapPairs })), piano }, null, 2));
