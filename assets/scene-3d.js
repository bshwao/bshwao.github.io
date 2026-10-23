import * as T from './vendor/three.module.min.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { createTowerModel } from './tower-model.js';
import { viewportLayout } from './spatial-layout.js';
import { outdoorCameraPose, cameraDepthRange } from './camera-framing.js';
import { renderBudget } from './render-budget.js';
import { palette } from './color-theme.js';
import { footprint } from './tower-geometry.js';
import { createCityEnvironment, cityPalette, citySun } from './city-environment.js';
import { createCityBackdrop } from './city-backdrop.js';

const ease = t => t * t * t * (t * (t * 6 - 15) + 10);
const phase = (t, start, end) => ease(T.MathUtils.clamp((t - start) / (end - start), 0, 1));
const lerp = T.MathUtils.lerp;

/** One persistent scene and camera: tower, exploded assembly, and inhabited cutaway. */
export function createSpatialScene({ container, onSelectSection, onSelectRoom, onFrame, onContextLost, shadowComparison = false }) {
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'default' });
  renderer.setClearColor(palette.paper);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.localClippingEnabled = true;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.info.autoReset = false;
  const canvas = renderer.domElement;
  canvas.className = 'spatial-canvas';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Interactive 3D city skyline. Left mouse drag or arrow keys to orbit; scroll or plus and minus to zoom. Click to unfold the main tower.');
  container.append(canvas);
  const scene = new T.Scene();
  const ambient=new T.HemisphereLight(palette.sky,palette.bounce,2.25);scene.add(ambient);
  const light = new T.DirectionalLight('#ffffff', 1.4); light.position.copy(citySun).multiplyScalar(220); scene.add(light);
  const fill = new T.DirectionalLight(palette.fill, .6); fill.position.set(-80, 30, -60); scene.add(fill);
  const model = createTowerModel(); scene.add(model.root);
  const environment=createCityEnvironment();scene.add(environment.root);
  const backgrounds = [environment.root, model.ground, model.district.root, model.districtBuildings.root, model.districtDetails.root, model.districtShadows.root];
  const backdrop = createCityBackdrop(renderer, backgrounds, model.modules.map(module => module.group));
  // Diagnostic comparison only: production uses baked face/contact shading.
  if(shadowComparison){
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
    light.castShadow=true;light.shadow.mapSize.set(1024,1024);
    Object.assign(light.shadow.camera,{left:-180,right:180,top:180,bottom:-180,near:1,far:600});
    light.shadow.bias=-.0003;light.shadow.normalBias=.08;
    model.root.traverse(node=>{if(node.isMesh)node.castShadow=true;});
    const receiver=new T.Mesh(new T.PlaneGeometry(360,360),new T.ShadowMaterial({opacity:.28}));
    receiver.rotation.x=-Math.PI/2;receiver.position.y=-.23;receiver.receiveShadow=true;receiver.name='comparison-shadow-receiver';environment.root.add(receiver);
  }
  const boxCorners = bounds => {
    const points=[];
    for(const x of [bounds.min.x,bounds.max.x]) for(const y of [bounds.min.y,bounds.max.y]) for(const z of [bounds.min.z,bounds.max.z]) points.push(new T.Vector3(x,y,z));
    return points;
  };
  const interiorBounds = new Map(model.modules.map(module=>{
    const rooms=module.interior.rooms.map(room=>({points:boxCorners(room.bounds),center:room.center,radius:room.radius}));
    const points=footprint(module.low+.005,12).flatMap(([x,z])=>[
      new T.Vector3(x,.035-module.base.geometry.parameters.options.depth,z),new T.Vector3(x,module.interior.unit*.6,z),
    ]).concat(rooms.flatMap(room=>room.points));
    const bounds=new T.Box3().setFromPoints(points);
    return [module,{points,center:bounds.getCenter(new T.Vector3()),radius:bounds.getBoundingSphere(new T.Sphere()).radius,rooms}];
  }));
  const depthReferences = [];
  model.root.traverse(node => { if (node.material?.userData.districtDepth) depthReferences.push(node.material.userData.districtDepth); });
  const camera = new T.PerspectiveCamera(34, 1, .1, 1000);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const controls = new OrbitControls(camera, canvas);
  controls.mouseButtons = { LEFT: T.MOUSE.ROTATE, MIDDLE: T.MOUSE.DOLLY, RIGHT: null };
  controls.touches = { ONE: T.TOUCH.ROTATE, TWO: T.TOUCH.DOLLY_ROTATE };
  controls.enablePan = false;
  controls.enableDamping = !reducedMotion.matches;
  controls.dampingFactor = .1;
  controls.rotateSpeed = .65;
  controls.zoomSpeed = .65;
  controls.minPolarAngle = .04;
  controls.maxPolarAngle = Math.PI - .12;
  const raycaster = new T.Raycaster();
  const pointer = new T.Vector2();
  let width = 1, height = 1, mode = 'tower', selected = null;
  let focusedRoom = null, contextRoom = null, activeRoom = 0, hoveredRoom = null, hasViewport = false;
  let expansion = 0, reveal = 0, panel = 0, focusAmount = 0;
  let districtVisibility = 1;
  const screenCenter = new T.Vector2(.5, .5);
  let animation = null, frame = 0, dirty = true, disposed = false;
  let pointerStart = null, hover = null;
  const savedViews = new Map();
  const activePointers = new Set();
  let modelDirty = true, lastProjection = '';
  const cuts = model.modules.map(() => 0);
  const projectVector = new T.Vector3();
  const paper = new T.Color(palette.paper);
  const exteriorAmbient=new T.Color('#a5bce0'),exteriorSun=new T.Color(cityPalette.sunlight),exteriorFill=new T.Color('#7895bf');
  const white = new T.Color('#ffffff');
  const projection = world => {
    projectVector.copy(world).project(camera);
    return { x: (projectVector.x + 1) * width / 2, y: (1 - projectVector.y) * height / 2, visible: projectVector.z > -1 && projectVector.z < 1 };
  };
  function framing(nextMode, frameWidth = width, frameHeight = height, direction = null) {
    const pose = outdoorCameraPose(nextMode, frameWidth, frameHeight, direction);
    return { target: pose.target, position: pose.position,
      screenCenter: new T.Vector2(pose.layout.centerX / frameWidth, pose.layout.centerY / frameHeight) };
  }
  function interiorFraming(module, roomIndex = null, position = module.group.position) {
    const bounds=interiorBounds.get(module);
    const frame=roomIndex===null?bounds:bounds.rooms[roomIndex];
    const target = position.clone().add(frame.center);
    const offset = camera.position.clone().sub(controls.target);
    const angle = Math.atan2(offset.x, offset.z);
    const layout = viewportLayout(width, height);
    const tan = Math.tan(T.MathUtils.degToRad(camera.fov / 2));
    const usableAspect = (layout.rect.right - layout.rect.left) / height;
    const usableHeight = layout.rect.bottom - layout.rect.top;
    const radius = frame.radius;
    const polar = roomIndex!==null ? .83 : layout.stacked ? .60 : .68;
    const direction = new T.Vector3(Math.sin(angle) * Math.sin(polar), Math.cos(polar), Math.cos(angle) * Math.sin(polar));
    const right = new T.Vector3().crossVectors(camera.up, direction).normalize();
    const up = new T.Vector3().crossVectors(direction, right).normalize();
    const horizontal = tan * usableAspect / 1.16, vertical = tan * usableHeight / height / 1.16;
    let distance = radius * 1.8;
    for(const vertex of frame.points) {
      const point=vertex.clone().sub(frame.center);
      distance=Math.max(distance,point.dot(direction)+Math.max(Math.abs(point.dot(right))/horizontal,Math.abs(point.dot(up))/vertical));
    }
    return { target, position: target.clone().addScaledVector(direction, distance),
      screenCenter: new T.Vector2(layout.centerX / width, layout.centerY / height) };
  }
  function containInteriorFlight() {
    if(!animation||mode!=='section'||!selected) return;
    if(animation.kind!=='room' && cuts[selected.index]<.25) return;
    const bounds=interiorBounds.get(selected), targetBounds=focusedRoom===null?bounds:bounds.rooms[focusedRoom];
    const {rect}=viewportLayout(width,height), cx=screenCenter.x*width,cy=screenCenter.y*height;
    if(cx<=rect.left||cx>=rect.right||cy<=rect.top||cy>=rect.bottom) return;
    const tangent=Math.tan(T.MathUtils.degToRad(camera.fov/2))*2/height;
    const left=(cx-rect.left)*tangent/1.03,rightSpace=(rect.right-cx)*tangent/1.03;
    const top=(cy-rect.top)*tangent/1.03,bottom=(rect.bottom-cy)*tangent/1.03;
    const direction=camera.position.clone().sub(controls.target).normalize();
    const right=new T.Vector3().crossVectors(camera.up,direction).normalize(),up=new T.Vector3().crossVectors(direction,right).normalize();
    const initialDistance=camera.position.distanceTo(controls.target);
    let distance=initialDistance;
    for(const vertex of targetBounds.points) {
      const point=vertex.clone().add(selected.group.position).sub(controls.target);
      const x=point.dot(right),y=point.dot(up);
      distance=Math.max(distance,point.dot(direction)+Math.max(x/(x>=0?rightSpace:-left),y/(y>=0?top:-bottom)));
    }
    const fit=animation.kind==='room'?phase(animation.progress,0,.2):phase(cuts[selected.index],.25,.55);
    camera.position.copy(controls.target).addScaledVector(direction,lerp(initialDistance,distance,fit));
  }
  function updateProjection() {
    const { near, far } = cameraDepthRange(camera.position.distanceTo(controls.target));
    const key = `${width}:${height}:${screenCenter.x}:${screenCenter.y}:${near}:${far}`;
    if (key === lastProjection) return;
    lastProjection = key;
    camera.aspect = width / height;
    camera.near = near; camera.far = far;
    camera.setViewOffset(width, height, (.5 - screenCenter.x) * width, (.5 - screenCenter.y) * height, width, height);
  }
  function updateModel() {
    model.modules.forEach((module, index) => {
      const surrounding = mode === 'section' && module !== selected;
      const context = surrounding && animation?.kind === 'scene' ? 1 - phase(animation.progress, .18, .7) : surrounding ? 0 : 1;
      // Room flights keep the other floors isolated; only a scene entry can show them.
      module.group.visible = !surrounding || context > .001;
      const cut = cuts[index];
      // Adjacent modules share the same cut plane in the assembled tower.
      // Keep one shared face until floors separate. The upper face also covers
      // the exposed ledge where the next module steps inward.
      module.caps[0].visible = expansion > .001 || index === model.modules.length - 1;
      module.caps[1].visible = true;
      module.capPlans.setPresentation(expansion, cut, context);
      module.clip.constant = module.group.position.y + (module.high - module.low) * (1 - cut) + module.interior.unit * .17;
      module.interior.group.visible = cut > .03;
      module.line.color.set(hover === module.id ? module.colors.ink : '#171f2b').lerp(module.cutInk,expansion*.5);
      module.line.opacity = .42 * context;
      module.surface.color.copy(white);
      module.surface.emissive.copy(paper).multiplyScalar((1 - context) * .8);
      module.slabMaterial.color.set(cityPalette.roof).lerp(module.cutTint,expansion).lerp(paper, 1 - context);
      module.base.material.color.set(cityPalette.metal).lerp(module.cutTint,expansion).lerp(paper, module === selected ? focusAmount * .8 : 1 - context);
      module.base.children[0].material.color.set(palette.muted).lerp(module.cutInk,expansion);
      module.base.children[0].material.opacity = (.28 + .52 * expansion) * context * (module === selected ? 1 - focusAmount * .72 : 1);
      module.interior.setFocus?.(module === selected ? contextRoom : null, focusAmount);
    });
    model.groundLine.opacity = .45;
    model.district.setPresentation(0, 0);
    model.districtBuildings.setPresentation(0, 0);
    model.districtDetails.setPresentation(0, 0);
    model.districtShadows.setPresentation(0, 0);
    backgrounds.forEach(root => { root.visible = districtVisibility >= .999; });
    model.root.updateMatrixWorld(true);
  }
  function labels() {
    if (mode === 'section' && selected) {
      return selected.interior.anchors.map((anchor, index) => ({ id: String(index), ...projection(anchor.clone().applyMatrix4(selected.group.matrixWorld)) }));
    }
    if (mode !== 'explore') return [];
    return model.modules.map((module, index) => {
      const side = index % 2 ? -1 : 1;
      const point = module.group.position.clone();
      point.addScaledVector(new T.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), side * (module.maxRadius + .8));
      point.y += (module.high - module.low) * (index === 0 ? .36 : .5);
      return { id: module.id, side, ...projection(point) };
    });
  }
  function draw(time = performance.now()) {
    if (disposed || document.hidden) { frame = 0; return; }
    frame = 0;
    let moving = false;
    if (animation) {
      const t = Math.min(1, (time - animation.start) / animation.duration);
      const e = ease(t);
      animation.progress = t;
      const entering = animation.kind === 'scene' && mode === 'section';
      const leaving = animation.kind === 'scene' && animation.from.reveal > animation.to.reveal;
      const cameraProgress = entering ? phase(t, .1, 1) : e;
      const structureProgress = entering ? phase(t, 0, .76) : e;
      const cutProgress = entering ? phase(t, .28, .9) : leaving ? phase(t, 0, .65) : e;
      expansion = lerp(animation.from.expansion, animation.to.expansion, e);
      reveal = lerp(animation.from.reveal, animation.to.reveal, e);
      districtVisibility = lerp(animation.from.districtVisibility, animation.to.districtVisibility,
        animation.to.districtVisibility<animation.from.districtVisibility ? phase(t,0,.24)
          : animation.to.districtVisibility>animation.from.districtVisibility ? phase(t,.66,1) : e);
      screenCenter.lerpVectors(animation.from.screenCenter, animation.to.screenCenter, entering ? phase(t, .22, .9) : e);
      panel = lerp(animation.from.panel, animation.to.panel, entering ? phase(t, .48, .96) : leaving ? phase(t, 0, .55) : e);
      focusAmount = lerp(animation.from.focusAmount, animation.to.focusAmount, e);
      camera.position.lerpVectors(animation.from.position, animation.to.position, cameraProgress);
      camera.position.addScaledVector(animation.lift, Math.sin(Math.PI * cameraProgress));
      controls.target.lerpVectors(animation.from.target, animation.to.target, cameraProgress);
      model.modules.forEach((module, index) => {
        module.group.position.lerpVectors(animation.from.modules[index], animation.to.modules[index], structureProgress);
        cuts[index] = lerp(animation.from.cuts[index], animation.to.cuts[index], cutProgress);
      });
      if (t === 1) {
        const done = animation.done;
        animation = null; controls.enabled = true;
        setControlLimits();
        done?.();
      }
      moving = true;
    }
    if (moving || modelDirty) { updateModel(); modelDirty = false; }
    containInteriorFlight();
    if(!selected&&!animation) controls.maxPolarAngle=Math.acos(T.MathUtils.clamp((1.5-controls.target.y)/camera.position.distanceTo(controls.target),-1,1));
    const changed = controls.update();
    updateProjection();
    if (dirty || moving || changed) {
      const distance = camera.position.distanceTo(controls.target);
      for (const reference of depthReferences) reference.value = distance;
      const lighting = amount => {
        ambient.color.set(palette.sky).lerp(exteriorAmbient,amount);
        ambient.intensity=lerp(2.25,1.65,amount);
        light.color.copy(white).lerp(exteriorSun,amount);
        light.intensity=lerp(1.4,2.7,amount);
        fill.color.set(palette.fill).lerp(exteriorFill,amount);
      };
      renderer.info.reset();
      if (districtVisibility < .999) {
        backdrop.render(scene, camera, 1 - districtVisibility,
          () => { environment.update(camera,1); lighting(1); },
          () => lighting(districtVisibility));
      } else { environment.update(camera,1); lighting(1); renderer.render(scene,camera); }
      canvas.dataset.background = districtVisibility < .999 ? 'blurred' : 'sharp';
      onFrame?.({ mode, selectedId: selected?.id, labels: labels(), expansion, reveal, panel, focusedRoom, activeRoom, hoveredRoom,
        viewport: viewportLayout(width, height), moving: Boolean(animation), transitionType: animation?.kind || null,
        azimuth: controls.getAzimuthalAngle(), polar: controls.getPolarAngle() });
      dirty = false;
    }
    if (animation || changed) invalidate();
  }
  function applyBudget() {
    const budget = renderBudget(width, height, devicePixelRatio);
    renderer.setPixelRatio(budget.pixelRatio);
    model.setCompact(budget.compact);
    canvas.dataset.detail = budget.compact ? 'compact' : 'full';
    canvas.dataset.quality = '0';
  }
  function invalidate() {
    dirty = true;
    if (!frame && !disposed) {
      frame = requestAnimationFrame(draw);
    }
  }
  function setControlLimits() {
    const radius = focusedRoom === null ? selected?.maxRadius : selected?.interior.rooms[focusedRoom]?.radius;
    controls.minDistance = selected ? radius * 1.4 : 85;
    const pose = selected ? null : framing(mode);
    const outdoor = pose ? pose.position.distanceTo(pose.target) : 0;
    controls.maxDistance = selected ? selected.maxRadius * 16 : Math.max(650, outdoor * 2.2);
    controls.maxPolarAngle=selected?Math.PI-.12:Math.acos(T.MathUtils.clamp((1.5-controls.target.y)/camera.position.distanceTo(controls.target),-1,1));
  }
  function move(to, duration, done, kind = 'scene') {
    // Drain orbital inertia before taking the new animation's starting pose.
    controls.enableDamping = false; controls.update(); controls.enableDamping = !reducedMotion.matches;
    controls.minDistance = .01;
    controls.maxDistance = Infinity;
    animation = {
      start: performance.now(), duration: reducedMotion.matches ? 1 : Math.max(1, duration), kind, progress: 0,
      from: { position: camera.position.clone(), target: controls.target.clone(), screenCenter: screenCenter.clone(), districtVisibility, expansion, reveal, panel, focusAmount, modules: model.modules.map(module => module.group.position.clone()), cuts: [...cuts] },
      to: { focusAmount: 0, districtVisibility, ...to, position: to.position.clone(), target: to.target.clone(), screenCenter: (to.screenCenter || screenCenter).clone() }, done,
      lift: new T.Vector3(0, kind === 'scene' && selected ? Math.min(18, camera.position.distanceTo(to.position) * .09) : kind === 'room' ? Math.min(selected.interior.unit * 2, camera.position.distanceTo(to.position) * .12) : 0, 0),
    };
    controls.enabled = false;
    hover = null; hoveredRoom = null; selected?.interior.setHoveredRoom(null);
    canvas.style.cursor = 'grab';
    invalidate();
  }
  function goTo(nextMode, id, { instant = false, onComplete, reset = false } = {}) {
    const previousMode = mode;
    const direction = camera.position.clone().sub(controls.target);
    const exploreDirection=new T.Vector3(direction.x,Math.hypot(direction.x,direction.z)/Math.tan(1.13),direction.z);
    if (previousMode !== 'section' && previousMode !== nextMode && !reset) {
      // Interrupted outdoor flights remember their destination, not a half-pose.
      const pose = animation?.kind === 'scene' ? animation.to : { position: camera.position, target: controls.target, screenCenter };
      savedViews.set(previousMode, { position: pose.position.clone(), target: pose.target.clone(), screenCenter: pose.screenCenter.clone() });
    }
    if (reset) savedViews.delete(nextMode);
    mode = nextMode;
    modelDirty = true;
    selected = nextMode === 'section' ? model.modules.find(module => module.id === id) : null;
    focusedRoom = null; contextRoom = null; activeRoom = 0; hoveredRoom = null;
    canvas.dataset.focusedRoom = '';
    selected?.interior.setActiveRoom(0);
    selected?.interior.setHoveredRoom(null);
    if (nextMode === 'section' && !selected) throw new Error('Unknown section');
    if (nextMode === 'section' && !savedViews.has('explore')) savedViews.set('explore', framing('explore', width, height, exploreDirection));
    // Resolve expanded transforms before calculating the destination floor's position.
    const desiredExpansion = nextMode === 'tower' ? 0 : 1;
    const modulePositions = model.modules.map((module, index) => new T.Vector3(
      (index % 2 ? 1 : -1) * (index === 4 ? 10 : 8) * desiredExpansion,
      module.low + (4 - index) * 10 * desiredExpansion + (selected && module !== selected ? (selected.index - index) * 105 : 0), 0));
    let pose;
    if (selected) pose = interiorFraming(selected, null, modulePositions[selected.index]);
    else if (!reset && previousMode !== nextMode && savedViews.has(nextMode)) pose = savedViews.get(nextMode);
    else pose = framing(nextMode, width, height, reset ? null : nextMode==='explore'?exploreDirection:direction);
    const to = { ...pose, expansion: desiredExpansion, districtVisibility: nextMode==='tower' ? 1 : 0, reveal: selected ? 1 : 0, panel: selected ? 1 : 0, modules: modulePositions, cuts: model.modules.map(module => module === selected ? 1 : 0) };
    move(to, instant ? 1 : nextMode === 'section' ? 1850 : previousMode === 'section' ? 1550 : 1300, onComplete);
    canvas.dataset.mode = nextMode;
    canvas.dataset.section = selected?.id || '';
    canvas.setAttribute('aria-label', selected ? `3D cutaway of ${selected.name}: ${selected.theme}. Left mouse drag or arrow keys to orbit. Select a numbered room to read its contents.` : 'Interactive 3D city skyline. Left mouse drag or arrow keys to orbit; scroll or plus and minus to zoom. Click to unfold the main tower.');
  }
  function focusRoom(index, { instant = false } = {}) {
    if (!selected || animation?.kind === 'scene' || !Number.isInteger(index) || !selected.interior.rooms[index]) return;
    activeRoom = index; focusedRoom = index; contextRoom = index;
    selected.interior.setActiveRoom(index);
    canvas.dataset.focusedRoom = String(index);
    const to = { ...interiorFraming(selected, index), expansion, reveal, panel,
      focusAmount: 1, modules: model.modules.map(module => module.group.position.clone()), cuts: [...cuts] };
    move(to, instant ? 1 : 760, null, 'room');
  }
  function overview() {
    if (!selected || animation?.kind === 'scene') return;
    focusedRoom = null;
    canvas.dataset.focusedRoom = '';
    const to = { ...interiorFraming(selected), expansion, reveal, panel,
      modules: model.modules.map(module => module.group.position.clone()), cuts: [...cuts] };
    move(to, 760, null, 'room');
  }
  function hit(event) {
    const bounds = canvas.getBoundingClientRect();
    pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
    camera.updateMatrixWorld();
    raycaster.setFromCamera(pointer, camera);
    if (mode === 'section' && selected) {
      return raycaster.intersectObjects(selected.interior.pickables, false)[0]?.object.userData.roomIndex ?? null;
    }
    const found = raycaster.intersectObjects(model.modules.flatMap(module => module.shell.children).filter(item => item.isMesh), false)[0];
    if (!found) return null;
    if (mode === 'tower' && districtVisibility > .5) {
      const scenery = [...model.districtBuildings.root.children, ...model.districtDetails.root.children].filter(item => item.isMesh);
      const obstacle = raycaster.intersectObjects(scenery, false)[0];
      if (obstacle && obstacle.distance < found.distance - .01) return null;
    }
    return found.object.userData.sectionId ?? null;
  }
  canvas.addEventListener('pointerdown', event => {
    if (hoveredRoom !== null || hover !== null) {
      hover = null; hoveredRoom = null; selected?.interior.setHoveredRoom(null); modelDirty = true; invalidate();
    }
    canvas.style.cursor = event.button === 0 || event.pointerType === 'touch' ? 'grabbing' : 'grab';
    activePointers.add(event.pointerId);
    if (activePointers.size > 1) { if (pointerStart) pointerStart.cancelled = true; return; }
    pointerStart = { x: event.clientX, y: event.clientY, button: event.button, id: event.pointerId, cancelled: false };
  });
  canvas.addEventListener('pointerup', event => {
    canvas.style.cursor = 'grab';
    activePointers.delete(event.pointerId);
    const start = pointerStart; pointerStart = null;
    if (!start || start.cancelled || start.id !== event.pointerId || start.button !== 0 || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5 || animation) return;
    const found = hit(event);
    if (found === null) return;
    if (mode === 'section') onSelectRoom?.(found);
    else onSelectSection?.(mode === 'tower' ? null : found);
  });
  canvas.addEventListener('pointercancel', event => { activePointers.delete(event.pointerId); pointerStart = null; canvas.style.cursor = 'grab'; });
  canvas.addEventListener('lostpointercapture', event => { activePointers.delete(event.pointerId); if (pointerStart?.id === event.pointerId) pointerStart.cancelled = true; });
  canvas.addEventListener('pointermove', event => {
    if (pointerStart && event.pointerId === pointerStart.id && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5) pointerStart.cancelled = true;
    if (event.buttons || animation || event.pointerType === 'touch') return;
    const found = hit(event);
    const next = mode !== 'section' ? found : null;
    const nextRoom = mode === 'section' ? found : null;
    canvas.style.cursor = found !== null ? 'pointer' : 'grab';
    if (hoveredRoom !== nextRoom) { hoveredRoom = nextRoom; selected?.interior.setHoveredRoom(nextRoom); invalidate(); }
    if (hover !== next) { hover = next; modelDirty = true; invalidate(); }
  });
  canvas.addEventListener('pointerleave', () => { hover = null; hoveredRoom = null; selected?.interior.setHoveredRoom(null); modelDirty = true; invalidate(); });
  canvas.addEventListener('keydown', event => {
    if (animation) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (mode === 'tower') onSelectSection?.(null);
      return;
    }
    const offset = camera.position.clone().sub(controls.target);
    const spherical = new T.Spherical().setFromVector3(offset);
    if (event.key === 'ArrowLeft') spherical.theta -= .13;
    else if (event.key === 'ArrowRight') spherical.theta += .13;
    else if (event.key === 'ArrowUp') spherical.phi = Math.max(.04, spherical.phi - .1);
    else if (event.key === 'ArrowDown') spherical.phi = Math.min(Math.PI - .12, spherical.phi + .1);
    else if (event.key === '+' || event.key === '=') spherical.radius = Math.max(controls.minDistance, spherical.radius * .9);
    else if (event.key === '-') spherical.radius = Math.min(controls.maxDistance, spherical.radius / .9);
    else return;
    event.preventDefault();
    camera.position.copy(controls.target).add(new T.Vector3().setFromSpherical(spherical));
    controls.update(); invalidate();
  });
  const resize = () => {
    const bounds = container.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0 || (hasViewport && width === bounds.width && height === bounds.height)) return;
    const oldWidth = width, oldHeight = height;
    const offset = camera.position.clone().sub(controls.target);
    const oldPose = selected ? interiorFraming(selected, focusedRoom) : framing(mode, width, height, offset);
    const targetAdjustment = controls.target.clone().sub(oldPose.target);
    const zoom = hasViewport ? offset.length() / oldPose.position.distanceTo(oldPose.target) : 1;
    width = bounds.width; height = bounds.height;
    applyBudget();
    renderer.setSize(width, height);
    if (hasViewport) for (const [viewMode, saved] of savedViews) {
      const viewDirection = saved.position.clone().sub(saved.target);
      const oldFrame = framing(viewMode, oldWidth, oldHeight, viewDirection), newFrame = framing(viewMode, width, height, viewDirection);
      const scale = newFrame.position.distanceTo(newFrame.target) / oldFrame.position.distanceTo(oldFrame.target);
      const adjustment = saved.target.clone().sub(oldFrame.target);
      saved.target.copy(newFrame.target).add(adjustment);
      saved.position.copy(saved.target).addScaledVector(viewDirection, scale);
      saved.screenCenter.copy(newFrame.screenCenter);
    }
    if (!animation) {
      const pose = selected ? interiorFraming(selected, focusedRoom) : framing(mode, width, height, hasViewport ? offset : null);
      const distance = pose.position.distanceTo(pose.target) * zoom;
      if (hasViewport && !selected) pose.target.add(targetAdjustment);
      camera.position.copy(hasViewport ? pose.target.clone().addScaledVector(offset.normalize(), distance) : pose.position);
      controls.target.copy(pose.target);
      screenCenter.copy(pose.screenCenter);
    } else {
      let pose;
      if (selected) pose = interiorFraming(selected, focusedRoom, animation.to.modules[selected.index]);
      else {
        const viewDirection = animation.to.position.clone().sub(animation.to.target);
        const oldFrame = framing(mode, oldWidth, oldHeight, viewDirection), newFrame = framing(mode, width, height, viewDirection);
        const scale = newFrame.position.distanceTo(newFrame.target) / oldFrame.position.distanceTo(oldFrame.target);
        const target = newFrame.target.clone().add(animation.to.target.clone().sub(oldFrame.target));
        pose = { target, position: viewDirection.multiplyScalar(scale).add(target), screenCenter: newFrame.screenCenter };
      }
      const remaining = animation.duration - (performance.now() - animation.start);
      move({ ...animation.to, ...pose }, remaining, animation.done, animation.kind);
    }
    hasViewport = true;
    if (!animation) setControlLimits();
    controls.update(); invalidate();
  };
  const observer = new ResizeObserver(resize); observer.observe(container);
  const visibility = () => { if (!document.hidden) invalidate(); };
  const motionChange = () => {
    controls.enableDamping = !reducedMotion.matches;
    if (reducedMotion.matches && animation) { animation.start = performance.now(); animation.duration = 1; }
    invalidate();
  };
  document.addEventListener('visibilitychange', visibility);
  reducedMotion.addEventListener('change', motionChange);
  controls.addEventListener('change', invalidate);
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); onContextLost?.(); });
  resize();
  goTo('tower', null, { instant: true });
  return {
    metrics() { return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, lines: renderer.info.render.lines, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, programs: renderer.info.programs.length, pixelRatio: renderer.getPixelRatio(), quality: 0, background: canvas.dataset.background, backdrop: backdrop.metrics(), near:camera.near, far:camera.far, width, height }; },
    refreshLabels() { invalidate(); },
    goTo,
    focusRoom,
    overview,
    hoverRoom(index) {
      const next = !animation && Number.isInteger(index) && selected?.interior.rooms[index] ? index : null;
      if (hoveredRoom === next) return;
      hoveredRoom = next; selected?.interior.setHoveredRoom(next); invalidate();
    },
    reset() { if (selected) overview(); else if (!animation) goTo(mode, selected?.id, { reset: true }); },
    focus() { canvas.focus({ preventScroll: true }); },
    dispose() {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect();
      document.removeEventListener('visibilitychange', visibility); controls.dispose();
      reducedMotion.removeEventListener('change', motionChange);
      const geometries = new Set(), materials = new Set();
      for (const module of model.modules) { geometries.add(module.lineGeometry); geometries.add(module.coarseLineGeometry); }
      scene.traverse(item => {
        if (item.geometry) geometries.add(item.geometry);
        if (item.material) (Array.isArray(item.material) ? item.material : [item.material]).forEach(material => materials.add(material));
      });
      backdrop.dispose(); geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());light.shadow.map?.dispose();renderer.dispose(); canvas.remove();
    },
  };
}
