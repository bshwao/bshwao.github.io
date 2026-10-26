import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { SKY_STARS, SKY_CONSTELLATIONS, SKY_WORLD, SKY_SOURCES, DEFAULT_SKY_VIEW, projectStar, clampSkyView, skyToScreen, screenToSky, zoomSkyView, filterSkyStars, nearestSkyStar, fitSkyStars, starMapMarkup, createStarMap } from '../assets/penthouse-star-map.js';

const viewport = { width:720,height:600 };
const close = (actual,expected) => assert.ok(Math.abs(actual-expected)<.00001,`${actual} ≈ ${expected}`);

test('catalog positions and sketches are complete, sourced, and within the map',()=>{
  assert.equal(SKY_STARS.length,33);
  assert.equal(new Set(SKY_STARS.map(star=>star.id)).size,SKY_STARS.length);
  const ids=new Set(SKY_STARS.map(star=>star.id));
  for(const star of SKY_STARS){
    assert.ok(star.ra>=0&&star.ra<360);
    assert.ok(star.dec>=SKY_WORLD.minDec&&star.dec<=90);
    assert.match(star.source,/^https:\/\//);
    assert.ok(SKY_CONSTELLATIONS.some(figure=>figure.id===star.constellation));
  }
  for(const figure of SKY_CONSTELLATIONS)for(const path of figure.paths)for(const id of path)assert.ok(ids.has(id));
  assert.match(SKY_SOURCES.iau,/iauarchive\.eso\.org/);
  assert.equal(SKY_STARS.find(star=>star.id==='aljanah').name,'Aljanah');
});

test('polar projection preserves pole, equator radius, and right ascension orientation',()=>{
  const pole=projectStar({ra:23,dec:90});
  close(pole.x,SKY_WORLD.x);close(pole.y,SKY_WORLD.y);
  const zero=projectStar({ra:0,dec:0}),six=projectStar({ra:90,dec:0});
  close(zero.x,SKY_WORLD.x);assert.ok(zero.y<SKY_WORLD.y);
  close(six.y,SKY_WORLD.y);assert.ok(six.x>SKY_WORLD.x);
  close(Math.hypot(six.x-SKY_WORLD.x,six.y-SKY_WORLD.y),90/115*SKY_WORLD.radius);
});

test('coordinate conversion inverts, zoom remains anchored, and pan/zoom are bounded',()=>{
  const view={x:600,y:500,zoom:3},point={x:550,y:400};
  const original=skyToScreen(point,view,viewport),roundtrip=screenToSky(original,view,viewport);
  close(roundtrip.x,point.x);close(roundtrip.y,point.y);
  const next=zoomSkyView(view,1.5,original,viewport),anchored=skyToScreen(point,next,viewport);
  close(anchored.x,original.x);close(anchored.y,original.y);
  assert.deepEqual(clampSkyView({x:-1e6,y:1e6,zoom:0}),DEFAULT_SKY_VIEW);
  const clamped=clampSkyView({x:-1e6,y:1e6,zoom:99});
  assert.equal(clamped.zoom,9);close(clamped.x,1200/18);close(clamped.y,1000-1000/18);
  assert.deepEqual(zoomSkyView(view,NaN,point,viewport),view);
});

test('search/filter and hit selection resolve real stars and empty space',()=>{
  assert.equal(filterSkyStars('  VEGA ')[0].id,'vega');
  assert.equal(filterSkyStars('alpha lyrae')[0].id,'vega');
  assert.equal(filterSkyStars('', 'orion').length,7);
  assert.equal(filterSkyStars('Vega','orion').length,0);
  assert.equal(filterSkyStars('no-such-star').length,0);
  const vega=SKY_STARS.find(star=>star.id==='vega');
  const view=fitSkyStars(filterSkyStars('','lyra'),viewport);
  assert.equal(nearestSkyStar(skyToScreen(projectStar(vega),view,viewport),view,viewport).id,'vega');
  assert.equal(nearestSkyStar({x:-900,y:-900},view,viewport),null);
});

function fixture() {
  const dom=new JSDOM(`<main>${starMapMarkup()}</main>`,{pretendToBeVisual:true});
  const root=dom.window.document.querySelector('.penthouse-sky');
  const field=root.querySelector('[data-sky-viewport]');
  field.getBoundingClientRect=()=>({left:0,top:0,width:720,height:600,right:720,bottom:600});
  const controller=createStarMap(root,{reducedMotion:true});
  const click=selector=>root.querySelector(selector).click();
  return {dom,root,field,controller,click};
}

test('native controls, search, selection, keyboard, and reset change the mounted atlas',()=>{
  const {dom,root,field,controller,click}=fixture();
  assert.equal(root.querySelectorAll('[data-sky-select]').length,33);
  assert.equal(root.dataset.reducedMotion,'true');
  click('[data-sky-action="in"]');
  assert.equal(root.querySelector('[data-sky-zoom]').textContent,'1.4×');
  field.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'+',bubbles:true,cancelable:true}));
  assert.equal(root.querySelector('[data-sky-zoom]').textContent,'1.8×');
  click('[data-sky-action="reset"]');
  assert.equal(root.querySelector('[data-sky-zoom]').textContent,'1.0×');
  click('[data-sky-select="betelgeuse"]');
  assert.equal(root.querySelector('[data-sky-details] h4').textContent,'Betelgeuse');
  assert.equal(root.querySelector('[data-sky-select="betelgeuse"]').getAttribute('aria-pressed'),'true');
  assert.match(root.querySelector('[data-sky-details]').textContent,/supergiant/);
  click('[data-sky-action="lines"]');
  assert.equal(root.querySelectorAll('.penthouse-sky-figure').length,0);
  const search=root.querySelector('[data-sky-search]');search.value='Deneb';
  search.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
  assert.equal(root.querySelectorAll('[data-sky-select]').length,1);
  const filter=root.querySelector('[data-sky-filter]');filter.value='cassiopeia';
  filter.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
  assert.equal(search.value,'');assert.equal(root.querySelectorAll('[data-sky-select]').length,5);
  assert.equal(root.querySelectorAll('[data-sky-star]').length,5);
  controller.dispose();dom.window.close();
});

