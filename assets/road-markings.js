import { districtPlan, outskirtsRoads, riverPlan, riverEdges } from './city-layout.js';
import { settlementRoads } from './island-settlement.js';

export const roadPaint = Object.freeze({ center: '#e4c16d', edge: '#eee9da', crossing: '#e7d9b5' });
const clearance = 4;

const bridges = riverPlan.bridges.map(center => {
  const banks = [riverEdges(center - 7), riverEdges(center + 7)];
  const deckStart = Math.min(...banks.map(bank => bank.north)) - 8;
  const deckEnd = Math.max(...banks.map(bank => bank.south)) + 8;
  return { id: `bridge-${center}`, group: 'bridge', axis: 'z', center, width: 10,
    start: deckStart - 10, end: Math.max(214, deckEnd + 10),
    profile: [[deckStart - 10, -.64], [deckStart, .31], [deckEnd, .31], [deckEnd + 10, -.50]] };
});

/** The actual road extents, shared by paint coverage and intersection cutouts. */
export const roadNetwork = [
  ...districtPlan.roadCenters.flatMap(center => ['x', 'z'].map(axis => ({
    id: `downtown-${axis}-${center}`, group: 'downtown', axis, center, width: districtPlan.roadWidth,
    start: -170, end: axis === 'z' ? Math.min(170, bridges.find(bridge => bridge.center === center).start) : 170, y: -.65,
  }))),
  ...outskirtsRoads.map(road => ({ ...road, group: 'outskirts', y: -.50 })),
  ...settlementRoads.map(road=>({...road,group:'settlement'})),
  ...bridges,
];

function intervals(start, end, cuts) {
  let spans = [[start, end]];
  for (const [a, b] of cuts) spans = spans.flatMap(([lo, hi]) => {
    if (b <= lo || a >= hi) return [[lo, hi]];
    return [[lo, Math.max(lo, a)], [Math.min(hi, b), hi]].filter(([x, y]) => y - x > .05);
  });
  return spans;
}

function roadHeight(road, along) {
  if (!road.profile) return road.y;
  for (let i = 1; i < road.profile.length; i++) {
    const [a, y0] = road.profile[i - 1], [b, y1] = road.profile[i];
    if (along <= b) return y0 + (y1 - y0) * Math.max(0, Math.min(1, (along - a) / (b - a)));
  }
  return road.profile.at(-1)[1];
}

/** World-width paint, interrupted before junctions, stop bars and crossings. */
export function planRoadMarkings(group) {
  const patches = [];
  for (const road of roadNetwork.filter(road => road.group === group)) {
    const cuts = roadNetwork.filter(other => other.axis !== road.axis
      && road.center >= other.start - road.width / 2 && road.center <= other.end + road.width / 2
      && other.center >= road.start - other.width / 2 - clearance && other.center <= road.end + other.width / 2 + clearance)
      .map(other => [other.center - other.width / 2 - clearance, other.center + other.width / 2 + clearance]);
    if (group === 'downtown') cuts.push([-9, 9]); // Existing plaza crossings and stop bars.
    const spans = intervals(road.start, road.end, cuts);
    const levels = road.profile ? road.profile.map(point => point[0]) : [];
    const bands = [
      { type: 'center', across: -.22, width: .20 }, { type: 'center', across: .22, width: .20 },
      { type: 'edge', across: -road.width / 2 + .6, width: .20 },
      { type: 'edge', across: road.width / 2 - .6, width: .20 },
    ];
    for (const [start, end] of spans) {
      // Split at ramp/deck joins so the paint follows the actual road slope.
      const stops = [start, ...levels.filter(at => at > start && at < end), end];
      for (let i = 1; i < stops.length; i++) for (const band of bands) {
        const a = band.across - band.width / 2, b = band.across + band.width / 2;
        const lo = stops[i - 1], hi = stops[i];
        const point = (across, along) => road.axis === 'z'
          ? [road.center + across, roadHeight(road, along) + .025, along]
          : [along, roadHeight(road, along) + .025, road.center + across];
        const points = road.axis === 'z'
          ? [point(a, lo), point(a, hi), point(b, hi), point(b, lo)]
          : [point(a, lo), point(b, lo), point(b, hi), point(a, hi)];
        patches.push({ roadId: road.id, type: band.type, color: roadPaint[band.type], points });
      }
    }
  }
  return patches;
}
