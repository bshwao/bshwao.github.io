import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {blackjackTotal,shuffledDeck,dealBlackjack,hitBlackjack,standBlackjack,scoreWordGuess,createWordState,submitWordGuess,crosswordEntries,checkCrossword} from '../assets/penthouse-game-engines.js';
import {WORD_ANSWERS,CROSSWORD_PUZZLES} from '../assets/penthouse-game-puzzles.js';
import {WORD_GUESSES} from '../assets/word-guesses.js';
import {arcadeMarkup,createArcade,ARCADE_GAMES} from '../assets/penthouse-arcade.js';

const cards=(...ranks)=>ranks.map(rank=>({rank:String(rank),suit:'♠'}));
const hand=(player,dealer,deck=[])=>({player:cards(...player),dealer:cards(...dealer),deck:cards(...deck),status:'playing',result:null});

test('Blackjack decks contain 52 unique cards, and aces adjust without losing soft totals',()=>{
  const deck=shuffledDeck(()=>.25);
  assert.equal(deck.length,52);assert.equal(new Set(deck.map(c=>c.rank+c.suit)).size,52);
  assert.deepEqual(blackjackTotal(cards('A','A',9)),{value:21,soft:true});
  assert.deepEqual(blackjackTotal(cards('A','A',9,9)),{value:20,soft:false});
  assert.deepEqual(blackjackTotal(cards('K','Q','J')),{value:30,soft:false});
});

test('Blackjack deals alternating cards and resolves natural wins, dealer blackjack and ties immediately',()=>{
  assert.throws(()=>dealBlackjack(cards(1,2,3)),RangeError);
  for(const [ranks,result]of [[['A',9,'K',8],'blackjack'],[[9,'A',8,'K'],'dealer-blackjack'],[['A','A','K','Q'],'push']]){
    const deck=cards(...ranks),before=structuredClone(deck),state=dealBlackjack(deck);
    assert.equal(state.status,'done');assert.equal(state.result,result);assert.deepEqual(deck,before);
    assert.deepEqual(state.player,[deck[0],deck[2]]);
    assert.equal(hitBlackjack(state),state);assert.equal(standBlackjack(state),state);
  }
});

test('Blackjack hits, busts and dealer draws are immutable, and the dealer stands on soft 17',()=>{
  const original=hand([10,6],[10,6],[6,2]),snapshot=structuredClone(original);
  assert.equal(hitBlackjack(original).result,'bust');assert.deepEqual(original,snapshot);
  const draw=standBlackjack(hand([10,9],[10,6],[2]));assert.equal(draw.result,'win');assert.equal(draw.dealer.length,3);
  const soft=standBlackjack(hand([10,8],['A',6],[10]));assert.equal(soft.dealer.length,2);assert.equal(soft.deck.length,1);
  assert.equal(standBlackjack(hand([10,8],[10,6],[10])).result,'dealer-bust');
  assert.equal(standBlackjack(hand([10,8],[10,8])).result,'push');
  assert.equal(standBlackjack(hand([10,8],[10,9])).result,'lose');
  assert.equal(hitBlackjack(hand([10,5],[10,8],[6])).result,'win');
});

test('Word Guess scores exact matches first and spends each duplicate answer letter only once',()=>{
  assert.deepEqual(scoreWordGuess('APPLE','ALLEY'),['correct','present','absent','present','absent']);
  assert.deepEqual(scoreWordGuess('TABLE','EERIE'),['absent','absent','absent','absent','correct']);
  assert.deepEqual(scoreWordGuess('LEVEL','ELVES'),['present','present','correct','correct','absent']);
  assert.throws(()=>scoreWordGuess('FOUR','FIVES'),RangeError);
});

test('Word Guess validates real words without spending guesses, freezes on completion, and caps attempts at six',()=>{
  assert.ok(WORD_GUESSES.size>10000);assert.equal(new Set(WORD_ANSWERS).size,WORD_ANSWERS.length);
  for(const answer of WORD_ANSWERS)assert.ok(WORD_GUESSES.has(answer.toLowerCase()),answer);
  const initial=createWordState('TABLE'),snapshot=structuredClone(initial);
  for(const bad of ['x','12345','zzzzz']){const next=submitWordGuess(initial,bad);assert.ok(next.error);assert.equal(next.guesses.length,0);}
  let state=submitWordGuess(initial,'cloud');assert.equal(submitWordGuess(state,'cloud').guesses.length,1);
  for(const guess of ['river','ocean','solar','lunar','apple'])state=submitWordGuess(state,guess);
  assert.equal(state.status,'lost');assert.equal(state.guesses.length,6);assert.equal(submitWordGuess(state,'table'),state);
  const won=submitWordGuess(initial,' table ');assert.equal(won.status,'won');assert.equal(submitWordGuess(won,'cloud'),won);
  assert.deepEqual(initial,snapshot);
});

