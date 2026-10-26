import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { sections } from '../assets/tower-geometry.js';
import { floorContent } from '../assets/floor-content.js';
import { createNoughtsAndCrosses, penthouseGameMarkup, createPenthousePlay } from '../assets/penthouse-play.js';

test('the visitor penthouse occupies its own top floor while original portfolio destinations remain intact',()=>{
  assert.equal(sections[0].id,'penthouse');
  assert.equal(sections[0].number,'06');
  assert.equal(sections[0].low,sections[1].high,'The new floor joins About without a gap or overlapping shell');
  assert.deepEqual(sections.slice(1).map(({id,number})=>[id,number]),[
    ['about','01'],['projects','02'],['experience','03'],['resume','04'],['contact','05'],
  ]);
  assert.deepEqual(floorContent.penthouse.rooms.map(room=>room.name),['Bedroom','Play lounge','Listening nook','Sky lounge']);
  assert.equal(floorContent.penthouse.rooms[1].activity,'tic-tac-toe');
});

test('a valid board move produces a house reply while occupied and invalid moves cannot overwrite it',()=>{
  const game=createNoughtsAndCrosses();
  assert.equal(game.move(0),true);
  const state=game.state();
  assert.equal(state.board[0],'X');assert.equal(state.board.filter(mark=>mark==='O').length,1);
  assert.equal(state.board.filter(Boolean).length,2);assert.equal(state.result,null);
  for(const index of [0,-1,9,.5,'1',null,NaN])assert.equal(game.move(index),false);
  assert.deepEqual(game.state(),state);
  state.board.fill('X');assert.notDeepEqual(game.state().board,state.board,'Returned state cannot mutate the live game');
});

test('noughts and crosses resolves a player win, a house win and a draw, then freezes until reset',()=>{
  for(const [outcome,moves]of [['X',[0,8,6,7]],['O',[0,1,3]],['draw',[0,1,6,5,7]]]){
    const game=createNoughtsAndCrosses();
    for(const move of moves)assert.equal(game.move(move),true);
    const state=game.state();assert.equal(state.result,outcome);
    for(let i=0;i<9;i++)assert.equal(game.move(i),false);
    assert.deepEqual(game.state(),state);
    assert.deepEqual(game.reset(),{board:Array(9).fill(null),result:null});
    assert.equal(game.move(4),true,'A reset starts a playable new round');
  }
});

test('the accessible game paints live marks and status, resets cleanly, and disposes its click handler',()=>{
  assert.equal(penthouseGameMarkup('unknown'),'');
  const dom=new JSDOM(`<main>${penthouseGameMarkup('tic-tac-toe')}</main>`),container=dom.window.document.querySelector('main');
  let plays=0;
  const play=createPenthousePlay(container,()=>plays++);
  const cells=[...container.querySelectorAll('[data-game-cell]')],status=container.querySelector('.penthouse-game-status');
  try{
    play.mount();assert.equal(cells.length,9);assert.equal(status.getAttribute('role'),'status');
    assert.ok(cells.every(button=>!button.disabled&&button.getAttribute('aria-label').endsWith('empty')));
    for(const move of [0,1,3])cells[move].click();
    assert.equal(plays,3);assert.ok(cells.every(button=>button.disabled));
    assert.match(status.textContent,/house takes this round/i);
    assert.ok(cells.filter(button=>button.textContent).every(button=>button.getAttribute('aria-label').endsWith(button.textContent)));
    cells[0].click();assert.equal(plays,3);
    container.querySelector('[data-game-reset]').click();
    assert.ok(cells.every(button=>!button.disabled&&!button.textContent));assert.equal(status.textContent,'Your move.');
    cells[4].click();assert.equal(plays,4);
    play.mount();assert.ok(cells.every(button=>!button.textContent),'Entering the room again starts a fresh round');
    play.dispose();cells[0].click();assert.equal(plays,4);assert.ok(cells.every(button=>!button.textContent));
  }finally{play.dispose();dom.window.close();}
});
