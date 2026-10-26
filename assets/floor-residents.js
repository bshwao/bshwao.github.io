import * as T from './vendor/three.module.min.js';
import { interiorFloorHeight } from './tower-geometry.js';

export const residentPauseKey='eh-resident-pause-v1';
export function readResidentPause(storage){try{return storage?.getItem(residentPauseKey)==='true';}catch{return false;}}

/** The seated companion shares the chair's batched transform and picking range. */
export function furnishSeatedRobot(parent,x,z,{box,cylinder,sphere}){
  const g=new T.Group();g.position.set(x,0,z);g.rotation.y=Math.PI;parent.add(g);
  const part=(x,y,z,w,h,d,mat='structure')=>box(g,x,y,z,w,h,d,mat);
  part(0,1.17,0,.62,.32,.5,'equipment');part(0,1.65,0,.7,.65,.46);
  cylinder(g,0,2.03,0,.11,.15,'ink');part(0,2.32,0,.78,.5,.57);
  part(0,2.33,.298,.64,.32,.035,'ink');
  for(const side of [-1,1]){
    part(side*.17,2.37,.322,.11,.075,.018,'glass');
    cylinder(g,side*.44,2.32,0,.11,.11,'equipment').rotation.z=Math.PI/2;
    part(side*.21,1.08,.3,.22,.23,.64,'equipment');
    sphere(g,side*.21,1.04,.59,.14,'ink');
    part(side*.21,.55,.59,.18,.9,.2);part(side*.21,.09,.7,.27,.16,.42,'equipment');
    sphere(g,side*.45,1.85,.02,.14,'equipment');
    const upper=part(side*.45,1.63,.23,.19,.49,.2);upper.rotation.x=.65;
    sphere(g,side*.45,1.45,.43,.12,'ink');
    const forearm=part(side*.4,1.57,.67,.16,.19,.52,'equipment');forearm.rotation.x=-.4;
    part(side*.35,1.7,.9,.22,.1,.22,'glass');
  }
  part(0,2.25,.323,.19,.025,.018,'glass');cylinder(g,.2,2.65,0,.025,.18,'ink');sphere(g,.2,2.76,0,.065,'glass');
  g.userData.resident='seated';return g;
}

/** Smooth, closed patrol through an open gallery lane. */
export function galleryRoute(region,landing,unit,band=null){
  const radius=landing*.1,half=region.width/2-unit*.8;
  const left=region.x-half+radius,right=region.x+half-radius;
  const z=band?(band.min+band.max)/2:region.z+region.depth/2-landing*.5,straight=right-left,length=straight*2+Math.PI*radius*2;
  return {left,right,z,radius,length,region:{...region},sample(distance){
    let s=((distance%length)+length)%length;
    if(s<straight)return {x:left+s,z:z-radius,heading:Math.PI/2};s-=straight;
    if(s<Math.PI*radius){const a=-Math.PI/2+s/radius;return {x:right+radius*Math.cos(a),z:z+radius*Math.sin(a),heading:-a};}s-=Math.PI*radius;
    if(s<straight)return {x:right-s,z:z+radius,heading:-Math.PI/2};s-=straight;
    const a=Math.PI/2+s/radius;return {x:left+radius*Math.cos(a),z:z+radius*Math.sin(a),heading:-a};
  }};
}

