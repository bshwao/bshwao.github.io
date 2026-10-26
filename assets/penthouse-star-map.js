/**
 * A small, offline catalog atlas, not an observing-time/location simulator.
 * Coordinates are degrees in the J2000/ICRS catalog frame, rounded to 0.001°.
 * Verified 2026-10-25 against the primary sources linked below. Named-star
 * positions/designations/magnitudes: IAU WGSN table; exceptions cite CDS/ESA.
 * The line sketches are editorial aids, not IAU constellation boundaries.
 */
export const SKY_SOURCES = Object.freeze({
  iau: 'https://iauarchive.eso.org/public/themes/naming_stars/',
  esa: 'https://www.cosmos.esa.int/web/hipparcos/sample-tables-5',
  triangle: 'https://eco.mtk.nao.ac.jp/koyomi/faq/stars.html.en',
  orion: 'https://science.nasa.gov/universe/stories/quick-reads/discovering-the-universe-through-the-constellation-orion/',
  gammaCas: 'https://simbad.cds.unistra.fr/simbad/sim-id?Ident=gam+Cas',
  zetaLyr: 'https://simbad.cds.unistra.fr/simbad/sim-id?Ident=zet01+Lyr',
  deltaLyr: 'https://simbad.cds.unistra.fr/simbad/sim-id?Ident=del02+Lyr',
});

const star = (id, name, constellation, designation, ra, dec, magnitude, fact = '', source = 'iau', color = 'ice') =>
  Object.freeze({ id, name, constellation, designation, ra, dec, magnitude, fact, source: SKY_SOURCES[source], color });

