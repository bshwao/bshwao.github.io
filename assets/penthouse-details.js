import * as T from './vendor/three.module.min.js';

/** Four visitor spaces, built into the existing room batches and object picker. */
export function furnishPenthouse(index, p, api) {
  const { box, cylinder, ring, sphere, wire, interact, sofa, plant, bookcase } = api;
  const part = (x,y,z,w,h,d,material='structure',turn=0) => box(p,x,y,z,w,h,d,material,turn);
  const note = (name, build) => {
    p.userData.features ??= [];
    p.userData.features.push(name);
    build();
  };
  const group = (parent,x,y,z,turn=0) => {
    const g=new T.Group();g.position.set(x,y,z);g.rotation.y=turn;parent.add(g);return g;
  };
  function rug(x,z,w,d) {
    part(x,.0125,z,w,.025,d,'glass');
    for(const side of [-1,1])part(x,.028,z+side*(d/2-.08),w-.12,.006,.025,'equipment');
  }
  function cabinet(x,z,w=1.2,h=.95,d=.9) {
    part(x,h/2,z,w,h,d,'equipment');
    part(x,h+.045,z,w+.06,.08,d+.06);
    for(const y of [h*.25,h*.71]) {
      part(x,y,z+d/2+.025,w-.12,h*.37,.045,'structure');
      part(x,y,z+d/2+.054,w*.3,.035,.025,'ink');
    }
  }
  function lamp(x,z,y) {
    interact(p,'Bedside lamp','display',()=>{
      cylinder(p,x,y+.045,z,.22,.08,'equipment');
      part(x,y+.43,z,.045,.7,.045,'ink');
      cylinder(p,x,y+.84,z,.34,.34,'structure');
      cylinder(p,x,y+.66,z,.26,.025,'glass');
      cylinder(p,x,y+1.035,z,.045,.065,'ink');
    });
  }
  function cushionChair(x,z,turn=0,name='Lounge chair') {
    interact(p,name,'sofa',()=>{
      const g=group(p,x,0,z,turn);
      box(g,0,.45,0,1.5,.4,1.35,'equipment');
      box(g,0,.73,-.04,1.24,.16,1.1,'glass');
      box(g,0,1.09,.58,1.5,.88,.16,'structure');
      for(const side of [-1,1])box(g,side*.67,.88,.02,.16,.4,1.2,'structure');
      for(const dx of [-.52,.52])for(const dz of [-.43,.43])cylinder(g,dx,.12,dz,.055,.24,'ink');
    });
  }
  function books(x,y,z,name='Stack of books') {
    interact(p,name,'paper',()=>{
      for(let i=0;i<3;i++) {
        const turn=(i-1)*.08;
        box(p,x,y+.045+i*.095,z,.62,.085,.45,i%2?'glass':'equipment',turn);
        box(p,x,y+.045+i*.095,z+.229,.5,.042,.014,'structure',turn);
      }
    });
  }
  function art(x,z,kind='shapes') {
    // A floor-supported feature board, not art floating between the furnishings
    // and the real bay wall. Supports stay inside the existing frame footprint.
    for(const side of [-1,1]) {
      part(x+side*1.08,1.1,z,.065,2.2,.075,'equipment');
      part(x+side*1.08,.06,z+.02,.4,.12,.14,'equipment');
    }
    part(x,2.7,z,2.65,1.45,.10,'equipment');
    part(x,2.7,z+.06,2.46,1.26,.025,'structure');
    if(kind==='stars') {
      const points=[[-.9,.28],[-.48,-.14],[-.05,.12],[.45,-.27],[.92,.25]];
      for(const [dx,dy]of points)sphere(p,x+dx,2.7+dy,z+.09,.055,'glass');
      wire(p,points.map(([dx,dy])=>[x+dx,2.7+dy,z+.09]),'ink',.012);
    }else{
      const disc=cylinder(p,x-.55,2.85,z+.09,.28,.025,'glass');disc.rotation.x=Math.PI/2;
      part(x+.45,2.7,z+.09,.58,.72,.022,'equipment',.12);
      part(x-.35,2.34,z+.09,1.05,.025,.02,'ink');
    }
  }
  function toyRobot(x,z) {
    interact(p,'Toy robot','bounce',()=>{
      for(const side of [-1,1]) {
        part(x+side*.23,.18,z,.23,.36,.28,'equipment');
        part(x+side*.23,.055,z+.07,.28,.11,.44,'ink');
        part(x+side*.53,.67,z,.15,.55,.21,'structure',side*.18);
      }
      part(x,.62,z,.67,.59,.43,'structure');
      part(x,1.13,z,.83,.43,.5,'equipment');
      part(x,1.12,z+.263,.66,.28,.025,'glass');
      for(const side of [-1,1])part(x+side*.17,1.15,z+.282,.09,.07,.018,'ink');
      part(x,1.39,z,.035,.13,.035,'ink');sphere(p,x,1.49,z,.08,'glass');
      for(const side of [-1,1])cylinder(p,x+side*.17,.69,z+.235,.055,.025,'glass').rotation.x=Math.PI/2;
    });
  }

  if(index===0) {
    note('Bedroom with separate sleeping, bedside and computer work areas',()=>{
      rug(-.8,-.35,3.65,4.85);
      const bedFrame=part(-.75,.35,-.45,2.85,.38,4.0,'equipment');
      for(const x of [-1.85,.35])for(const z of [-2.08,1.2])part(x,.13,z,.15,.26,.15,'ink');
      part(-.75,.71,-.4,2.65,.34,3.76,'structure');
      part(-.75,1.15,-2.50,2.95,1.5,.16,'equipment');
      for(const x of [-1.8,-1.1,-.4,.3])part(x,1.15,-2.4075,.035,1.22,.025,'glass');
      interact(p,'Pillows and duvet','sofa',()=>{
        const duvet=part(-.75,.965,.19,2.64,.17,2.42,'glass');
        for(const x of [-1.4,-.1])part(x,1.015,-1.66,1.1,.25,.62,'structure');
        // Stitch the hem onto the actual rounded cover. Flat strips floated
        // above its bevel and their box outlines crossed the blanket's edges.
        duvet.updateMatrix();
        const probe=new T.Mesh(duvet.geometry,duvet.material);probe.updateMatrixWorld(true);
        const ray=new T.Raycaster(),points=[];
        for(let i=0;i<=48;i++){
          ray.set(new T.Vector3(-.4+i/48*.8,1,.33),new T.Vector3(0,-1,0));
          const hit=ray.intersectObject(probe,false)[0];
          if(!hit)throw new Error('The duvet hem must remain on the cover');
          const point=hit.point.applyMatrix4(duvet.matrix);point.y+=.009;points.push(point);
        }
        const path=new T.CurvePath();
        for(let i=1;i<points.length;i++)path.add(new T.LineCurve3(points[i-1],points[i]));
        const hem=new T.Mesh(new T.TubeGeometry(path,96,.0035,4,false),bedFrame.material);
        hem.userData.surface='equipment';hem.userData.outline=false;p.add(hem);
      });
      cabinet(1.45,-1.75,1.2,.95,1.1);
      lamp(1.65,-1.94,1.035);books(1.17,1.035,-1.45,'Bedside books');
      interact(p,'Slippers','bounce',()=>{
        for(const side of [-1,1]) {
          const x=.91+side*.18;
          part(x,.075,1.94,.23,.15,.56,'equipment',-.1);
          part(x,.17,1.8,.23,.05,.25,'glass',-.1);
        }
      });
      interact(p,'Soft ottoman','sofa',()=>{
        part(-.75,.32,2.75,1.15,.64,1.1,'equipment');
        part(-.75,.69,2.75,1.11,.12,1.06,'glass');
      });
      plant(p,-3.1,2.6);
      note('Side-wall computer workstation with a task chair and clear sitting space',()=>{
        // Face the monitor into a dedicated work area, away from the headboard.
        // All desk components share this transform before the room is fitted.
        const workstation=group(p,3.75,0,.35,-Math.PI/2);
        const deskPart=(x,y,z,w,h,d,mat='structure')=>box(workstation,x,y,z,w,h,d,mat);
        interact(workstation,'Bedroom computer desk','pulse',()=>{
          deskPart(0,1.55,0,2.8,.14,1.25,'equipment');
          for(const x of [-1.22,1.22])for(const z of [-.48,.48])deskPart(x,.75,z,.085,1.5,.085,'equipment');
          deskPart(0,.35,-.49,2.45,.08,.075,'equipment');
          deskPart(-.99,.63,-.14,.43,1.18,.66,'ink');
          for(const y of [.39,.58,.77])deskPart(-.99,y,.198,.29,.035,.018,'equipment');
          deskPart(0,1.67,-.32,.72,.09,.38,'ink');
          deskPart(0,1.91,-.32,.075,.45,.075,'ink');
          deskPart(0,1.65,.31,1.14,.04,.33,'structure');
          for(let row=0;row<3;row++)for(let col=0;col<9;col++)deskPart(-.49+col*.12,1.675,.2+row*.105,.085,.01,.06,'equipment');
          const mouse=sphere(workstation,.89,1.68,.32,.1,'glass');mouse.scale.set(.1,.045,.14);
        });
        interact(workstation,'Bedroom computer monitor','display',()=>{
          deskPart(0,2.36,-.32,1.8,1.05,.12,'ink');
          deskPart(0,2.36,-.251,1.64,.89,.018,'glass');
          deskPart(-.39,2.49,-.236,.67,.34,.012,'structure');
          for(let i=0;i<3;i++)deskPart(.3,2.53-i*.16,-.236,.39,.04,.012,'equipment');
        });
        interact(workstation,'Bedroom computer chair','seat',()=>{
          const chair=group(workstation,0,0,1.37);
          cylinder(chair,0,.46,0,.07,.56,'ink');
          for(let i=0;i<5;i++){
            const a=i*Math.PI*2/5,x=Math.cos(a)*.5,z=Math.sin(a)*.5;
            wire(chair,[[0,.23,0],[x,.12,z]],'equipment',.04);
            const wheel=cylinder(chair,x,.09,z,.09,.075,'ink');wheel.rotation.z=Math.PI/2;wheel.rotation.y=-a;
          }
          box(chair,0,.78,0,1.06,.13,.97,'equipment');
          box(chair,0,.88,-.025,1.0,.14,.9,'glass');
          const back=box(chair,0,1.34,.42,.99,.96,.12,'equipment');back.rotation.x=.1;
          const pad=box(chair,0,1.35,.345,.86,.79,.07,'glass');pad.rotation.x=.1;
          for(const side of [-1,1]){
            box(chair,side*.49,1.045,.06,.055,.33,.055,'equipment');
            box(chair,side*.49,1.24,.035,.12,.075,.63,'structure');
          }
        });
      });
    });
  }else if(index===1) {
    note('Play lounge with a console, arcade, tabletop game and toy robot',()=>{
      rug(-.9,.2,4.1,4.6);
      sofa(p,-1.1,1.05,Math.PI);
      cabinet(-1.0,-2.65,3.75,.75,.85);
      // Screen and bezel move together; the low media cabinet stays fixed.
      part(-1,1.08,-2.65,.12,.5,.16,'ink');part(-1,.84,-2.65,1.1,.055,.42,'equipment');
      interact(p,'Game screen','display',()=>{
        part(-1,2.2,-2.65,3.12,1.8,.15,'ink');
        part(-1,2.2,-2.561,2.91,1.59,.025,'glass');
        for(let col=0;col<7;col++) {
          const height=.13*(1+((col*3)%5));
          part(-2.12+col*.35,1.82+height/2,-2.54,.22,height,.018,col%2?'equipment':'structure');
        }
        part(-1,2.63,-2.54,1.53,.038,.018,'equipment');
      });
      interact(p,'Game console','display',()=>{
        part(.28,1.02,-2.58,.4,.37,.48,'equipment');
        part(.28,1.02,-2.326,.25,.2,.018,'ink');
        part(.28,1.16,-2.31,.04,.03,.02,'glass');
      });
      part(-1.1,.58,-.55,2.3,.12,1.0,'structure');
      for(const x of [-2.03,-.17])for(const z of [-.9,-.2])part(x,.27,z,.08,.54,.08,'equipment');
      part(-1.58,.66,-.55,.94,.035,.83,'equipment');
      for(let row=0;row<3;row++)for(let col=0;col<3;col++)part(-1.89+col*.31,.683,-.82+row*.27,.275,.012,.235,(row+col)%2?'glass':'structure');
      interact(p,'Tabletop game pieces','bounce',()=>{
        for(const [x,z,material]of [[-1.89,-.82,'ink'],[-1.58,-.55,'equipment'],[-1.27,-.28,'ink']]) {
          cylinder(p,x,.73,z,.075,.07,material);sphere(p,x,.8,z,.07,material);
        }
      });
      interact(p,'Game controller','bounce',()=>{
        part(-.43,.73,-.49,.66,.14,.35,'equipment');
        for(const side of [-1,1])part(-.43+side*.25,.68,-.34,.16,.18,.27,'equipment',side*.18);
        part(-.61,.812,-.49,.15,.018,.045,'ink');part(-.61,.812,-.49,.045,.018,.15,'ink');
        for(const [dx,dz]of [[0,-.055],[.07,0],[0,.055],[-.07,0]])cylinder(p,-.25+dx,.813,-.49+dz,.026,.025,'glass');
      });
      interact(p,'Arcade machine','display',()=>{
        part(2.65,1.1,-1.7,1.15,2.2,.95,'equipment');
        part(2.65,1.58,-1.205,.94,.78,.035,'ink');part(2.65,1.58,-1.177,.79,.63,.018,'glass');
        for(let i=0;i<3;i++)part(2.39+i*.26,1.48+i*.13,-1.161,.13,.1,.014,'structure');
        part(2.65,2.13,-1.184,.92,.17,.035,'structure');
        part(2.65,.99,-1.04,1.2,.12,.45,'structure');
        cylinder(p,2.42,1.12,-1.03,.045,.18,'ink');sphere(p,2.42,1.24,-1.03,.09,'equipment');
        for(const x of [2.7,2.91])cylinder(p,x,1.075,-1.03,.065,.055,'glass');
        part(2.65,.35,-1.204,.66,.14,.025,'ink');
      });
      toyRobot(2.48,1.35);plant(p,-3.2,-2.45);
    });
  }else if(index===2) {
    note('Listening nook with a spinning vinyl record and playable keyboard',()=>{
      rug(.6,.45,5.9,4.45);
      cabinet(-1.5,-2.45,2.55,1.1,1.05);
      part(-1.5,1.235,-2.45,2.12,.18,1.12,'equipment');
      cylinder(p,-1.8,1.33,-2.45,.14,.03,'ink');
      interact(p,'Vinyl record','spin',()=>{
        cylinder(p,-1.8,1.355,-2.45,.51,.045,'ink');
        for(const r of [.3,.4,.47])ring(p,-1.8,1.383,-2.45,r,'equipment',Math.PI/2);
        cylinder(p,-1.8,1.386,-2.45,.145,.018,'structure');
        part(-1.74,1.399,-2.45,.026,.012,.18,'glass');
      });
      cylinder(p,-.78,1.4,-2.63,.065,.16,'ink');
      wire(p,[[-.78,1.47,-2.63],[-.94,1.48,-2.24],[-1.38,1.43,-2.29]],'structure',.025);
      part(-1.4,1.405,-2.29,.11,.055,.12,'equipment');
      for(const x of [-3.22,.22])interact(p,x<0?'Left speaker':'Right speaker','pulse',()=>{
        part(x,.93,-2.45,.72,1.86,.72,'equipment');part(x,.93,-2.072,.59,1.68,.025,'ink');
        for(const [y,r]of [[.55,.22],[1.24,.15]]) {
          const cone=cylinder(p,x,y,-2.045,r,.035,'glass');cone.rotation.x=Math.PI/2;
          const center=cylinder(p,x,y,-2.018,r*.37,.025,'ink');center.rotation.x=Math.PI/2;
        }
      });
      part(1.93,1.36,.05,2.85,.14,1.07,'structure');
      for(const x of [.74,3.12])part(x,.65,.05,.08,1.3,.75,'equipment');
      interact(p,'Synthesizer keys','piano',()=>{
        part(1.93,1.52,.05,2.73,.18,.99,'equipment');
        for(let i=0;i<18;i++) {
          const x=.7+i*.145;
          part(x,1.63,.24,.134,.045,.53,'structure').userData.pianoKey=i;
          if(![2,6].includes(i%7)&&i<17)part(x+.071,1.675,.1,.07,.06,.26,'ink').userData.pianoKey=i;
        }
        for(const x of [.9,1.25,1.6,1.95])cylinder(p,x,1.65,-.28,.045,.065,'ink');
        part(2.66,1.635,-.29,.64,.035,.22,'glass');
      });
      interact(p,'Keyboard stool','seat',()=>{
        part(1.93,.78,1.65,1.06,.18,.73,'glass');
        for(const x of [1.52,2.34])for(const z of [1.4,1.9])part(x,.35,z,.075,.7,.075,'equipment');
      });
      cushionChair(-2.35,.65,.25,'Listening chair');
      bookcase(p,2.45,-2.65,1.8,true);plant(p,-3.1,2.35);art(-.1,-3.35);
    });
  }else {
    note('Sky lounge with a telescope, constellation globe and refreshments',()=>{
      rug(1.35,.65,4.5,3.65);
      const tx=-2.15,tz=-1.6;
      cylinder(p,tx,1.08,tz,.075,1.75,'equipment');
      for(let i=0;i<3;i++) {
        const angle=i*Math.PI*2/3,x=tx+Math.cos(angle)*.77,z=tz+Math.sin(angle)*.77;
        wire(p,[[tx,1.42,tz],[x,.08,z]],'ink',.045);cylinder(p,x,.045,z,.105,.085,'equipment');
      }
      interact(p,'Telescope','telescope',()=>{
        const g=group(p,tx,1.96,tz);g.rotation.x=-Math.PI/3;
        cylinder(g,0,0,0,.24,1.6,'structure');
        cylinder(g,0,.82,0,.28,.09,'equipment');cylinder(g,0,.872,0,.22,.025,'glass');
        cylinder(g,0,-.9,0,.11,.2,'ink');
        box(g,.18,.2,0,.1,.4,.1,'equipment');
      });
      const gx=.45,gz=-2.18;
      cylinder(p,gx,.08,gz,.4,.12,'equipment');cylinder(p,gx,.42,gz,.07,.64,'ink');
      interact(p,'Constellation globe','spin',()=>{
        sphere(p,gx,1.3,gz,.55,'glass');
        ring(p,gx,1.3,gz,.565,'ink',Math.PI/2);ring(p,gx,1.3,gz,.565,'equipment');
        const meridian=ring(p,gx,1.3,gz,.565,'equipment');meridian.rotation.y=Math.PI/2;
        for(const [a,b]of [[.2,.8],[1.2,.1],[2.4,.5],[3.7,-.5],[5.1,.1]]) {
          const r=Math.sqrt(1-b*b)*.57;sphere(p,gx+Math.cos(a)*r,1.3+b*.57,gz+Math.sin(a)*r,.045,'structure');
        }
      });
      cushionChair(1.0,1.2,.1,'Window lounge chair');cushionChair(2.92,1.1,-.22,'Second lounge chair');
      cylinder(p,1.95,.64,-.55,.82,.12,'structure');
      // The post joins the two disks inside their volumes; hidden end caps
      // must not compete with the tabletop underside or the floor rug.
      const post=cylinder(p,1.95,.29,-.55,.085,.58,'equipment');
      post.geometry=new T.CylinderGeometry(1,1,1,20,1,true);
      cylinder(p,1.95,.07,-.55,.47,.11,'equipment');
      const plate=cylinder(p,1.7,.7175,-.55,.33,.035,'glass');
      const plateSkin=new T.CylinderGeometry(1,1,1,20);
      // The tabletop owns their contact surface; the plate has no hidden lid.
      plateSkin.setIndex([...plateSkin.index.array].slice(0,plateSkin.groups[2].start));
      plateSkin.clearGroups();plate.geometry=plateSkin;
      interact(p,'Cookie plate','bounce',()=>{
        for(let i=0;i<5;i++) {
          const a=i*Math.PI*2/5,x=1.7+Math.cos(a)*.18,z=-.55+Math.sin(a)*.18;
          cylinder(p,x,.7625,z,.092,.055,'equipment');
          for(const dx of [-.025,.025])part(x+dx,.795,z,.018,.01,.022,'ink');
        }
      });
      interact(p,'Warm mug','pulse',()=>{
        cylinder(p,2.35,.845,-.54,.14,.29,'equipment');
        cylinder(p,2.35,.997,-.54,.11,.014,'ink');
        ring(p,2.515,.855,-.54,.13,'structure');
      });
      books(2.9,0,-1.6,'Sky atlases');plant(p,-3.05,2.2);art(1.55,-3.35,'stars');
    });
  }
}

