import { sections } from '../assets/tower-geometry.js';
import { floorContent } from '../assets/floor-content.js';
const params=new URLSearchParams(location.search),width=Number(params.get('width'))||390,height=Number(params.get('height'))||844;
const frame=document.querySelector('#portfolio'),status=document.querySelector('#status'),output=document.querySelector('#results');
const safeInsets=params.has('safe')?(width>height?{top:0,right:44,bottom:21,left:44}:{top:47,right:0,bottom:34,left:0}):null;
frame.width=width;frame.height=height;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms)),rows=[],errors=[];
const assert=(value,message)=>{if(!value)throw new Error(message);};
let doc,win;
function visible(node){if(node.closest('details:not([open])')&&!node.matches('summary'))return false;const rect=node.getBoundingClientRect(),style=win.getComputedStyle(node);return rect.width>0&&rect.height>0&&style.visibility!=='hidden'&&style.opacity!=='0';}
async function ready(){
  for(let i=0;i<220;i++){
    const main=frame.contentDocument?.querySelector('#main');
    if(main?.dataset.transition==='idle'&&main.dataset.cameraMotion==='idle'&&!frame.contentDocument.getAnimations().some(a=>a.playState==='running'))return;
    await delay(40);
  }
  throw new Error('The portfolio did not settle');
}
async function route(hash){win.location.hash=hash;await delay(20);await ready();}
function check(view,dialog=null){
  status.textContent=`Checking ${view}…`;
  assert(doc.documentElement.scrollWidth<=width+1,`${view}: page overflows horizontally`);
  assert(!errors.length,`${view}: runtime errors`);
  const root=dialog||doc.querySelector('#main');
  if(dialog)assert(dialog.scrollWidth<=dialog.clientWidth+1,`${view}: dialog overflows horizontally`);
  const controls=[...root.querySelectorAll(dialog?'.penthouse-dialog-header button':'.spatial-tools button,.view-settings>summary,#room-panel-views button,#floor-overview')].filter(visible);
  for(const control of controls){
    const r=control.getBoundingClientRect();
    assert(r.width>=43.9&&r.height>=43.9,`${view}: small target ${control.getAttribute('aria-label')||control.textContent}`);
    assert(r.left>=-.5&&r.right<=width+.5&&r.top>=-.5&&r.bottom<=height+.5,`${view}: unreachable control ${control.textContent}`);
    const hit=doc.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
    assert(control.contains(hit),`${view}: covered control ${control.textContent}`);
  }
  if(!dialog){
    const chrome=[...doc.querySelectorAll('.spatial-tools,.material-key,.structure-action,.spatial-heading,.spatial-bottom,.page-identity,.tower-labels[data-layout="dock"],#interior-panel')].filter(visible);
    for(let i=0;i<chrome.length;i++)for(let j=i+1;j<chrome.length;j++){
      const a=chrome[i].getBoundingClientRect(),b=chrome[j].getBoundingClientRect();
      assert(a.right<=b.left+1||b.right<=a.left+1||a.bottom<=b.top+1||b.bottom<=a.top+1,`${view}: ${chrome[i].className} overlaps ${chrome[j].className}`);
    }
    for(const node of doc.querySelectorAll('.spatial-canvas,.spatial-tools,#room-panel-views,#station-navigation'))
      assert(win.getComputedStyle(node).userSelect==='none',`${view}: scene chrome can be selected`);
    assert(win.getComputedStyle(doc.querySelector('#interior-scroll')).userSelect==='text',`${view}: reading text cannot be selected`);
  }
  if(!dialog&&doc.querySelector('#main').dataset.mode==='section'){
    const panel=doc.querySelector('#interior-panel').getBoundingClientRect();
    assert(panel.bottom<=height+.5&&panel.top>=0,`${view}: panel is outside viewport`);
    const nav=doc.querySelector('#station-navigation'),tab=nav.querySelector('[aria-pressed="true"]');
    if(tab){const a=tab.getBoundingClientRect(),b=nav.getBoundingClientRect();assert(a.left>=b.left-1&&a.right<=b.right+1,`${view}: selected room tab is offscreen`);}
  }
  rows.push({view,controls:controls.length,overflow:false});output.textContent=JSON.stringify({width,height,safeInsets,rows,errors},null,2);
}
try{
  frame.src='../index.html#about';await new Promise(resolve=>frame.addEventListener('load',resolve,{once:true}));await ready();
  doc=frame.contentDocument;win=frame.contentWindow;win.addEventListener('error',e=>errors.push(e.message));
  if(safeInsets)for(const [side,value] of Object.entries(safeInsets))doc.documentElement.style.setProperty(`--safe-${side}`,`${value}px`);
  for(const {id} of params.has('activities')?[]:sections){
    await route(id);check(`${id} overview`);
    for(const room of floorContent[id].rooms){await route(`${id}/${room.id}`);check(`${id}/${room.id}`);}
  }
  for(const view of ['scene','read','split']){
    doc.querySelector(`[data-panel-view="${view}"]`).click();await delay(40);check(`room panel ${view}`);
    assert(doc.querySelector('#interior-scroll').inert===(view==='scene'),`Collapsed content focus state is wrong`);
  }
  doc.querySelector('[data-panel-view="read"]').click();
  const scroll=doc.querySelector('#interior-scroll');scroll.scrollTop=scroll.scrollHeight;
  const last=doc.querySelector('#interior-navigation a:last-child').getBoundingClientRect(),panel=doc.querySelector('#interior-panel').getBoundingClientRect();
  assert(last.bottom<=panel.bottom+1&&last.top>=panel.top,'Footer floor navigation cannot be reached by scrolling');check('reachable footer');
  for(const [room,opener,dialogId] of [['a','[data-bedroom-desktop]','penthouse-desktop-dialog'],['b','[data-penthouse-open="arcade"]','penthouse-arcade-dialog'],['c','[data-music-expand]','penthouse-music-dialog'],['d','[data-penthouse-open="sky"]','penthouse-sky-dialog']]){
    await route(`penthouse/${room}`);doc.querySelector(opener).click();await delay(100);
    const dialog=doc.getElementById(dialogId);assert(dialog.open,`${dialogId} did not open`);check(dialogId,dialog);
    if(room==='b')for(const game of ['blackjack','wordle','crossword','snake','2048','sudoku','tic-tac-toe']){
      dialog.querySelector(`[data-arcade-launch="${game}"]`).click();await delay(20);
      const body=dialog.querySelector('.penthouse-dialog-body');assert(body.scrollWidth<=body.clientWidth+1,`${game}: game content overflows`);check(`game ${game}`,dialog);dialog.querySelector('[data-arcade-overview]').click();
    }
    if(room==='a'){
      dialog.querySelector('[data-desktop-launch="notes"]').click();
      const notes=dialog.querySelector('textarea');assert(parseFloat(win.getComputedStyle(notes).fontSize)>=16,'Mobile text entry is too small');check('bedroom notes',dialog);
      assert(win.getComputedStyle(notes).userSelect!=='none','Notes must keep native text selection');
    }
    dialog.close();await delay(20);
  }
  await route('');check('city controls');
  for(const [id,field]of [['zoom-in','zoomMin'],['zoom-out','zoomMax']]){
    const button=doc.getElementById(id);
    for(let step=0;step<40&&!button.disabled;step++){button.click();await delay(40);}
    await ready();
    const main=doc.querySelector('#main');
    assert(button.disabled&&Math.abs(Number(main.dataset.zoomDistance)-Number(main.dataset[field]))<.05,`${id}: rendered camera did not reach its stop`);
    check(`city ${id} stop`);
  }
  doc.querySelector('#reset-spatial').click();await ready();
  await route('explore');check('floor selector');
  status.textContent=`PASS — ${rows.length} views; reachable controls, room panels, all games and activities`;
}catch(error){status.textContent=`FAIL — ${error.message}`;output.textContent=JSON.stringify({width,height,rows,errors,error:error.stack},null,2);}
