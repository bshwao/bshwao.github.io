const DIRECTIONS = Object.freeze({up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0]});
const opposite = {up: 'down', down: 'up', left: 'right', right: 'left'};
const randomIndex = (length, random) => Math.min(length - 1, Math.max(0, Math.floor(random() * length)));
const samePoint = (a, b) => a.x === b.x && a.y === b.y;

function snakeFood(body, size, random) {
  const empty = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (!body.some(part => part.x === x && part.y === y)) empty.push({x, y});
  }
  return empty.length ? empty[randomIndex(empty.length, random)] : null;
}

/** Pure Snake state. Advancing a paused/ready/finished state has no effect. */
export function createSnakeState({size = 16, random = Math.random} = {}) {
  if (!Number.isInteger(size) || size < 5) throw new RangeError('Snake needs a board of at least five cells.');
  const x = Math.floor(size / 2), y = Math.floor(size / 2);
  const body = [{x, y}, {x: x - 1, y}, {x: x - 2, y}];
  return {size, body, food: snakeFood(body, size, random), direction: 'right', nextDirection: 'right', score: 0, status: 'ready'};
}

export function turnSnake(state, direction) {
  if (!DIRECTIONS[direction] || direction === opposite[state.direction]) return state;
  return {...state, nextDirection: direction};
}

export function stepSnake(state, random = Math.random) {
  if (state.status !== 'running') return state;
  const direction = state.nextDirection, [dx, dy] = DIRECTIONS[direction];
  const head = {x: state.body[0].x + dx, y: state.body[0].y + dy};
  const eating = state.food && samePoint(head, state.food);
  // The tail leaves this square on the same tick unless the snake eats.
  const occupied = eating ? state.body : state.body.slice(0, -1);
  if (head.x < 0 || head.y < 0 || head.x >= state.size || head.y >= state.size || occupied.some(part => samePoint(part, head))) {
    return {...state, direction, status: 'over'};
  }
  const body = [head, ...state.body];
  if (!eating) body.pop();
  const food = eating ? snakeFood(body, state.size, random) : state.food;
  return {...state, body, food, direction, score: state.score + (eating ? 1 : 0), status: food ? 'running' : 'won'};
}

/** Merge each pair once, from the leading edge of a 2048 line. */
export function merge2048Line(line) {
  const values = line.filter(Boolean), result = [];
  let score = 0;
  for (let i = 0; i < values.length; i++) {
    if (values[i] === values[i + 1]) {
      const value = values[i] * 2;
      result.push(value); score += value; i++;
    } else result.push(values[i]);
  }
  while (result.length < line.length) result.push(0);
  return {line: result, score};
}

export function canMove2048(board) {
  return board.some((value, i) => !value || (i % 4 < 3 && value === board[i + 1]) || (i < 12 && value === board[i + 4]));
}

function spawn2048(board, random) {
  const empty = board.flatMap((value, i) => value ? [] : [i]);
  if (!empty.length) return board;
  const result = [...board], index = empty[randomIndex(empty.length, random)];
  result[index] = random() < .9 ? 2 : 4;
  return result;
}

export function create2048State(random = Math.random) {
  return {board: spawn2048(spawn2048(Array(16).fill(0), random), random), score: 0, won: false, over: false, moved: false};
}

export function move2048(state, direction, random = Math.random) {
  if (!DIRECTIONS[direction] || state.over) return {...state, moved: false};
  const board = [...state.board];
  let score = state.score;
  for (let line = 0; line < 4; line++) {
    const indices = Array.from({length: 4}, (_, i) => {
      if (direction === 'left') return line * 4 + i;
      if (direction === 'right') return line * 4 + 3 - i;
      if (direction === 'up') return i * 4 + line;
      return (3 - i) * 4 + line;
    });
    const merged = merge2048Line(indices.map(index => state.board[index]));
    indices.forEach((index, i) => { board[index] = merged.line[i]; });
    score += merged.score;
  }
  const moved = board.some((value, i) => value !== state.board[i]);
  const next = moved ? spawn2048(board, random) : board;
  return {board: next, score, won: state.won || next.some(value => value >= 2048), over: !canMove2048(next), moved};
}

