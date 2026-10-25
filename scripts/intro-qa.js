const frame=document.querySelector('#portfolio'),status=document.querySelector('#status'),output=document.querySelector('#results');
const params=new URLSearchParams(location.search),rows=[];
const requested=[Math.max(320,Math.min(1920,Number(params.get('width'))||390)),Math.max(360,Math.min(1080,Number(params.get('height'))||844))];
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
async function until(predicate,message){
  for(let i=0;i<300;i++){if(predicate())return;await delay(40);}
  throw new Error(message);
}
function setSize(width,height){
  frame.width=width;frame.height=height;
  document.body.style.setProperty('--preview-width',`${width}px`);document.body.style.setProperty('--preview-height',`${height}px`);
  document.querySelector('#selected').textContent=`${width} × ${height}`;
}
async function showIntro(){
  await until(()=>frame.contentDocument?.querySelector('#replay-intro'),'Production controls did not initialize');
  const doc=frame.contentDocument,dialog=doc.querySelector('#portfolio-intro');
  assert(!doc.querySelector('#main').classList.contains('unavailable'),'WebGL fallback prevented the city reveal check');
  if(!dialog.open){
    await until(()=>doc.querySelector('#main').dataset.transition==='idle'&&doc.querySelector('#main').dataset.cameraMotion==='idle','Production city did not settle before replay');
    doc.querySelector('#view-settings').open=true;doc.querySelector('#replay-intro').click();
  }
  await until(()=>dialog.open&&dialog.dataset.state==='welcome'&&doc.querySelector('#intro-status').textContent==='Ready when you are.','Introduction did not become ready');
  await delay(80);
}
const box=node=>{const r=node.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
function checkIntro(width,height){
  const doc=frame.contentDocument,dialog=doc.querySelector('#portfolio-intro'),viewport=`${width}x${height}`;
  assert(dialog.open,`${viewport}: introduction is not visible`);
  assert(doc.querySelector('#main').inert,`${viewport}: city remains interactive behind the introduction`);
  assert(doc.documentElement.scrollWidth<=width+1&&dialog.scrollWidth<=dialog.clientWidth+1,`${viewport}: introduction has horizontal overflow`);
  assert(dialog.scrollHeight<=dialog.clientHeight+1,`${viewport}: introduction needs vertical scrolling`);
  const nodes=[['name',doc.querySelector('#intro-title')],['description',doc.querySelector('#intro-description')],['entry',doc.querySelector('#intro-enter')],['reading',doc.querySelector('.intro-actions a')]];
  const bounds=nodes.map(([name,node])=>({name,...box(node)}));
  for(const b of bounds){
    assert(b.width>0&&b.height>0,`${viewport}: ${b.name} has no visible bounds`);
    assert(b.x>=-.5&&b.right<=width+.5&&b.y>=-.5&&b.bottom<=height+.5,`${viewport}: ${b.name} leaves the visible dialog (${JSON.stringify(b)})`);
    if(b.name==='entry'||b.name==='reading')assert(b.height>=44,`${viewport}: ${b.name} needs a 44px-high target`);
  }
  return{viewport,dialog:box(dialog),horizontalOverflow:false,bounds};
}
async function checkReveal(row){
  const doc=frame.contentDocument,dialog=doc.querySelector('#portfolio-intro'),main=doc.querySelector('#main'),started=performance.now();
  doc.querySelector('#intro-enter').click();
  await until(()=>!dialog.open&&!main.inert,'Introduction did not finish revealing the city');
  const elapsed=Math.round(performance.now()-started),canvas=doc.querySelector('#spatial-stage canvas');
  assert(elapsed<2000,`${row.viewport}: reveal exceeded two seconds`);
  canvas.focus();assert(doc.activeElement===canvas,`${row.viewport}: city cannot receive keyboard focus after entry`);
  const distance=Number(main.dataset.zoomDistance);
  doc.querySelector('#zoom-in').click();await until(()=>Number(main.dataset.zoomDistance)<distance-.01,'City zoom did not respond after entry');
  doc.querySelector('#zoom-out').click();await until(()=>Math.abs(Number(main.dataset.zoomDistance)-distance)<.02,'City zoom did not restore its starting distance');
  Object.assign(row,{revealMs:elapsed,cityInteractionRestored:true});
}
async function preview(width,height){setSize(width,height);await showIntro();}
const fail=error=>{status.textContent=`FAIL — ${error.message}`;output.textContent=JSON.stringify({rows,error:error.stack},null,2);};
try{
  setSize(...requested);
  const loaded=new Promise(resolve=>frame.addEventListener('load',resolve,{once:true}));frame.src='../index.html';await loaded;
  for(const dimensions of [[320,568],[390,844],[650,390],[1280,720]]){
    setSize(...dimensions);await showIntro();const row=checkIntro(...dimensions);rows.push(row);await checkReveal(row);
    output.textContent=JSON.stringify({rows},null,2);
  }
  await preview(...requested);
  status.textContent='PASS — four intro layouts, visible copy/actions, 44px targets, finite reveal and restored city interaction';
  output.textContent=JSON.stringify({rows,preview:`${requested[0]}x${requested[1]}`},null,2);
  document.querySelectorAll('#tools button').forEach(button=>button.disabled=false);
  if(params.get('preview')==='1')document.body.classList.add('preview');
}catch(error){fail(error);document.querySelectorAll('#tools button').forEach(button=>button.disabled=false);}
for(const button of document.querySelectorAll('[data-size]'))button.addEventListener('click',()=>preview(...button.dataset.size.split(',').map(Number)).catch(fail));
document.querySelector('#replay').addEventListener('click',()=>showIntro().catch(fail));
document.querySelector('#preview').addEventListener('click',()=>document.body.classList.add('preview'));
