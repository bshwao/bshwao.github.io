import * as T from './vendor/three.module.min.js';
import { settlementRoads, settlementHouses, settlementStructures } from './island-settlement.js';
import { planRoadMarkings } from './road-markings.js';
import { outskirtsRoads, riverEdges, riverPlan } from './city-layout.js';
import { islandTerrainHeight } from './island-topography.js';
import { cityPalette } from './city-palette.js';

export function settlementRoadHeight(road,along) {
  for(let i=1;i<road.profile.length;i++){const[a,y0]=road.profile[i-1],[b,y1]=road.profile[i];if(along<=b)return y0+(y1-y0)*Math.max(0,(along-a)/(b-a));}
  return road.profile.at(-1)[1];
}

/** The new town edge joins the existing four outskirts batches. */
export function appendIslandSettlement({vertex,feature,rect,box,solid,subtract}) {
  const quad=(layer,a,b,c,d,tint,glow=0,surface=0)=>{for(const p of [a,b,c,a,c,d])vertex(layer,p,tint,glow,surface);};
  const top=(layer,b,y,tint)=>rect(layer,b,y,tint);
  const seen=outskirtsRoads.map(road=>road.bounds);
  const seenWalks=[];
  for(const road of settlementRoads)feature('settlement-street',()=>{
    const expand=b=>[b[0]-road.walk,b[1]-road.walk,b[2]+road.walk,b[3]+road.walk];
    const strips=(bounds,offset,surface,tint)=>{
      for(const b of bounds){const lo=road.axis==='x'?b[0]:b[1],hi=road.axis==='x'?b[2]:b[3];
        const stops=[lo,...road.profile.map(p=>p[0]).filter(x=>x>lo&&x<hi),hi];
        for(let i=1;i<stops.length;i++){
          const a=stops[i-1],c=stops[i],y0=settlementRoadHeight(road,a)+offset,y1=settlementRoadHeight(road,c)+offset;
          const points=road.axis==='x'?[[a,y0,b[1]],[a,y0,b[3]],[c,y1,b[3]],[c,y1,b[1]]]:[[b[0],y0,a],[b[0],y1,c],[b[2],y1,c],[b[2],y0,a]];
          quad('paving',...points,tint,0,surface);
        }
      }
    };
    strips(subtract(road.bounds,seen),0,1,cityPalette.road);seen.push(road.bounds);
    const outer=expand(road.bounds);
    strips(subtract(outer,[...outskirtsRoads.map(r=>r.bounds),...settlementRoads.map(r=>r.bounds),...seenWalks]),.11,0,'#a5aa9b');seenWalks.push(outer);
  },{id:road.id,plan:road});
  const roadMarkings=planRoadMarkings('settlement');
  for(const patch of roadMarkings)quad('marks',...patch.points,patch.color);

  const wall=['#b4ae98','#9eaaa1','#a58f80','#a9a38b','#8f9f9f'],roof=['#6f7876','#80766d','#8e7867','#737e82'];
  function home(h,publicBuilding=false){
    const {x,z,w,d,base}=h,y=base+h.height,x0=x-w/2,x1=x+w/2,z0=z-d/2,z1=z+d/2;
    const tint=publicBuilding?'#a6aca2':wall[Math.abs(h.seed)%wall.length],tile=roof[Math.abs(h.seed||2)%roof.length];
    top('paving',h.bounds,base,'#a1a693');
    if(base-h.low>.45)for(const [a,b,c,e]of [
      [[x0,h.low,z0],[x0,base,z0],[x1,base,z0],[x1,h.low,z0]],[[x1,h.low,z1],[x1,base,z1],[x0,base,z1],[x0,h.low,z1]],
      [[x0,h.low,z1],[x0,base,z1],[x0,base,z0],[x0,h.low,z0]],[[x1,h.low,z0],[x1,base,z0],[x1,base,z1],[x1,h.low,z1]],
    ])quad('fixtures',a,b,c,e,'#7c8279');
    quad('fixtures',[x0,base,z0],[x0,y,z0],[x1,y,z0],[x1,base,z0],tint);
    quad('fixtures',[x0,base,z1],[x1,base,z1],[x1,y,z1],[x0,y,z1],tint);
    quad('fixtures',[x0,base,z0],[x0,base,z1],[x0,y,z1],[x0,y,z0],tint);
    quad('fixtures',[x1,base,z1],[x1,base,z0],[x1,y,z0],[x1,y,z1],tint);
    if(h.roof==='gable'){
      if(h.axis==='z'){
        quad('fixtures',[x0,y,z0],[x0,y+1.7,z],[x1,y+1.7,z],[x1,y,z0],tile);
        quad('fixtures',[x0,y+1.7,z],[x0,y,z1],[x1,y,z1],[x1,y+1.7,z],tile);
        for(const p of [[x0,y,z0],[x0,y,z1],[x0,y+1.7,z],[x1,y,z1],[x1,y,z0],[x1,y+1.7,z]])vertex('fixtures',p,tint);
      }else{
        quad('fixtures',[x0,y,z0],[x0,y,z1],[x,y+1.7,z1],[x,y+1.7,z0],tile);
        quad('fixtures',[x,y+1.7,z0],[x,y+1.7,z1],[x1,y,z1],[x1,y,z0],tile);
        for(const p of [[x1,y,z0],[x0,y,z0],[x,y+1.7,z0],[x0,y,z1],[x1,y,z1],[x,y+1.7,z1]])vertex('fixtures',p,tint);
      }
    }else if(h.roof==='hip'){
      for(const [a,b]of [[[x1,y,z0],[x0,y,z0]],[[x0,y,z0],[x0,y,z1]],[[x0,y,z1],[x1,y,z1]],[[x1,y,z1],[x1,y,z0]]])for(const p of [a,b,[x,y+1.7,z]])vertex('fixtures',p,tile);
    }else top('fixtures',h.bounds,y,tile);
    const ly=base+h.height*.43,hy=base+h.height*.76,ww=Math.min(2.8,w*.17),wd=Math.min(2.8,d*.17),window='#bdbb96';
    for(const face of [-1,1]){
      const pz=z+face*(d/2+.035),px=x+face*(w/2+.035);
      const front=h.axis==='x'&&face===-h.side;
      for(const cx of front?[x-w*.22,x+w*.22]:[x]){let q=[[cx-ww/2,ly,pz],[cx+ww/2,ly,pz],[cx+ww/2,hy,pz],[cx-ww/2,hy,pz]];if(face<0)q.reverse();quad('fixtures',...q,window,1);}
      const sideFront=h.axis==='z'&&face===-h.side;
      for(const cz of sideFront?[z-d*.22,z+d*.22]:[z]){let q=[[px,ly,cz-wd/2],[px,hy,cz-wd/2],[px,hy,cz+wd/2],[px,ly,cz+wd/2]];if(face<0)q.reverse();quad('fixtures',...q,window,1);}
    }
    const sign=-(h.side||1),door='#65736f';
    if(h.axis==='z'){const px=x+sign*(w/2+.04);let q=[[px,base,z-.65],[px,base+2.4,z-.65],[px,base+2.4,z+.65],[px,base,z+.65]];if(sign<0)q.reverse();quad('fixtures',...q,door);}
    else{const pz=z+sign*(d/2+.04);let q=[[x-.65,base,pz],[x+.65,base,pz],[x+.65,base+2.4,pz],[x-.65,base+2.4,pz]];if(sign<0)q.reverse();quad('fixtures',...q,door);}
  }
  for(const h of settlementHouses)feature('island-house',()=>{
    const road=settlementRoads.find(r=>r.id===h.roadId),along=road.axis==='x'?h.x:h.z,edge=road.center+h.side*(road.width/2+road.walk);
    const front=road.axis==='x'?h.z-h.side*h.d/2:h.x-h.side*h.w/2,drive=road.axis==='x'?[h.x-1.4,Math.min(edge,front),h.x+1.4,Math.max(edge,front)]:[Math.min(edge,front),h.z-1.4,Math.max(edge,front),h.z+1.4];
    const streetY=settlementRoadHeight(road,along)+.12;
    const [a,b,c,d]=drive;
    const points=road.axis==='x'?[[a,edge<front?streetY:h.base,b],[a,edge<front?h.base:streetY,d],[c,edge<front?h.base:streetY,d],[c,edge<front?streetY:h.base,b]]:[[a,edge<front?streetY:h.base,b],[a,edge<front?streetY:h.base,d],[c,edge<front?h.base:streetY,d],[c,edge<front?h.base:streetY,b]];
    quad('paving',...points,'#b1af98');home(h);
  },{id:h.id,plan:h});

  const cylinder=new T.CylinderGeometry(1,1,1,10).toNonIndexed();
  for(const s of settlementStructures)feature(`island-${s.type}`,()=>{
    if(s.type==='water-tower'){
      for(const dx of [-4,4])for(const dz of [-4,4])box('fixtures',s.x+dx,s.base+6,s.z+dz,.7,12,.7,'#89978f');
      solid('fixtures',cylinder,s.x,s.base+14,s.z,6,5,6,'#9caaa4');solid('fixtures',cylinder,s.x,s.base+16.6,s.z,6.4,.35,6.4,'#6b7f7d');
    }else if(s.type==='solar-garden'){
      for(let x=s.x-s.w/2+4;x<s.x+s.w/2-3;x+=10)for(let z=s.z-s.d/2+4;z<s.z+s.d/2-3;z+=9){const y=islandTerrainHeight(x,z)+.6;quad('fixtures',[x-3,y,z-2.4],[x-3,y+.8,z+2.4],[x+3,y+.8,z+2.4],[x+3,y,z-2.4],'#486978');}
    }else{
      const access=s.access.road,side=access.axis==='x'?Math.sign(s.z-access.center):Math.sign(s.x-access.center);
      home({...s,axis:access.axis,side,roof:['community-hall','market'].includes(s.type)?'gable':'flat',seed:s.type.length},true);
      if(['depot','fire-station'].includes(s.type))for(const dx of [-s.w*.3,0,s.w*.3])quad('fixtures',[s.x+dx-3,s.base,s.z+s.d/2+.06],[s.x+dx+3,s.base,s.z+s.d/2+.06],[s.x+dx+3,s.base+4,s.z+s.d/2+.06],[s.x+dx-3,s.base+4,s.z+s.d/2+.06],'#788c8a');
      if(s.type==='school')top('marks',[s.x-13,s.z-5,s.x+13,s.z+5],s.base+s.height+.025,'#84957c');
      if(s.type==='clinic'){
        const z=s.z+s.d/2+.08,y=s.base+s.height*.7;
        quad('fixtures',[s.x-2,y-.5,z],[s.x+2,y-.5,z],[s.x+2,y+.5,z],[s.x-2,y+.5,z],'#b77663');
        quad('fixtures',[s.x-.5,y-2,z+.01],[s.x+.5,y-2,z+.01],[s.x+.5,y+2,z+.01],[s.x-.5,y+2,z+.01],'#b77663');
      }
    }
    const [rx,rz]=s.access.point,dx=rx-s.x,dz=rz-s.z,length=Math.hypot(dx,dz),nx=-dz/length*1.5,nz=dx/length*1.5;
    const y=settlementRoadHeight(s.access.road,s.access.road.axis==='x'?rx:rz)+.12;
    quad('paving',[s.x+nx,s.base,s.z+nz],[rx+nx,y,rz+nz],[rx-nx,y,rz-nz],[s.x-nx,s.base,s.z-nz],'#aaa995');
  },{id:s.id,plan:s});
  const harbor=settlementStructures.find(s=>s.type==='harbor-office');
  if(harbor)feature('island-marina',()=>{
    const x=harbor.x+20,z=riverEdges(x).north;
    box('fixtures',x,riverPlan.waterY+.17,z+4,28,.28,2.2,'#9b917b');
    for(const dx of [-9,0,9]){box('fixtures',x+dx,riverPlan.waterY+.17,z+8,1.3,.28,9,'#9b917b');box('fixtures',x+dx+2.5,riverPlan.waterY+.4,z+9,3,.65,5,'#b6b7a6');box('fixtures',x+dx+2.5,riverPlan.waterY+.9,z+9,2,.4,2.4,'#7d989d');}
  },{waterfront:true});
  cylinder.dispose();
  return roadMarkings;
}