export const SKY_STARS = Object.freeze([
  star('betelgeuse', 'Betelgeuse', 'orion', 'Alpha Orionis', 88.793, 7.407, .45, 'A red supergiant marking one of Orion’s shoulders.', 'orion', 'amber'),
  star('rigel', 'Rigel', 'orion', 'Beta Orionis', 78.634, -8.202, .18, 'A blue supergiant marking one of Orion’s feet.', 'orion'),
  star('bellatrix', 'Bellatrix', 'orion', 'Gamma Orionis', 81.283, 6.350, 1.64),
  star('mintaka', 'Mintaka', 'orion', 'Delta Orionis', 83.002, -.299, 2.25, 'The western end of the three-star belt in this catalog sketch.'),
  star('alnilam', 'Alnilam', 'orion', 'Epsilon Orionis', 84.053, -1.202, 1.69, 'The middle star of Orion’s three-star belt.'),
  star('alnitak', 'Alnitak', 'orion', 'Zeta Orionis', 85.190, -1.943, 1.74, 'The eastern end of Orion’s three-star belt.'),
  star('saiph', 'Saiph', 'orion', 'Kappa Orionis', 86.939, -9.670, 2.07),
  star('dubhe', 'Dubhe', 'ursa-major', 'Alpha Ursae Majoris', 165.932, 61.751, 1.81),
  star('merak', 'Merak', 'ursa-major', 'Beta Ursae Majoris', 165.460, 56.382, 2.34),
  star('phecda', 'Phecda', 'ursa-major', 'Gamma Ursae Majoris', 178.458, 53.695, 2.41),
  star('megrez', 'Megrez', 'ursa-major', 'Delta Ursae Majoris', 183.857, 57.033, 3.32),
  star('alioth', 'Alioth', 'ursa-major', 'Epsilon Ursae Majoris', 193.507, 55.960, 1.76),
  star('mizar', 'Mizar', 'ursa-major', 'Zeta Ursae Majoris', 200.981, 54.925, 2.23),
  star('alkaid', 'Alkaid', 'ursa-major', 'Eta Ursae Majoris', 206.885, 49.313, 1.85),
  star('caph', 'Caph', 'cassiopeia', 'Beta Cassiopeiae', 2.295, 59.150, 2.28),
  star('schedar', 'Schedar', 'cassiopeia', 'Alpha Cassiopeiae', 10.127, 56.537, 2.24),
  star('gamma-cas', 'Gamma Cassiopeiae', 'cassiopeia', 'Gamma Cassiopeiae', 14.177, 60.717, null, 'The middle peak of the five-star W in this sketch.', 'gammaCas'),
  star('ruchbah', 'Ruchbah', 'cassiopeia', 'Delta Cassiopeiae', 21.454, 60.235, 2.66),
  star('segin', 'Segin', 'cassiopeia', 'Epsilon Cassiopeiae', 28.599, 63.670, 3.35),
  star('vega', 'Vega', 'lyra', 'Alpha Lyrae', 279.234, 38.783, .03, 'Together with Deneb and Altair, Vega forms the Summer Triangle.', 'triangle'),
  star('zeta-lyr', 'Zeta¹ Lyrae', 'lyra', 'Zeta¹ Lyrae', 281.193, 37.605, null, 'CDS classifies this star as a spectroscopic binary.', 'zetaLyr'),
  star('delta-lyr', 'Delta² Lyrae', 'lyra', 'Delta² Lyrae', 283.626, 36.899, 4.30, 'CDS classifies this star as a long-period variable.', 'deltaLyr', 'amber'),
  star('sheliak', 'Sheliak', 'lyra', 'Beta Lyrae', 282.520, 33.363, 3.52),
  star('sulafat', 'Sulafat', 'lyra', 'Gamma Lyrae', 284.736, 32.690, 3.25),
  star('deneb', 'Deneb', 'cygnus', 'Alpha Cygni', 310.358, 45.280, 1.25, 'Deneb is one of the three corners of the Summer Triangle.', 'triangle'),
  star('sadr', 'Sadr', 'cygnus', 'Gamma Cygni', 305.557, 40.257, 2.23),
  star('albireo', 'Albireo', 'cygnus', 'Beta¹ Cygni', 292.680, 27.960, 3.05),
  star('fawaris', 'Fawaris', 'cygnus', 'Delta Cygni', 296.244, 45.131, 2.90),
  star('aljanah', 'Aljanah', 'cygnus', 'Epsilon Cygni', 311.553, 33.970, 2.48, 'The IAU-approved name of Epsilon Cygni is Aljanah.'),
  star('altair', 'Altair', 'aquila', 'Alpha Aquilae', 297.696, 8.868, .76, 'Altair completes the Summer Triangle with Vega and Deneb.', 'triangle'),
  star('tarazed', 'Tarazed', 'aquila', 'Gamma Aquilae', 296.565, 10.613, 2.72),
  star('alshain', 'Alshain', 'aquila', 'Beta Aquilae', 298.828, 6.407, 3.71),
  star('polaris', 'Polaris', 'ursa-minor', 'Alpha Ursae Minoris', 37.955, 89.264, 1.97, 'Its catalog declination places it less than one degree from the north celestial pole.'),
]);

const constellation = (id, name, subtitle, description, paths, label, chart) =>
  Object.freeze({ id, name, subtitle, description, paths: Object.freeze(paths.map(Object.freeze)), label: Object.freeze(label), source: `https://iauarchive.eso.org/static/public/constellations/pdf/${chart}.pdf` });

export const SKY_CONSTELLATIONS = Object.freeze([
  constellation('orion', 'Orion', 'The hunter', 'Follow three belt stars between the shoulders and feet. Betelgeuse and Rigel are red and blue supergiants.', [['betelgeuse','bellatrix','mintaka','rigel','saiph','alnitak','betelgeuse'],['mintaka','alnilam','alnitak']], [92, 21], 'ORI'),
  constellation('ursa-major', 'Ursa Major', 'The great bear', 'These seven stars trace the Big Dipper, a familiar pattern within the larger constellation Ursa Major.', [['dubhe','merak','phecda','megrez','dubhe'],['megrez','alioth','mizar','alkaid']], [185, 43], 'UMA'),
  constellation('cassiopeia', 'Cassiopeia', 'The queen', 'Five selected stars form the familiar W pattern. Its orientation here follows the catalog projection.', [['caph','schedar','gamma-cas','ruchbah','segin']], [14, 46], 'CAS'),
  constellation('lyra', 'Lyra', 'The lyre', 'Bright Vega sits beside a small four-star parallelogram. Vega is also a corner of the Summer Triangle.', [['vega','zeta-lyr','delta-lyr','sulafat','sheliak','zeta-lyr']], [267, 31], 'LYR'),
  constellation('cygnus', 'Cygnus', 'The swan', 'The selected stars sketch a cross: Deneb and Albireo along its long axis, with Sadr at the crossing.', [['deneb','sadr','albireo'],['fawaris','sadr','aljanah']], [328, 38], 'CYG'),
  constellation('aquila', 'Aquila', 'The eagle', 'Altair lies between Tarazed and Alshain in this selected-star sketch. It is a corner of the Summer Triangle.', [['tarazed','altair','alshain']], [307, -1], 'AQL'),
  constellation('ursa-minor', 'Ursa Minor', 'The little bear', 'Only Polaris is included here as a reference near the north celestial pole; the rest of the Little Dipper is outside this small catalog.', [], [95, 83], 'UMI'),
]);

