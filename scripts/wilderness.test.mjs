import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mountainRegions, createMountainLandscape, mountainTerrainHeight } from '../assets/mountain-landscape.js';
import { createIslandWilderness, islandTerrainHeight } from '../assets/island-wilderness.js';
import { citySceneryRadius, islandFramingRadius, islandContains, oceanY } from '../assets/city-geography.js';
import { cameraDepthRange } from '../assets/camera-framing.js';
import { riverPlan, riverCenter } from '../assets/city-layout.js';

const mountains = createMountainLandscape(), island = createIslandWilderness();
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const tolerance = .003;

// Independently intersect the uploaded triangles. Testing only the generator's
// height function against its own root metadata would miss a floating forest.
function terrainSampler(data) {
  const buckets = new Map(), cellSize = 96, p = data.positions;
  for (let i = 0; i < data.terrainVertexCount * 3; i += 9) {
    const a = p.slice(i, i + 3), b = p.slice(i + 3, i + 6), c = p.slice(i + 6, i + 9);
    const denominator = (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2]);
    if (Math.abs(denominator) < 1e-8) continue;
    const nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]);
    const ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
    const nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const triangle = { a, b, c, denominator, normalY: ny / Math.hypot(nx, ny, nz) };
    const minX = Math.floor(Math.min(a[0], b[0], c[0]) / cellSize), maxX = Math.floor(Math.max(a[0], b[0], c[0]) / cellSize);
    const minZ = Math.floor(Math.min(a[2], b[2], c[2]) / cellSize), maxZ = Math.floor(Math.max(a[2], b[2], c[2]) / cellSize);
    for (let x = minX; x <= maxX; x++) for (let z = minZ; z <= maxZ; z++) {
      const key = `${x},${z}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(triangle);
    }
  }
  return (x, z) => {
    let hit = null;
    for (const triangle of buckets.get(`${Math.floor(x / cellSize)},${Math.floor(z / cellSize)}`) || []) {
      const { a, b, c, denominator } = triangle;
      const u = ((b[2] - c[2]) * (x - c[0]) + (c[0] - b[0]) * (z - c[2])) / denominator;
      const v = ((c[2] - a[2]) * (x - c[0]) + (a[0] - c[0]) * (z - c[2])) / denominator;
      if (u < -1e-6 || v < -1e-6 || u + v > 1 + 1e-6) continue;
      const height = a[1] * u + b[1] * v + c[1] * (1 - u - v);
      if (!hit || height > hit.height) hit = { height, normalY: triangle.normalY };
    }
    return hit;
  };
}

test('landscape generation is repeatable, complete, and within its geometry budget', async () => {
  const freshMountains = (await import('../assets/mountain-landscape.js?determinism-check')).createMountainLandscape();
  const freshIsland = (await import('../assets/island-wilderness.js?determinism-check')).createIslandWilderness();
  for (const [data, repeated] of [[mountains, freshMountains], [island, freshIsland]]) {
    assert.equal(data.positions.length % 9, 0, 'The landscape is made of complete triangles');
    assert.equal(data.positions.length, data.colors.length, 'Every vertex has a baked surface color');
    assert.ok(data.positions.every(Number.isFinite) && data.colors.every(Number.isFinite));
    assert.ok(data.colors.every(value => value >= 0 && value <= 1.5));
    assert.ok(data.terrainVertexCount > 0 && data.terrainVertexCount % 3 === 0);
    assert.ok(data.terrainVertexCount < data.positions.length / 3, 'Forests and continuous land both have geometry');
    assert.equal(digest(data.positions), digest(repeated.positions), 'Reloading does not replace the terrain with another random landscape');
    assert.equal(digest(data.colors), digest(repeated.colors));
    assert.equal(digest(data.trees), digest(repeated.trees));
  }
  assert.ok((mountains.positions.length + island.positions.length) / 9 <= 34_000, 'The new terrain and forests retain room under the complete-city triangle budget');
});

test('six mountain regions have distinct normalized terrain profiles and peak arrangements', () => {
  assert.equal(mountainRegions.length, 6);
  assert.equal(new Set(mountainRegions.map(region => region.id)).size, 6);
  assert.equal(new Set(mountainRegions.map(region => region.name)).size, 6);
  const profiles = mountainRegions.map(region => {
    const values = [], c = Math.cos(region.yaw), s = Math.sin(region.yaw);
    for (let u = -.7; u <= .701; u += .175) for (let v = -.7; v <= .701; v += .175) {
      const x = region.x + u * region.rx * c - v * region.rz * s;
      const z = region.z + u * region.rx * s + v * region.rz * c;
      values.push(mountainTerrainHeight(x, z) - oceanY);
    }
    const maximum = Math.max(...values);
    assert.ok(maximum > 90, `${region.name}: a real mountain profile rises above its coast`);
    return values.map(value => value / maximum);
  });
  for (let i = 0; i < profiles.length; i++) for (let j = i + 1; j < profiles.length; j++) {
    const difference = profiles[i].reduce((sum, value, k) => sum + Math.abs(value - profiles[j][k]), 0) / profiles[i].length;
    assert.ok(difference > .025, 'No mountain region is a translated, rotated or uniformly scaled copy of another');
  }
  const normalizedPeaks = mountainRegions.map(region => {
    const maximum = Math.max(...region.peaks.map(peak => peak[4]));
    return digest(region.peaks.map(peak => peak.map((value, i) => Math.round((i === 4 ? value / maximum : value) * 1000) / 1000)));
  });
  assert.equal(new Set(normalizedPeaks).size, mountainRegions.length, 'Independent plans accompany the different actual silhouettes');
  const peakCounts = new Set(mountainRegions.map(region => region.peaks.length));
  assert.ok(peakCounts.size > 1, 'The skyline does not repeat a fixed number of peaks in every direction');
});

test('forest distribution varies by region, species, scale and angular sector', () => {
  for (const data of [mountains, island]) {
    assert.ok(data.trees.length >= 200, 'Broad forest cover supplements the intervening terrain');
    assert.ok(new Set(data.trees.map(tree => tree.type)).size >= 2, 'A single stamped crown does not stand for every forest');
    const heights = data.trees.map(tree => tree.height);
    assert.ok(Math.max(...heights) - Math.min(...heights) > 8, 'Tree height varies continuously');
    assert.ok(new Set(heights.map(height => Math.round(height * 10))).size > 25);
    const regions = new Map();
    for (const tree of data.trees) regions.set(tree.region, (regions.get(tree.region) || 0) + 1);
    assert.ok(regions.size >= 4, 'Forests occur in several independently composed areas');
    const counts = [...regions.values()];
    assert.ok(Math.max(...counts) / Math.min(...counts) > 1.1, 'Forest regions do not repeat identical patch populations');
  }
  const sectors = Array(8).fill(0);
  for (const tree of [...mountains.trees, ...island.trees]) sectors[Math.floor((Math.atan2(tree.z, tree.x) + Math.PI) / (Math.PI / 4)) % 8]++;
  assert.ok(sectors.every(count => count > 10), 'Every orbit direction sees a wooded landscape');
  const mean = sectors.reduce((sum, count) => sum + count, 0) / sectors.length;
  const variation = Math.sqrt(sectors.reduce((sum, count) => sum + (count - mean) ** 2, 0) / sectors.length) / mean;
  assert.ok(variation > .08, 'The forest is not a uniform circular band');
});

test('mountain placement has uneven distances, coast sizes and open-water angular gaps',()=>{
  const distances=mountainRegions.map(region=>Math.hypot(region.x,region.z));
  const areas=mountainRegions.map(region=>region.rx*region.rz);
  assert.ok(Math.max(...distances)/Math.min(...distances)>1.35,'The ranges are not laid out at one shared radius');
  assert.ok(Math.max(...areas)/Math.min(...areas)>2,'Landmasses have materially different extents');
  const angles=mountainRegions.map(region=>(Math.atan2(region.z,region.x)+Math.PI*2)%(Math.PI*2)).sort((a,b)=>a-b);
  const gaps=angles.map((angle,i)=>(angles[(i+1)%angles.length]-angle+Math.PI*2)%(Math.PI*2));
  assert.ok(Math.max(...gaps)/Math.min(...gaps)>1.7,'Open-ocean gaps are not evenly spaced');
  for(const turn of [Math.PI/3,Math.PI/2,Math.PI*2/3,Math.PI]){
    const c=Math.cos(turn),s=Math.sin(turn);
    const matches=mountainRegions.filter(a=>mountainRegions.some(b=>a!==b&&Math.hypot(a.x*c-a.z*s-b.x,a.x*s+a.z*c-b.z)<400)).length;
    assert.ok(matches<=3,'Rotating the plan does not reproduce the same surrounding arrangement');
  }
});

test('every forest root sits on actual dry terrain with usable slope', () => {
  for (const [data, heightAt, mainIsland] of [[mountains, mountainTerrainHeight, false], [island, islandTerrainHeight, true]]) {
    const sample = terrainSampler(data);
    for (const tree of data.trees) {
      assert.ok([tree.x, tree.z, tree.base, tree.height].every(Number.isFinite));
      const surface = sample(tree.x, tree.z);
      assert.ok(surface, 'A tree root must be supported by an uploaded terrain triangle');
      assert.ok(Math.abs(surface.height - tree.base) < tolerance, 'Tree roots neither float nor sink below the visible terrain');
      assert.ok(Math.abs(surface.height - heightAt(tree.x, tree.z)) < tolerance, 'The public height sampler agrees with actual triangles');
      assert.ok(surface.normalY > .5, 'Forests leave sheer cliffs as exposed rock');
      assert.ok(tree.base > oceanY + .15, 'Trees do not grow in the ocean or on the submerged shoreline');
      assert.ok(Number.isInteger(tree.vertexStart) && tree.vertexStart >= data.terrainVertexCount);
      assert.ok(Number.isInteger(tree.vertexCount) && tree.vertexCount >= 3 && tree.vertexStart + tree.vertexCount <= data.positions.length / 3);
      let lowest = Infinity, highest = -Infinity;
      for (let vertex = tree.vertexStart; vertex < tree.vertexStart + tree.vertexCount; vertex++) {
        lowest = Math.min(lowest, data.positions[vertex * 3 + 1]); highest = Math.max(highest, data.positions[vertex * 3 + 1]);
      }
      assert.ok(Math.abs(lowest - tree.base) < tolerance, 'Actual tree geometry reaches its supported root elevation');
      assert.ok(Math.abs(highest - tree.base - tree.height) < tolerance, 'The visible crown uses the recorded individual tree height');
      if (mainIsland) {
        assert.ok(islandContains(tree.x, tree.z, .978), 'Main-island forest stays inland of the wet shore');
        if (tree.x >= riverPlan.minX && tree.x <= riverPlan.mouthX) assert.ok(Math.abs(tree.z - riverCenter(tree.x)) > riverPlan.halfWidth + 1, 'The river channel remains clear of trees');
        const lake = ((tree.x - riverPlan.minX) / 55) ** 2 + ((tree.z - riverCenter(riverPlan.minX)) / 36) ** 2;
        assert.ok(lake > 1, 'The headwater lake remains open water');
      }
    }
    assert.equal(heightAt(9000, 9000), oceanY, 'Outside the land is ocean rather than an extended terrain sheet');
  }
});

test('all actual terrain and forest vertices remain inside scenery and camera depth bounds', () => {
  assert.ok(citySceneryRadius > islandFramingRadius, 'The far scenery radius is separate from central-island framing');
  assert.ok(islandFramingRadius >= 1400 && islandFramingRadius <= 1800, 'The central island retains useful framing');
  for (const data of [mountains, island]) {
    for (let i = 0; i < data.positions.length; i += 3) assert.ok(Math.hypot(data.positions[i], data.positions[i + 1], data.positions[i + 2]) < citySceneryRadius, 'The bound includes every actual mountain and crown vertex, not just landmass centers');
    for (const distance of [150, 650, 2800, 12000]) for (let side = 0; side < 8; side++) {
      const angle = side * Math.PI / 4, { far } = cameraDepthRange(distance), polar = 1.35;
      const dx = Math.sin(polar) * Math.sin(angle), dy = Math.cos(polar), dz = Math.sin(polar) * Math.cos(angle);
      for (let i = 0; i < data.positions.length; i += 3) {
        const depth = distance - (data.positions[i] * dx + data.positions[i + 1] * dy + data.positions[i + 2] * dz);
        assert.ok(depth < far - 20, 'Distant peaks do not clip as the camera orbits or zooms');
      }
    }
  }
});
