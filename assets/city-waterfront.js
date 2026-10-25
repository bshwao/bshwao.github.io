import * as T from './vendor/three.module.min.js';
import { riverPlan, riverCenter, riverEdges, districtPlan } from './city-layout.js';
import { cityPalette } from './city-environment.js';
import { applyDistrictDepth } from './district-style.js';
import { applyGroundTexture } from './ground-materials.js';
import { planRoadMarkings } from './road-markings.js';
import { oceanY } from './city-geography.js';

/** A static river, quays, bridges and riverwalk, sharing five geometry batches. */
export function createCityWaterfront() {
  const root = new T.Group(); root.name = 'city-waterfront';
  const features = [], layers = Object.fromEntries(['water','quays','planting','fixtures','reflections'].map(name => [name,{positions:[],colors:[],glow:[],surface:[]}]));
  const colors = new Map(), color = value => {
    if (!colors.has(value)) colors.set(value,new T.Color(value).toArray());
    return colors.get(value);
  };
  let active = null;
  const vertex = (layer,point,tint,surface=0) => {
    layers[layer].positions.push(...point); layers[layer].colors.push(...color(tint));
    if(layer==='water'){
      const downstream=T.MathUtils.smoothstep(point[0],riverPlan.mouthX-5,riverPlan.maxX);
      const halfWidth=riverPlan.halfWidth*(1+T.MathUtils.smoothstep(point[0],riverPlan.mouthX-65,riverPlan.maxX)*1.4);
      const edge=T.MathUtils.smoothstep(Math.abs(point[2]-riverCenter(point[0]))/halfWidth,.65,1);
      const feather=T.MathUtils.smoothstep(point[0],riverPlan.mouthX-15,riverPlan.mouthX+20);
      layers[layer].colors.push((1-downstream)*(1-edge*feather));
    }
    layers[layer].glow.push(active?.glow?1:0);layers[layer].surface.push(surface);
    active?.bounds.expandByPoint(new T.Vector3(...point));
  };
  const quad = (layer,a,b,c,d,tint,surface=0) => { for (const p of [a,b,c,a,c,d]) vertex(layer,p,tint,surface); };
  const rect = (layer,x0,z0,x1,z1,y,tint) => quad(layer,[x0,y,z0],[x0,y,z1],[x1,y,z1],[x1,y,z0],tint,tint===cityPalette.road?1:0);
  const line = (a,b,tint='#7294ac') => { vertex('reflections',a,tint); vertex('reflections',b,tint); };
  const feature = (kind,build,data={}) => {
    const previous = active; active = {kind,bounds:new T.Box3(),...data}; features.push(active); build(); active = previous;
  };
  const cube = new T.BoxGeometry(1,1,1).toNonIndexed();
  const crown = new T.SphereGeometry(1,6,3).toNonIndexed();
  function solid(layer,geometry,x,y,z,w,h,d,tint) {
    const p=geometry.attributes.position,n=geometry.attributes.normal;
    const base=new T.Color(tint),top=base.clone().multiplyScalar(1.10).getHexString(),side=base.clone().multiplyScalar(.80).getHexString();
    for(let i=0;i<p.count;i++) vertex(layer,[x+p.getX(i)*w,y+p.getY(i)*h,z+p.getZ(i)*d],`#${n.getY(i)>.4?top:side}`);
  }
  const box = (layer,x,y,z,w,h,d,tint) => solid(layer,cube,x,y,z,w,h,d,tint);
  const waterY=riverPlan.waterY,walkY=-.32,half=riverPlan.halfWidth,walk=riverPlan.promenadeWidth;
  const nextRiverX=x=>Math.min(x+20,riverPlan.maxX);
  const levelAt=x=>waterY+(oceanY-waterY)*T.MathUtils.smoothstep(x,riverPlan.mouthX+20,riverPlan.maxX);
  const widthAt=x=>half*(1+T.MathUtils.smoothstep(x,riverPlan.mouthX-65,riverPlan.maxX)*1.4);

  feature('river',()=>{
    for(let x=riverPlan.minX;x<riverPlan.maxX;x=nextRiverX(x)) {
      const next=nextRiverX(x),a=riverCenter(x),b=riverCenter(next),wa=widthAt(x),wb=widthAt(next);
      for(const [lo,hi,tint]of [[-1,-.65,'#19394b'],[-.65,0,'#1b4861'],[0,.65,'#214f68'],[.65,1,'#19394b']]) {
        quad('water',[x,levelAt(x),a+lo*wa],[x,levelAt(x),a+hi*wa],[next,levelAt(next),b+hi*wb],[next,levelAt(next),b+lo*wb],tint);
      }
    }
    // Fixed low-contrast ripple strokes suggest reflected city lights without
    // a moving shader, reflection camera, texture, or idle animation loop.
    for(let i=0;i<100;i++) {
      const x=-330+(i*37)%660,z=riverCenter(x)+Math.sin(i*2.7)*half*.78,length=1.2+(i%5)*.75;
      line([x,waterY+.014,z],[x+length,waterY+.014,z-.1],i%6===0?'#b3a27d':'#456d85');
    }
  });
  feature('headwater-lake',()=>{
    const x=riverPlan.minX,z=riverCenter(x);
    for(let i=0;i<48;i++) {
      const a=i*Math.PI/24,b=(i+1)*Math.PI/24;
      for(const point of [[x,waterY,z],[x+Math.cos(b)*55,waterY,z+Math.sin(b)*36],[x+Math.cos(a)*55,waterY,z+Math.sin(a)*36]]) vertex('water',point,'#1b4861');
    }
  });
  for(const side of [-1,1]) feature('riverbank',()=>{
    // Urban promenades finish inland; the river alone reaches the sea.
    for(let x=-560;x<560;x+=20) {
      const next=Math.min(x+20,560),a=riverCenter(x)+side*half,b=riverCenter(next)+side*half;
      const outerA=a+side*walk,outerB=b+side*walk;
      quad('quays',[x,walkY,Math.min(a,outerA)],[x,walkY,Math.max(a,outerA)],[next,walkY,Math.max(b,outerB)],[next,walkY,Math.min(b,outerB)],'#7f8d98');
      const wall=[[x,waterY-.2,a],[x,walkY,a],[next,walkY,b],[next,waterY-.2,b]];
      if(side<0) wall.reverse();
      quad('quays',...wall,'#536876');
      line([x,walkY+.025,a],[next,walkY+.025,b],'#b6ad95');
    }
  },{side});

  // Both original north/south avenues continue across the water.
  for(const x of riverPlan.bridges) feature('bridge',()=>{
    const edges=[riverEdges(x-7),riverEdges(x+7)];
    const start=Math.min(...edges.map(e=>e.north))-8,end=Math.max(...edges.map(e=>e.south))+8,middle=(start+end)/2;
    box('quays',x,-.05,middle,15,.7,end-start,'#70808d');
    rect('quays',x-5,start,x+5,end,.31,cityPalette.road);
    // Gentle ramps join the raised bridge deck to both avenue landings.
    for(const [z0,z1,y0,y1]of [[start-10,start,-.64,.31],[end,end+10,.31,-.50]]) {
      quad('quays',[x-5,y0,z0],[x-5,y1,z1],[x+5,y1,z1],[x+5,y0,z0],cityPalette.road,1);
      for(const side of [-1,1]){
        const a=x+side*6.25-1.1,b=x+side*6.25+1.1;
        quad('quays',[a,y0+.02,z0],[a,y1+.02,z1],[b,y1+.02,z1],[b,y0+.02,z0],'#87939c');
      }
    }
    for(const side of [-1,1]) {
      box('fixtures',x+side*6.6,1.16,middle,.20,.18,end-start,'#a3b2bd');
      box('fixtures',x+side*6.6,.65,middle,.12,.12,end-start,'#647b8b');
      for(let z=start+1;z<end;z+=5) box('fixtures',x+side*6.6,.72,z,.16,1.05,.16,'#70899b');
      box('quays',x+side*5,-.55,riverCenter(x),1.1,.9,3.4,'#526673');
    }
    // The southern landing meets a new avenue, rather than ending in the river.
    rect('quays',x-5,end,x+5,214,-.50,cityPalette.road);
    for(const side of [-1,1]) rect('quays',x+side*6.5-1.5,end,x+side*6.5+1.5,214,-.39,'#87939c');
  },{x});
  const roadMarkings = planRoadMarkings('bridge');
  for (const patch of roadMarkings) quad('fixtures', ...patch.points, patch.color);

  for(const side of [-1,1]) for(const [i,x]of [-270,-230,-190,-150,-110,-70,-20,20,70,110,150,190,230,270].entries()) {
    const z=riverCenter(x)+side*(half+walk*.68);
    feature('riverside-tree',()=>{
      box('fixtures',x,1.1,z,.25,2.8,.25,'#536b78');
      solid('planting',crown,x,3.4,z,2.2,2.5,2.2,i%3?'#405d57':'#597062');
      box('quays',x,-.20,z,3,.24,3,'#687d85');
    });
    if(i%2===0) {
      feature('riverside-bench',()=>{
        box('fixtures',x+4,.40,z,2.9,.18,.85,'#b7a183');
        box('fixtures',x+4,.8,z+side*.35,2.9,.7,.14,'#8d806f');
        for(const dx of [-1,1]) box('fixtures',x+4+dx,.05,z,.17,.65,.65,'#526977');
      });
      feature('riverwalk-lamp',()=>{
        box('fixtures',x+8,2.05,z,.13,4.7,.13,'#6d8597');
        active.glow=true;box('fixtures',x+8,4.46,z,.85,.16,.55,'#dcc99e');active.glow=false;
        rect('quays',x+6.7,z-1.2,x+9.3,z+1.2,walkY+.025,'#999a87');
      });
    }
  }
  for(const x of [-110,110]) feature('riverside-park',()=>{
    const z=riverEdges(x).north-walk-8;
    rect('planting',x-17,z-5,x+17,z+5,-.35,'#536d60');
    rect('quays',x-19,z+5,x+19,z+7,-.34,'#81929b');
    for(const dx of [-13,13]) {
      box('fixtures',x+dx,.9,z,.28,2.5,.28,'#526a77');
      solid('planting',crown,x+dx,3.2,z,2.2,2.6,2.2,'#456555');
    }
  });
  for(const [x,side]of [[-118,-1],[132,1]]) feature('moored-boat',()=>{
    const z=riverCenter(x)+side*(half-5);
    box('fixtures',x,waterY+.25,z,6,.65,2.1,'#b5b4a4');
    box('fixtures',x-.5,waterY+.82,z,2.8,.8,1.65,'#778f9f');
    box('fixtures',x-.5,waterY+1.27,z,3.2,.14,1.9,'#d0c9af');
    box('quays',x+5,waterY+.18,z+side*2,2.1,.25,8,'#6d808b');
  });

  cube.dispose(); crown.dispose();
  for(const [name,layer]of Object.entries(layers)) {
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(layer.positions,3));
    geometry.setAttribute('color',new T.Float32BufferAttribute(layer.colors,name==='water'?4:3));
    geometry.setAttribute('cityGlow',new T.Float32BufferAttribute(layer.glow,1));
    geometry.setAttribute('surfaceKind',new T.Float32BufferAttribute(layer.surface,1));
    const material=applyDistrictDepth(name==='reflections'
      ?new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.55})
      :new T.MeshBasicMaterial({vertexColors:true,transparent:name==='water',depthWrite:name!=='water'}),name==='water'?.72:.30);
    if(name==='fixtures')material.userData.cityGlowMode='vertex';
    else if(name==='quays')applyGroundTexture(material,'mixed');
    else if(name==='water')applyGroundTexture(material,'water');
    else if(name==='planting')applyGroundTexture(material,'terrain');
    const object=name==='reflections'?new T.LineSegments(geometry,material):new T.Mesh(geometry,material);
    object.name=`waterfront-${name}`; root.add(object);
  }
  return {root,features,roadMarkings,setPresentation(expansion,reveal){root.visible=reveal<.999&&expansion<.999;}};
}
