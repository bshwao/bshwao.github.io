// Local visual QA surface; no production imports, state changes, or network uploads.
const params=new URLSearchParams(location.search),frame=document.querySelector('#preview');
const width=Math.max(320,Math.min(1600,Number(params.get('width'))||390)),height=Math.max(360,Math.min(1200,Number(params.get('height'))||844));
const rooms={bedroom:'a',arcade:'b',music:'c',sky:'d'},activity=Object.hasOwn(rooms,params.get('activity'))?params.get('activity'):'music';
document.documentElement.style.setProperty('--preview-width',`${width}px`);document.body.style.minHeight=`${height}px`;
frame.width=width;frame.height=height;frame.src=`../index.html#penthouse/${rooms[activity]}`;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const runtimeErrors=[];
const captureError=event=>runtimeErrors.push({message:event.message,source:event.filename,line:event.lineno,stack:event.error?.stack||''});
window.addEventListener('error',captureError);
try{
  let doc;
  for(let i=0;i<200;i++){doc=frame.contentDocument;if(doc?.querySelector('#main[data-transition="idle"][data-camera-motion="idle"]'))break;await delay(50);}
  frame.contentWindow.addEventListener('error',captureError);
  const selectors={bedroom:'[data-bedroom-desktop]',arcade:'[data-penthouse-open="arcade"]',music:'[data-music-expand]',sky:'[data-penthouse-open="sky"]'};
  doc.querySelector(selectors[activity]).click();await delay(100);
  const game=params.get('game');
  if(activity==='arcade'&&game){doc.querySelector(`[data-arcade-launch="${CSS.escape(game)}"]`)?.click();await delay(50);}
  const dialog=doc.querySelector('.penthouse-dialog[open]'),rect=dialog.getBoundingClientRect(),header=dialog.querySelector('header').getBoundingClientRect();
  const report={width,height,activity,dialog:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},header:{top:header.top,bottom:header.bottom},horizontalOverflow:doc.documentElement.scrollWidth>width,dialogOverflow:dialog.scrollWidth>dialog.clientWidth,pass:true};
  report.pass=Boolean(dialog.open)&&!report.horizontalOverflow&&!report.dialogOverflow&&header.top>=0&&header.bottom<=height&&(activity!=='music'||rect.width===width&&rect.height===height);
  if(activity==='arcade'&&params.has('audit')){
    const script=doc.createElement('script');script.src='../node_modules/axe-core/axe.min.js';
    const loaded=new Promise((resolve,reject)=>{script.onload=resolve;script.onerror=()=>reject(new Error('Run npm ci before this local audit.'));});doc.head.append(script);await loaded;
    report.views=[];
    const audit=async view=>{
      const result=await frame.contentWindow.axe.run(dialog,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});
      const body=dialog.querySelector('.penthouse-dialog-body'),panel=dialog.querySelector('[data-arcade-panel]:not([hidden])');
      report.views.push({view,horizontalOverflow:body.scrollWidth>body.clientWidth+1,panelOverflow:panel?panel.scrollWidth>panel.clientWidth+1:false,violations:result.violations.map(({id,nodes})=>({id,targets:nodes.map(node=>node.target)}))});
    };
    dialog.querySelector('[data-arcade-overview]').click();await audit('dashboard');
    for(const id of ['blackjack','wordle','crossword','snake','2048','sudoku','tic-tac-toe']){
      dialog.querySelector(`[data-arcade-launch="${id}"]`).click();
      if(id==='blackjack')dialog.querySelector('[data-blackjack-deal]').click();
      if(id==='wordle'){for(const letter of 'CLOUD')dialog.querySelector(`[data-word-key="${letter}"]`).click();dialog.querySelector('[data-word-key="!"]').click();}
      if(id==='crossword'){const input=dialog.querySelector('[data-cross-index="0"]');input.value='Z';input.dispatchEvent(new frame.contentWindow.Event('input',{bubbles:true}));dialog.querySelector('[data-cross-check]').click();}
      if(id==='tic-tac-toe')dialog.querySelector('[data-game-cell="0"]').click();
      await audit(id);dialog.querySelector('[data-arcade-overview]').click();
    }
    if(game)dialog.querySelector(`[data-arcade-launch="${CSS.escape(game)}"]`)?.click();
    report.pass&&=report.views.every(row=>!row.horizontalOverflow&&!row.panelOverflow&&!row.violations.length);
  }
  report.runtimeErrors=runtimeErrors;report.pass&&=!runtimeErrors.length;
  document.querySelector('#results').textContent=JSON.stringify(report,null,2);
  document.querySelector('#results').dataset.ready='true';
}catch(error){document.querySelector('#results').textContent=`FAIL: ${error.stack}`;}
