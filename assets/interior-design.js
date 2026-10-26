/** Material and furnishing directions for all 23 inhabited rooms.
 * Four furniture roles remain batched; finishes are baked into architecture.
 */
const room=(name,colors,floor,wall,roundness,turn,pattern='boards')=>({
  name,colors:{structure:colors[0],equipment:colors[1],ink:colors[2],glass:colors[3]},
  floor,wall,roundness,turn:turn*Math.PI/180,pattern,
});
export const interiorDesigns={
  penthouse:{name:'Fireside apartment',trim:'#875338',hall:'#c89970',outline:'#684638',rooms:[
    room('Cinnamon bedroom',['#eed4ac','#bb704c','#593b31','#e6ac90'],'#ba865b','#e4bd93',.22,-90,'wide-boards'),
    room('Terracotta play den',['#f0cf9e','#a84e43','#4f343d','#d68e57'],'#ac7955','#d7ad91',.18,-15,'wide-boards'),
    room('Amber record room',['#dcae6b','#754b38','#392e2c','#be8450'],'#986740','#d5b286',.14,90,'boards'),
    room('Rose sunset lounge',['#efd0b2','#a96467','#573c43','#d69c6a'],'#c69470','#ebc4a8',.25,-90,'wide-boards'),
  ]},
  about:{name:'Collected walnut study',trim:'#3d584a',hall:'#a28f6d',outline:'#423d31',rooms:[
    room('Forest model gallery',['#d4b68b','#385b4d','#353b31','#91a786'],'#a89470','#c3c4a7',.035,90,'parquet'),
    room('Oxford writing study',['#c89c64','#3d505f','#32383c','#a9b5ae'],'#907751','#bfc4b5',.06,-90,'boards'),
    room('Walnut recital room',['#e6c9a0','#623e35','#292c2d','#aa865d'],'#a47a55','#cbb397',.08,15,'parquet'),
    room('Olive conversation salon',['#d7bf8a','#6a7351','#3c4537','#b8b18a'],'#ac9673','#c1c8aa',.13,90,'boards'),
  ]},
  projects:{name:'Midnight maker studio',trim:'#315573',hall:'#596c79',outline:'#293e50',rooms:[
    room('Cobalt maker island',['#b0c8d4','#275a83','#24313f','#63c4cc'],'#5d727d','#829cac',.035,90,'resin'),
    room('Violet systems lab',['#c3c1d0','#65577e','#252d3d','#75a8bd'],'#555e71','#9496aa',.025,180,'raised-panels'),
    room('Petrol simulator studio',['#acbfc0','#2f6c70','#253840','#db9f61'],'#4a666b','#8caaa9',.05,-90,'resin'),
  ]},
  experience:{name:'Industrial test workshop',trim:'#ab7727',hall:'#9c9b87',outline:'#424943',rooms:[
    room('Safety yellow electronics bay',['#bfc4b9','#d3ac43','#343e40','#698e7e'],'#898e85','#c3c7b8',0,90,'concrete'),
    room('Graphite network bay',['#b2c3c4','#4c6f79','#293b42','#d29a42'],'#7a888b','#b8c6c5',0,90,'raised-panels'),
    room('Copper diagnostics bay',['#c6bba4','#b16d4d','#3f4240','#84a393'],'#929489','#c7c3b5',.015,-90,'concrete'),
    room('Crimson race workshop',['#d1c6b0','#a7463b','#30363a','#caad58'],'#8b8d83','#c6c6b7',0,90,'concrete'),
  ]},
  resume:{name:'Burgundy reference library',trim:'#764743',hall:'#c2ad83',outline:'#59483a',rooms:[
    room('Burgundy document gallery',['#e5d5b4','#79433f','#453a32','#b3955e'],'#b59a71','#ddd0b4',.045,90,'parquet'),
    room('Mahogany book stacks',['#ceae7f','#633f32','#3c342c','#9d8761'],'#a3875e','#c8bb9e',.025,90,'boards'),
    room('Ink blue drafting library',['#decc9e','#3d5364','#3d3c36','#a9ad93'],'#b19b75','#d2ccb5',.04,-90,'parquet'),
    room('Ochre print atelier',['#e4d0a8','#a37c40','#4d4034','#bd9477'],'#baa27a','#ddd0b5',.06,180,'boards'),
  ]},
  contact:{name:'Garden reception',trim:'#32786e',hall:'#bfd0b4',outline:'#3f5d4e',rooms:[
    room('Jade welcome desk',['#e1c9a3','#407e70','#354e43','#a8bf92'],'#d2bc96','#d3ddbc',.16,-90,'terrazzo'),
    room('Lagoon connection bar',['#d4c5a4','#347a86','#354d59','#a3cfca'],'#b9c7b5','#c0d8cf',.09,90,'large-tile'),
    room('Apricot tea garden',['#f0d2ab','#b17652','#48573c','#bac69a'],'#d8c5a0','#e1d6b8',.22,90,'terrazzo'),
    room('Sage consultation nook',['#ddc69c','#7c9271','#405446','#c4b28d'],'#c3c7a4','#d3dfc4',.17,-90,'large-tile'),
  ]},
};
export function interiorRoomDesign(id,index){return interiorDesigns[id].rooms[index];}
