// A real WebGL pixel regression: exterior weather must never repaint the room.
import * as T from '../assets/vendor/three.module.min.js';
import { createCityBackdrop } from '../assets/city-backdrop.js';
const width=480,height=320,world=new T.Scene(),view=new T.OrthographicCamera(-1,1,1,-1,.1,10);
const renderer=new T.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});renderer.setSize(width,height);renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;
document.querySelector('#stage').append(renderer.domElement);view.position.z=5;
const city=new T.Group(),room=new T.Group();world.add(city,room);
const geometry=new T.PlaneGeometry(2,2),cityMaterial=new T.MeshBasicMaterial({color:'#8b9b98'}),roomMaterial=new T.MeshBasicMaterial({color:'#c98452'});
const street=new T.Mesh(geometry,cityMaterial);street.position.z=-2;city.add(street);
const floor=new T.Mesh(geometry,roomMaterial);floor.scale.set(.38,.38,1);room.add(floor);
const backdrop=createCityBackdrop(renderer,[city],[room]),gl=renderer.getContext();
const assert=(value,message)=>{if(!value)throw new Error(message);};
function render(weather,time){backdrop.setWeather(weather);backdrop.setWeatherTime(time);backdrop.render(world,view,1,()=>{},()=>{});const bytes=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,bytes);return bytes;}
const luma=(bytes,i)=>bytes[i]*.2126+bytes[i+1]*.7152+bytes[i+2]*.0722;
try{
  const day=render({},0),night=render({night:1},0),rainA=render({rain:true,night:1},2),rainB=render({rain:true,night:1},2.2);
  let roomChanges=0,outdoorChanges=0,dayLight=0,nightLight=0,outdoorPixels=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4,changed=rainA[i]!==rainB[i]||rainA[i+1]!==rainB[i+1]||rainA[i+2]!==rainB[i+2];
    if(x>width*.35&&x<width*.65&&y>height*.35&&y<height*.65){if(changed||day[i]!==rainA[i]||day[i+1]!==rainA[i+1]||day[i+2]!==rainA[i+2])roomChanges++;}
    if(x<width*.25||x>width*.75||y<height*.25||y>height*.75){outdoorPixels++;dayLight+=luma(day,i);nightLight+=luma(night,i);if(changed)outdoorChanges++;}
  }
  assert(roomChanges===0,`${roomChanges} interior pixels were affected by outdoor weather`);
  assert(outdoorChanges>25,'Rain does not visibly move in the exterior');
  assert(nightLight<dayLight*.75,'The outdoor night remains too close to daytime brightness');
  const before={geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures};
  for(let i=0;i<8;i++)render({rain:i%2===0,night:i%2},i);
  const restored=render({},0);assert(restored.every((value,i)=>value===day[i]),'Clearing weather does not restore the original city image');
  assert(renderer.info.memory.geometries===before.geometries&&renderer.info.memory.textures===before.textures,'Weather changes allocate GPU resources');
  backdrop.setLowGraphics(true);
  const lowDay=render({},0),lowRain=render({rain:true,night:1},2);
  let lowRoomChanges=0;
  for(let y=Math.ceil(height*.35);y<height*.65;y++)for(let x=Math.ceil(width*.35);x<width*.65;x++){
    const i=(y*width+x)*4;if(lowDay[i]!==lowRain[i]||lowDay[i+1]!==lowRain[i+1]||lowDay[i+2]!==lowRain[i+2])lowRoomChanges++;
  }
  assert(lowRoomChanges===0,'Low graphics puts weather over the room');
  assert(backdrop.metrics().blurPasses===0&&backdrop.metrics().width===width/2,'Weather bypasses the low graphics raster budget');
  const lowResources={geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures};
  assert(lowResources.geometries===before.geometries&&lowResources.textures<=before.textures,'Low graphics exceeds the existing resource budget');
  for(let i=0;i<8;i++)render({rain:i%2===0,night:i%2},i);
  assert(renderer.info.memory.geometries===lowResources.geometries&&renderer.info.memory.textures===lowResources.textures,'Repeated low graphics weather changes allocate GPU resources');
  document.querySelector('#results').textContent=JSON.stringify({viewport:`${width}x${height}`,interiorChangedPixels:roomChanges,lowGraphicsInteriorChangedPixels:lowRoomChanges,exteriorMovingPixels:outdoorChanges,outdoorPixels,dayLuminance:dayLight/outdoorPixels,nightLuminance:nightLight/outdoorPixels,nightRatio:nightLight/dayLight,restoresOriginalPixels:true,stableResources:before,lowResources},null,2);
  backdrop.dispose();geometry.dispose();cityMaterial.dispose();roomMaterial.dispose();renderer.dispose();
  assert(renderer.info.memory.geometries===0&&renderer.info.memory.textures===0,'GPU resources remain after disposal');
  document.querySelector('#status').textContent='PASS — night outside, animated rain outside, unchanged interior pixels, stable resources and disposal';
}catch(error){backdrop.dispose();geometry.dispose();cityMaterial.dispose();roomMaterial.dispose();renderer.dispose();document.querySelector('#status').textContent=`FAIL — ${error.message}`;document.querySelector('#results').textContent=error.stack;}
