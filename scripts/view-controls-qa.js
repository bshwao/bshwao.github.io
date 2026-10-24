const frame = document.querySelector('#portfolio'), output = document.querySelector('#results'), status = document.querySelector('#status');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const ready = async () => {
  for (let i = 0; i < 300; i++) {
    const main = frame.contentDocument?.querySelector('#main');
    if (main?.dataset.transition === 'idle' && main.dataset.cameraMotion === 'idle') return;
    await delay(40);
  }
  throw new Error('Portfolio did not settle');
};
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const rows = [];
function checkControls(width, height) {
  const doc = frame.contentDocument;
  const controls = [...doc.querySelectorAll('.spatial-tools > button:not([hidden]), .zoom-controls button, .view-settings > summary')];
  const boxes = controls.map(node => ({ name: node.getAttribute('aria-label') || node.textContent.trim(), box: node.getBoundingClientRect() }));
  for (const { name, box } of boxes) {
    assert(box.left >= 0 && box.right <= width && box.top >= 0 && box.bottom <= height, `${name} leaves ${width}x${height}`);
    assert(box.width >= 44 && box.height >= 44, `${name} needs a 44px target`);
  }
  for (const [i, a] of boxes.entries()) for (const b of boxes.slice(i + 1)) assert(Math.min(a.box.right,b.box.right)-Math.max(a.box.left,b.box.left) <= 0 || Math.min(a.box.bottom,b.box.bottom)-Math.max(a.box.top,b.box.top) <= 0, `${a.name} overlaps ${b.name}`);
  doc.querySelector('#view-settings').open = true;
  const panel = doc.querySelector('.view-settings-panel').getBoundingClientRect();
  assert(panel.left >= 0 && panel.right <= width && panel.top >= 0 && panel.bottom <= height, `Settings panel leaves ${width}x${height}`);
  const back = doc.querySelector('#back-to-structure').getBoundingClientRect();
  const left = Math.max(panel.left,back.left), right = Math.min(panel.right,back.right), top = Math.max(panel.top,back.top), bottom = Math.min(panel.bottom,back.bottom);
  if (right > left && bottom > top) assert(doc.elementFromPoint((left+right)/2,(top+bottom)/2)?.closest('#view-settings'), 'Navigation covers the open settings panel');
  rows.push({viewport:`${width}x${height}`,route:frame.contentWindow.location.hash,controls:boxes.map(({name,box})=>({name,x:box.x,y:box.y,width:box.width,height:box.height})),panel:{x:panel.x,y:panel.y,width:panel.width,height:panel.height}});
  doc.querySelector('#view-settings').open = false;
  const graphics = doc.querySelector('#graphics-preference'), original = graphics.value;
  graphics.value = 'low'; graphics.dispatchEvent(new Event('change',{bubbles:true}));
  for (const node of doc.querySelectorAll('.interior-panel, .tower-label, .spatial-tools button')) {
    const style = frame.contentWindow.getComputedStyle(node);
    assert(style.getPropertyValue('--glass-top').trim() === '1' && style.getPropertyValue('--glass-bottom').trim() === '1', 'Low graphics leaves a translucent glass surface');
    assert(style.backdropFilter === 'none', 'Low graphics leaves a backdrop filter');
  }
  graphics.value = original; graphics.dispatchEvent(new Event('change',{bubbles:true}));
  doc.querySelector('#show-controls-hint').click();
  const hint = doc.querySelector('#controls-hint').getBoundingClientRect();
  assert(hint.left >= 0 && hint.right <= width && hint.top >= 0 && hint.bottom <= height, `Controls hint leaves ${width}x${height}`);
  doc.querySelector('#dismiss-controls-hint').click();
}
try {
  frame.src = '../index.html'; await new Promise(resolve => frame.addEventListener('load',resolve,{once:true})); await ready();
  for (const [width,height] of [[320,568],[390,650],[650,390],[1280,720]]) {
    frame.width = width; frame.height = height; await delay(150); await ready();
    for (const route of ['tower','projects/b']) {
      frame.contentWindow.location.hash = route; await delay(60); await ready(); checkControls(width,height);
    }
  }
  status.textContent = 'PASS — zoom, reset, reading and settings controls fit all eight phone/desktop views';
  output.textContent = JSON.stringify(rows,null,2);
  frame.width=390; frame.height=650; frame.contentDocument.querySelector('#view-settings').open=true;
} catch(error) { status.textContent=`FAIL — ${error.message}`; output.textContent=JSON.stringify(rows,null,2); }
for (const button of document.querySelectorAll('[data-size]')) button.addEventListener('click',()=>{[frame.width,frame.height]=button.dataset.size.split(',').map(Number);});
document.querySelector('#settings').addEventListener('click',()=>{frame.contentDocument.querySelector('#view-settings').open=true;});
document.querySelector('#project').addEventListener('click',()=>{frame.contentDocument.querySelector('#view-settings').open=false;frame.contentWindow.location.hash='projects/b';});
document.querySelector('#hint').addEventListener('click',()=>frame.contentDocument.querySelector('#show-controls-hint').click());
document.querySelector('#preview').addEventListener('click',()=>document.body.classList.add('preview'));
