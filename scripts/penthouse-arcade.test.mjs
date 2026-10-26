import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createSnakeState, turnSnake, stepSnake, merge2048Line, create2048State, move2048, canMove2048, createSudokuPuzzle, sudokuConflicts, sudokuComplete, arcadeMarkup, createArcade} from '../assets/penthouse-arcade.js';

const runningSnake = changes => ({...createSnakeState({size: 6, random: () => 0}), status: 'running', ...changes});
test('Snake advances only while running, rejects reversing, grows on food, and leaves its input intact', () => {
  const ready = createSnakeState({random: () => 0});
  assert.equal(stepSnake(ready), ready);
  assert.equal(stepSnake({...ready, status: 'paused'}).status, 'paused');
  const state = runningSnake({food: {x: 4, y: 3}}), snapshot = structuredClone(state);
  assert.equal(turnSnake(state, 'left'), state);
  assert.equal(turnSnake(state, 'invalid'), state);
  assert.equal(turnSnake(turnSnake(state, 'up'), 'left').nextDirection, 'up', 'A queued turn cannot reverse the current direction');
  const next = stepSnake(state, () => 0);
  assert.equal(next.score, 1); assert.equal(next.body.length, 4);
  assert.deepEqual(next.body[0], {x: 4, y: 3});
  assert.ok(!next.body.some(part => part.x === next.food.x && part.y === next.food.y));
  assert.deepEqual(state, snapshot);
});

test('Snake detects walls and its body but can enter a vacated tail square', () => {
  assert.equal(stepSnake(runningSnake({body: [{x: 5, y: 2}, {x: 4, y: 2}]})).status, 'over');
  const body = [{x: 2, y: 2}, {x: 2, y: 1}, {x: 1, y: 1}, {x: 1, y: 2}];
  assert.equal(stepSnake(runningSnake({body, direction: 'left', nextDirection: 'up'})).status, 'over');
  const tailMove = stepSnake(runningSnake({body, direction: 'down', nextDirection: 'left'}));
  assert.equal(tailMove.status, 'running'); assert.deepEqual(tailMove.body[0], {x: 1, y: 2});
});

test('2048 lines merge from the moving edge without double merges', () => {
  for (const [input, expected, score] of [
    [[2, 2, 2, 2], [4, 4, 0, 0], 8], [[2, 2, 4, 0], [4, 4, 0, 0], 4],
    [[4, 0, 4, 4], [8, 4, 0, 0], 8], [[2, 4, 8, 16], [2, 4, 8, 16], 0],
  ]) {
    const copy = [...input];
    assert.deepEqual(merge2048Line(input), {line: expected, score}); assert.deepEqual(input, copy);
  }
});

test('2048 moves in all four directions, only spawns on a move, and identifies wins and dead boards', () => {
  const initial = create2048State(() => 0);
  assert.equal(initial.board.filter(Boolean).length, 2);
  const state = {board: [2, 2, 0, 0, ...Array(12).fill(0)], score: 0, won: false, over: false};
  const original = structuredClone(state);
  assert.deepEqual(move2048(state, 'left', () => 0).board.slice(0, 4), [4, 2, 0, 0]);
  assert.deepEqual(move2048(state, 'right', () => 0).board.slice(0, 4), [2, 0, 0, 4]);
  assert.equal(move2048(state, 'left', () => 0).score, 4);
  const vertical = {...state, board: [2, 0, 0, 0, 2, ...Array(11).fill(0)]};
  assert.equal(move2048(vertical, 'up', () => 0).board[0], 4);
  assert.equal(move2048(vertical, 'down', () => 0).board[12], 4);
  let calls = 0;
  const unchanged = move2048({...state, board: [2, ...Array(15).fill(0)]}, 'left', () => { calls++; return 0; });
  assert.equal(unchanged.moved, false); assert.equal(calls, 0);
  assert.equal(move2048({...state, board: [1024, 1024, ...Array(14).fill(0)]}, 'left', () => 0).won, true);
  const dead = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2];
  assert.equal(canMove2048(dead), false);
  assert.equal(move2048({...state, board: dead}, 'up', () => 0).over, true);
  assert.deepEqual(state, original);
});

