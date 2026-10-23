const clamp = value => Math.max(0,Math.min(1,value));
const smooth = (a,b,value) => { const t=clamp((value-a)/(b-a));return t*t*(3-2*t); };
const mixHex = (a,b,t) => '#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');
const skyKeys=[
  [0,'#071225','#1c2d48'],[5,'#101d36','#35445e'],[6,'#405c83','#dfab87'],
  [7,'#4e87ba','#c5d9e5'],[12,'#3e7eb6','#bed8e9'],[16,'#4c83b2','#c9d9df'],
  [18,'#4b577d','#e3ad84'],[19,'#172741','#45516b'],[20,'#071225','#1c2d48'],[24,'#071225','#1c2d48'],
];
const direction = angle => {
  const vector=[-.62+.18*Math.cos(angle),.34*Math.sin(angle),-1],length=Math.hypot(...vector);
  return vector.map(value=>value/length);
};

/** An illustrative daily solar arc, using the visitor's own local clock. */
export function readCityTime(date=new Date()) {
  if(!Number.isFinite(date.getTime())) throw new TypeError('A valid local date is required');
  const hour=date.getHours()+date.getMinutes()/60+date.getSeconds()/3600;
  const daylight=smooth(5.5,7,hour)*(1-smooth(17,19,hour)),night=1-daylight;
  const phase=hour<5.5||hour>=19?'night':hour<7?'dawn':hour<12?'morning':hour<17?'afternoon':'evening';
  const index=skyKeys.findIndex((key,i)=>i<skyKeys.length-1&&hour>=key[0]&&hour<skyKeys[i+1][0]);
  const a=skyKeys[Math.max(0,index)],b=skyKeys[Math.max(0,index)+1],blend=smooth(a[0],b[0],hour);
  const sunDirection=direction((hour-6)/12*Math.PI),moonDirection=direction((hour-18)/12*Math.PI);
  const zenith=mixHex(a[1],b[1],blend),horizon=mixHex(a[2],b[2],blend);
  return {hour,phase,daylight,night,zenith,horizon,haze:mixHex('#25364e','#a3bdcc',daylight),
    tint:mixHex('#7189ad','#ffffff',daylight),ambient:mixHex('#7189b0','#a8c9e6',daylight),
    keyColor:mixHex('#b8cce8',phase==='evening'?'#ffc28a':'#fff0ce',daylight),
    fill:mixHex('#617ba5','#90b4d4',daylight),ambientIntensity:.85+daylight*.8,keyIntensity:.65+daylight*2.05,
    sunDirection,moonDirection,sunVisibility:daylight*smooth(-.02,.025,sunDirection[1]),
    moonVisibility:night*smooth(-.02,.025,moonDirection[1]),stars:night*night,
    minute:Math.floor(date.getTime()/60000)};
}

/** One minute-aligned timer; hidden tabs refresh once when they become visible. */
export function createCityClock(onChange,{now=()=>new Date(),schedule=setTimeout,cancel=clearTimeout,hidden=()=>false}={}) {
  let timer=null,disposed=false,minute=null,state;
  const refresh=()=>{
    if(disposed)return state;
    const date=now(),next=Math.floor(date.getTime()/60000);
    if(next!==minute){minute=next;state=readCityTime(date);onChange(state);}
    return state;
  };
  const arm=()=>{timer=schedule(()=>{if(disposed)return;if(!hidden())refresh();arm();},Math.max(1000,60020-(now().getTime()%60000)));};
  refresh();arm();
  return {refresh,dispose(){disposed=true;cancel(timer);}};
}