// This classic puzzle has one solution. Row/column group, digit, and transpose
// transformations preserve its clues, validity, and uniqueness.
const SUDOKU_CLUES = '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const SUDOKU_SOLUTION = '534678912672195348198342567859761423426853791713924856961537284287419635345286179';
function shuffled(values, random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1, random);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createSudokuPuzzle(random = Math.random) {
  const grouped = () => shuffled([0, 1, 2], random).flatMap(group => shuffled([0, 1, 2], random).map(i => group * 3 + i));
  const rows = grouped(), columns = grouped(), digits = shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9], random), transpose = random() < .5;
  const transform = source => Array.from({length: 81}, (_, i) => {
    const row = rows[Math.floor(i / 9)], column = columns[i % 9];
    const value = Number(source[transpose ? column * 9 + row : row * 9 + column]);
    return value ? digits[value - 1] : 0;
  });
  return {clues: transform(SUDOKU_CLUES), solution: transform(SUDOKU_SOLUTION)};
}

/** Return every duplicate cell, including both sides of each conflict. */
export function sudokuConflicts(board) {
  const conflicts = new Set();
  const units = [];
  for (let row = 0; row < 9; row++) units.push(Array.from({length: 9}, (_, column) => row * 9 + column));
  for (let column = 0; column < 9; column++) units.push(Array.from({length: 9}, (_, row) => row * 9 + column));
  for (let box = 0; box < 9; box++) units.push(Array.from({length: 9}, (_, i) => (Math.floor(box / 3) * 3 + Math.floor(i / 3)) * 9 + (box % 3) * 3 + i % 3));
  for (const unit of units) {
    const seen = new Map();
    for (const index of unit) {
      const value = board[index];
      if (!value) continue;
      if (seen.has(value)) { conflicts.add(index); conflicts.add(seen.get(value)); }
      else seen.set(value, index);
    }
  }
  return conflicts;
}

export function sudokuComplete(board) {
  return board.length === 81 && board.every(value => Number.isInteger(value) && value >= 1 && value <= 9) && sudokuConflicts(board).size === 0;
}

let markupId = 0;
function directionMarkup(game) {
  return `<div class="arcade-directions" role="group" aria-label="${game === 'snake' ? 'Snake' : '2048'} direction controls">${['up', 'left', 'down', 'right'].map(direction => `<button type="button" class="arcade-direction arcade-direction-${direction}" data-${game}-direction="${direction}" aria-label="Move ${direction}">${{up: '↑', left: '←', down: '↓', right: '→'}[direction]}</button>`).join('')}</div>`;
}

