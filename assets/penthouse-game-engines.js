import { WORD_GUESSES } from './word-guesses.js';

export function blackjackTotal(cards) {
  let value=0,aces=0;
  for(const card of cards){if(card.rank==='A'){value+=11;aces++;}else value+=['J','Q','K'].includes(card.rank)?10:Number(card.rank);}
  while(value>21&&aces){value-=10;aces--;}
  return {value,soft:aces>0};
}

export function shuffledDeck(random=Math.random){
  const deck=['♠','♥','♦','♣'].flatMap(suit=>['A','2','3','4','5','6','7','8','9','10','J','Q','K'].map(rank=>({rank,suit})));
  for(let i=deck.length-1;i>0;i--){const j=Math.min(i,Math.max(0,Math.floor(random()*(i+1))));[deck[i],deck[j]]=[deck[j],deck[i]];}
  return deck;
}

/** Practice hands: no wagers. Dealer stands on all 17s, including soft 17. */
export function dealBlackjack(deck=shuffledDeck()){
  if(deck.length<4)throw new RangeError('A hand requires at least four cards.');
  const player=[deck[0],deck[2]],dealer=[deck[1],deck[3]],p=blackjackTotal(player).value,d=blackjackTotal(dealer).value;
  const natural=p===21||d===21;
  return {player,dealer,deck:deck.slice(4),status:natural?'done':'playing',result:natural?p===d?'push':p===21?'blackjack':'dealer-blackjack':null};
}

export function hitBlackjack(state){
  if(state.status!=='playing'||!state.deck.length)return state;
  const next={...state,player:[...state.player,state.deck[0]],deck:state.deck.slice(1)};
  const total=blackjackTotal(next.player).value;
  if(total>21)return {...next,status:'done',result:'bust'};
  return total===21?standBlackjack(next):next;
}

export function standBlackjack(state){
  if(state.status!=='playing')return state;
  const dealer=[...state.dealer],deck=[...state.deck];
  while(blackjackTotal(dealer).value<17&&deck.length)dealer.push(deck.shift());
  const p=blackjackTotal(state.player).value,d=blackjackTotal(dealer).value;
  return {...state,dealer,deck,status:'done',result:d>21?'dealer-bust':p>d?'win':p===d?'push':'lose'};
}

/** Two passes prevent duplicate guesses from claiming the same answer letter. */
export function scoreWordGuess(answer,guess){
  const remaining=answer.toUpperCase().split(''),letters=guess.toUpperCase().split(''),marks=Array(5).fill('absent');
  if(remaining.length!==5||letters.length!==5)throw new RangeError('Use five-letter words.');
  for(let i=0;i<5;i++)if(letters[i]===remaining[i]){marks[i]='correct';remaining[i]=null;}
  for(let i=0;i<5;i++)if(marks[i]!=='correct'){const at=remaining.indexOf(letters[i]);if(at>=0){marks[i]='present';remaining[at]=null;}}
  return marks;
}

export function createWordState(answer){
  if(!/^[a-z]{5}$/i.test(answer))throw new RangeError('Use a five-letter answer.');
  return {answer:answer.toUpperCase(),guesses:[],marks:[],status:'playing',error:''};
}

export function submitWordGuess(state,value,allowed=WORD_GUESSES){
  if(state.status!=='playing')return state;
  const word=String(value).trim().toUpperCase();
  if(!/^[A-Z]{5}$/.test(word))return {...state,error:'Enter five letters.'};
  if(!allowed.has(word.toLowerCase())&&word!==state.answer)return {...state,error:'Word not in the dictionary.'};
  if(state.guesses.includes(word))return {...state,error:'You already tried that word.'};
  const guesses=[...state.guesses,word],marks=[...state.marks,scoreWordGuess(state.answer,word)];
  return {...state,guesses,marks,status:word===state.answer?'won':guesses.length===6?'lost':'playing',error:''};
}

/** Build numbered, intersecting Across/Down entries from an authored grid. */
export function crosswordEntries(puzzle){
  const size=puzzle.rows.length;
  if(!size||puzzle.rows.some(row=>row.length!==size))throw new RangeError('Crosswords use square grids.');
  const cells=puzzle.rows.join('').split(''),entries=[],numbers=new Map();let number=0;
  for(let index=0;index<cells.length;index++){
    if(cells[index]==='#')continue;
    const row=Math.floor(index/size),col=index%size;
    const across=(col===0||cells[index-1]==='#')&&col+1<size&&cells[index+1]!=='#';
    const down=(row===0||cells[index-size]==='#')&&row+1<size&&cells[index+size]!=='#';
    if(across||down)numbers.set(index,++number);
    for(const direction of ['across','down']){
      if(direction==='across'?!across:!down)continue;
      const indices=[],step=direction==='across'?1:size;
      for(let at=index;at<cells.length&&cells[at]!=='#'&&(direction==='down'||Math.floor(at/size)===row);at+=step)indices.push(at);
      const answer=indices.map(i=>cells[i]).join('');
      if(!puzzle.clues[answer])throw new Error(`Missing clue: ${answer}`);
      entries.push({id:`${number}-${direction}`,number,direction,indices,answer,clue:puzzle.clues[answer]});
    }
  }
  return {size,cells,entries,numbers};
}

export function checkCrossword(puzzle,values){
  const cells=puzzle.rows.join('').split(''),wrong=[],empty=[];
  cells.forEach((answer,i)=>{if(answer==='#')return;if(!values[i])empty.push(i);else if(values[i].toUpperCase()!==answer)wrong.push(i);});
  return {wrong,empty,complete:wrong.length===0&&empty.length===0};
}
