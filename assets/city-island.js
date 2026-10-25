import * as T from './vendor/three.module.min.js';
import { createIslandWilderness, islandTerrainHeight } from './island-wilderness.js';
import { createMountainLandscape, mountainTerrainHeight } from './mountain-landscape.js';

let mainland;
/** Terrain, beach, trees and distant ranges keep the existing single land draw. */
export function createIslandGeometry(lowGraphics = false) {
  mainland ??= createIslandWilderness();
  const mountains=createMountainLandscape(),positions=[],colors=[];
  const copy=(data,start,count)=>{
    for(let i=start*3;i<(start+count)*3;i++){positions.push(data.positions[i]);colors.push(data.colors[i]);}
  };
  const add=(data,skip)=>{
    if(!lowGraphics){copy(data,0,data.positions.length/3);return;}
    copy(data,0,data.terrainVertexCount);
    data.trees.forEach((tree,i)=>{if(i%skip===0)copy(data,tree.vertexStart,tree.vertexCount);});
    for(const rock of data.rocks||[])copy(data,rock.vertexStart,rock.vertexCount);
  };
  add(mainland,3);
  const outerStart=positions.length/3;
  add(mountains,4);
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  geometry.computeVertexNormals();geometry.computeBoundingSphere();
  geometry.userData.landscapeRanges={islandTerrain:{start:0,count:mainland.terrainVertexCount},outerTerrain:{start:outerStart,count:mountains.terrainVertexCount}};
  geometry.userData.lowGraphics=lowGraphics;
  return geometry;
}

export function landscapeHeightAt(x,z) { return Math.max(islandTerrainHeight(x,z),mountainTerrainHeight(x,z)); }
export function outdoorTerrainFloor(x,z) { const height=landscapeHeightAt(x,z);return height>0?height+6:1.5; }
