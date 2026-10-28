import {classicPanels,createSnakeState,turnSnake,stepSnake,create2048State,move2048,createSudokuPuzzle,sudokuConflicts,sudokuComplete} from './arcade-classics.js';
import {blackjackTotal,shuffledDeck,dealBlackjack,hitBlackjack,standBlackjack,createWordState,submitWordGuess,crosswordEntries,checkCrossword} from './penthouse-game-engines.js';
import {WORD_ANSWERS,CROSSWORD_PUZZLES} from './penthouse-game-puzzles.js';
import {createNoughtsAndCrosses} from './penthouse-play.js';

export const ARCADE_GAMES=Object.freeze([
  {id:'blackjack',name:'Blackjack',category:'Cards',rule:'Practice hands · aim for 21',color:'green'},
  {id:'wordle',name:'Word Guess',category:'Wordle-style',rule:'5 letters · 6 guesses',color:'sage'},
  {id:'crossword',name:'Mini Crosswords',category:'Words',rule:'Across & down · 3 puzzles',color:'blue'},
  {id:'snake',name:'Snake',category:'Arcade',rule:'Collect apples · avoid your tail',color:'green'},
  {id:'2048',name:'2048',category:'Numbers',rule:'Slide tiles · reach 2048',color:'amber'},
  {id:'sudoku',name:'Sudoku',category:'Logic',rule:'Fill each row, column & box',color:'rose'},
  {id:'tic-tac-toe',name:'Noughts & crosses',category:'Strategy',rule:'Three in a row · play the computer',color:'plum'},
]);
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let instance=0;
function preview(game){
  if(game==='blackjack')return '<span class="preview-card">A<small>♠</small></span><span class="preview-card is-red">K<small>♥</small></span>';
  if(game==='wordle')return [...'GUESS'].map((c,i)=>`<span class="preview-letter tone-${i%3}">${c}</span>`).join('');
  if(game==='crossword')return Array.from({length:25},(_,i)=>`<span class="preview-square${[3,4,8,9,15,16,20,21].includes(i)?' is-block':''}">${[0,2,5,10,12,17,22].includes(i)?i%8+1:''}</span>`).join('');
  if(game==='snake')return '<svg viewBox="0 0 160 65" aria-hidden="true"><path d="M28 45h42V20h39v25h25" fill="none" stroke="currentColor" stroke-width="13" stroke-linejoin="round"/><circle cx="136" cy="18" r="7" fill="#b66243"/><circle cx="30" cy="42" r="1.5" fill="#f4f0e5"/></svg>';
  if(game==='2048')return [2,4,8,16].map((n,i)=>`<span class="preview-number number-${i}">${n}</span>`).join('');
  if(game==='sudoku')return [1,'',3,'',5,'',7,'',9].map(n=>`<span class="preview-digit">${n}</span>`).join('');
  return ['X','','O','','X','','O','','X'].map(c=>`<span class="preview-mark">${c}</span>`).join('');
}
function extraPanel(id,game,html){return `<section class="arcade-panel" id="${id}-${game}" role="tabpanel" aria-labelledby="${id}-tab-${game}" data-arcade-panel="${game}" hidden>${html}</section>`;}