test('Each authored crossword has ten unique clued entries, fully checked intersections and a connected grid',()=>{
  assert.equal(CROSSWORD_PUZZLES.length,3);
  const signatures=new Set();
  for(const puzzle of CROSSWORD_PUZZLES){
    const {cells,entries,numbers}=crosswordEntries(puzzle);signatures.add(cells.join(''));
    assert.equal(entries.length,10);assert.equal(new Set(entries.map(e=>e.answer)).size,10);
    assert.equal(cells.filter(c=>c!=='#').length,17);
    for(const entry of entries){assert.ok(entry.clue);assert.equal(numbers.get(entry.indices[0]),entry.number);}
    cells.forEach((c,i)=>{if(c!=='#'){const crossing=entries.filter(e=>e.indices.includes(i));assert.equal(crossing.length,2);assert.deepEqual(new Set(crossing.map(e=>e.direction)),new Set(['across','down']));}});
    const visited=new Set([cells.findIndex(c=>c!=='#')]);let previous=0;
    while(previous!==visited.size){previous=visited.size;for(const i of [...visited])for(const n of [i-5,i+5,...(i%5?[i-1]:[]),...(i%5<4?[i+1]:[])])if(cells[n]&&cells[n]!=='#')visited.add(n);}
    assert.equal(visited.size,17);
    const values=cells.map(c=>c==='#'?'':c.toLowerCase());assert.equal(checkCrossword(puzzle,values).complete,true);
    values[0]='Z';values[1]='';const feedback=checkCrossword(puzzle,values);
    assert.deepEqual(feedback.wrong,[0]);assert.deepEqual(feedback.empty,[1]);assert.equal(feedback.complete,false);
  }
  assert.equal(signatures.size,3);
});

function fixture(){
  const dom=new JSDOM(`<dialog open>${arcadeMarkup()}</dialog>`,{pretendToBeVisual:true}),w=dom.window,root=w.document.querySelector('.penthouse-arcade');
  let tick=null;
  w.setInterval=callback=>{tick=callback;return 1;};w.clearInterval=()=>tick=null;
  const arcade=createArcade(root,{random:()=>0}),find=selector=>root.querySelector(selector),click=selector=>find(selector).click();
  const input=(index,value)=>{const node=find(`[data-cross-index="${index}"]`);node.value=value;node.dispatchEvent(new w.Event('input',{bubbles:true}));};
  const key=(selector,value)=>find(selector).dispatchEvent(new w.KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true}));
  return {w,root,arcade,find,click,input,key,tick:()=>tick,close(){arcade.dispose();dom.window.close();}};
}

test('The dashboard exposes seven games, accessible tabs and state that survives switching and returning to the library',()=>{
  const f=fixture();try{
    assert.equal(f.root.dataset.view,'dashboard');assert.equal(f.root.querySelectorAll('[data-arcade-launch]').length,7);
    assert.equal(f.find('[data-game-workspace]').hidden,true);
    for(const game of ARCADE_GAMES){f.click(`[data-arcade-launch="${game.id}"]`);assert.equal(f.find(`[data-arcade-panel="${game.id}"]`).hidden,false);assert.equal(f.root.querySelectorAll('[data-arcade-panel]:not([hidden])').length,1);}
    f.click('[data-game-cell="0"]');const tic=f.arcade.state().tic;
    f.click('[data-arcade-overview]');f.click('[data-arcade-launch="wordle"]');
    for(const key of 'CLOUD')f.key('[data-word-board]',key);f.key('[data-word-board]','Enter');
    const word=f.arcade.state().word;assert.equal(word.guesses.length,1);
    f.click('[data-arcade-tab="tic-tac-toe"]');assert.deepEqual(f.arcade.state().tic,tic);
    f.click('[data-arcade-tab="wordle"]');assert.deepEqual(f.arcade.state().word,word);
    f.click('[data-word-new]');assert.notEqual(f.arcade.state().word.answer,word.answer);assert.equal(f.arcade.state().word.guesses.length,0);
    f.key('[data-arcade-tab="wordle"]','End');assert.equal(f.arcade.state().active,'tic-tac-toe');
    assert.equal(f.w.document.activeElement,f.find('[data-arcade-tab="tic-tac-toe"]'));
  }finally{f.close();}
});