export function arcadeMarkup() {
  const id = `penthouse-arcade-${++markupId}`;
  return `<section class="penthouse-arcade" aria-label="Penthouse arcade">
    <p class="arcade-eyebrow">A little time off</p>
    <div class="arcade-tabs" role="tablist" aria-label="Choose a game">${[['snake', 'Snake'], ['2048', '2048'], ['sudoku', 'Sudoku']].map(([game, label], i) => `<button type="button" role="tab" id="${id}-tab-${game}" aria-controls="${id}-${game}" aria-selected="${i === 0}" tabindex="${i === 0 ? '0' : '-1'}" data-arcade-tab="${game}">${label}</button>`).join('')}</div>
    <section class="arcade-panel" id="${id}-snake" role="tabpanel" aria-labelledby="${id}-tab-snake" data-arcade-panel="snake">
      <div class="arcade-game-heading"><div><h3>Snake</h3><p>A bite at a time.</p></div><p class="arcade-score">Apples <strong data-snake-score>0</strong></p></div>
      <p class="arcade-instructions" id="${id}-snake-help">Use arrow keys, W A S D, or the buttons. Collect the apple; avoid the walls and your tail.</p>
      <div class="arcade-snake-board" tabindex="0" role="img" aria-label="Snake board. Press Start to play." aria-describedby="${id}-snake-help" data-snake-board></div>
      <div class="arcade-game-controls"><button type="button" class="arcade-primary" data-snake-toggle>Start</button><button type="button" data-snake-reset>New game</button>${directionMarkup('snake')}</div>
      <p class="arcade-status" role="status" aria-live="polite" data-snake-status>Ready when you are. Press Start.</p>
    </section>
    <section class="arcade-panel" id="${id}-2048" role="tabpanel" aria-labelledby="${id}-tab-2048" data-arcade-panel="2048" hidden>
      <div class="arcade-game-heading"><div><h3>2048</h3><p>Make room for something bigger.</p></div><p class="arcade-score">Score <strong data-2048-score>0</strong></p></div>
      <p class="arcade-instructions" id="${id}-2048-help">Use arrow keys, swipe the board, or use the buttons. Matching tiles join. Reach 2048, then keep going.</p>
      <div class="arcade-2048-board" tabindex="0" role="group" aria-label="2048 board" aria-describedby="${id}-2048-help" data-2048-board></div>
      <div class="arcade-game-controls"><button type="button" data-2048-reset>New game</button>${directionMarkup('2048')}</div>
      <p class="arcade-status" role="status" aria-live="polite" data-2048-status>Pick a direction to begin.</p>
    </section>
    <section class="arcade-panel" id="${id}-sudoku" role="tabpanel" aria-labelledby="${id}-tab-sudoku" data-arcade-panel="sudoku" hidden>
      <div class="arcade-game-heading"><div><h3>Sudoku</h3><p>Nine little moments of clarity.</p></div><p class="arcade-score">Filled <strong data-sudoku-score>0 / 81</strong></p></div>
      <p class="arcade-instructions" id="${id}-sudoku-help">Fill each row, column, and 3 × 3 box with 1–9. Dark numbers are fixed clues. Conflicts are marked as you type. Scroll the grid sideways on a small screen.</p>
      <div class="arcade-sudoku-scroll"><div class="arcade-sudoku-board" role="group" aria-label="Sudoku grid" aria-describedby="${id}-sudoku-help" data-sudoku-board>${Array.from({length: 81}, (_, i) => `<input type="text" inputmode="numeric" pattern="[1-9]" maxlength="1" autocomplete="off" spellcheck="false" data-sudoku-cell="${i}" aria-label="Row ${Math.floor(i / 9) + 1}, column ${i % 9 + 1}"${i % 9 === 2 || i % 9 === 5 ? ' class="arcade-box-right"' : ''}${Math.floor(i / 9) === 2 || Math.floor(i / 9) === 5 ? ' data-box-bottom' : ''}>`).join('')}</div></div>
      <div class="arcade-game-controls"><button type="button" class="arcade-primary" data-sudoku-check>Check progress</button><button type="button" data-sudoku-reset>Reset</button><button type="button" data-sudoku-new>New puzzle</button></div>
      <p class="arcade-status" role="status" aria-live="polite" data-sudoku-status>A fresh puzzle. Take your time.</p>
    </section>
  </section>`;
}