function countSolutions(clues) {
  const board = [...clues]; let count = 0;
  function search() {
    if (count > 1) return;
    let index = -1, candidates = [];
    for (let i = 0; i < 81; i++) if (!board[i]) {
      const choices = [];
      for (let value = 1; value <= 9; value++) {
        board[i] = value;
        if (!sudokuConflicts(board).has(i)) choices.push(value);
      }
      board[i] = 0;
      if (index < 0 || choices.length < candidates.length) { index = i; candidates = choices; }
      if (candidates.length < 2) break;
    }
    if (index < 0) { count++; return; }
    for (const value of candidates) { board[index] = value; search(); }
    board[index] = 0;
  }
  search(); return count;
}

test('Sudoku transformations preserve valid solutions, every clue, and a unique solvable puzzle', () => {
  let seed = 42;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const signatures = new Set();
  for (let i = 0; i < 6; i++) {
    const {clues, solution} = createSudokuPuzzle(random);
    assert.equal(clues.length, 81); assert.equal(solution.length, 81);
    assert.equal(clues.filter(Boolean).length, 30); assert.equal(sudokuConflicts(clues).size, 0);
    assert.equal(sudokuComplete(solution), true); assert.equal(sudokuComplete(clues), false);
    clues.forEach((value, index) => { if (value) assert.equal(value, solution[index]); });
    assert.equal(countSolutions(clues), 1); signatures.add(clues.join(''));
  }
  assert.equal(signatures.size, 6);
  const duplicate = Array(81).fill(0); duplicate[0] = 2; duplicate[1] = 2; duplicate[27] = 2;
  assert.deepEqual([...sudokuConflicts(duplicate)].sort((a, b) => a - b), [0, 1, 27]);
});

test('Arcade tabs, controls, clue protection, conflict feedback, and disposal work in the mounted DOM', () => {
  const dom = new JSDOM(`<main>${arcadeMarkup()}</main>`, {pretendToBeVisual: true});
  const document = dom.window.document, container = document.querySelector('main');
  let plays = 0;
  const arcade = createArcade(container, {onPlay: () => plays++});
  try {
    const tab = game => container.querySelector(`[data-arcade-tab="${game}"]`);
    assert.equal(container.querySelectorAll('[role="tab"]').length, 3);
    container.querySelector('[data-snake-toggle]').click();
    assert.equal(plays, 1); assert.equal(container.querySelector('[data-snake-toggle]').textContent, 'Pause');
    tab('2048').click();
    assert.equal(container.querySelector('[data-snake-toggle]').textContent, 'Resume');
    assert.equal(tab('2048').getAttribute('aria-selected'), 'true');
    assert.equal(container.querySelector('[data-arcade-panel="snake"]').hidden, true);
    const tileBefore = container.querySelector('[data-2048-board]').textContent;
    const tileState = {board: [...container.querySelector('[data-2048-board]').children].map(cell => Number(cell.dataset.value)), score: 0, won: false, over: false};
    const direction = ['down', 'left', 'right', 'up'].find(direction => move2048(tileState, direction, () => 0).moved);
    container.querySelector(`[data-2048-direction="${direction}"]`).click();
    assert.equal(plays, 2, 'The on-screen 2048 movement buttons play a turn');
    assert.notEqual(container.querySelector('[data-2048-board]').textContent, tileBefore);
    tab('sudoku').click();
    const inputs = [...container.querySelectorAll('[data-sudoku-cell]')];
    assert.equal(inputs.filter(input => input.readOnly).length, 30);
    const empty = inputs.find(input => !input.readOnly), index = Number(empty.dataset.sudokuCell);
    const fixedInRow = inputs.find((input, i) => input.readOnly && Math.floor(i / 9) === Math.floor(index / 9));
    empty.value = fixedInRow.value; empty.dispatchEvent(new dom.window.Event('input', {bubbles: true}));
    assert.equal(empty.getAttribute('aria-invalid'), 'true'); assert.match(container.querySelector('[data-sudoku-status]').textContent, /conflict/);
    const clue = inputs.find(input => input.readOnly), expected = clue.value;
    clue.value = '9'; clue.dispatchEvent(new dom.window.Event('input', {bubbles: true})); assert.equal(clue.value, expected);
    container.querySelector('[data-sudoku-reset]').click(); assert.equal(empty.value, '');
    arcade.dispose();
    const before = plays; empty.value = '1'; empty.dispatchEvent(new dom.window.Event('input', {bubbles: true}));
    tab('snake').click(); assert.equal(plays, before); assert.equal(tab('sudoku').getAttribute('aria-selected'), 'true');
  } finally { arcade.dispose(); dom.window.close(); }
});

