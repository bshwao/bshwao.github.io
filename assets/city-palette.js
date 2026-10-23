import * as T from './vendor/three.module.min.js';
export const cityPalette=Object.freeze({
  zenith:'#071225',horizon:'#253a59',haze:'#2c3e56',sunlight:'#ffd39a',
  metal:'#252a34',glazing:'#3d526c',reflection:'#e3ae64',brick:'#9a6653',limestone:'#c5b49b',
  concrete:'#9faaa9',bronze:'#8e7965',roof:'#636873',road:'#555c66',pavement:'#a9aaa3',foliage:'#455e4e',
});
// Direction used to bake the restrained architectural face shading.
export const citySun=new T.Vector3(-65,82,100).normalize();
