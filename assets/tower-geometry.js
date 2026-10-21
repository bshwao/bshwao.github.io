/** Shared world-space geometry. Y is up; the complete tower is 110 units tall. */
export const sections = [
  { id: 'about', name: 'About', number: '01', low: 78.5, high: 110, theme: 'The personal study', subtitle: 'THE PERSON BEHIND THE PLANS' },
  { id: 'projects', name: 'Projects', number: '02', low: 52.5, high: 78.5, theme: 'The makers’ workshop', subtitle: 'IDEAS / EXPERIMENTS / BUILDS' },
  { id: 'experience', name: 'Experience', number: '03', low: 31.5, high: 52.5, theme: 'The electronics laboratory', subtitle: 'CIRCUITS / SYSTEMS / THE TRACK' },
  { id: 'resume', name: 'Résumé', number: '04', low: 14.5, high: 31.5, theme: 'The reference archive', subtitle: 'EDUCATION / SKILLS / THE PDF' },
  { id: 'contact', name: 'Contact', number: '05', low: 0, high: 14.5, theme: 'The conversation lounge', subtitle: 'LET’S BUILD SOMETHING' },
];

export const wings = [
  { angle: -Math.PI / 2, reach: 18.2, levels: [0, 17, 31.5, 44, 55, 64.5, 72.5, 79.5, 85, 89.5, 93.2, 96, 98] },
  { angle: Math.PI / 6, reach: 16.9, levels: [0, 12, 26.5, 39.5, 51, 61, 70, 77.5, 83.5, 88.5, 92.5, 95.5, 97.8] },
  { angle: Math.PI * 5 / 6, reach: 17.4, levels: [0, 21.5, 35.5, 48, 58.5, 68, 75.5, 82, 87, 91, 94.4, 96.8, 98.7] },
];
const retreat = [1, .9, .77, .65, .54, .44, .35, .27, .2, .14, .09, .05, .02];
export const setbacks = [...new Set(wings.flatMap(wing => wing.levels))].sort((a, b) => a - b);
export function radius(angle, height) {
  if (height >= 99.5) return Math.max(.008, .31 * (110 - height) / 10.5);
  let value = height < 50 ? 5.4 - height * .026 : height < 80 ? 4.1 - (height - 50) * .05 : height < 95 ? 2.6 - (height - 80) * .1 : Math.max(.19, 1.1 - (height - 95) * .19);
  for (const wing of wings) {
    let stage = 0;
    while (stage + 1 < wing.levels.length && height >= wing.levels[stage + 1]) stage++;
    const delta = Math.atan2(Math.sin(angle - wing.angle), Math.cos(angle - wing.angle));
    value += wing.reach * retreat[stage] * Math.exp(-.5 * (delta / .44) ** 2) * (1 + .035 * Math.cos(delta * 25) * Math.exp(-.5 * (delta / .65) ** 2));
  }
  return value;
}
export function footprint(height, count = 96) {
  return Array.from({ length: count }, (_, i) => {
    const angle = i * Math.PI * 2 / count;
    const r = radius(angle, height);
    return [Math.cos(angle) * r, Math.sin(angle) * r];
  });
}
export function stationPositions(section, count) {
  const positions = wings.map(wing => {
    const reach = radius(wing.angle, section.low + .02);
    return { x: Math.cos(wing.angle) * reach * .59, z: Math.sin(wing.angle) * reach * .59, angle: -wing.angle - Math.PI / 2, reach };
  });
  return count === 3 ? positions : [{ x: 0, z: 0, angle: 0, reach: Math.max(...positions.map(p => p.reach)) * .65 }, ...positions];
}
