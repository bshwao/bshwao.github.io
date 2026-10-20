/** Original procedural supertall: a street-level perspective, drawn entirely in SVG. */
export function createSkyscraper() {
  const blue = '#2c568f';
  const precision = (value) => Number(value.toFixed(1));
  const xy = (p) => `${precision(p[0])},${precision(p[1])}`;
  const length = (p) => Math.hypot(...p);
  const normal = (p) => p.map((n) => n / length(p));
  const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const camera = [430, -720, 52];
  const forward = normal([-camera[0], -camera[1], 480 - camera[2]]);
  const right = normal(cross(forward, [0, 0, 1]));
  const up = cross(right, forward);
  const rawProjection = (p) => {
    const relative = p.map((n, i) => n - camera[i]);
    const depth = dot(relative, forward);
    return [dot(relative, right) / depth, -dot(relative, up) / depth];
  };

  // Three rounded, fluted wings retreat at different elevations around a slender core.
  // Unequal setbacks are intentional: the silhouette keeps changing as the eye rises.
  const wings = [
    { angle: -Math.PI / 2, reach: 182, levels: [0, 170, 315, 440, 550, 645, 725, 795, 850, 895, 932, 960, 980] },
    { angle: Math.PI / 6, reach: 169, levels: [0, 120, 265, 395, 510, 610, 700, 775, 835, 885, 925, 955, 978] },
    { angle: Math.PI * 5 / 6, reach: 174, levels: [0, 215, 355, 480, 585, 680, 755, 820, 870, 910, 944, 968, 987] },
  ];
  const retreat = [1, .9, .77, .65, .54, .44, .35, .27, .2, .14, .09, .05, .02];
  const elevations = [...new Set(wings.flatMap((wing) => wing.levels))].sort((a, b) => a - b);
  const core = (z) => {
    if (z < 500) return 54 - z * .026;
    if (z < 800) return 41 - (z - 500) * .05;
    if (z < 950) return 26 - (z - 800) * .1;
    return Math.max(1.9, 11 - (z - 950) * .19);
  };
  const angularDistance = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const radius = (angle, z) => {
    if (z >= 995) return Math.max(.08, 3.1 * (1100 - z) / 105);
    let result = core(z);
    for (const wing of wings) {
      let stage = 0;
      while (stage + 1 < wing.levels.length && z >= wing.levels[stage + 1]) stage += 1;
      const delta = angularDistance(angle, wing.angle);
      const lobe = Math.exp(-.5 * (delta / .44) ** 2);
      // Paired little radii form shallow curved bays in the curtain wall.
      const fluting = 1 + .035 * Math.cos(delta * 25) * Math.exp(-.5 * (delta / .65) ** 2);
      result += wing.reach * retreat[stage] * lobe * fluting;
    }
    return result;
  };
  const surface = (angle, z) => {
    const r = radius(angle, z);
    return [Math.cos(angle) * r, Math.sin(angle) * r, z];
  };

  const samples = 108;
  const circle = Array.from({ length: samples }, (_, i) => i * Math.PI * 2 / samples);
  const outlineSamples = [];
  for (const z of [0, ...elevations, 995, 1100]) {
    for (const angle of circle) outlineSamples.push(rawProjection(surface(angle, z)));
  }
  const rawBounds = {
    minX: Math.min(...outlineSamples.map((p) => p[0])), maxX: Math.max(...outlineSamples.map((p) => p[0])),
    minY: Math.min(...outlineSamples.map((p) => p[1])), maxY: Math.max(...outlineSamples.map((p) => p[1])),
  };
  const horizontalScale = 690 / (rawBounds.maxX - rawBounds.minX);
  const verticalScale = 1030 / (rawBounds.maxY - rawBounds.minY);
  const project = (p) => {
    const raw = rawProjection(p);
    return [205 + (raw[0] - rawBounds.minX) * horizontalScale, 35 + (raw[1] - rawBounds.minY) * verticalScale];
  };
  const projectedSurface = (angle, z) => project(surface(angle, z));
  const path = (points, close = false) => points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xy(p)}`).join('') + (close ? 'Z' : '');
  const segment = (a, b) => `M${xy(a)}L${xy(b)}`;
  const bounds = (points) => ({
    minX: Math.min(...points.map((p) => p[0])), maxX: Math.max(...points.map((p) => p[0])),
    minY: Math.min(...points.map((p) => p[1])), maxY: Math.max(...points.map((p) => p[1])),
  });

  const sections = [
    { id: 'about', title: 'About', subtitle: 'THE PERSON BEHIND THE PLANS', low: 785, high: 1100, dx: -100, dy: -30 },
    { id: 'projects', title: 'Projects', subtitle: 'IDEAS / EXPERIMENTS / BUILDS', low: 525, high: 785, dx: 100, dy: -15 },
    { id: 'experience', title: 'Experience', subtitle: 'WHERE I HAVE MADE AN IMPACT', low: 315, high: 525, dx: -100, dy: 0 },
    { id: 'resume', title: 'Résumé', subtitle: 'EDUCATION / SKILLS / THE PDF', low: 145, high: 315, dx: 100, dy: 15 },
    { id: 'contact', title: 'Contact', subtitle: 'LET’S BUILD SOMETHING', low: 0, high: 145, dx: -110, dy: 30 },
  ];

  const hull = (points) => {
    const sorted = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const turn = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const lower = [];
    for (const point of sorted) {
      while (lower.length > 1 && turn(lower.at(-2), lower.at(-1), point) <= 0) lower.pop();
      lower.push(point);
    }
    const upper = [];
    for (const point of sorted.slice().reverse()) {
      while (upper.length > 1 && turn(upper.at(-2), upper.at(-1), point) <= 0) upper.pop();
      upper.push(point);
    }
    return lower.slice(0, -1).concat(upper.slice(0, -1));
  };

  function makeSection(section, index) {
    const { low, high } = section;
    const changes = elevations.filter((z) => z > low && z < high);
    const zSamples = [low, high];
    for (const z of changes) zSamples.push(z - .02, z);
    if (low < 995 && high > 995) zSamples.push(994.98, 995);
    // Midpoints preserve the slight taper between the true horizontal setbacks.
    for (let z = Math.ceil(low / 34) * 34; z < high; z += 34) if (z > low) zSamples.push(z);
    zSamples.sort((a, b) => a - b);
    const floorLevels = [];
    for (let z = Math.ceil(low / 5.7) * 5.7; z <= Math.min(high, 995); z += 5.7) floorLevels.push(z);
    if (high === 1100) for (let z = 1002; z < 1082; z += 10) floorLevels.push(z);
    const sectionPoints = [];
    const ribbons = [];

    for (let i = 0; i < samples; i += 1) {
      const a = circle[i];
      const b = a + Math.PI * 2 / samples;
      const midpoint = (a + b) / 2;
      const midZ = (low + Math.min(high, 995)) / 2;
      const worldA = surface(a, midZ);
      const worldB = surface(b, midZ);
      const outward = [worldB[1] - worldA[1], worldA[0] - worldB[0], 0];
      const towardCamera = camera.map((n, axis) => n - (worldA[axis] + worldB[axis]) / 2);
      // Rear radial faces form floating panels at the section cuts; omit them
      // from the shared geometry used by both collapsed and expanded views.
      if (dot([Math.cos(midpoint), Math.sin(midpoint), 0], towardCamera) <= 0) continue;
      if (dot(outward, towardCamera) <= 0) continue;

      const left = zSamples.map((z) => projectedSurface(a, z));
      const rightEdge = zSamples.map((z) => projectedSurface(b, z));
      const outline = left.concat(rightEdge.slice().reverse());
      sectionPoints.push(...outline);
      let floors = '';
      let windowHeads = '';
      let mechanical = '';
      for (const z of floorLevels) {
        floors += segment(projectedSurface(a, z), projectedSurface(b, z));
        if (z + .9 < Math.min(high, 995)) windowHeads += segment(projectedSurface(a, z + .9), projectedSurface(b, z + .9));
        // Fine parallel louvers mark occasional mechanical storeys, not heavy slabs.
        if (Math.floor(z / 5.7) % 27 < 3 && z < 940) {
          for (const dz of [1.8, 2.7, 3.6, 4.5]) {
            if (z + dz < high) mechanical += segment(projectedSurface(a, z + dz), projectedSurface(b, z + dz));
          }
        }
      }
      for (const z of changes) {
        floors += segment(projectedSurface(a, z - .02), projectedSurface(b, z - .02));
        floors += segment(projectedSurface(a, z), projectedSurface(b, z));
      }
      const mullions = path(left) + path(zSamples.map((z) => projectedSurface(midpoint, z)));
      const depth = dot(worldA.map((n, axis) => n - camera[axis]), forward);
      ribbons.push({
        depth,
        markup: `<g class="facade-ribbon"><path d="${path(outline, true)}" fill="#fff" stroke="none"/><path d="${floors}" stroke-width=".6"/><path d="${windowHeads}" stroke-width=".3" opacity=".8"/><path d="${mullions}" stroke-width="${i % 9 === 0 ? '.85' : '.46'}"/><path d="${mechanical}" stroke-width=".44" opacity=".85"/></g>`,
      });
    }
    ribbons.sort((a, b) => b.depth - a.depth);
    const artBounds = bounds(sectionPoints);
    const transform = `--floor-index:${index};--expand-x:${section.dx}px;--expand-y:${section.dy}px`;
    const onLeft = index % 2 === 1;
    const titleX = onLeft ? artBounds.minX - 32 : artBounds.maxX + 32;
    const titleY = (artBounds.minY + artBounds.maxY) / 2;
    const leaderStart = onLeft ? artBounds.minX - 3 : artBounds.maxX + 3;
    const leaderEnd = onLeft ? titleX + 9 : titleX - 9;
    const anchor = onLeft ? 'end' : 'start';
    const labelHitMinX = Math.max(-section.dx, onLeft ? titleX - 230 : artBounds.maxX - 8);
    const labelHitMaxX = Math.min(1100 - section.dx, onLeft ? artBounds.minX + 8 : titleX + 235);
    return {
      visual: `<g class="tower-module tower-floor-visual" style="${transform}" aria-hidden="true"><g class="floor-architecture">${ribbons.map((ribbon) => ribbon.markup).join('')}</g></g>`,
      interactive: `<g class="tower-module tower-floor" data-room="${section.id}" style="${transform}" role="button" aria-hidden="true" tabindex="-1" aria-haspopup="dialog" aria-controls="room-dialog" aria-label="Open ${section.title}">
        <title>${section.title} — Eric Hsu’s portfolio</title>
        <path class="floor-hit" d="${path(hull(sectionPoints), true)}" fill="transparent" stroke="none"/>
        <rect class="floor-label-hit" x="${precision(labelHitMinX)}" y="${precision(titleY - 42)}" width="${precision(labelHitMaxX - labelHitMinX)}" height="80" fill="transparent" stroke="none" aria-hidden="true"/>
        <g class="floor-label" fill="${blue}" stroke="none" aria-hidden="true">
          <path d="M${precision(leaderStart)} ${precision(titleY + 6)}H${precision(leaderEnd)}" fill="none" stroke="${blue}" stroke-width=".55"/>
          <circle cx="${precision(leaderStart)}" cy="${precision(titleY + 6)}" r="2" fill="#fff" stroke="${blue}" stroke-width=".6"/>
          <text class="floor-number" x="${precision(titleX)}" y="${precision(titleY - 25)}" text-anchor="${anchor}" font-family="Consolas, 'Liberation Mono', monospace" font-size="9" letter-spacing="1.8">0${index + 1} / PORTFOLIO</text>
          <text class="floor-title" x="${precision(titleX)}" y="${precision(titleY)}" text-anchor="${anchor}" font-family="Georgia, 'Times New Roman', serif" font-size="25" letter-spacing="-.6">${section.title}</text>
          <text class="floor-subtitle" x="${precision(titleX)}" y="${precision(titleY + 23)}" text-anchor="${anchor}" font-family="Consolas, 'Liberation Mono', monospace" font-size="8" letter-spacing=".25">${section.subtitle}</text>
        </g>
      </g>`,
    };
  }

  const modules = sections.map((section, index) => makeSection(section, index));
  return `<svg id="portfolio-skyscraper" class="skyscraper-blueprint" viewBox="0 0 1100 1100" xmlns="http://www.w3.org/2000/svg" role="group" aria-labelledby="tower-art-title tower-art-description" fill="none" stroke="${blue}" stroke-width=".5" stroke-linejoin="round" stroke-linecap="round">
    <title id="tower-art-title">Eric Hsu — portfolio skyscraper</title>
    <desc id="tower-art-description">A fine blue architectural drawing of an enormous stepped skyscraper, seen from the street looking toward its needle spire. Expand its five sections to explore About, Projects, Experience, Résumé and Contact.</desc>
    ${modules.map((floor) => floor.visual).reverse().join('')}
    ${modules.map((floor) => floor.interactive).join('')}
  </svg>`;
}
