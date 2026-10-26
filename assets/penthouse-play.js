const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const winner=board=>lines.map(line=>line.map(i=>board[i])).find(row=>row[0]&&row.every(mark=>mark===row[0]))?.[0]||null;

export function createNoughtsAndCrosses() {
  let board=Array(9).fill(null),result=null;
  const state=()=>({board:[...board],result});
  const complete=()=>{result=winner(board)||(board.every(Boolean)?'draw':null);return Boolean(result);};
  function opportunity(mark){
    for(let i=0;i<9;i++)if(!board[i]){
      board[i]=mark;const wins=winner(board)===mark;board[i]=null;
      if(wins)return i;
    }
    return -1;
  }
  return {
    state,
    move(index){
      if(!Number.isInteger(index)||index<0||index>8||result||board[index])return false;
      board[index]='X';
      if(!complete()){
        const win=opportunity('O'),block=opportunity('X');
        const choice=win>=0?win:block>=0?block:[4,0,8,2,6,1,3,5,7].find(i=>!board[i]);
        board[choice]='O';complete();
      }
      return true;
    },
    reset(){board=Array(9).fill(null);result=null;return state();},
  };
}

export function penthouseGameMarkup(activity) {
  if(activity!=='tic-tac-toe')return '';
  return `<section class="penthouse-game" aria-labelledby="penthouse-game-title"><h4 id="penthouse-game-title">Noughts &amp; crosses</h4><p>You’re X. The house plays O.</p><div class="penthouse-game-board" role="group" aria-label="Noughts and crosses board">${Array.from({length:9},(_,i)=>`<button type="button" data-game-cell="${i}" aria-label="Row ${Math.floor(i/3)+1}, column ${i%3+1}, empty"></button>`).join('')}</div><p class="penthouse-game-status" role="status" aria-live="polite">Your move.</p><button type="button" class="penthouse-game-reset" data-game-reset>New game ↻</button></section>`;
}

export function createPenthousePlay(container,onPlay) {
  const game=createNoughtsAndCrosses();
  function paint(){
    const {board,result}=game.state();
    for(const button of container.querySelectorAll('[data-game-cell]')){
      const i=Number(button.dataset.gameCell),mark=board[i];
      button.textContent=mark||'';button.disabled=Boolean(result||mark);
      button.dataset.mark=mark||'';
      button.setAttribute('aria-label',`Row ${Math.floor(i/3)+1}, column ${i%3+1}, ${mark||'empty'}`);
    }
    const status=container.querySelector('.penthouse-game-status');
    if(status)status.textContent=result==='X'?'You win. Nicely played!':result==='O'?'The house takes this round. Try again?':result==='draw'?'A draw. Another round?':'Your move.';
  }
  const click=event=>{
    const cell=event.target.closest('[data-game-cell]'),reset=event.target.closest('[data-game-reset]');
    if(cell&&container.contains(cell)&&game.move(Number(cell.dataset.gameCell))){paint();onPlay?.();}
    if(reset&&container.contains(reset)){game.reset();paint();}
  };
  container.addEventListener('click',click);
  return {mount(){game.reset();paint();},dispose(){container.removeEventListener('click',click);}};
}
