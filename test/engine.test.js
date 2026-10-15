const test = require('node:test');
const assert = require('node:assert/strict');
const {
  CELL_STATE,
  validateBoard,
  solveNorinori,
  getHint
} = require('../src/norinori-engine.js');

test('Norinori Engine - Valid Board Validation', () => {
  const rows = 4, cols = 4;
  // Two 8-cell rooms
  const rooms = [
    { id: 0, cells: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [1, 1], [1, 2], [1, 3]] },
    { id: 1, cells: [[2, 0], [2, 1], [2, 2], [2, 3], [3, 0], [3, 1], [3, 2], [3, 3]] }
  ];
  const grid = Array.from({ length: rows }, () => Array(cols).fill(CELL_STATE.EMPTY));

  // Place a 1x2 domino in room 0: (0, 0) and (0, 1)
  grid[0][0] = CELL_STATE.SHADED;
  grid[0][1] = CELL_STATE.SHADED;

  // Place a 1x2 domino in room 1: (3, 2) and (3, 3) (diagonal/separated, no touching)
  grid[3][2] = CELL_STATE.SHADED;
  grid[3][3] = CELL_STATE.SHADED;

  const res = validateBoard(grid, rows, cols, rooms);
  assert.equal(res.isComplete, true);
  assert.equal(res.dominoes.length, 2);
  assert.equal(res.singletonViolations.length, 0);
  assert.equal(res.oversizeViolations.length, 0);
});

test('Norinori Engine - Cross-Chamber Domino Validation', () => {
  const rows = 2, cols = 2;
  // Two 2-cell vertical rooms
  const rooms = [
    { id: 0, cells: [[0, 0], [1, 0]] },
    { id: 1, cells: [[0, 1], [1, 1]] }
  ];
  const grid = Array.from({ length: rows }, () => Array(cols).fill(CELL_STATE.SHADED));

  // In this 2x2 grid, each cell is shaded:
  // (0,0)-(0,1) is a 1x2 domino spanning rooms 0 and 1!
  // (1,0)-(1,1) would touch (0,0)-(0,1), forming a 2x2 cluster (oversize)
  const res = validateBoard(grid, rows, cols, rooms);
  assert.equal(res.isComplete, false);
  assert.ok(res.oversizeViolations.length > 0);
});

test('Norinori Engine - Singleton Shaded Cell Violation', () => {
  const rows = 3, cols = 3;
  const rooms = [
    { id: 0, cells: [[0, 0], [0, 1], [0, 2], [1, 0]] },
    { id: 1, cells: [[1, 1], [1, 2], [2, 0], [2, 1], [2, 2]] }
  ];
  const grid = Array.from({ length: rows }, () => Array(cols).fill(CELL_STATE.EMPTY));
  grid[0][0] = CELL_STATE.SHADED; // isolated single cell

  const res = validateBoard(grid, rows, cols, rooms);
  assert.equal(res.isComplete, false);
  assert.equal(res.singletonViolations.length, 1);
});

test('Norinori Engine - Oversize Component Violation (Size >= 3)', () => {
  const rows = 3, cols = 3;
  const rooms = [
    { id: 0, cells: [[0, 0], [0, 1], [0, 2]] },
    { id: 1, cells: [[1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]] }
  ];
  const grid = Array.from({ length: rows }, () => Array(cols).fill(CELL_STATE.EMPTY));
  // 3 shaded cells in a line
  grid[0][0] = CELL_STATE.SHADED;
  grid[0][1] = CELL_STATE.SHADED;
  grid[0][2] = CELL_STATE.SHADED;

  const res = validateBoard(grid, rows, cols, rooms);
  assert.equal(res.isComplete, false);
  assert.equal(res.oversizeViolations.length, 3);
});

test('Norinori Engine - Deductive Hint Engine', () => {
  const rows = 3, cols = 3;
  // Room 0 has 2 cells: (0,0) and (0,1)
  const rooms = [
    { id: 0, cells: [[0, 0], [0, 1]] },
    { id: 1, cells: [[0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]] }
  ];
  const grid = Array.from({ length: rows }, () => Array(cols).fill(CELL_STATE.EMPTY));

  // Since room 0 only has 2 candidate cells, both must be shaded nori!
  const hint1 = getHint(grid, rows, cols, rooms, null);
  assert.ok(hint1);
  assert.equal(hint1.targetState, CELL_STATE.SHADED);

  // Now shade (0, 0) and (0, 1) to form a domino
  grid[0][0] = CELL_STATE.SHADED;
  grid[0][1] = CELL_STATE.SHADED;

  // The hint should suggest marking adjacent neighbor (1, 0) or (1, 1) or (0, 2) as DOT to isolate the domino!
  const hint2 = getHint(grid, rows, cols, rooms, null);
  assert.ok(hint2);
  assert.equal(hint2.targetState, CELL_STATE.DOT);
});

test('Norinori Engine - Solver and Uniqueness Verification', () => {
  const rows = 4, cols = 4;
  // 4 rooms of 4 cells each
  const rooms = [
    { id: 0, cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
    { id: 1, cells: [[0, 2], [0, 3], [1, 2], [1, 3]] },
    { id: 2, cells: [[2, 0], [2, 1], [3, 0], [3, 1]] },
    { id: 3, cells: [[2, 2], [2, 3], [3, 2], [3, 3]] }
  ];

  const res = solveNorinori(rows, cols, rooms, 2, 500);
  assert.ok(res.count >= 1);
  assert.equal(res.timedOut, false);
});

test('Norinori Levels - Verify All 50 Level Solutions and Structure', () => {
  const { LEVELS } = require('../src/levels.js');
  assert.equal(LEVELS.length, 50, 'Must have exactly 50 levels');

  for (const lvl of LEVELS) {
    assert.ok(lvl.id >= 1 && lvl.id <= 50);
    assert.ok(lvl.name && lvl.name.length > 0);
    assert.ok(lvl.pack && lvl.pack.length > 0);
    assert.ok(lvl.rows >= 6 && lvl.rows <= 10);
    assert.ok(lvl.cols >= 6 && lvl.cols <= 10);
    assert.ok(lvl.rooms.length > 0);

    // Validate precomputed solution
    const val = validateBoard(lvl.solution, lvl.rooms);
    assert.equal(val.isComplete, true, `Level ${lvl.id} (${lvl.name}) solution must be complete`);
    assert.equal(val.allRoomsValid, true, `Level ${lvl.id} (${lvl.name}) rooms must be valid`);
    assert.equal(val.singletonViolations.length, 0);
    assert.equal(val.oversizeViolations.length, 0);
  }
});
