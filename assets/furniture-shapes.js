import * as T from './vendor/three.module.min.js';

/** A closed, softly beveled solid, normalized to the same bounds as a unit box. */
export function roundedFurnitureGeometry(radius=.16){
  const r=Math.min(.24,Math.max(.015,radius)),s=new T.Shape();
  const lo=-.5+r,hi=.5-r,c=Math.min(r,.12);
  s.moveTo(lo+c,lo);s.lineTo(hi-c,lo);s.quadraticCurveTo(hi,lo,hi,lo+c);
  s.lineTo(hi,hi-c);s.quadraticCurveTo(hi,hi,hi-c,hi);
  s.lineTo(lo+c,hi);s.quadraticCurveTo(lo,hi,lo,hi-c);
  s.lineTo(lo,lo+c);s.quadraticCurveTo(lo,lo,lo+c,lo);
  const g=new T.ExtrudeGeometry(s,{depth:1-2*r,bevelEnabled:true,bevelSize:r,bevelThickness:r,bevelSegments:2,curveSegments:3,steps:1});
  g.center();g.computeBoundingBox();const size=g.boundingBox.getSize(new T.Vector3());
  g.scale(1/size.x,1/size.y,1/size.z);g.computeBoundingBox();return g;
}
