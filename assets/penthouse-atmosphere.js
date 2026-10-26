/** Bedroom atmosphere values are local presentation settings, not weather data. */
export const atmospherePresets = Object.freeze([
  Object.freeze({ id:'rainy-night', label:'Rainy Night', hour:22, brightness:.62, lamps:true, weather:'rain', ambient:'rain' }),
  Object.freeze({ id:'golden-hour', label:'Golden Hour', hour:18, brightness:.95, lamps:false, weather:'clear', ambient:'city' }),
  Object.freeze({ id:'late-night-coding', label:'Late-Night Coding', hour:23, brightness:.48, lamps:true, weather:'clear', ambient:'city' }),
]);

export const DEFAULT_ATMOSPHERE = Object.freeze({ hour:null, brightness:1, lamps:false, weather:'clear', ambient:'off' });
const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
const numeric = value => typeof value==='number' ? value : typeof value==='string'&&value.trim()!=='' ? Number(value) : NaN;

export function normalizeAtmosphere(input = {}) {
  if (!input || typeof input!=='object' || Array.isArray(input)) return {...DEFAULT_ATMOSPHERE};
  const hour=numeric(input.hour),brightness=numeric(input.brightness);
  return {
    hour:input.hour==null||!Number.isFinite(hour)?null:clamp(hour,0,23.999),
    brightness:Number.isFinite(brightness)?clamp(brightness,.25,1.25):1,
    lamps:input.lamps===true,
    weather:input.weather==='rain'?'rain':'clear',
    ambient:['off','rain','city'].includes(input.ambient)?input.ambient:'off',
  };
}

/** Reject invalid or collapsed projections before they reach SVG attributes. */
export function normalizeWindowPoints(points) {
  if(!Array.isArray(points)||points.length!==4)return null;
  if(points.some(point=>!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)||Math.abs(point.x)>1e6||Math.abs(point.y)>1e6))return null;
  const next=points.map(({x,y})=>({x,y}));
  const area=next.reduce((sum,point,index)=>{const following=next[(index+1)%4];return sum+point.x*following.y-following.x*point.y;},0)/2;
  if(Math.abs(area)<1)return null;
  // A projected planar window remains convex; reject folded/bow-tie polygons.
  const turns=next.map((point,index)=>{
    const b=next[(index+1)%4],c=next[(index+2)%4];
    return (b.x-point.x)*(c.y-b.y)-(b.y-point.y)*(c.x-b.x);
  });
  if(!turns.every(turn=>turn>0)&&!turns.every(turn=>turn<0))return null;
  return next;
}

let weatherInstance=0;
const ns='http://www.w3.org/2000/svg';

/**
 * Attach to the positioned scene stage. Coordinates passed to setWindow are
 * stage-local CSS pixels, ordered around the four inside corners of the glass.
 * Root scene code owns lighting, clock, sound, and window projection updates.
 */
export function createBedroomWeather(container) {
  const doc=container.ownerDocument,win=doc.defaultView;
  const id=`penthouse-weather-${++weatherInstance}`;
  const layer=doc.createElement('div');
  layer.className='penthouse-weather';layer.hidden=true;layer.setAttribute('aria-hidden','true');
  layer.innerHTML=`<svg xmlns="${ns}" viewBox="0 0 1 1" preserveAspectRatio="none" focusable="false" aria-hidden="true">
    <defs>
      <clipPath id="${id}-clip" clipPathUnits="userSpaceOnUse"><polygon data-weather-clip points="0,0 0,0 0,0 0,0"/></clipPath>
      <linearGradient id="${id}-tint" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6591b7" stop-opacity=".15"/><stop offset="1" stop-color="#87afca" stop-opacity=".025"/></linearGradient>
      <pattern id="${id}-far" patternUnits="userSpaceOnUse" width="180" height="150"><path d="M12 15l3 12 M51 72l3 12 M91 22l3 12 M132 119l3 12 M167 56l3 12 M31 129l3 12 M112 83l3 12"/></pattern>
      <pattern id="${id}-near" patternUnits="userSpaceOnUse" width="210" height="150"><path d="M23 48l5 24 M77 7l5 24 M116 102l5 24 M174 61l5 24 M202 129l5 24"/></pattern>
    </defs>
    <g clip-path="url(#${id}-clip)">
      <rect data-weather-tint fill="url(#${id}-tint)" x="0" y="0" width="1" height="1"/>
      <g class="penthouse-weather-far"><rect data-weather-field x="-210" y="-300" width="421" height="601" fill="url(#${id}-far)"/></g>
      <g class="penthouse-weather-near"><rect data-weather-field x="-210" y="-300" width="421" height="601" fill="url(#${id}-near)"/></g>
    </g>
  </svg>`;
  container.append(layer);
  const svg=layer.querySelector('svg'),polygon=layer.querySelector('[data-weather-clip]');
  const tint=layer.querySelector('[data-weather-tint]'),fields=layer.querySelectorAll('[data-weather-field]');
  let state={weather:'clear',reducedMotion:false,visible:false},windowVisible=false,points=null,disposed=false;

  function update() {
    if(disposed)return;
    const active=state.weather==='rain'&&state.visible&&windowVisible&&Boolean(points);
    layer.hidden=!active;
    layer.dataset.weather=state.weather;
    layer.dataset.reducedMotion=String(state.reducedMotion);
    layer.dataset.animating=String(active&&!doc.hidden&&!state.reducedMotion);
  }

  function resize() {
    if(disposed)return;
    const bounds=container.getBoundingClientRect();
    const width=Math.max(1,Number.isFinite(bounds.width)?bounds.width:1),height=Math.max(1,Number.isFinite(bounds.height)?bounds.height:1);
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    tint.setAttribute('width',String(width));tint.setAttribute('height',String(height));
    for(const field of fields){field.setAttribute('width',String(width+420));field.setAttribute('height',String(height+600));}
  }
  const observer=win.ResizeObserver?new win.ResizeObserver(resize):null;
  if(observer)observer.observe(container);else win.addEventListener('resize',resize);
  doc.addEventListener('visibilitychange',update);
  resize();update();

  return {
    setState(input={}) {
      if(disposed||!input||typeof input!=='object')return;
      if(Object.hasOwn(input,'weather'))state.weather=input.weather==='rain'?'rain':'clear';
      if(Object.hasOwn(input,'reducedMotion'))state.reducedMotion=input.reducedMotion===true;
      if(Object.hasOwn(input,'visible'))state.visible=input.visible===true;
      update();
    },
    setWindow(input,visible=true) {
      if(disposed)return;
      points=normalizeWindowPoints(input);windowVisible=visible===true;
      if(points)polygon.setAttribute('points',points.map(point=>`${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' '));
      update();
    },
    dispose() {
      if(disposed)return;
      disposed=true;observer?.disconnect();
      if(!observer)win.removeEventListener('resize',resize);
      doc.removeEventListener('visibilitychange',update);
      layer.remove();points=null;
    },
  };
}