function walkingRobot(colors){
  const root=new T.Group();root.name='gallery-walking-robot';
  const cube=new T.BoxGeometry(1,1,1),ball=new T.SphereGeometry(1,8,6),round=new T.CylinderGeometry(1,1,1,10);
  const parts=[],rigs=[];let vertexCount=0,currentRig=null;
  function part(source,x,y,z,w,h,d,color='structure',turn=0){
    const geometry=source.toNonIndexed(),matrix=new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),turn),new T.Vector3(w,h,d));
    geometry.applyMatrix4(matrix);const count=geometry.attributes.position.count;
    const rgb=new T.Color(colors[color]),values=new Float32Array(count*3);for(let i=0;i<values.length;i+=3){values[i]=rgb.r;values[i+1]=rgb.g;values[i+2]=rgb.b;}
    geometry.setAttribute('color',new T.BufferAttribute(values,3));
    if(currentRig)rigs.push({start:vertexCount,count,...currentRig});parts.push(geometry);vertexCount+=count;
  }
  const box=(x,y,z,w,h,d,c='structure',r=0)=>part(cube,x,y,z,w,h,d,c,r);
  const sphere=(x,y,z,r,c='equipment')=>part(ball,x,y,z,r,r,r,c);
  box(0,1.25,0,.62,.3,.46,'equipment');box(0,1.74,0,.76,.66,.49);
  box(0,1.77,.257,.36,.24,.025,'equipment');box(0,1.81,.275,.17,.035,.012,'glass');
  part(round,0,2.14,0,.11,.15,.11,'ink');box(0,2.42,0,.84,.5,.6);
  box(0,2.43,.314,.7,.33,.035,'ink');
  for(const side of [-1,1]){
    box(side*.19,2.47,.338,.13,.085,.018,'glass');
    sphere(side*.47,2.43,0,.12);
    currentRig={pivot:[side*.22,1.16,0],amplitude:side*.34};
    sphere(side*.22,1.15,0,.14,'ink');box(side*.22,.91,0,.23,.43,.23);
    sphere(side*.22,.68,0,.12,'equipment');box(side*.22,.44,0,.19,.4,.21,'equipment');
    box(side*.22,.13,.1,.3,.2,.46,'ink');
    currentRig={pivot:[side*.49,1.99,0],amplitude:-side*.28};
    sphere(side*.49,1.99,0,.14,'equipment');box(side*.5,1.77,0,.19,.39,.21);
    sphere(side*.5,1.53,0,.12,'ink');box(side*.5,1.32,.03,.16,.33,.19,'equipment');sphere(side*.5,1.1,.05,.11,'glass');
    currentRig=null;
  }
  box(0,2.36,.34,.2,.027,.018,'glass');part(round,.2,2.76,0,.025,.18,.025,'ink');sphere(.2,2.87,0,.065,'glass');
  const geometry=new T.BufferGeometry();
  for(const name of ['position','normal','color']){const values=new Float32Array(vertexCount*3);let offset=0;for(const part of parts){values.set(part.attributes[name].array,offset);offset+=part.attributes[name].array.length;}geometry.setAttribute(name,new T.BufferAttribute(values,3));}
  const rest=geometry.attributes.position.array.slice(),normals=geometry.attributes.normal.array.slice();
  geometry.attributes.position.setUsage(T.DynamicDrawUsage);geometry.attributes.normal.setUsage(T.DynamicDrawUsage);
  geometry.boundingBox=new T.Box3(new T.Vector3(-.8,-.05,-.75),new T.Vector3(.8,3,.75));geometry.boundingSphere=geometry.boundingBox.getBoundingSphere(new T.Sphere());
  const material=new T.MeshLambertMaterial({vertexColors:true});const mesh=new T.Mesh(geometry,material);root.add(mesh);
  const rotation=new T.Matrix4(),matrix=new T.Matrix4(),origin=new T.Matrix4(),normalMatrix=new T.Matrix3(),point=new T.Vector3(),normal=new T.Vector3();
  for(const part of parts)part.dispose();cube.dispose();ball.dispose();round.dispose();
  return {root,mesh,pose(phase,moving){
    for(const rig of rigs){const [x,y,z]=rig.pivot;rotation.makeRotationX(moving?Math.sin(phase)*rig.amplitude:0);matrix.makeTranslation(x,y,z).multiply(rotation).multiply(origin.makeTranslation(-x,-y,-z));normalMatrix.getNormalMatrix(matrix);
      for(let i=rig.start;i<rig.start+rig.count;i++){point.fromArray(rest,i*3).applyMatrix4(matrix);normal.fromArray(normals,i*3).applyNormalMatrix(normalMatrix);geometry.attributes.position.setXYZ(i,point.x,point.y,point.z);geometry.attributes.normal.setXYZ(i,normal.x,normal.y,normal.z);}
    }
    geometry.attributes.position.needsUpdate=true;geometry.attributes.normal.needsUpdate=true;
  }};
}

/** A single extra draw, active only in the visible Level 01 gallery. */
export function createGalleryResident(parent,room,unit,landing,colors,obstacles=[]){
  let scale=unit*.8;
  const required=2*(scale*.85+landing*.1)+.08;
  // Prefer an open lane behind the front benches, where the entrance frames
  // cannot hide the character. Actual furniture bounds reserve the clearance.
  const min=room.region.z,max=room.region.z+room.region.depth/2,gaps=[];
  const blocked=obstacles.map(box=>({min:Math.max(min,box.min.z),max:Math.min(max,box.max.z)})).filter(span=>span.max>span.min).sort((a,b)=>a.min-b.min);
  let cursor=min;
  for(const span of blocked){if(span.min-cursor>=required)gaps.push({min:cursor,max:span.min});cursor=Math.max(cursor,span.max);}
  if(max-cursor>=required)gaps.push({min:cursor,max});
  if(!gaps.length)scale=Math.min(scale,(landing*.4-.04)/.85);
  const robot=walkingRobot(colors),route=galleryRoute(room.region,landing,unit,gaps[0]);
  robot.root.scale.setScalar(scale);parent.add(robot.root);
  let elapsed=0,last=null,wasMoving=false,shown=true;
  const floor=interiorFloorHeight+.022;
  const bounds=new T.Box3(new T.Vector3(route.left-route.radius-scale*.85,interiorFloorHeight,route.z-route.radius-scale*.85),new T.Vector3(route.right+route.radius+scale*.85,floor+scale*3,route.z+route.radius+scale*.85));
  function place(moving){const p=route.sample(route.length*.18+elapsed*unit*.55);robot.root.position.set(p.x,floor+(moving?Math.abs(Math.sin(elapsed*8))*.025*scale:0),p.z);robot.root.rotation.y=p.heading;robot.pose(elapsed*8,moving);}
  place(false);
  return {root:robot.root,mesh:robot.mesh,route,bounds,obstacles,
    update(time,{visible=true,animate=true}={}){
      const visibilityChanged=shown!==visible;shown=visible;robot.root.visible=visible;
      const moving=visible&&animate;
      if(moving){if(last!==null)elapsed+=Math.min(.1,Math.max(0,(time-last)/1000));last=time;place(true);}
      else {last=null;if(wasMoving)place(false);}
      const changed=moving||wasMoving!==moving||visibilityChanged;wasMoving=moving;
      return {changed,moving};
    },
    state(){return {count:2,moving:wasMoving,position:robot.root.position.toArray(),distance:elapsed*unit*.55,visible:shown};},
  };
}
