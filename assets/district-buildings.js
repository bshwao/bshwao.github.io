import { palette } from './color-theme.js';
import * as T from './vendor/three.module.min.js';
import { cityLots, buildingVolumes } from './city-layout.js';
import { applyDistrictDepth, shadeDistrictGeometry } from './district-style.js';
import { cityPalette } from './city-environment.js';

/** Thirty-eight solid buildings; architecture shares five rendering layers. */
export function createDistrictBuildings() {
  const root=new T.Group(); root.name='district-buildings';
  const surfaces=[],roofs=[],glazing=[],outlines=[],details=[],buildings=[];
  const coloredArrays=[surfaces,roofs,glazing],ranges=coloredArrays.map(()=>[]);
  const cube=new T.BoxGeometry(1,1,1).toNonIndexed();
  const cp=cube.attributes.position,cn=cube.attributes.normal;
  const segment=(target,a,b)=>target.push(...a,...b);
  const path=(target,points)=>{for(let i=1;i<points.length;i++) segment(target,points[i-1],points[i]);};
  const quad=(target,a,b,c,d)=>target.push(...a,...b,...c,...a,...c,...d);
  const rectangle=(target,x0,z0,x1,z1,y)=>path(target,[[x0,y,z0],[x1,y,z0],[x1,y,z1],[x0,y,z1],[x0,y,z0]]);
  function box(target,x,y,z,w,h,d,edges=false) {
    for(let i=0;i<cp.count;i++) target.push(x+cp.getX(i)*w,y+cp.getY(i)*h,z+cp.getZ(i)*d);
    if(edges) {
      rectangle(outlines,x-w/2,z-d/2,x+w/2,z+d/2,y+h/2);
      for(const dx of [-w/2,w/2]) for(const dz of [-d/2,d/2]) segment(outlines,[x+dx,y-h/2,z+dz],[x+dx,y+h/2,z+dz]);
    }
  }
  // Subtract supported upper shafts so a lower roof never competes with their lids.
  function exposedRoof(part,parts) {
    let patches=[[part.x-part.width/2,part.z-part.depth/2,part.x+part.width/2,part.z+part.depth/2]];
    for(const upper of parts.filter(p=>Math.abs(p.bottom-part.top)<1e-6)) {
      const cut=[upper.x-upper.width/2,upper.z-upper.depth/2,upper.x+upper.width/2,upper.z+upper.depth/2];
      patches=patches.flatMap(([x0,z0,x1,z1])=>{
        const a=Math.max(x0,cut[0]),b=Math.max(z0,cut[1]),c=Math.min(x1,cut[2]),d=Math.min(z1,cut[3]);
        if(a>=c||b>=d) return [[x0,z0,x1,z1]];
        return [[x0,z0,a,z1],[c,z0,x1,z1],[a,z0,c,b],[a,d,c,z1]].filter(p=>p[2]-p[0]>1e-7&&p[3]-p[1]>1e-7);
      });
    }
    for(const [x0,z0,x1,z1] of patches) quad(roofs,[x0,part.top,z0],[x0,part.top,z1],[x1,part.top,z1],[x1,part.top,z0]);
  }
  for(const lot of cityLots) {
    const starts=coloredArrays.map(array=>array.length/3);
    const parts=buildingVolumes(lot),bounds=new T.Box3(),building={...lot,lotId:lot.id,parts,bounds};
    buildings.push(building);
    for(const part of parts) {
      const {x,z,width:w,depth:d,bottom,top}=part,x0=x-w/2,x1=x+w/2,z0=z-d/2,z1=z+d/2,h=top-bottom;
      for(let i=0;i<cp.count;i++) {
        if(cn.getY(i)>.5) continue;
        surfaces.push(x+cp.getX(i)*w,bottom+(cp.getY(i)+.5)*h,z+cp.getZ(i)*d);
      }
      bounds.expandByPoint(new T.Vector3(x0,bottom,z0)); bounds.expandByPoint(new T.Vector3(x1,top,z1));
      rectangle(outlines,x0,z0,x1,z1,top+.035);
      for(const px of [x0,x1]) for(const pz of [z0,z1]) segment(outlines,[px,bottom,pz],[px,top,pz]);
      if(part.roof==='flat') exposedRoof(part,parts);
      else if(part.roof==='gable') {
        const ridge=top+2.1;
        quad(roofs,[x0,top,z0],[x0,top,z1],[x,ridge,z1],[x,ridge,z0]);
        quad(roofs,[x,ridge,z0],[x,ridge,z1],[x1,top,z1],[x1,top,z0]);
        surfaces.push(x1,top,z0,x0,top,z0,x,ridge,z0,x0,top,z1,x1,top,z1,x,ridge,z1);
        for(const pz of [z0,z1]) path(outlines,[[x0,top,pz],[x,ridge,pz],[x1,top,pz]]);
        segment(outlines,[x,ridge,z0],[x,ridge,z1]); bounds.max.y=ridge;
      } else {
        for(let bay=0;bay<3;bay++) {
          const a=z0+bay*d/3,b=a+d/3,high=top+1.8;
          quad(roofs,[x0,top,a],[x0,high,b],[x1,high,b],[x1,top,a]);
          quad(glazing,[x0,top,b],[x1,top,b],[x1,high,b],[x0,high,b]);
          surfaces.push(x0,top,b,x0,high,b,x0,top,a,x1,top,a,x1,high,b,x1,top,b);
          for(const px of [x0,x1]) path(outlines,[[px,top,a],[px,high,b],[px,top,b]]);
          segment(outlines,[x0,high,b],[x1,high,b]); bounds.max.y=high;
        }
      }
      const heritage=['brick','limestone','landmark','campus'].includes(lot.family);
      const floors=Math.max(1,Math.round(h/(lot.family==='workshop'?h:3.1)));
      for(const [a0,a1,fixed,axis,facing] of [[x0,x1,z0-.045,'x',-1],[x0,x1,z1+.045,'x',1],[z0,z1,x0-.045,'z',-1],[z0,z1,x1+.045,'z',1]]) {
        const point=(a,y)=>axis==='x'?[a,y,fixed]:[fixed,y,a];
        const pitch=lot.family==='glass'?2.2:lot.family==='brick'?3:lot.family==='workshop'?6:3.8;
        const bays=Math.max(1,Math.floor((a1-a0-1.4)/pitch)),bay=(a1-a0-1.4)/bays;
        for(let floor=0;floor<floors;floor++) {
          const lo=bottom+(floor+(heritage?.25:.1))*h/floors,hi=bottom+(floor+(heritage?.76:.87))*h/floors;
          for(let i=0;i<bays;i++) {
            const left=a0+.7+i*bay+bay*(heritage?.14:.035),right=a0+.7+(i+1)*bay-bay*(heritage?.14:.035);
            let face=[point(left,lo),point(right,lo),point(right,hi),point(left,hi)];
            if((axis==='x'&&facing<0)||(axis==='z'&&facing>0)) face.reverse();
            quad(glazing,...face);
            if(lot.layer!=='distant') path(details,[...face,face[0]]);
            if(heritage&&lot.layer!=='distant') {
              segment(details,point(left-.1,lo-.11),point(right+.1,lo-.11));
              if(lot.family==='landmark'&&floor===0) segment(outlines,point(left-.15,bottom),point(left-.15,top));
            }
          }
          if(floor>0&&lot.layer!=='distant'&&lot.family!=='glass') segment(details,point(a0,bottom+floor*h/floors),point(a1,bottom+floor*h/floors));
        }
        if(bottom<0&&lot.layer!=='distant') {
          const middle=(a0+a1)/2,entry=Math.min(1.2,(a1-a0)*.16);
          path(outlines,[point(middle-entry,.02),point(middle-entry,2.8),point(middle+entry,2.8),point(middle+entry,.02)]);
          segment(details,point(middle,0),point(middle,2.6));
        }
      }
      if(heritage&&part.roof==='flat'&&lot.layer!=='distant') {
        const cy=top+.22;
        box(roofs,x,cy,z0,w+.3,.36,.22); box(roofs,x,cy,z1,w+.3,.36,.22);
        box(roofs,x0,cy,z,.22,.36,d); box(roofs,x1,cy,z,.22,.36,d);
        bounds.expandByPoint(new T.Vector3(x0-.15,cy+.18,z0-.15)); bounds.expandByPoint(new T.Vector3(x1+.15,cy+.18,z1+.15));
      }
      if(lot.form==='shopfront') {
        box(roofs,x,3.1,z1+.22,w*.85,.16,.65,true);
        bounds.max.z=Math.max(bounds.max.z,z1+.55);
      }
    }
    coloredArrays.forEach((array,index)=>ranges[index].push({start:starts[index],end:array.length/3,lot}));
  }
  cube.dispose();
  const layers=[
    {name:'building-surfaces',positions:surfaces,color:cityPalette.limestone,mesh:true},
    {name:'building-roofs',positions:roofs,color:cityPalette.roof,mesh:true},
    {name:'building-glazing',positions:glazing,color:cityPalette.glazing,mesh:true},
    {name:'building-outlines',positions:outlines,color:'#474851',opacity:.65},
    {name:'building-facades',positions:details,color:'#4f535d',opacity:.38},
  ];
  for(const layer of layers) {
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(layer.positions,3));
    if(layer.mesh) {
      const spans=ranges[coloredArrays.indexOf(layer.positions)];let spanIndex=0;
      const families={glass:cityPalette.glazing,brick:cityPalette.brick,limestone:cityPalette.limestone,landmark:cityPalette.bronze,workshop:cityPalette.concrete,campus:cityPalette.limestone};
      shadeDistrictGeometry(geometry,i=>{
        while(i>=spans[spanIndex].end&&spanIndex<spans.length-1)spanIndex++;
        const span=spans[spanIndex];
        if(layer.positions===surfaces)return families[span.lot.family];
        if(layer.positions===roofs)return cityPalette.roof;
        const group=Math.floor((i-span.start)/48),seed=Number(span.lot.parcelId.replace(/\D/g,''))||1;
        return Math.sin(group*19.1+seed*7.3)>.68?'#caa773':span.lot.family==='glass'?'#4b657f':'#4b515d';
      });
    }
    const material=applyDistrictDepth(layer.mesh?new T.MeshBasicMaterial({color:'#ffffff',vertexColors:true,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1})
      :new T.LineBasicMaterial({color:layer.color,transparent:true,opacity:layer.opacity,depthWrite:false}),layer.mesh?.35:.54);
    const object=layer.mesh?new T.Mesh(geometry,material):new T.LineSegments(geometry,material);
    object.name=layer.name;layer.material=material;root.add(object);
  }
  return {root,buildings,setPresentation(expansion,reveal) {
    const amount=(1-T.MathUtils.clamp(reveal,0,1))*(1-T.MathUtils.clamp(expansion,0,1)*.7);root.visible=amount>.005;
    for(const layer of layers) {
      const m=layer.material;m.opacity=(layer.opacity??1)*amount;
      if(layer.mesh&&m.transparent!==(amount<.999)){m.transparent=amount<.999;m.needsUpdate=true;}
    }
  }};
}
