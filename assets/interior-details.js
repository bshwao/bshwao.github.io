/** Static room-scale details. Everything joins the existing four surface batches. */
export function furnishInteriorDetails(section,index,p,api) {
  const {box,cylinder,ring,sphere,paper,wire,feature}=api;
  const add=(name,build)=>feature(p,name,build);
  const back=section==='experience'&&index===3?-3.8:-3.15;
  const bar=(x,y,z,w,h,d,mat='ink',turn=0)=>box(p,x,y,z,w,h,d,mat,turn);
  function lamp(x,z,deskY=1.66) {
    cylinder(p,x,deskY,z,.23,.07,'equipment');
    bar(x,deskY+.35,z,.055,.65,.055);
    bar(x+.15,deskY+.67,z,.36,.055,.055,'ink',-.2);
    bar(x+.3,deskY+.67,z,.48,.10,.3,'equipment');
    bar(x+.3,deskY+.61,z,.39,.025,.24,'structure');
  }
  function cabinet(x,z,w=1.15,h=1.6,drawers=3) {
    bar(x,h/2,z,w,h,.85,'equipment');
    for(let i=0;i<drawers;i++) {
      const y=(i+.5)*h/drawers;
      bar(x,y,z+.44,w-.12,h/drawers-.08,.06,'structure');
      bar(x,y,z+.48,w*.32,.045,.045);
    }
    bar(x,h+.06,z,w+.1,.1,.94,'structure');
  }
  function clipboard(x,y,z) {
    bar(x,y,z,.78,.08,1.0,'equipment');paper(p,x,y+.06,z,.65,.85);
    bar(x,y+.09,z-.4,.25,.04,.1);
  }
  function boardLine(x,y,w,mat='ink') {bar(x,y,back+.17,w,.025,.018,mat);}
  function diagram() {
    for(const [x,y]of [[-.85,3.55],[0,3.55],[.85,3.55],[0,3.0]]) {
      bar(x,y,back+.14,.4,.28,.035,'equipment');
      bar(x,y,back+.17,.27,.035,.012,'structure');
    }
    boardLine(0,3.55,1.7);bar(0,3.25,back+.16,.025,.6,.018);
  }
  function books(x,y,z,count=5) {
    for(let i=0;i<count;i++)bar(x+(i-(count-1)/2)*.19,y+.32,z,.13,.58+(i%2)*.12,.38,i%2?'equipment':'structure');
  }
  function digits(number,x,y,z) {
    const segments={0:'abcedf',1:'bc',2:'abged',3:'abgcd',4:'fgbc',5:'afgcd'};
    const strokes={a:[0,.15,.13,.022],g:[0,0,.13,.022],d:[0,-.15,.13,.022],f:[-.065,.075,.022,.15],b:[.065,.075,.022,.15],e:[-.065,-.075,.022,.15],c:[.065,-.075,.022,.15]};
    for(const [i,n]of String(number).padStart(2,'0').split('').entries())for(const s of segments[n]) {
      const [dx,dy,w,h]=strokes[s];bar(x+(i-.5)*.22+dx,y+dy,z,w,h,.015);
    }
  }
  add('Paneled room backdrop, numbered plaque and framed display',()=>{
    bar(0,.67,back,7.7,1.34,.13,'structure');
    bar(0,.09,back+.075,7.7,.1,.045,'equipment');
    bar(0,1.35,back,7.8,.08,.22,'equipment');
    for(const x of [-3,-1.5,0,1.5,3])bar(x,.7,back+.08,.035,1.1,.025,'equipment');
    bar(-3.1,1.01,back+.1,.66,.48,.035,'glass');digits(index+1,-3.1,1.01,back+.13);
    for(const x of [-1.4,1.4])bar(x,2.5,back,.065,2.3,.075,'equipment');
    bar(0,3.3,back,3.0,1.75,.13,'equipment');
    bar(0,3.3,back+.08,2.8,1.55,.04,'structure');
    bar(0,4.22,back+.15,3.1,.08,.32,'equipment');
    bar(0,4.17,back+.15,2.9,.025,.23,'glass');
    if(section==='projects'||section==='experience')diagram();
    else if(section==='resume') {
      for(const x of [-.82,0,.82]) {
        bar(x,3.3,back+.13,.65,1.15,.02,'glass');
        for(let i=0;i<4;i++)boardLine(x,3.6-i*.2,.44,i?'equipment':'ink');
      }
    } else if(section==='about') {
      for(const x of [-.85,0,.85]) {
        bar(x,3.3,back+.13,.6,1.1,.025,'glass');
        boardLine(x,3.55,.43);boardLine(x,3.2,.36,'equipment');
        bar(x-.15,3.38,back+.15,.025,.3,.015);
      }
    } else {
      for(const x of [-.8,0,.8]) {
        bar(x,3.3,back+.13,.65,1.1,.025,'glass');
        const disc=cylinder(p,x,3.5,back+.18,.2,.035,'equipment');disc.rotation.x=Math.PI/2;
        boardLine(x,3.05,.45,'equipment');
      }
    }
  });
  add('Section-specific floor finish and inset entry threshold',()=>{
    if(section==='about'||section==='resume') {
      for(let i=0;i<9;i++)bar(-3.3+i*.82,.057,-.15,.016,.013,5.8,'structure');
      for(let i=0;i<4;i++)bar(i%2?1.2:-1.2,.059,-2.3+i*1.45,2.4,.014,.018,'equipment');
    } else if(section==='experience') {
      for(const x of [-3.35,3.35])for(let i=0;i<6;i++)bar(x,.065,-2.3+i*.85,.48,.02,.11,'equipment',-.55);
    } else if(section==='projects') {
      for(const x of [-2.5,0,2.5])bar(x,.057,0,.018,.013,5.6,'structure');
      for(const z of [-2,0,2])bar(0,.058,z,7,.014,.018,'structure');
      bar(0,.11,back+.24,6.8,.12,.16,'equipment');
    } else {
      bar(0,.059,.1,6.6,.025,4.6,'structure');
      for(const x of [-3.1,3.1])bar(x,.076,.1,.05,.012,4.3,'equipment');
      for(const z of [-1.95,2.15])bar(0,.076,z,6.2,.012,.05,'equipment');
    }
    bar(0,.064,2.6,1.2,.03,.23,'structure');
  });
  if(section==='about') {
    if(index===0)add('Architectural study model and portfolio display shelf',()=>{
      bar(2.65,1.22,-.3,1.35,.14,1.35,'structure');
      for(const x of [2.2,3.1])bar(x,.6,-.3,.08,1.2,.9,'equipment');
      bar(2.65,1.33,-.3,.95,.08,.95,'glass');
      for(const [x,h]of [[2.4,.75],[2.7,1.5],[2.95,1.05]])bar(x,1.4+h/2,-.3,.22,h,.42,'equipment');
      bar(2.7,3.06,-.3,.024,.36,.024);books(-2.9,1.4,back+.3,5);
      bar(-2.9,1.38,back+.3,1.3,.1,.7,'structure');
    });
    if(index===1)add('Articulated study lamp, notebook and desk stationery',()=>{
      lamp(-1.55,-.5);paper(p,-1,1.74,.42,.7,.6,-.1);
      cylinder(p,1.55,1.8,.5,.12,.24,'equipment');
      for(const dx of [-.05,.04])bar(1.55+dx,2.0,.5,.025,.32,.025);
      books(-2.95,1.42,back+.35,4);bar(-2.95,1.4,back+.35,1.2,.1,.7,'structure');
    });
    if(index===2)add('Music stand, acoustic panels and metronome',()=>{
      cylinder(p,2.7,.15,.3,.4,.09,'equipment');bar(2.7,1.1,.3,.06,1.9,.06);
      bar(2.7,2.1,.3,1,.8,.08,'equipment');
      for(let i=0;i<4;i++)bar(2.7,2.35-i*.15,.35,.72,.022,.012,'structure');
      for(let i=0;i<4;i++)bar(-3.25+i*.3,2.02,back+.16,.17,1.4,.18,'glass');
      bar(-1.1,2.1,-.55,.3,.45,.35,'structure');bar(-1.1,2.18,-.36,.025,.3,.02);
    });
    if(index===3)add('Language library, wall clock and coat stand',()=>{
      bar(0,1.5,back+.4,2.4,.12,.7,'structure');books(0,1.57,back+.4,8);
      bar(2.8,1.98,back+.1,.07,1.3,.07,'equipment');
      const clock=cylinder(p,2.8,2.7,back+.2,.38,.09,'equipment');clock.rotation.x=Math.PI/2;
      bar(2.8,2.78,back+.26,.025,.2,.018);bar(2.9,2.7,back+.26,.22,.025,.018);
      cylinder(p,-3.1,.13,2.55,.27,.09,'equipment');bar(-3.1,1.45,2.55,.07,2.7,.07);
      bar(-3.1,2.5,2.55,.65,.06,.06,'equipment');
    });
  } else if(section==='projects') {
    if(index===0)add('Maker pegboard, hand tools and wearable prototype station',()=>{
      bar(-2.95,2.15,back+.1,1.18,1.75,.08,'glass');
      for(let i=0;i<4;i++)for(let j=0;j<3;j++)bar(-3.25+i*.22,1.9+j*.28,back+.16,.045,.045,.025,'ink');
      for(const x of [-3.1,-2.65]){bar(x,2.25,back+.24,.055,.6,.07,'equipment');bar(x,2.53,back+.24,.24,.08,.07);}
      cabinet(2.85,.8,1.15,1.35,2);bar(2.85,1.48,.8,.7,.08,.65,'glass');
      ring(p,2.85,1.67,.8,.19,'ink',Math.PI/2);bar(2.85,1.86,.8,.25,.12,.27,'equipment');
      bar(2.85,1.93,.8,.18,.025,.2,'glass');lamp(-1.65,-.5);
    });
    if(index===1)add('Patch panel, switch ports and cable management',()=>{
      cabinet(2.85,-.8,1.3,1.5,2);
      for(let row=0;row<2;row++)for(let i=0;i<5;i++)bar(2.4+i*.22,.95+row*.28,-.32,.13,.12,.025,'ink');
      wire(p,[[2.5,1.45,-1.25],[2.3,1.2,-1.5],[1.8,.16,-1.7]],'equipment',.025);
      bar(-.9,3.55,-1.75,4.2,.12,.4,'equipment');
      for(const x of [-2.6,.8])bar(x,1.75,-1.75,.06,3.5,.06);
    });
    if(index===2)add('Simulator steering wheel, pedals and telemetry tablet',()=>{
      ring(p,0,1.94,.85,.36,'ink',-.2);bar(0,1.94,.85,.5,.06,.05,'equipment');
      bar(0,1.77,.85,.06,.34,.05,'equipment');bar(0,.12,1.15,.8,.1,.6,'equipment');
      for(const x of [-.2,.2]){const pedal=bar(x,.26,1.15,.22,.07,.4,'glass');pedal.rotation.x=-.45;}
      cabinet(2.95,-.5,1.0,1.35,2);clipboard(2.95,1.48,-.5);
      wire(p,[[-1.1,3.0,back+.19],[-.8,3.25,back+.19],[-.3,3.0,back+.19],[.2,3.4,back+.19],[1.1,3.15,back+.19]],'ink',.018);
    });
  } else if(section==='experience') {
    if(index===0)add('Component drawers, multimeter and solder reel',()=>{
      cabinet(-2.85,-.5,1.1,1.45,4);
      bar(.32,1.85,-.48,.43,.29,.42,'equipment');bar(.32,2.0,-.48,.29,.02,.25,'glass');
      const reel=cylinder(p,2.85,1.99,-.25,.28,.2,'structure');reel.rotation.z=Math.PI/2;
      ring(p,2.85,1.99,-.25,.2,'ink',Math.PI/2);
    });
    if(index===1)add('Network cable tray, service labels and patch terminal',()=>{
      bar(0,3.65,-1.0,4.7,.1,.4,'equipment');
      for(const x of [-2.5,2.5])bar(x,1.8,-1,.065,3.6,.065);
      for(const x of [-1.6,1.6])for(let j=0;j<3;j++)bar(x,2.9-j*.7,.77,.32,.12,.02,'glass');
      cabinet(3,.9,.9,1.2,3);clipboard(3,1.33,.9);
    });
    if(index===2)add('Diagnostic trolley, coiled test leads and inspection clipboard',()=>{
      cabinet(-2.95,1.3,1.05,1.3,3);clipboard(-2.95,1.43,1.3);
      ring(p,2.85,1.77,-.25,.24,'ink',Math.PI/2);
      wire(p,[[2.85,1.74,-.1],[3.3,1.5,.2],[3.25,.35,.5]],'ink',.025);
    });
    if(index===3)add('Brake hubs, suspension links, pit tools and inspection stand',()=>{
      for(const x of [-1.3,1.3])for(const z of [-1.75,1.75]) {
        const hub=cylinder(p,x,.6,z,.26,.54,'structure');hub.rotation.z=Math.PI/2;
        wire(p,[[x*.35,.8,z-.25],[x,.5,z]],'equipment',.035);
      }
      cabinet(-3.05,0,.85,1.25,3);clipboard(-3.05,1.38,0);
      bar(3,.75,-.6,1,1.5,1,'equipment');bar(3,1.6,-.6,1.15,.14,1.1,'structure');
      ring(p,3,1.78,-.6,.24,'ink');
    });
  } else if(section==='resume') {
    if(index===0)add('Academic display, mortarboard and brochure rack',()=>{
      bar(.6,1.78,-.35,.62,.06,.62,'ink',Math.PI/4);cylinder(p,.6,1.69,-.35,.19,.15,'equipment');
      cabinet(2.8,.9,1.1,1.25,3);
      for(let i=0;i<3;i++){bar(2.8,1.38+i*.1,.7+i*.13,.85,.08,.5,'equipment');paper(p,2.8,1.44+i*.1,.7+i*.13,.65,.4);}
    });
    if(index===1)add('Library catalogue drawers, shelf labels and book trolley',()=>{
      cabinet(3,0,1.05,1.9,5);
      for(const z of [-2,1])for(const x of [-1.4,0,1.4])bar(x,2.43,z+.38,.28,.11,.025,'glass');
      bar(-3,.8,.5,1,.12,1.3,'structure');
      for(const z of [0,1])bar(-3,.4,z,.65,.8,.06,'equipment');books(-3,.88,.5,4);
    });
    if(index===2)add('Technical drawing board, caliper and task lamp',()=>{
      paper(p,-1,1.74,1.45,.8,.6);lamp(-1.55,.5);
      bar(1.15,1.76,1.5,.6,.035,.055);for(const x of [.9,1.3])bar(x,1.76,1.6,.04,.035,.25);
      cabinet(2.95,-.65,1.0,1.5,3);books(2.95,1.58,-.65,4);
    });
    if(index===3)add('Document scanner, printer and output paper trays',()=>{
      cabinet(2.7,-1.1,1.2,1.3,2);bar(2.7,1.65,-1.1,1.1,.55,.9,'equipment');
      bar(2.7,1.95,-1.1,1.03,.07,.86,'glass');bar(2.7,1.65,-.63,.8,.06,.04);
      paper(p,2.7,1.51,-.45,.65,.7);bar(2.7,1.45,-.3,.85,.07,.6,'structure');
    });
  } else {
    if(index===0)add('Reception terminal, desk bell and correspondence cubbies',()=>{
      bar(-.65,2.5,-.4,.85,.65,.09,'equipment');bar(-.65,2.5,-.34,.7,.5,.025,'glass');
      bar(-.65,2.22,-.4,.08,.25,.08);cylinder(p,1.5,2.2,.22,.17,.1,'ink');
      sphere(p,1.5,2.28,.22,.13,'equipment');cabinet(2.8,-.8,1.1,1.7,4);
    });
    if(index===1)add('Device charging station, desktop lamp and connected devices',()=>{
      cabinet(-2.85,-.5,1.1,1.3,2);
      for(let i=0;i<3;i++){bar(-3.2+i*.34,1.57,-.5,.23,.4,.08,'equipment');bar(-3.2+i*.34,1.59,-.445,.17,.29,.015,'glass');}
      wire(p,[[-3.2,1.37,-.5],[-2.9,1.35,-.8],[-2.5,1.37,-.5]],'ink',.015);lamp(-1.65,-.5);
    });
    if(index===2)add('Tea service, side table and framed lounge artwork',()=>{
      bar(0,.92,0,.75,.06,.55,'equipment');
      for(const x of [-.22,.22]){cylinder(p,x,1.04,0,.09,.18,'structure');ring(p,x+.1,1.06,0,.055,'ink');}
      cylinder(p,-3.2,.9,2.5,.32,1.7,'equipment');cylinder(p,-3.2,1.8,2.5,.55,.1,'structure');
      books(-2.9,1.43,back+.35,4);bar(-2.9,1.4,back+.35,1.3,.1,.65,'structure');
    });
    if(index===3)add('Globe consultation table, map stand and visitor notes',()=>{
      cylinder(p,2.85,.7,1.45,.15,1.3,'equipment');cylinder(p,2.85,1.4,1.45,.62,.12,'structure');
      sphere(p,2.85,2.02,1.45,.45,'glass');ring(p,2.85,2.02,1.45,.46,'ink',Math.PI/2);
      ring(p,2.85,2.02,1.45,.46,'equipment');bar(2.85,1.61,1.45,.09,.3,.09);
      clipboard(-.8,1.74,-1.1);
    });
  }
}