export const SKY_WORLD = Object.freeze({ width: 1200, height: 1000, x: 600, y: 490, radius: 430, minDec: -25 });
export const DEFAULT_SKY_VIEW = Object.freeze({ x: 600, y: 500, zoom: 1 });
const byId = new Map(SKY_STARS.map(item => [item.id, item]));
const constellations = new Map(SKY_CONSTELLATIONS.map(item => [item.id, item]));
const limit = (value, min, max) => Math.min(max, Math.max(min, value));
const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let instance = 0;

/** North-polar azimuthal equidistant projection. RA increases clockwise. */
export function projectStar({ ra, dec }) {
  const radius = (90 - dec) / (90 - SKY_WORLD.minDec) * SKY_WORLD.radius;
  const angle = ra * Math.PI / 180;
  return { x: SKY_WORLD.x + radius * Math.sin(angle), y: SKY_WORLD.y - radius * Math.cos(angle) };
}

export function clampSkyView(view = DEFAULT_SKY_VIEW) {
  const zoom = limit(finite(view.zoom, 1), 1, 9);
  const halfX = SKY_WORLD.width / (2 * zoom), halfY = SKY_WORLD.height / (2 * zoom);
  return { x: limit(finite(view.x, 600), halfX, SKY_WORLD.width - halfX), y: limit(finite(view.y, 500), halfY, SKY_WORLD.height - halfY), zoom };
}

export function skyScale(view, viewport) {
  return Math.min(viewport.width / SKY_WORLD.width, viewport.height / SKY_WORLD.height) * view.zoom;
}

export function skyToScreen(point, view, viewport) {
  const scale = skyScale(view, viewport);
  return { x: viewport.width / 2 + (point.x - view.x) * scale, y: viewport.height / 2 + (point.y - view.y) * scale };
}

export function screenToSky(point, view, viewport) {
  const scale = skyScale(view, viewport);
  return { x: view.x + (point.x - viewport.width / 2) / scale, y: view.y + (point.y - viewport.height / 2) / scale };
}

export function zoomSkyView(view, factor, anchor, viewport) {
  if (!Number.isFinite(factor) || factor <= 0) return clampSkyView(view);
  const old = screenToSky(anchor, view, viewport);
  const next = clampSkyView({ ...view, zoom: view.zoom * factor });
  const scale = skyScale(next, viewport);
  return clampSkyView({ ...next, x: old.x - (anchor.x - viewport.width / 2) / scale, y: old.y - (anchor.y - viewport.height / 2) / scale });
}

export function filterSkyStars(query = '', constellationId = 'all') {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return SKY_STARS.filter(item => (constellationId === 'all' || item.constellation === constellationId) && terms.every(term =>
    `${item.name} ${item.designation} ${constellations.get(item.constellation).name}`.toLocaleLowerCase().includes(term)));
}

export function nearestSkyStar(point, view, viewport, stars = SKY_STARS, radius = 22) {
  let nearest = null, distance = radius;
  for (const item of stars) {
    const screen = skyToScreen(projectStar(item), view, viewport);
    const candidate = Math.hypot(point.x - screen.x, point.y - screen.y);
    if (candidate <= distance) { nearest = item; distance = candidate; }
  }
  return nearest;
}