test('Snake pauses on visibility loss and detachment and its interval is cleared on tab changes and disposal', () => {
  const dom = new JSDOM(`<main>${arcadeMarkup()}</main>`, {pretendToBeVisual: true});
  const document = dom.window.document, container = document.querySelector('main');
  let tick = null, cleared = 0;
  dom.window.setInterval = callback => { tick = callback; return 1; };
  dom.window.clearInterval = () => { cleared++; tick = null; };
  const arcade = createArcade(container);
  try {
    const toggle = container.querySelector('[data-snake-toggle]');
    toggle.click(); assert.equal(typeof tick, 'function');
    Object.defineProperty(document, 'hidden', {configurable: true, value: true});
    document.dispatchEvent(new dom.window.Event('visibilitychange'));
    assert.equal(tick, null); assert.equal(toggle.textContent, 'Resume');
    Object.defineProperty(document, 'hidden', {configurable: true, value: false});
    toggle.click(); container.remove(); tick(); assert.equal(tick, null);
    document.body.append(container); toggle.click();
    container.querySelector('[data-arcade-tab="2048"]').click(); assert.equal(tick, null);
    container.querySelector('[data-arcade-tab="snake"]').click(); toggle.click();
    arcade.dispose(); assert.equal(tick, null); assert.equal(cleared, 4);
    toggle.click(); assert.equal(tick, null);
  } finally { arcade.dispose(); dom.window.close(); }
});

test('Arcade deactivation preserves the current game and removes its handlers until reactivated', () => {
  const dom = new JSDOM(`<main>${arcadeMarkup()}</main>`, {pretendToBeVisual: true});
  const container = dom.window.document.querySelector('main');
  let plays = 0, interval = null;
  dom.window.setInterval = callback => { interval = callback; return 1; };
  dom.window.clearInterval = () => { interval = null; };
  const arcade = createArcade(container, {onPlay: () => plays++});
  try {
    container.querySelector('[data-snake-toggle]').click();
    interval();
    const body = container.querySelector('[data-snake-board]').innerHTML;
    arcade.setActive(false);
    assert.equal(interval, null);
    container.querySelector('[data-snake-reset]').click();
    assert.equal(container.querySelector('[data-snake-board]').innerHTML, body);
    arcade.setActive(true);
    assert.equal(container.querySelector('[data-snake-toggle]').textContent, 'Resume');
    assert.equal(container.querySelector('[data-snake-board]').innerHTML, body);
    container.querySelector('[data-snake-toggle]').click(); assert.equal(plays, 2);
    container.querySelector('[data-arcade-tab="sudoku"]').click();
    const input = container.querySelector('[data-sudoku-cell][data-fixed="false"]');
    input.value = '1'; input.dispatchEvent(new dom.window.Event('input', {bubbles: true}));
    arcade.setActive(false); arcade.setActive(true);
    assert.equal(input.value, '1'); assert.equal(container.querySelector('[data-arcade-tab="sudoku"]').getAttribute('aria-selected'), 'true');
  } finally { arcade.dispose(); dom.window.close(); }
});
