import * as T from '../../assets/vendor/three.module.min.js';
import { sections,interiorFloorHeight } from '../../assets/tower-geometry.js';
import { floorContent } from '../../assets/floor-content.js';
import { createInterior } from '../../assets/interiors.js';
import { interiorDesigns } from '../../assets/interior-design.js';
import { writeFile } from 'node:fs/promises';

const floors=sections.map(section=>{
  const interior=createInterior(section,floorContent[section.id]);
  return {id:section.id,name:section.name,design:interiorDesigns[section.id].name,objects:interior.interactions.objects.length,
    rooms:interior.rooms.map((room,index)=>({id:floorContent[section.id].rooms[index].id,name:floorContent[section.id].rooms[index].name,
      design:room.design.name,palette:room.surfaces.map(surface=>`#${surface.color.getHexString()}`),
      floor:room.design.floor,wall:room.design.wall,pattern:room.design.pattern,roundness:room.design.roundness,
      turnDegrees:Math.round(room.design.turn*180/Math.PI),position:room.group.position.toArray(),scale:room.scale,
      bounds:{min:room.bounds.min.toArray(),max:room.bounds.max.toArray()},
      occupiedFraction:room.bounds.getSize(new T.Vector3()).toArray().filter((_,i)=>i!==1).map((size,i)=>size/(i===0?room.region.width:room.region.depth)),
      objects:interior.interactions.objects.filter(object=>object.roomIndex===index).map(object=>({name:object.name,kind:object.kind})),
      triangles:room.group.children.reduce((sum,mesh)=>sum+mesh.geometry.attributes.position.count/3,0),
    }))};
});
await writeFile(new URL('inventory.json',import.meta.url),JSON.stringify({floorSurfaceY:interiorFloorHeight,floors},null,2));
console.log(`${floors.length} floors / ${floors.reduce((n,f)=>n+f.rooms.length,0)} rooms / ${floors.reduce((n,f)=>n+f.objects,0)} interactive objects`);