export function fitSkyStars(stars, viewport) {
  if (!stars.length) return { ...DEFAULT_SKY_VIEW };
  const points = stars.map(projectStar);
  const xs = points.map(point => point.x), ys = points.map(point => point.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const fit = Math.min(viewport.width / SKY_WORLD.width, viewport.height / SKY_WORLD.height);
  const zoom = Math.min(viewport.width / Math.max(100, maxX - minX) / fit, viewport.height / Math.max(100, maxY - minY) / fit) * .67;
  return clampSkyView({ x: (minX + maxX) / 2, y: (minY + maxY) / 2, zoom });
}

/** The caller owns the surrounding dialog, its heading, and focus restoration. */
export function starMapMarkup() {
  const id = `penthouse-sky-${++instance}`;
  return `<section class="penthouse-sky" data-sky-root aria-label="Star atlas">
    <div class="penthouse-sky-heading"><div><p class="penthouse-sky-eyebrow">THE PENTHOUSE OBSERVATORY</p><h3>Follow a constellation.</h3></div><span class="penthouse-sky-edition">33 STARS / 7 CONSTELLATIONS</span></div>
    <p class="penthouse-sky-intro">An illustrative catalog atlas, centered on the north celestial pole. Explore familiar patterns from different seasons.</p>
    <div class="penthouse-sky-layout"><div class="penthouse-sky-chart-column">
      <div class="penthouse-sky-toolbar" role="group" aria-label="Map controls"><button type="button" data-sky-action="out" aria-label="Zoom out">−</button><output data-sky-zoom aria-label="Map zoom">1.0×</output><button type="button" data-sky-action="in" aria-label="Zoom in">+</button><button type="button" data-sky-action="reset">Reset view</button><button type="button" data-sky-action="lines" aria-pressed="true">Connections</button></div>
      <div class="penthouse-sky-viewport" data-sky-viewport tabindex="0" role="region" aria-label="Interactive star map" aria-describedby="${id}-instructions"><svg data-sky-svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 600" aria-hidden="true" focusable="false"></svg><span class="penthouse-sky-chart-note">NORTH POLAR VIEW · J2000</span></div>
      <p class="penthouse-sky-help" id="${id}-instructions">Drag to pan · scroll or pinch to zoom · select a star. Keyboard: arrow keys pan, + / − zoom, Home resets. The star list offers the same selections.</p>
      <p class="penthouse-sky-caveat">Catalog positions, not tonight’s local sky. Lines are selected-star sketches; faint background points are decorative.</p>
    </div><aside class="penthouse-sky-sidebar" aria-label="Explore the star catalog">
      <div class="penthouse-sky-finder"><label for="${id}-search">Find a star</label><input id="${id}-search" data-sky-search type="search" placeholder="Try Vega or Orion" autocomplete="off" spellcheck="false"><label for="${id}-constellation">Constellation</label><select id="${id}-constellation" data-sky-filter><option value="all">All constellations</option>${SKY_CONSTELLATIONS.map(item=>`<option value="${item.id}">${item.name}</option>`).join('')}</select></div>
      <div class="penthouse-sky-details" data-sky-details></div>
      <div class="penthouse-sky-catalog"><p data-sky-count class="penthouse-sky-catalog-count"></p><ul data-sky-list aria-label="Catalog stars"></ul></div>
      <p class="penthouse-sky-status" data-sky-status role="status" aria-live="polite" aria-atomic="true"></p>
    </aside></div>
  </section>`;
}

const decorativeStars = Array.from({length: 230}, (_, index) => {
  const fraction = (Math.sin(index * 127.1 + 311.7) * 43758.5453) % 1;
  return projectStar({ ra: index * 137.508 % 360, dec: 90 - Math.sqrt(Math.abs(fraction)) * 115 });
});

export function createStarMap(container, { reducedMotion = false } = {}) {
  const root = container.matches?.('[data-sky-root]') ? container : container.querySelector('[data-sky-root]');
  if (!root) throw new Error('createStarMap requires starMapMarkup() inside its container.');
  const doc = root.ownerDocument, win = doc.defaultView;
  const viewport = root.querySelector('[data-sky-viewport]'), svg = root.querySelector('[data-sky-svg]');
  const search = root.querySelector('[data-sky-search]'), filter = root.querySelector('[data-sky-filter]');
  const list = root.querySelector('[data-sky-list]'), details = root.querySelector('[data-sky-details]');
  const status = root.querySelector('[data-sky-status]'), zoomLabel = root.querySelector('[data-sky-zoom]');
  let view = { ...DEFAULT_SKY_VIEW }, selected = 'vega', showLines = true, disposed = false;
  let size = { width: 720, height: 600 }, drag = null, gesture = null, moved = false;
  const pointers = new Map(), cleanups = [];
  root.dataset.reducedMotion = String(Boolean(reducedMotion));
  const listen = (element, name, handler, options) => { element.addEventListener(name, handler, options); cleanups.push(()=>element.removeEventListener(name, handler, options)); };
  const visibleStars = () => filterSkyStars('', filter.value);
  const announce = message => { status.textContent = message; };
  const screen = point => skyToScreen(point, view, size);
  const local = event => { const bounds = viewport.getBoundingClientRect(); return { x: event.clientX - bounds.left, y: event.clientY - bounds.top }; };

  function renderChart() {
    if (disposed) return;
    const scale = skyScale(view, size), center = screen({x:SKY_WORLD.x,y:SKY_WORLD.y});
    const selectedStar = byId.get(selected), active = selectedStar?.constellation;
    const grid = [0,30,60].map(dec => {
      const radius = (90 - dec) / 115 * SKY_WORLD.radius * scale;
      return `<circle cx="${center.x}" cy="${center.y}" r="${radius}"/><text x="${center.x+5}" y="${center.y-radius-6}">${dec===0?'CELESTIAL EQUATOR':`+${dec}°`}</text>`;
    }).join('');
    const spokes = Array.from({length: 12},(_,i)=> {
      const point=screen(projectStar({ra:i*30,dec:-25}));
      return `<path d="M${center.x},${center.y} L${point.x},${point.y}"/>`;
    }).join('');
    const dust = decorativeStars.map(point=>{ const p=screen(point);return `M${p.x.toFixed(1)},${p.y.toFixed(1)}h.5`; }).join(' ');
    const figures = SKY_CONSTELLATIONS.filter(item=>filter.value==='all'||filter.value===item.id);
    const paths = showLines ? figures.map(figure=>`<g class="penthouse-sky-figure${figure.id===active?' is-active':''}">${figure.paths.map(path=>`<path d="${path.map((id,index)=>{const p=screen(projectStar(byId.get(id)));return `${index?'L':'M'}${p.x},${p.y}`;}).join(' ')}"/>`).join('')}</g>`).join('') : '';
    const labels = figures.map(figure=>{
      const point=screen(projectStar({ra:figure.label[0],dec:figure.label[1]}));
      return `<text class="penthouse-sky-constellation${figure.id===active?' is-active':''}" x="${point.x}" y="${point.y}" text-anchor="middle">${escape(figure.name.toUpperCase())}</text>`;
    }).join('');
    const stars = visibleStars().map(item=>{
      const point=screen(projectStar(item)), chosen=item.id===selected;
      const radius=item.magnitude==null?2:Math.max(1.8,4.8-item.magnitude*.7);
      const label = chosen || item.magnitude < 1.5 || view.zoom >= 4;
      return `<g class="penthouse-sky-star${chosen?' is-selected':''}" data-sky-star="${item.id}" transform="translate(${point.x},${point.y})"><circle class="penthouse-sky-hit" r="22"/><circle class="penthouse-sky-halo" r="${chosen?15:radius*2.8}"/><circle class="penthouse-sky-dot${item.color==='amber'?' is-amber':''}" r="${radius}"/>${chosen?'<circle class="penthouse-sky-selection" r="11"/>':''}${label?`<text x="${radius+9}" y="${chosen?-10:4}">${escape(item.name)}</text>`:''}</g>`;
    }).join('');
    svg.setAttribute('viewBox',`0 0 ${size.width} ${size.height}`);
    svg.innerHTML=`<g class="penthouse-sky-grid">${grid}${spokes}</g><path class="penthouse-sky-dust" d="${dust}"/><g class="penthouse-sky-pole"><path d="M${center.x-4},${center.y}h8 M${center.x},${center.y-4}v8"/><text x="${center.x+9}" y="${center.y+4}">N. pole</text></g>${paths}${labels}${stars}`;
    zoomLabel.value=`${view.zoom.toFixed(1)}×`;zoomLabel.textContent=zoomLabel.value;
    root.querySelector('[data-sky-action="out"]').disabled=view.zoom<=1;
    root.querySelector('[data-sky-action="in"]').disabled=view.zoom>=9;
  }

  function renderDetails() {
    const item=byId.get(selected), figure=constellations.get(item.constellation);
    const connections = new Set(figure.paths.flatMap(path=>path.flatMap((id,index)=>id===item.id?[path[index-1],path[index+1]].filter(Boolean):[])));
    details.innerHTML=`<p class="penthouse-sky-detail-kicker">${escape(figure.name)} / ${escape(figure.subtitle)}</p><h4>${escape(item.name)}</h4><p class="penthouse-sky-designation">${escape(item.designation)}</p><p>${escape(item.fact || `${item.name} is catalogued as ${item.designation}. ${figure.description}`)}</p><dl><div><dt>Right ascension</dt><dd>${(item.ra/15).toFixed(3)} h</dd></div><div><dt>Declination</dt><dd>${item.dec>=0?'+':''}${item.dec.toFixed(3)}°</dd></div>${item.magnitude==null?'':`<div><dt>Catalog V magnitude</dt><dd>${item.magnitude.toFixed(2)}</dd></div>`}</dl><p class="penthouse-sky-connection-note">${connections.size?`Sketch connections: ${[...connections].map(id=>escape(byId.get(id).name)).join(', ')}.`:'Reference star; no connections drawn.'}</p><p class="penthouse-sky-source"><a href="${SKY_SOURCES.iau}" target="_blank" rel="noopener noreferrer">Catalog source ↗</a>${item.source!==SKY_SOURCES.iau?`<a href="${item.source}" target="_blank" rel="noopener noreferrer">Star fact / position ↗</a>`:''}<a href="${figure.source}" target="_blank" rel="noopener noreferrer">IAU constellation chart ↗</a></p>`;
  }

  function renderList() {
    const matches=filterSkyStars(search.value,filter.value);
    root.querySelector('[data-sky-count]').textContent=`${matches.length} ${matches.length===1?'star':'stars'} in the catalog`;
    list.innerHTML=matches.length?matches.map(item=>`<li><button type="button" data-sky-select="${item.id}" aria-pressed="${item.id===selected}"><span>${escape(item.name)}</span><small>${escape(constellations.get(item.constellation).name)}</small></button></li>`).join(''):'<li class="penthouse-sky-empty">No stars match. Try another name or constellation.</li>';
  }

  function selectStar(id, focus = true) {
    const item=byId.get(id);if(!item)return;
    selected=id;
    if(focus)view=fitSkyStars(SKY_STARS.filter(star=>star.constellation===item.constellation),size);
    renderChart();renderDetails();
    // Keep keyboard focus on the existing list button when selection changes.
    for(const button of list.querySelectorAll('[data-sky-select]'))button.setAttribute('aria-pressed',String(button.dataset.skySelect===id));
    announce(`${item.name} selected in ${constellations.get(item.constellation).name}. ${item.fact||item.designation}.`);
  }

  function resize() {
    const bounds=viewport.getBoundingClientRect();
    if(bounds.width>0&&bounds.height>0)size={width:bounds.width,height:bounds.height};
    renderChart();
  }
  const zoom = factor => {view=zoomSkyView(view,factor,{x:size.width/2,y:size.height/2},size);renderChart();};
  const pan = (x,y) => {const scale=skyScale(view,size);view=clampSkyView({...view,x:view.x-x/scale,y:view.y-y/scale});};
  function pointerMetrics() {
    const values=[...pointers.values()];
    const a=values[0],b=values[1];
    return b?{x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.hypot(a.x-b.x,a.y-b.y)}:{...a,distance:0};
  }

  listen(root,'click',event=>{
    const choice=event.target.closest('[data-sky-select]');
    if(choice&&root.contains(choice)){selectStar(choice.dataset.skySelect);return;}
    const action=event.target.closest('[data-sky-action]')?.dataset.skyAction;
    if(action==='in')zoom(1.35);
    if(action==='out')zoom(1/1.35);
    if(action==='reset'){view={...DEFAULT_SKY_VIEW};renderChart();announce('Full catalog view restored.');}
    if(action==='lines'){showLines=!showLines;event.target.closest('button').setAttribute('aria-pressed',String(showLines));renderChart();}
  });
  listen(viewport,'click',event=>{
    if(moved){moved=false;return;}
    const item=nearestSkyStar(local(event),view,size,visibleStars());
    if(item)selectStar(item.id,false);
  });
  listen(search,'input',()=>{renderList();announce(root.querySelector('[data-sky-count]').textContent);});
  listen(filter,'change',()=>{
    search.value='';
    const matches=visibleStars();
    if(filter.value==='all')view={...DEFAULT_SKY_VIEW};
    else {view=fitSkyStars(matches,size);if(!matches.some(item=>item.id===selected))selected=matches[0].id;}
    renderList();renderDetails();renderChart();
    announce(filter.value==='all'?'All constellations shown.':`${constellations.get(filter.value).name} shown. ${matches.length} catalog stars.`);
  });
  listen(list,'keydown',event=>{
    if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
    const buttons=[...list.querySelectorAll('button')],index=buttons.indexOf(event.target);
    if(index<0)return;
    event.preventDefault();
    buttons[event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();
  });
  listen(viewport,'keydown',event=>{
    const movement={ArrowLeft:[48,0],ArrowRight:[-48,0],ArrowUp:[0,48],ArrowDown:[0,-48]}[event.key];
    if(movement){event.preventDefault();pan(...movement);renderChart();return;}
    if(['+','=','-','_','Home'].includes(event.key)){
      event.preventDefault();
      if(event.key==='Home'){view={...DEFAULT_SKY_VIEW};renderChart();}
      else zoom(['+','='].includes(event.key)?1.35:1/1.35);
    }
  });
  listen(viewport,'wheel',event=>{
    event.preventDefault();
    view=zoomSkyView(view,Math.exp(-limit(event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?size.height:1),-150,150)*.0025),local(event),size);renderChart();
  },{passive:false});
  listen(viewport,'pointerdown',event=>{
    if(event.button!==0)return;
    const point=local(event);pointers.set(event.pointerId,point);
    if(pointers.size===1){drag=point;moved=false;}
    else moved=true;
    gesture=pointerMetrics();
    viewport.setPointerCapture?.(event.pointerId);
    viewport.classList.add('is-dragging');
  });
  listen(viewport,'pointermove',event=>{
    if(!pointers.has(event.pointerId))return;
    const point=local(event);pointers.set(event.pointerId,point);
    const next=pointerMetrics();
    if(drag&&Math.hypot(point.x-drag.x,point.y-drag.y)>5)moved=true;
    pan(next.x-gesture.x,next.y-gesture.y);
    if(next.distance&&gesture.distance)view=zoomSkyView(view,next.distance/gesture.distance,{x:next.x,y:next.y},size);
    gesture=next;renderChart();
  });
  function endPointer(event) {
    pointers.delete(event.pointerId);
    gesture=pointers.size?pointerMetrics():null;
    if(!pointers.size){drag=null;viewport.classList.remove('is-dragging');}
  }
  listen(viewport,'pointerup',endPointer);
  listen(viewport,'pointercancel',event=>{moved=true;endPointer(event);});
  listen(viewport,'lostpointercapture',endPointer);
  const observer=win.ResizeObserver?new win.ResizeObserver(resize):null;
  if(observer)observer.observe(viewport);else listen(win,'resize',resize);
  renderList();renderDetails();resize();
  return { dispose() {if(disposed)return;disposed=true;observer?.disconnect();cleanups.forEach(cleanup=>cleanup());pointers.clear();viewport.classList.remove('is-dragging');} };
}
