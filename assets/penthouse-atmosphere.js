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