/** Mount inside an existing dialog. The caller owns that dialog and its close UI. */
export function createArcade(container, {onPlay = () => {}} = {}) {
  const root = container.matches?.('.penthouse-arcade') ? container : container.querySelector('.penthouse-arcade');
  if (!root) throw new Error('Insert arcadeMarkup() before creating the arcade.');
  const document = root.ownerDocument, window = document.defaultView;
  const lifetime = new window.AbortController();
  let activeEvents = null, disposed = false, enabled = true, active = 'snake', timer = null;
  let snake = createSnakeState(), tiles = create2048State(), puzzle = createSudokuPuzzle(), sudoku = [...puzzle.clues];
  const find = selector => root.querySelector(selector);
  const tabs = [...root.querySelectorAll('[data-arcade-tab]')];
  const panels = [...root.querySelectorAll('[data-arcade-panel]')];
  const sudokuInputs = [...root.querySelectorAll('[data-sudoku-cell]')];
  const snakeBoard = find('[data-snake-board]'), tileBoard = find('[data-2048-board]');
  const listen = (element, name, callback, signal) => element.addEventListener(name, callback, {signal});
  const status = (game, message) => { find(`[data-${game}-status]`).textContent = message; };
  const stopTimer = () => { if (timer !== null) { window.clearInterval(timer); timer = null; } };

  snakeBoard.innerHTML = Array.from({length: snake.size ** 2}, () => '<span></span>').join('');
  tileBoard.innerHTML = Array.from({length: 16}, () => '<span class="arcade-tile" role="img"></span>').join('');

  function paintSnake() {
    const occupied = new Map(snake.body.map((part, i) => [part.y * snake.size + part.x, i === 0 ? 'head' : 'body']));
    const apple = snake.food ? snake.food.y * snake.size + snake.food.x : -1;
    [...snakeBoard.children].forEach((cell, i) => { cell.dataset.cell = i === apple ? 'food' : occupied.get(i) || ''; });
    find('[data-snake-score]').textContent = snake.score;
    find('[data-snake-toggle]').textContent = snake.status === 'running' ? 'Pause' : snake.status === 'paused' ? 'Resume' : ['over', 'won'].includes(snake.status) ? 'Play again' : 'Start';
    snakeBoard.setAttribute('aria-label', `Snake board. ${snake.score} apples. ${snake.status === 'over' ? 'Game over.' : snake.status === 'won' ? 'Board complete.' : snake.status + '.'}`);
  }

  function pauseSnake(message = 'Paused. Press Resume when you’re ready.') {
    stopTimer();
    if (snake.status === 'running') { snake = {...snake, status: 'paused'}; paintSnake(); status('snake', message); }
  }

  function startSnake() {
    if (!enabled || disposed) return;
    if (['over', 'won'].includes(snake.status)) snake = createSnakeState();
    snake = {...snake, status: 'running'};
    stopTimer(); paintSnake(); status('snake', 'Keep going. An apple is waiting.'); onPlay();
    timer = window.setInterval(() => {
      const dialog = root.closest('dialog');
      if (disposed || !enabled || active !== 'snake' || !root.isConnected || document.hidden || (dialog && !dialog.open)) {
        pauseSnake(); return;
      }
      const previousScore = snake.score;
      snake = stepSnake(snake); paintSnake();
      if (snake.score !== previousScore) status('snake', `${snake.score} ${snake.score === 1 ? 'apple' : 'apples'}. Keep going.`);
      if (snake.status === 'over' || snake.status === 'won') {
        stopTimer();
        status('snake', snake.status === 'won' ? 'Every square filled. You win!' : `That’s the round. ${snake.score} ${snake.score === 1 ? 'apple' : 'apples'} collected. Play again?`);
      }
    }, 145);
  }

  function paint2048() {
    [...tileBoard.children].forEach((cell, i) => {
      const value = tiles.board[i];
      cell.textContent = value || ''; cell.dataset.value = value || '';
      cell.dataset.level = value ? Math.min(11, Math.log2(value)) : 0;
      cell.setAttribute('aria-label', `Row ${Math.floor(i / 4) + 1}, column ${i % 4 + 1}: ${value || 'empty'}`);
    });
    find('[data-2048-score]').textContent = tiles.score;
  }

  function play2048(direction) {
    const previous = tiles;
    tiles = move2048(tiles, direction); paint2048();
    if (tiles.over) status('2048', 'No moves left. Start a new game for another go.');
    else if (!previous.won && tiles.won) status('2048', '2048! You made it. Keep going for a bigger tile.');
    else if (tiles.moved) status('2048', `${tiles.score} points. Largest tile: ${Math.max(...tiles.board)}.`);
    else status('2048', 'No tiles moved. Try another direction.');
    if (tiles.moved) onPlay();
  }

  function paintSudoku() {
    const conflicts = sudokuConflicts(sudoku);
    sudokuInputs.forEach((input, i) => {
      input.value = sudoku[i] || ''; input.readOnly = Boolean(puzzle.clues[i]);
      input.tabIndex = puzzle.clues[i] ? -1 : 0;
      input.dataset.fixed = Boolean(puzzle.clues[i]);
      input.dataset.conflict = conflicts.has(i);
      input.setAttribute('aria-invalid', conflicts.has(i) ? 'true' : 'false');
      input.setAttribute('aria-label', `Row ${Math.floor(i / 9) + 1}, column ${i % 9 + 1}${puzzle.clues[i] ? `, fixed clue ${puzzle.clues[i]}` : ''}${conflicts.has(i) ? ', conflict' : ''}`);
    });
    find('[data-sudoku-score]').textContent = `${sudoku.filter(Boolean).length} / 81`;
    return conflicts;
  }

  function editableTarget(event) {
    return event.target.closest('input, textarea, select, [contenteditable="true"]') || event.ctrlKey || event.altKey || event.metaKey;
  }

  function activate(game, focus = false) {
    pauseSnake(); activeEvents?.abort(); activeEvents = new window.AbortController(); active = game;
    const signal = activeEvents.signal;
    tabs.forEach(tab => { const selected = tab.dataset.arcadeTab === game; tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1; });
    panels.forEach(panel => { panel.hidden = panel.dataset.arcadePanel !== game; });
    if (focus) tabs.find(tab => tab.dataset.arcadeTab === game).focus();
    if (game === 'snake') {
      listen(find('[data-snake-toggle]'), 'click', () => snake.status === 'running' ? pauseSnake() : startSnake(), signal);
      listen(find('[data-snake-reset]'), 'click', () => { stopTimer(); snake = createSnakeState(); paintSnake(); status('snake', 'Fresh board. Press Start.'); }, signal);
      root.querySelectorAll('[data-snake-direction]').forEach(button => listen(button, 'click', () => { snake = turnSnake(snake, button.dataset.snakeDirection); }, signal));
      listen(root, 'keydown', event => {
        if (editableTarget(event) || event.target.closest('[role="tab"]')) return;
        const direction = {ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down', ArrowLeft: 'left', w: 'up', d: 'right', s: 'down', a: 'left'}[event.key];
        if (direction) { event.preventDefault(); snake = turnSnake(snake, direction); }
        if (event.code === 'Space' && event.target === snakeBoard) { event.preventDefault(); snake.status === 'running' ? pauseSnake() : startSnake(); }
      }, signal);
      listen(document, 'visibilitychange', () => { if (document.hidden) pauseSnake('Paused while you were away. Press Resume to continue.'); }, signal);
      listen(window, 'blur', () => pauseSnake('Paused while you were away. Press Resume to continue.'), signal);
      const dialog = root.closest('dialog');
      if (dialog) listen(dialog, 'close', () => pauseSnake(), signal);
    } else if (game === '2048') {
      listen(find('[data-2048-reset]'), 'click', () => { tiles = create2048State(); paint2048(); status('2048', 'A fresh pair of tiles. Pick a direction.'); }, signal);
      root.querySelectorAll('[data-2048-direction]').forEach(button => listen(button, 'click', () => play2048(button.dataset['2048Direction']), signal));
      listen(root, 'keydown', event => {
        if (editableTarget(event) || event.target.closest('[role="tab"]')) return;
        const direction = {ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down', ArrowLeft: 'left'}[event.key];
        if (direction) { event.preventDefault(); play2048(direction); }
      }, signal);
      let pointer = null;
      listen(tileBoard, 'pointerdown', event => { if (event.button !== undefined && event.button !== 0) return; pointer = {x: event.clientX, y: event.clientY, id: event.pointerId}; tileBoard.setPointerCapture?.(event.pointerId); }, signal);
      listen(tileBoard, 'pointerup', event => {
        if (!pointer || pointer.id !== event.pointerId) return;
        const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y; pointer = null;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
        play2048(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up');
      }, signal);
      listen(tileBoard, 'pointercancel', () => { pointer = null; }, signal);
    } else {
      listen(find('[data-sudoku-board]'), 'input', event => {
        const input = event.target.closest('[data-sudoku-cell]');
        if (!input) return;
        const index = Number(input.dataset.sudokuCell);
        if (puzzle.clues[index]) { paintSudoku(); return; }
        const digits = input.value.replace(/[^1-9]/g, '');
        sudoku[index] = digits ? Number(digits.at(-1)) : 0;
        const conflicts = paintSudoku();
        status('sudoku', sudokuComplete(sudoku) ? 'Beautifully done. Every row, column, and box is complete.' : conflicts.size ? `${conflicts.size} cells conflict. Check the marked numbers.` : 'No conflicts so far. Keep going.');
        onPlay();
      }, signal);
      listen(find('[data-sudoku-board]'), 'keydown', event => {
        const input = event.target.closest('[data-sudoku-cell]');
        if (!input) return;
        const offset = {ArrowUp: -9, ArrowRight: 1, ArrowDown: 9, ArrowLeft: -1}[event.key];
        if (!offset) return;
        event.preventDefault();
        let index = Number(input.dataset.sudokuCell) + offset;
        while (index >= 0 && index < 81 && puzzle.clues[index]) index += offset;
        if (index >= 0 && index < 81) { sudokuInputs[index].focus(); sudokuInputs[index].select(); }
      }, signal);
      listen(find('[data-sudoku-check]'), 'click', () => {
        const conflicts = paintSudoku(), wrong = sudoku.some((value, i) => value && value !== puzzle.solution[i]);
        status('sudoku', sudokuComplete(sudoku) ? 'Beautifully done. Puzzle complete!' : conflicts.size ? `${conflicts.size} cells conflict. Check the marked numbers.` : wrong ? 'A number needs another look. There are no direct conflicts yet.' : `All entered numbers are correct. ${sudoku.filter(value => !value).length} squares to go.`);
      }, signal);
      listen(find('[data-sudoku-reset]'), 'click', () => { sudoku = [...puzzle.clues]; paintSudoku(); status('sudoku', 'Your entries are cleared. The same puzzle is ready again.'); }, signal);
      listen(find('[data-sudoku-new]'), 'click', () => { puzzle = createSudokuPuzzle(); sudoku = [...puzzle.clues]; paintSudoku(); status('sudoku', 'A fresh puzzle. Take your time.'); }, signal);
    }
  }

  listen(root, 'click', event => {
    if (!enabled) return;
    const tab = event.target.closest('[data-arcade-tab]');
    if (tab && root.contains(tab) && tab.dataset.arcadeTab !== active) activate(tab.dataset.arcadeTab);
  }, lifetime.signal);
  listen(find('[role="tablist"]'), 'keydown', event => {
    if (!enabled) return;
    const tab = event.target.closest('[data-arcade-tab]');
    if (!tab) return;
    const i = tabs.indexOf(tab);
    const index = {ArrowRight: (i + 1) % 3, ArrowLeft: (i + 2) % 3, Home: 0, End: 2}[event.key];
    if (index !== undefined) { event.preventDefault(); event.stopPropagation(); activate(tabs[index].dataset.arcadeTab, true); }
  }, lifetime.signal);
  paintSnake(); paint2048(); paintSudoku(); activate('snake');
  return {
    setActive(value) {
      if (disposed || enabled === Boolean(value)) return;
      enabled = Boolean(value);
      if (enabled) activate(active);
      else { pauseSnake(); activeEvents?.abort(); }
    },
    dispose() { if (disposed) return; disposed = true; pauseSnake(); stopTimer(); activeEvents?.abort(); lifetime.abort(); },
  };
}