test('wheel, drag, and touch pinch update projection and dispose detaches all controls',()=>{
  const {dom,root,field,controller,click}=fixture();
  const pointer=(type,x,y,id=1)=>{
    const event=new dom.window.MouseEvent(type,{clientX:x,clientY:y,button:0,bubbles:true});
    Object.defineProperty(event,'pointerId',{value:id});field.dispatchEvent(event);
  };
  field.dispatchEvent(new dom.window.WheelEvent('wheel',{deltaY:-120,clientX:360,clientY:300,bubbles:true,cancelable:true}));
  assert.notEqual(root.querySelector('[data-sky-zoom]').textContent,'1.0×');
  const before=root.querySelector('[data-sky-star="vega"]').getAttribute('transform');
  pointer('pointerdown',200,200);pointer('pointermove',260,240);pointer('pointerup',260,240);
  assert.notEqual(root.querySelector('[data-sky-star="vega"]').getAttribute('transform'),before);
  pointer('pointerdown',200,200,1);pointer('pointerdown',300,200,2);
  const oldZoom=root.querySelector('[data-sky-zoom]').textContent;
  pointer('pointermove',400,200,2);pointer('pointerup',200,200,1);pointer('pointerup',400,200,2);
  assert.notEqual(root.querySelector('[data-sky-zoom]').textContent,oldZoom);
  controller.dispose();controller.dispose();
  const disposedZoom=root.querySelector('[data-sky-zoom]').textContent;
  click('[data-sky-action="reset"]');
  assert.equal(root.querySelector('[data-sky-zoom]').textContent,disposedZoom);
  dom.window.close();
});

test('markup labels are instance-safe and stars remain keyboard-selectable',()=>{
  const dom=new JSDOM(starMapMarkup()+starMapMarkup());
  const ids=[...dom.window.document.querySelectorAll('[id]')].map(node=>node.id);
  assert.equal(ids.length,new Set(ids).size);
  for(const label of dom.window.document.querySelectorAll('label'))assert.ok(dom.window.document.getElementById(label.htmlFor));
  assert.equal(dom.window.document.querySelector('[data-sky-viewport]').tabIndex,0);
  dom.window.close();
});