test('Blackjack conceals the dealer hole card until the hand ends and counts each result once',()=>{
  const f=fixture();try{
    f.arcade.select('blackjack');f.click('[data-blackjack-deal]');
    assert.equal(f.find('[data-blackjack-dealer] [aria-label="Face-down card"]').textContent,'✦');
    assert.equal(f.find('[data-blackjack-dealer-total]').textContent,'?');assert.equal(f.find('[data-blackjack-deal]').disabled,true);
    f.click('[data-blackjack-stand]');const after=f.arcade.state();
    assert.equal(after.hand.status,'done');assert.equal(after.record.hands,1);assert.equal(f.find('.card-back'),null);
    f.click('[data-blackjack-stand]');assert.equal(f.arcade.state().record.hands,1);
    f.arcade.overview();f.arcade.select('blackjack');assert.deepEqual(f.arcade.state().hand,after.hand);
  }finally{f.close();}
});

test('Word Guess on-screen controls validate entries and show duplicate-aware feedback without losing stronger keyboard marks',()=>{
  const f=fixture();try{
    f.arcade.select('wordle');
    const type=word=>{for(const key of word)f.click(`[data-word-key="${key}"]`);f.click('[data-word-key="!"]');};
    type('ZZZZZ');assert.match(f.find('[data-word-status]').textContent,/dictionary/);assert.equal(f.arcade.state().word.guesses.length,0);
    for(let i=0;i<5;i++)f.click('[data-word-key="?"]');
    type('APPLE');assert.equal(f.arcade.state().word.guesses.length,1);assert.equal(f.find('[data-word-key="E"]').dataset.mark,'correct');
    type('RIVER');assert.equal(f.find('[data-word-key="E"]').dataset.mark,'correct');
    type('TABLE');assert.equal(f.arcade.state().word.status,'won');
    assert.match(f.find('[data-word-status]').textContent,/Solved/);assert.equal(f.find('[data-word-cell="10"]').getAttribute('aria-label'),'Row 3, column 1: T, correct place');
    f.click('[data-word-key="A"]');assert.equal(f.arcade.state().draft,'');
  }finally{f.close();}
});

test('Crossword editing shares intersection letters, supports keyboard direction, feedback, reveal, reset and all three puzzles',()=>{
  const f=fixture();try{
    f.arcade.select('crossword');f.input(0,'f');assert.equal(f.find('[data-cross-index="0"]').value,'F');
    assert.equal(f.w.document.activeElement,f.find('[data-cross-index="1"]'));
    f.key('[data-cross-index="1"]','Enter');assert.match(f.find('[data-cross-current]').textContent,/Down/);
    f.key('[data-cross-index="1"]','ArrowDown');assert.equal(f.w.document.activeElement,f.find('[data-cross-index="6"]'));
    f.input(6,'Z');f.click('[data-cross-check]');assert.equal(f.find('[data-cross-index="6"]').getAttribute('aria-invalid'),'true');
    f.click('[data-cross-index="6"]');f.click('[data-cross-reveal]');assert.equal(f.find('[data-cross-index="6"]').value,'A');
    assert.equal(f.find('[data-cross-index="6"]').getAttribute('aria-invalid'),'false');
    f.click('[data-arcade-tab="blackjack"]');f.click('[data-arcade-tab="crossword"]');assert.equal(f.find('[data-cross-index="6"]').value,'A');
    const cells=CROSSWORD_PUZZLES[0].rows.join('');[...cells].forEach((c,i)=>{if(c!=='#')f.input(i,c);});
    assert.match(f.find('[data-cross-status]').textContent,/Puzzle complete/);
    f.click('[data-cross-reset]');assert.ok(f.arcade.state().crossValues.every(c=>!c));
    for(const edition of [2,3,1]){f.click('[data-cross-new]');assert.equal(f.find('[data-cross-edition]').textContent,`Mini ${edition} / 3`);}
  }finally{f.close();}
});

test('Leaving Snake via overview, Escape, dialog close or deactivation cancels its timer without resetting other games',()=>{
  const f=fixture();try{
    for(const exit of ['overview','cancel','close','inactive']){
      f.arcade.setActive(true);f.arcade.select('snake');f.click('[data-snake-toggle]');assert.equal(typeof f.tick(),'function');
      if(exit==='overview')f.arcade.overview();
      else if(exit==='inactive')f.arcade.setActive(false);
      else f.root.closest('dialog').dispatchEvent(new f.w.Event(exit,{cancelable:true}));
      assert.equal(f.tick(),null);assert.equal(f.arcade.state().snake.status,'paused');
    }
    f.arcade.setActive(true);f.arcade.select('wordle');f.arcade.dispose();const before=f.arcade.state();
    f.click('[data-word-key="A"]');f.click('[data-arcade-tab="blackjack"]');assert.deepEqual(f.arcade.state(),before);
  }finally{f.close();}
});