/** Cozy perimeter furniture fills deep real bays without stretching the bed or instruments. */
export function furnishPenthouseExtensions(index,parent,bounds,region,scale,opening,api) {
  const {box,cylinder,feature,interact}=api;
  const center=bounds.getCenter(new T.Vector3()),margin=Math.min(region.width,region.depth)*.055;
  const minX=center.x-(region.width/2-margin)/scale,maxX=center.x+(region.width/2-margin)/scale;
  const minZ=center.z-(region.depth/2-margin)/scale,maxZ=center.z+(region.depth/2-margin)/scale;
  const doorX=center.x+((opening?.x??region.x)-region.x)/scale,entry=opening?.entrySide??1;
  const aisle=Math.max(1.5,(opening?.width??1.1)/scale+.45),additions=[];
  const part=(x,y,z,w,h,d,material='structure')=>box(parent,x,y,z,w,h,d,material);
  const record=(name,build)=>{
    const first=parent.children.length;feature(parent,name,build);additions.push(...parent.children.slice(first));
  };
  const names=['Bedroom dressing cabinet','Game library','Record library','Window-side storage'];
  for(const [a,b,side]of [[minX,bounds.min.x-.35,-1],[bounds.max.x+.35,maxX,1]]){
    if(b-a<1.15)continue;
    const width=Math.min(.78,b-a-.2),x=side<0?a+.1+width/2:b-.1-width/2;
    const depth=Math.min(4.9,maxZ-minZ-.4),z=center.z;
    record('Window bench with loose cushions',()=>{
      part(x,.46,z,width,.42,depth,'equipment');
      for(const dz of [-depth*.39,depth*.39])part(x,.14,z+dz,width*.73,.28,.09,'ink');
      part(x+side*(width/2-.045),.98,z,.09,1.12,depth,'structure');
      interact(parent,'Window bench cushions','sofa',()=>{
        part(x-side*.045,.745,z,width-.13,.15,depth-.14,'glass');
        for(const dz of [-depth*.3,depth*.3])part(x-side*.06,.94,z+dz,width-.18,.23,.7,'structure');
      });
    });
  }
  for(const [a,b,side]of [[minZ,bounds.min.z-.35,-1],[bounds.max.z+.35,maxZ,1]]){
    if(b-a<.7)continue;
    const depth=Math.min(.78,b-a-.2),z=side<0?a+.1+depth/2:b-.1-depth/2,doorway=side===entry;
    const spans=doorway?[[minX+.16,doorX-aisle/2],[doorX+aisle/2,maxX-.16]]:[[minX+.16,maxX-.16]];
    for(const [left,right]of spans){
      if(right-left<.95)continue;
      const width=Math.min(right-left-.14,4.8),x=(left+right)/2;
      record(doorway?'Entry bench with cushions and a small book stack':names[index],()=>{
        if(doorway){
          // Low seats flank the actual doorway and leave its full landing clear.
          part(x,.42,z,width,.58,depth,'equipment');
          part(x,.76,z,width-.1,.10,depth-.08,'glass');
          for(const dx of [-width*.38,width*.38])part(x+dx,.1,z,.09,.2,depth*.75,'ink');
          if(width>1.6)interact(parent,'Spare cushions','sofa',()=>{
            part(x+width*.27,.91,z,width*.3,.21,depth*.78,'structure');
          });
        }else{
          const height=index===0?2.2:1.35;
          part(x,height/2,z,width,height,depth,'equipment');
          part(x,height+.04,z,width+.06,.075,depth+.045,'structure');
          const bays=Math.max(2,Math.floor(width/.9));
          for(let i=0;i<bays;i++){
            const bx=x+(i-(bays-1)/2)*width/bays;
            if(index===0){
              part(bx,height/2,z+side*(depth/2+.025),width/bays-.07,height-.12,.045,'glass');
              part(bx+width/bays*.26,height*.5,z+side*(depth/2+.055),.035,.24,.025,'ink');
            }else{
              for(let j=0;j<3;j++){
                part(bx+(j-1)*width/bays*.2,.61,z+side*(depth/2+.03),width/bays*.14,.87-(j%2)*.12,.055,j%2?'glass':'structure');
                part(bx+(j-1)*width/bays*.2,.94,z+side*(depth/2+.065),width/bays*.09,.025,.015,'ink');
              }
            }
          }
        }
      });
    }
  }
  return {count:additions.length,objects:additions};
}
