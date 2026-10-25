import * as T from './vendor/three.module.min.js';
import { islandContains } from './city-geography.js';
import {count,scales,rings,center,smooth,hash,noise,cell,river,islandTerrainHeight} from './island-topography.js';
import { settlementOccupied } from './island-settlement.js';
export {islandTerrainHeight} from './island-topography.js';

/** Continuous asymmetric terrain and independently varied trees, in one batch. */
export function createIslandWilderness() {
  const positions = [], colors = [], trees = [], rocks = [], features = [];
  const colorCache = new Map(), color = hex => {
    if (!colorCache.has(hex)) colorCache.set(hex, new T.Color(hex).toArray()); return colorCache.get(hex);
  };
  const sun = new T.Vector3(-.45, .8, -.39).normalize();
  const triangle = (a, b, c, tint) => {
    const ab = new T.Vector3().subVectors(new T.Vector3(...b), new T.Vector3(...a));
    const ac = new T.Vector3().subVectors(new T.Vector3(...c), new T.Vector3(...a));
    const normal = ab.cross(ac).normalize(), shade = .62 + Math.max(0, normal.dot(sun)) * .32 + Math.max(0, normal.y) * .11;
    for (const [index, p] of [a, b, c].entries()) {
      const rgb = color(Array.isArray(tint) ? tint[index] : tint);
      positions.push(...p); colors.push(...rgb.map(value => value * shade));
    }
  };
  const floorTint=new T.Color(),forestTint=new T.Color('#365c47');
  const terrainColor = p => {
    const s = cell(p[0], p[2]).scale, h = p[1];
    if (s > .992) return '#84948b';
    if (s > .974) return '#b3ad8d';
    if (s > .948) return '#959c7d';
    if (h > 26 && p[0] < -600) return '#828678';
    const meadow=p[2]>580&&p[0]>-160;
    const tint=meadow?(noise(p[0]*.009,p[2]*.009,3)>.5?'#8d986d':'#7e8e66'):(noise(p[0]*.008,p[2]*.008,2)>.54?'#788b66':'#718764');
    if(Math.abs(p[0])<532&&p[2]>-525&&p[2]<545)return tint;
    const region=p[2]<-420?'north':p[0]<-520?'west':p[2]>530?'south':'east';
    const density=({north:.88,west:.64,south:.28,east:.47})[region];
    const cover=smooth(.22,.74,noise(p[0]*.0053+12,p[2]*.0053-8,31))*density;
    const riverClear=p[0]<-930?1:smooth(53,90,Math.abs(p[2]-river(p[0])));
    return `#${floorTint.set(tint).lerp(forestTint,cover*riverClear*(1-smooth(.88,.946,s))*.92).getHexString()}`;
  };
  const groundTriangle = (a, b, c) => triangle(a, b, c, [terrainColor(a), terrainColor(b), terrainColor(c)]);
  for (let i = 0; i < count; i++) {
    const next = (i + 1) % count;
    groundTriangle(center, rings[1][next], rings[1][i]);
    for (let ring = 1; ring < scales.length - 1; ring++) {
      const a = rings[ring][i], b = rings[ring][next], c = rings[ring + 1][next], d = rings[ring + 1][i];
      groundTriangle(a, b, c); groundTriangle(a, c, d);
    }
  }
  const terrainVertexCount = positions.length / 3;
  const regionAt = (x, z) => z < -420 ? 'north' : x < -520 ? 'west' : z > 530 ? 'south' : 'east';
  const candidates = [];
  for (let gx = -39; gx <= 39; gx++) for (let gz = -39; gz <= 41; gz++) {
    const x = gx * 29 + (hash(gx, gz, 1) - .5) * 26, z = gz * 29 + (hash(gx, gz, 2) - .5) * 26;
    if (!islandContains(x, z, .925) || (Math.abs(x) < 532 && z > -525 && z < 545)) continue;
    if (x > -930 && Math.abs(z - river(x)) < 53) continue;
    const region = regionAt(x, z), patch = noise(x * .0053 + 12, z * .0053 - 8, 31);
    const density = ({ north: .88, west: .64, south: .28, east: .47 })[region];
    const clearing = noise(x * .012, z * .012, 83);
    if (hash(gx, gz, 9) > density * smooth(.18, .77, patch) * (.35 + clearing * .8)) continue;
    candidates.push({ x, z, region, key: hash(gx, gz, 122), seed: hash(gx, gz, 512) * 100000 | 0 });
  }
  candidates.sort((a, b) => a.key - b.key);
  for (const candidate of candidates) {
    if (trees.length >= 440) break;
    const { x, z, region, seed } = candidate;
    if (trees.some(tree => Math.hypot(tree.x - x, tree.z - z) < 11)) continue;
    const base = islandTerrainHeight(x, z), variation = hash(seed, 4), height = 10 + variation * 17;
    const type = region === 'north' ? (variation > .25 ? 'fir' : 'broadleaf') : region === 'west' ? (variation > .24 ? 'wind-pine' : 'fir') : variation > .43 ? 'broadleaf' : 'wind-pine';
    const radius = (type === 'broadleaf' ? .25 : .19) * height * (.84 + hash(seed, 10) * .34);
    if(settlementOccupied(x,z,radius+1))continue;
    if (!islandContains(x + radius, z + radius, .95) || !islandContains(x - radius, z - radius, .95)) continue;
    const yaw = hash(seed, 6) * Math.PI * 2, leanX = (hash(seed, 7) - .5) * height * .12, leanZ = (hash(seed, 8) - .5) * height * .10;
    const leaf = type === 'fir' ? '#3e6550' : type === 'wind-pine' ? '#526e50' : '#5f7e51';
    const sides = type === 'fir' && hash(seed, 16) > .5 ? 5 : 4;
    const vertexStart = positions.length / 3;
    const crown = Array.from({ length: sides }, (_, i) => {
      const angle = yaw + i * Math.PI * 2 / sides, r = radius * (.8 + hash(seed + i, 1) * .4);
      return [x + leanX * .45 + Math.cos(angle) * r, base + height * (type === 'broadleaf' ? .60 : .36) + (hash(seed + i, 2) - .5) * height * .11, z + leanZ * .45 + Math.sin(angle) * r];
    });
    const top = [x + leanX, base + height, z + leanZ], bottom = [x, base + height * .25, z];
    for (let i = 0; i < sides; i++) {
      const next = (i + 1) % sides;
      triangle(top, crown[next], crown[i], leaf);
      triangle(bottom, crown[i], crown[next], leaf);
    }
    const trunkRadius = .25 + height * .011;
    for (let i = 0; i < 3; i++) {
      const angle = yaw + i * Math.PI * 2 / 3, next = angle + Math.PI * 2 / 3;
      triangle([x + Math.cos(angle) * trunkRadius, base, z + Math.sin(angle) * trunkRadius], [x + leanX * .3, base + height * .4, z + leanZ * .3], [x + Math.cos(next) * trunkRadius, base, z + Math.sin(next) * trunkRadius], '#786e53');
    }
    trees.push({ x, z, base, height, radius, type, region, seed, vertexStart, vertexCount: positions.length / 3 - vertexStart });
  }
  // Individual outcrops follow the western slope; no repeated circular patches.
  for (let i = 0; i < 22; i++) {
    const x = -1040 + hash(i, 71) * 290, z = -490 + hash(i, 72) * 740;
    if (!islandContains(x, z, .92) || Math.abs(z - river(x)) < 80 || islandTerrainHeight(x, z) < 3) continue;
    const base = islandTerrainHeight(x, z), radius = 3 + hash(i, 73) * 6, height = 2 + hash(i, 74) * 7;
    if(settlementOccupied(x,z,radius+1))continue;
    const vertexStart = positions.length / 3;
    const rock = Array.from({ length: 5 }, (_, j) => {
      const a = j * Math.PI * 2 / 5, r = radius * (.75 + hash(i, j, 15) * .5), px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      return [px, islandTerrainHeight(px, pz) - .2, pz];
    });
    const top = [x + radius * .27, Math.max(base + height, ...rock.map(p => p[1] + height * .25)), z - radius * .17];
    for (let j = 0; j < 5; j++) triangle(top, rock[(j + 1) % 5], rock[j], '#888d7e');
    rocks.push({ x, z, base, height: top[1] - base, radius, vertexStart, vertexCount: positions.length / 3 - vertexStart });
  }
  for (const region of ['north', 'west', 'south', 'east']) {
    const regional = trees.filter(tree => tree.region === region);
    features.push({ kind: 'island-wilderness-region', region, trees: regional.length, meanHeight: regional.reduce((sum, tree) => sum + tree.height, 0) / Math.max(1, regional.length) });
  }
  return { positions, colors, trees, rocks, features, terrainVertexCount, vegetationVertexStart: terrainVertexCount, vegetationVertexCount: positions.length / 3 - terrainVertexCount };
}