export function arcadeMarkup(){
  const id=`penthouse-arcade-${++instance}`;
  const heading=(name,score)=>`<div class="arcade-game-heading"><h3>${name}</h3>${score||''}</div>`;
  return `<section class="penthouse-arcade" aria-label="Games dashboard" data-view="dashboard">
    <div class="game-lobby" data-game-lobby><div class="game-library-heading"><div><span class="game-eyebrow">PLAY ROOM</span><h3>Choose a game</h3></div><span class="game-count">7 games</span></div>
      <div class="game-catalog">${ARCADE_GAMES.map(game=>`<button type="button" class="game-card color-${game.color}" data-arcade-launch="${game.id}" aria-label="Play ${escape(game.name)}"><span class="game-card-top"><span class="game-category">${game.category}</span><span aria-hidden="true">↗</span></span><span class="game-preview preview-${game.id}" aria-hidden="true">${preview(game.id)}</span><strong>${escape(game.name)}</strong><span class="game-rule">${escape(game.rule)}</span><span class="game-progress" data-game-progress="${game.id}">Ready</span></button>`).join('')}</div>
    </div>
    <div class="game-workspace" data-game-workspace hidden>
      <div class="game-toolbar"><button type="button" data-arcade-overview>← All games</button><label class="game-switch" for="${id}-switch">Game<select id="${id}-switch" data-game-switch>${ARCADE_GAMES.map(g=>`<option value="${g.id}">${escape(g.name)}</option>`).join('')}</select></label><span class="game-session-note">Progress stays while you switch games</span></div>
      <div class="game-workspace-layout"><nav class="arcade-tabs" role="tablist" aria-label="Choose a game" aria-orientation="vertical">${ARCADE_GAMES.map(game=>`<button type="button" role="tab" id="${id}-tab-${game.id}" aria-controls="${id}-${game.id}" aria-selected="false" tabindex="-1" data-arcade-tab="${game.id}">${escape(game.name)}</button>`).join('')}</nav><div class="game-stage">
      ${classicPanels(id)}
      ${extraPanel(id,'blackjack',heading('Blackjack','<p class="arcade-score">Hands won<strong data-blackjack-score>0 / 0</strong></p>')+`<p class="arcade-instructions">Get closer to 21 than the dealer without going over. Aces count as 1 or 11. The dealer stands on all 17s. Practice hands, without wagers.</p><div class="blackjack-table"><div class="blackjack-hand-heading"><h4>Dealer</h4><span data-blackjack-dealer-total>—</span></div><div class="blackjack-cards" data-blackjack-dealer role="group" aria-label="Dealer cards"></div><div class="blackjack-table-line"></div><div class="blackjack-hand-heading"><h4>Your hand</h4><span data-blackjack-player-total>—</span></div><div class="blackjack-cards" data-blackjack-player role="group" aria-label="Your cards"></div></div><div class="arcade-game-controls"><button type="button" class="arcade-primary" data-blackjack-deal>Deal hand</button><button type="button" data-blackjack-hit disabled>Hit</button><button type="button" data-blackjack-stand disabled>Stand</button></div><p class="arcade-status" data-blackjack-status role="status" aria-live="polite">Deal a hand to begin.</p>`)}
      ${extraPanel(id,'wordle',heading('Word Guess','<p class="arcade-score">Guesses<strong data-word-score>0 / 6</strong></p>')+`<p class="arcade-instructions">Find the five-letter word in six guesses. Green: correct place. Gold: different place. Gray: not in the word. Use your keyboard or the letter buttons.</p><div class="word-play-area"><div class="word-grid-area"><div class="word-board" data-word-board tabindex="0" role="group" aria-label="Word Guess board, six rows of five letters"></div><p class="arcade-status word-status" data-word-status role="status" aria-live="polite">Enter a five-letter word.</p></div><div class="word-input-area"><div class="word-keyboard" role="group" aria-label="Letter keyboard">${['QWERTYUIOP','ASDFGHJKL','!ZXCVBNM?'].map(row=>`<div class="word-key-row">${[...row].map(key=>`<button type="button" data-word-key="${key}"${key==='!'||key==='?'?' class="word-wide-key"':''} aria-label="${key==='!'?'Submit guess':key==='?'?'Delete letter':key}">${key==='!'?'Enter':key==='?'?'⌫':key}</button>`).join('')}</div>`).join('')}</div><div class="arcade-game-controls"><button type="button" data-word-new>New word</button></div></div></div>`)}
      ${extraPanel(id,'crossword',heading('Mini Crosswords','<p class="arcade-score">Letters<strong data-cross-score>0 / 17</strong></p>')+`<p class="arcade-instructions">Select a clue or square, then type. Arrow keys move; Enter switches Across/Down. Use Check to mark incorrect letters.</p><div class="crossword-layout"><div><p class="cross-current" id="${id}-cross-current" data-cross-current></p><div class="crossword-board" data-cross-board role="group" aria-label="Mini crossword grid"></div><div class="arcade-game-controls"><button type="button" data-cross-direction>Switch direction</button><button type="button" class="arcade-primary" data-cross-check>Check</button><button type="button" data-cross-reveal>Reveal letter</button></div></div><div class="crossword-clues" data-cross-clues></div></div><p class="arcade-status" data-cross-status role="status" aria-live="polite"></p><div class="arcade-game-controls"><button type="button" data-cross-reset>Clear entries</button><button type="button" data-cross-new>Next puzzle</button><span class="cross-edition" data-cross-edition></span></div>`)}
      ${extraPanel(id,'tic-tac-toe',heading('Noughts &amp; crosses')+`<p class="arcade-instructions">You play X; the computer plays O. Complete a row, column, or diagonal.</p><div class="penthouse-game"><div class="penthouse-game-board" role="group" aria-label="Noughts and crosses board">${Array.from({length:9},(_,i)=>`<button type="button" data-game-cell="${i}" aria-label="Row ${Math.floor(i/3)+1}, column ${i%3+1}, empty"></button>`).join('')}</div><p class="penthouse-game-status arcade-status" role="status" aria-live="polite">Your move.</p><button type="button" data-game-reset>New game</button></div>`)}
      </div></div>
    </div>
  </section>`;
}

