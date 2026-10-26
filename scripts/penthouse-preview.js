// Local visual QA surface; no production imports, state changes, or network uploads.
const params=new URLSearchParams(location.search),frame=document.querySelector('#preview');
const width=Math.max(320,Math.min(1600,Number(params.get('width'))||390)),height=Math.max(360,Math.min(1200,Number(params.get('height'))||844));
const rooms={bedroom:'a',arcade:'b',music:'c',sky:'d'},activity=Object.hasOwn(rooms,params.get('activity'))?params.get('activity'):'music';
document.documentElement.style.setProperty('--preview-width',`${width}px`);document.body.style.minHeight=`${height}px`;
frame.width=width;frame.height=height;frame.src=`../index.html#penthouse/${rooms[activity]}`;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try{
  let doc;
  for(let i=0;i<200;i++){doc=frame.contentDocument;if(doc?.querySelector('#main[data-transition="idle"][data-camera-motion="idle"]'))break;await delay(50);}
  const selectors={bedroom:'[data-bedroom-desktop]',arcade:'[data-penthouse-open="arcade"]',music:'[data-music-expand]',sky:'[data-penthouse-open="sky"]'};
  doc.querySelector(selectors[activity]).click();await delay(100);
  const dialog=doc.querySelector('.penthouse-dialog[open]'),rect=dialog.getBoundingClientRect(),header=dialog.querySelector('header').getBoundingClientRect();
  const report={width,height,activity,dialog:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},header:{top:header.top,bottom:header.bottom},horizontalOverflow:doc.documentElement.scrollWidth>width,dialogOverflow:dialog.scrollWidth>dialog.clientWidth,pass:true};
  report.pass=Boolean(dialog.open)&&!report.horizontalOverflow&&!report.dialogOverflow&&header.top>=0&&header.bottom<=height&&(activity!=='music'||rect.width===width&&rect.height===height);
  document.querySelector('#results').textContent=JSON.stringify(report,null,2);
  document.querySelector('#results').dataset.ready='true';
}catch(error){document.querySelector('#results').textContent=`FAIL: ${error.stack}`;}