export function createArcade(container,{onPlay=()=>{},random=Math.random}={}){
  const root=container.matches?.('.penthouse-arcade')?container:container.querySelector('.penthouse-arcade');
  if(!root)throw new Error('Insert arcadeMarkup() before creating the dashboard.');
  const doc=root.ownerDocument,win=doc.defaultView,events=new win.AbortController(),signal=events.signal;
  const $=selector=>root.querySelector(selector),$$=selector=>[...root.querySelectorAll(selector)];
  let enabled=true,disposed=false,inGame=false,active='blackjack',timer=null,pointer=null;
  let snake=createSnakeState({random}),tiles=create2048State(random),puzzle=createSudokuPuzzle(random),sudoku=[...puzzle.clues];
  let hand=null,record={wins:0,losses:0,pushes:0,hands:0};
  let wordIndex=Math.floor(random()*WORD_ANSWERS.length)%WORD_ANSWERS.length,word=createWordState(WORD_ANSWERS[wordIndex]),draft='';
  let crossIndex=0,cross=crosswordEntries(CROSSWORD_PUZZLES[0]),crossValues=Array(25).fill(''),crossSelected=0,crossDirection='across',crossErrors=new Set(),crossRevealed=new Set();
  const tic=createNoughtsAndCrosses();
  const listen=(node,name,fn)=>node.addEventListener(name,fn,{signal});
  const announce=(game,message)=>{const node=$(`[data-${game}-status]`);if(node.textContent!==message)node.textContent=message;};
  const stopTimer=()=>{if(timer!==null){win.clearInterval(timer);timer=null;}};
  const validGame=game=>ARCADE_GAMES.some(item=>item.id===game);
  const hasWord=()=>cross.entries.find(entry=>entry.direction===crossDirection&&entry.indices.includes(crossSelected))||cross.entries.find(entry=>entry.indices.includes(crossSelected));
  function paintCards(){
    const finished=checkCrossword(CROSSWORD_PUZZLES[crossIndex],crossValues),t=tic.state();
    const summary={snake:snake.status==='ready'?'Ready':`${snake.score} ${snake.score===1?'apple':'apples'} · ${snake.status}`,2048:`${tiles.score} points${tiles.over?' · finished':''}`,sudoku:`${sudoku.filter(Boolean).length} / 81 filled`,blackjack:hand?`${record.wins} ${record.wins===1?'win':'wins'} · ${record.hands} ${record.hands===1?'hand':'hands'}`:'Ready',wordle:word.status==='won'?'Solved':word.status==='lost'?'Finished':word.guesses.length?`${word.guesses.length} / 6 guesses`:'Ready',crossword:finished.complete?'Solved':`${crossValues.filter(Boolean).length} / 17 letters`,'tic-tac-toe':t.result?t.result==='draw'?'Draw':t.result==='X'?'You won':'Computer won':t.board.some(Boolean)?'In progress':'Ready'};
    for(const node of $$('[data-game-progress]'))node.textContent=summary[node.dataset.gameProgress];
  }
  function paintSnake(){
    const occupied=new Map(snake.body.map((p,i)=>[p.y*snake.size+p.x,i?'body':'head'])),apple=snake.food?snake.food.y*snake.size+snake.food.x:-1;
    [...$('[data-snake-board]').children].forEach((cell,i)=>cell.dataset.cell=i===apple?'food':occupied.get(i)||'');
    $('[data-snake-score]').textContent=snake.score;
    $('[data-snake-toggle]').textContent=snake.status==='running'?'Pause':snake.status==='paused'?'Resume':['over','won'].includes(snake.status)?'Play again':'Start';
    $('[data-snake-board]').setAttribute('aria-label',`Snake board. ${snake.score} apples. ${snake.status}.`);paintCards();
  }
  function pauseSnake(message='Paused. Press Resume to continue.'){
    stopTimer();if(snake.status==='running'){snake={...snake,status:'paused'};paintSnake();announce('snake',message);}
  }
  function startSnake(){
    if(!enabled||disposed||!inGame||active!=='snake')return;
    if(['over','won'].includes(snake.status))snake=createSnakeState({random});
    snake={...snake,status:'running'};stopTimer();paintSnake();announce('snake','Running.');onPlay();
    timer=win.setInterval(()=>{
      const dialog=root.closest('dialog');
      if(!enabled||disposed||!inGame||active!=='snake'||doc.hidden||!root.isConnected||(dialog&&!dialog.open)){pauseSnake();return;}
      snake=stepSnake(snake,random);paintSnake();
      if(['over','won'].includes(snake.status)){stopTimer();announce('snake',snake.status==='won'?'Board complete. You win!':`Game over. ${snake.score} apples collected.`);}
    },145);
  }
  function paint2048(){
    [...$('[data-2048-board]').children].forEach((cell,i)=>{const value=tiles.board[i];cell.textContent=value||'';cell.dataset.value=value||'';cell.dataset.level=value?Math.min(11,Math.log2(value)):0;cell.setAttribute('aria-label',`Row ${Math.floor(i/4)+1}, column ${i%4+1}: ${value||'empty'}`);});
    $('[data-2048-score]').textContent=tiles.score;paintCards();
  }
  function play2048(direction){
    const previous=tiles;tiles=move2048(tiles,direction,random);paint2048();
    announce('2048',tiles.over?'No moves left.':!previous.won&&tiles.won?'2048 reached. You can continue playing.':tiles.moved?`${tiles.score} points. Largest tile: ${Math.max(...tiles.board)}.`:'No tiles moved.');
    if(tiles.moved)onPlay();
  }
  function paintSudoku(){
    const conflicts=sudokuConflicts(sudoku);
    $$('[data-sudoku-cell]').forEach((input,i)=>{input.value=sudoku[i]||'';input.readOnly=Boolean(puzzle.clues[i]);input.tabIndex=puzzle.clues[i]?-1:0;input.dataset.fixed=Boolean(puzzle.clues[i]);input.dataset.conflict=conflicts.has(i);input.setAttribute('aria-invalid',String(conflicts.has(i)));input.setAttribute('aria-label',`Row ${Math.floor(i/9)+1}, column ${i%9+1}${puzzle.clues[i]?`, fixed clue ${puzzle.clues[i]}`:''}${conflicts.has(i)?', conflict':''}`);});
    $('[data-sudoku-score]').textContent=`${sudoku.filter(Boolean).length} / 81`;paintCards();return conflicts;
  }
  function cardMarkup(card,hidden=false){
    if(hidden)return '<span class="playing-card card-back" role="img" aria-label="Face-down card"><span aria-hidden="true">✦</span></span>';
    const suit={'♠':'spades','♥':'hearts','♦':'diamonds','♣':'clubs'}[card.suit],rank={A:'Ace',J:'Jack',Q:'Queen',K:'King'}[card.rank]||card.rank;
    return `<span class="playing-card${['♥','♦'].includes(card.suit)?' is-red':''}" role="img" aria-label="${rank} of ${suit}"><span aria-hidden="true">${card.rank}<small>${card.suit}</small></span><b aria-hidden="true">${card.suit}</b></span>`;
  }
  function paintBlackjack(){
    $('[data-blackjack-player]').innerHTML=hand?hand.player.map(c=>cardMarkup(c)).join(''):'<span class="card-placeholder" aria-hidden="true"></span>';
    $('[data-blackjack-dealer]').innerHTML=hand?hand.dealer.map((c,i)=>cardMarkup(c,hand.status==='playing'&&i===1)).join(''):'<span class="card-placeholder" aria-hidden="true"></span>';
    $('[data-blackjack-player-total]').textContent=hand?blackjackTotal(hand.player).value:'—';
    $('[data-blackjack-dealer-total]').textContent=!hand?'—':hand.status==='playing'?'?':blackjackTotal(hand.dealer).value;
    $('[data-blackjack-deal]').disabled=hand?.status==='playing';$('[data-blackjack-deal]').textContent=hand?'Deal again':'Deal hand';
    for(const action of ['hit','stand'])$(`[data-blackjack-${action}]`).disabled=hand?.status!=='playing';
    $('[data-blackjack-score]').textContent=`${record.wins} / ${record.hands}`;
    if(hand)announce('blackjack',hand.status==='playing'?'Hit for another card, or Stand.':({blackjack:'Blackjack. You win.','dealer-blackjack':'Dealer has blackjack.',bust:'You went over 21. Dealer wins.','dealer-bust':'Dealer went over 21. You win.',win:'You win.',lose:'Dealer wins.',push:'Push. The hand is tied.'})[hand.result]);
    paintCards();
  }
  function applyHand(next,isNew=false){
    if(next.status==='done'&&(isNew||hand?.status!=='done')){record.hands++;if(['blackjack','dealer-bust','win'].includes(next.result))record.wins++;else if(next.result==='push')record.pushes++;else record.losses++;}
    hand=next;paintBlackjack();onPlay();
  }
  function paintWord(){
    const priorities={absent:1,present:2,correct:3},keys={};
    word.guesses.forEach((guess,row)=>[...guess].forEach((letter,col)=>{const mark=word.marks[row][col];if((priorities[mark]||0)>(priorities[keys[letter]]||0))keys[letter]=mark;}));
    $('[data-word-board]').innerHTML=Array.from({length:30},(_,i)=>{const row=Math.floor(i/5),col=i%5,letter=word.guesses[row]?.[col]||(row===word.guesses.length?draft[col]:'')||'',mark=word.marks[row]?.[col]||'';return `<span class="word-cell" role="img" data-word-cell="${i}" data-mark="${mark}" aria-label="Row ${row+1}, column ${col+1}: ${letter||'empty'}${mark?', '+{correct:'correct place',present:'different place',absent:'not in the word'}[mark]:''}">${letter}</span>`;}).join('');
    $$('[data-word-key]').forEach(key=>{const mark=keys[key.dataset.wordKey]||'';key.dataset.mark=mark;if(/^[A-Z]$/.test(key.dataset.wordKey))key.setAttribute('aria-label',key.dataset.wordKey+(mark?', '+{correct:'correct place',present:'in the word',absent:'not in the word'}[mark]:''));});
    $('[data-word-score]').textContent=`${word.guesses.length} / 6`;
    announce('word',word.error||(word.status==='won'?`Solved in ${word.guesses.length} ${word.guesses.length===1?'guess':'guesses'}.`:word.status==='lost'?`The word was ${word.answer}.`:word.guesses.length?`${word.guesses.length} of 6 guesses used.`:'Enter a five-letter word.'));paintCards();
  }
  function wordKey(key){
    if(word.status!=='playing')return;
    if(key==='!'){const previous=word.guesses.length;word=submitWordGuess(word,draft);if(word.guesses.length>previous){draft='';onPlay();}}
    else if(key==='?'){draft=draft.slice(0,-1);word={...word,error:''};}
    else if(/^[A-Z]$/.test(key)&&draft.length<5){draft+=key;word={...word,error:''};}
    paintWord();
  }
  function buildCross(){
    cross=crosswordEntries(CROSSWORD_PUZZLES[crossIndex]);crossValues=Array(25).fill('');crossSelected=cross.cells.findIndex(c=>c!=='#');crossDirection='across';crossErrors.clear();crossRevealed.clear();
    const hint=$('[data-cross-current]').id;
    $('[data-cross-board]').innerHTML=cross.cells.map((c,i)=>c==='#'?'<span class="cross-block" aria-hidden="true"></span>':`<label class="cross-cell"><span class="cross-number" aria-hidden="true">${cross.numbers.get(i)||''}</span><input type="text" maxlength="1" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" data-cross-index="${i}" aria-describedby="${hint}" aria-label="Row ${Math.floor(i/5)+1}, column ${i%5+1}"></label>`).join('');
    $('[data-cross-clues]').innerHTML=['across','down'].map(direction=>`<section><h4>${direction==='across'?'Across':'Down'}</h4><ol>${cross.entries.filter(e=>e.direction===direction).map(e=>`<li><button type="button" data-cross-clue="${e.id}"><b>${e.number}</b><span>${escape(e.clue)}</span></button></li>`).join('')}</ol></section>`).join('');
    $('[data-cross-edition]').textContent=`Mini ${crossIndex+1} / ${CROSSWORD_PUZZLES.length}`;paintCross();announce('cross','Select a square or clue.');
  }
  function paintCross(){
    const entry=hasWord();if(!entry)return;crossDirection=entry.direction;
    $('[data-cross-current]').textContent=`${entry.number} ${entry.direction==='across'?'Across':'Down'} · ${entry.clue}`;
    $$('[data-cross-index]').forEach(input=>{const i=Number(input.dataset.crossIndex);input.value=crossValues[i];input.tabIndex=i===crossSelected?0:-1;input.parentElement.dataset.selected=String(i===crossSelected);input.parentElement.dataset.active=String(entry.indices.includes(i));input.parentElement.dataset.revealed=String(crossRevealed.has(i));input.setAttribute('aria-invalid',String(crossErrors.has(i)));});
    $$('[data-cross-clue]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.crossClue===entry.id)));
    $('[data-cross-score]').textContent=`${crossValues.filter(Boolean).length} / 17`;
    if(checkCrossword(CROSSWORD_PUZZLES[crossIndex],crossValues).complete)announce('cross','Puzzle complete.');paintCards();
  }
  function selectCross(index,focus=false){if(cross.cells[index]==null||cross.cells[index]==='#')return;crossSelected=index;paintCross();if(focus)$(`[data-cross-index="${index}"]`).focus();}
  function advanceCross(step=1){const entry=hasWord(),at=entry.indices.indexOf(crossSelected),next=entry.indices[at+step];if(next!==undefined)selectCross(next,true);}
  function paintTic(){
    const {board,result}=tic.state();$$('[data-game-cell]').forEach(button=>{const i=Number(button.dataset.gameCell),mark=board[i];button.textContent=mark||'';button.disabled=Boolean(result||mark);button.dataset.mark=mark||'';button.setAttribute('aria-label',`Row ${Math.floor(i/3)+1}, column ${i%3+1}, ${mark||'empty'}`);});
    $('.penthouse-game-status').textContent=result==='X'?'You win.':result==='O'?'Computer wins.':result==='draw'?'Draw.':'Your move.';paintCards();
  }
  function select(game,focus=true){
    if(!validGame(game)||disposed||!enabled)return;
    pauseSnake();pointer=null;active=game;inGame=true;root.dataset.view='game';root.dataset.game=game;
    $('[data-game-lobby]').hidden=true;$('[data-game-workspace]').hidden=false;$('[data-game-switch]').value=game;
    $$('[data-arcade-tab]').forEach(tab=>{tab.setAttribute('aria-selected',String(tab.dataset.arcadeTab===game));tab.tabIndex=tab.dataset.arcadeTab===game?0:-1;});
    $$('[data-arcade-panel]').forEach(panel=>panel.hidden=panel.dataset.arcadePanel!==game);
    if(focus){const target=game==='wordle'?$('[data-word-board]'):game==='crossword'?$(`[data-cross-index="${crossSelected}"]`):game==='snake'?$('[data-snake-board]'):game==='2048'?$('[data-2048-board]'):$(`[data-arcade-panel="${game}"] button:not(:disabled),[data-arcade-panel="${game}"] input:not([readonly])`);target?.focus({preventScroll:true});}
  }
  function overview(focus=true){pauseSnake();inGame=false;root.dataset.view='dashboard';root.dataset.game='';$('[data-game-workspace]').hidden=true;$('[data-game-lobby]').hidden=false;paintCards();if(focus)$(`[data-arcade-launch="${active}"]`)?.focus({preventScroll:true});}
  listen(root,'click',event=>{
    if(!enabled||disposed)return;
    const launch=event.target.closest('[data-arcade-launch]'),tab=event.target.closest('[data-arcade-tab]');
    if(launch||tab){select((launch||tab).dataset[launch?'arcadeLaunch':'arcadeTab'],!tab);return;}
    if(event.target.closest('[data-arcade-overview]')){overview();return;}
    if(!inGame)return;
    const button=event.target.closest('button'),cell=event.target.closest('[data-cross-index]');
    if(active==='crossword'&&cell){selectCross(Number(cell.dataset.crossIndex));return;}
    if(!button)return;
    const has=name=>button.hasAttribute('data-'+name);
    if(active==='snake'){
      if(has('snake-toggle'))snake.status==='running'?pauseSnake():startSnake();
      if(has('snake-reset')){stopTimer();snake=createSnakeState({random});paintSnake();announce('snake','Press Start.');}
      if(has('snake-direction'))snake=turnSnake(snake,button.dataset.snakeDirection);
    }else if(active==='2048'){
      if(has('2048-direction'))play2048(button.dataset['2048Direction']);
      if(has('2048-reset')){tiles=create2048State(random);paint2048();announce('2048','Pick a direction to begin.');}
    }else if(active==='sudoku'){
      if(has('sudoku-check')){const result=paintSudoku(),wrong=sudoku.some((v,i)=>v&&v!==puzzle.solution[i]);announce('sudoku',sudokuComplete(sudoku)?'Puzzle complete.':result.size?`${result.size} cells conflict.`:wrong?'Some entered numbers are incorrect.':`All entered numbers are correct. ${sudoku.filter(v=>!v).length} squares to go.`);}
      if(has('sudoku-new')){puzzle=createSudokuPuzzle(random);sudoku=[...puzzle.clues];paintSudoku();announce('sudoku','Puzzle ready.');}
      if(has('sudoku-reset')){sudoku=[...puzzle.clues];paintSudoku();announce('sudoku','Entries cleared.');}
    }else if(active==='blackjack'){
      if(has('blackjack-deal')&&hand?.status!=='playing')applyHand(dealBlackjack(shuffledDeck(random)),true);
      if(has('blackjack-hit')&&hand)applyHand(hitBlackjack(hand));
      if(has('blackjack-stand')&&hand)applyHand(standBlackjack(hand));
    }else if(active==='wordle'){
      if(has('word-key'))wordKey(button.dataset.wordKey);
      if(has('word-new')){wordIndex=(wordIndex+1+Math.floor(random()*(WORD_ANSWERS.length-1)))%WORD_ANSWERS.length;word=createWordState(WORD_ANSWERS[wordIndex]);draft='';paintWord();$('[data-word-board]').focus();}
    }else if(active==='crossword'){
      const entry=cross.entries.find(e=>e.id===button.dataset.crossClue);
      if(entry){crossDirection=entry.direction;selectCross(entry.indices.find(i=>!crossValues[i])??entry.indices[0],true);}
      if(has('cross-direction')){crossDirection=crossDirection==='across'?'down':'across';paintCross();}
      if(has('cross-check')){const result=checkCrossword(CROSSWORD_PUZZLES[crossIndex],crossValues);crossErrors=new Set(result.wrong);paintCross();const empty=`${result.empty.length} empty ${result.empty.length===1?'square':'squares'}.`;announce('cross',result.complete?'Puzzle complete.':result.wrong.length?`${result.wrong.length} incorrect ${result.wrong.length===1?'letter':'letters'}. ${empty}`:`Entered letters are correct. ${empty}`);}
      if(has('cross-reveal')){crossValues[crossSelected]=cross.cells[crossSelected];crossErrors.delete(crossSelected);crossRevealed.add(crossSelected);paintCross();onPlay();}
      if(has('cross-reset'))buildCross();
      if(has('cross-new')){crossIndex=(crossIndex+1)%CROSSWORD_PUZZLES.length;buildCross();}
    }else if(active==='tic-tac-toe'){
      if(has('game-cell')&&tic.move(Number(button.dataset.gameCell))){paintTic();onPlay();}
      if(has('game-reset')){tic.reset();paintTic();}
    }
  });
  listen(root,'change',event=>{if(enabled&&event.target.matches('[data-game-switch]'))select(event.target.value);});
  listen(root,'input',event=>{
    if(!enabled||!inGame)return;
    if(active==='sudoku'&&event.target.matches('[data-sudoku-cell]')){const i=Number(event.target.dataset.sudokuCell);if(puzzle.clues[i]){paintSudoku();return;}const value=event.target.value.replace(/[^1-9]/g,'');sudoku[i]=value?Number(value.at(-1)):0;const conflicts=paintSudoku();announce('sudoku',sudokuComplete(sudoku)?'Puzzle complete.':conflicts.size?`${conflicts.size} cells conflict.`:'No conflicts so far.');onPlay();}
    if(active==='crossword'&&event.target.matches('[data-cross-index]')){const i=Number(event.target.dataset.crossIndex),value=event.target.value.toUpperCase().replace(/[^A-Z]/g,'').at(-1)||'';crossSelected=i;crossValues[i]=value;crossErrors.delete(i);paintCross();if(value)advanceCross();onPlay();}
  });
  listen(root,'focusin',event=>{if(enabled&&inGame&&active==='crossword'&&event.target.matches('[data-cross-index]'))selectCross(Number(event.target.dataset.crossIndex));});
  listen(root,'keydown',event=>{
    if(!enabled||!inGame||event.ctrlKey||event.altKey||event.metaKey)return;
    const tab=event.target.closest('[data-arcade-tab]');
    if(tab){const i=ARCADE_GAMES.findIndex(g=>g.id===tab.dataset.arcadeTab),next={ArrowRight:(i+1)%7,ArrowDown:(i+1)%7,ArrowLeft:(i+6)%7,ArrowUp:(i+6)%7,Home:0,End:6}[event.key];if(next!==undefined){event.preventDefault();event.stopPropagation();select(ARCADE_GAMES[next].id,false);$(`[data-arcade-tab="${ARCADE_GAMES[next].id}"]`).focus();}return;}
    if(active==='crossword'&&event.target.matches('[data-cross-index]')){
      const i=Number(event.target.dataset.crossIndex),col=i%5,row=Math.floor(i/5);
      if(event.key==='Enter'||event.key===' '){event.preventDefault();crossDirection=crossDirection==='across'?'down':'across';paintCross();return;}
      const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
      if(delta){event.preventDefault();event.stopPropagation();crossDirection=delta[0]?'across':'down';let x=col+delta[0],y=row+delta[1];while(x>=0&&x<5&&y>=0&&y<5){const at=y*5+x;if(cross.cells[at]!=='#'){selectCross(at,true);break;}x+=delta[0];y+=delta[1];}return;}
      if(event.key==='Backspace'&&!crossValues[i]){event.preventDefault();advanceCross(-1);}return;
    }
    if(active==='sudoku'&&event.target.matches('[data-sudoku-cell]')){const offset={ArrowUp:-9,ArrowRight:1,ArrowDown:9,ArrowLeft:-1}[event.key];if(offset){event.preventDefault();let i=Number(event.target.dataset.sudokuCell)+offset;while(i>=0&&i<81&&puzzle.clues[i])i+=offset;if(i>=0&&i<81){const input=$(`[data-sudoku-cell="${i}"]`);input.focus();input.select();}}return;}
    if(event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
    if(active==='wordle'){
      if(/^[a-z]$/i.test(event.key)){event.preventDefault();event.stopPropagation();wordKey(event.key.toUpperCase());$('[data-word-board]').focus({preventScroll:true});}
      if(event.key==='Backspace'||event.key==='Enter'&&!event.target.closest('button')){event.preventDefault();event.stopPropagation();wordKey(event.key==='Enter'?'!':'?');}return;
    }
    const direction={ArrowUp:'up',ArrowRight:'right',ArrowDown:'down',ArrowLeft:'left',...(active==='snake'?{w:'up',d:'right',s:'down',a:'left'}:{})}[event.key];
    if(direction&&['snake','2048'].includes(active)){event.preventDefault();event.stopPropagation();if(active==='snake')snake=turnSnake(snake,direction);else play2048(direction);}
    if(active==='snake'&&event.code==='Space'&&event.target===$('[data-snake-board]')){event.preventDefault();snake.status==='running'?pauseSnake():startSnake();}
  });
  listen($('[data-2048-board]'),'pointerdown',event=>{if(enabled&&inGame&&active==='2048'&&(event.button===undefined||event.button===0)){pointer={x:event.clientX,y:event.clientY,id:event.pointerId};event.currentTarget.setPointerCapture?.(event.pointerId);}});
  listen($('[data-2048-board]'),'pointerup',event=>{if(!enabled||!inGame||active!=='2048'||!pointer||pointer.id!==event.pointerId)return;const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;pointer=null;if(Math.max(Math.abs(dx),Math.abs(dy))>=18)play2048(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up');});
  listen($('[data-2048-board]'),'pointercancel',()=>{pointer=null;});
  listen(doc,'visibilitychange',()=>{if(doc.hidden)pauseSnake('Paused while the page is hidden.');});
  listen(win,'blur',()=>pauseSnake());
  const dialog=root.closest('dialog');
  if(dialog){listen(dialog,'close',()=>pauseSnake());listen(dialog,'cancel',event=>{if(inGame){event.preventDefault();overview();}});}
  $('[data-snake-board]').innerHTML=Array.from({length:256},()=>'<span></span>').join('');
  $('[data-2048-board]').innerHTML=Array.from({length:16},()=>'<span class="arcade-tile" role="img"></span>').join('');
  paintSnake();paint2048();paintSudoku();paintBlackjack();paintWord();buildCross();paintTic();overview(false);
  return {select,overview,
    state(){return JSON.parse(JSON.stringify({active,inGame,enabled,snake,tiles,sudoku,hand,record,word,draft,crossIndex,crossValues,tic:tic.state()}));},
    setActive(value){if(disposed)return;enabled=Boolean(value);if(!enabled){pauseSnake();pointer=null;}},
    dispose(){if(disposed)return;disposed=true;pauseSnake();stopTimer();events.abort();},
  };
}
