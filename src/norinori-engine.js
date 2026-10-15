/**
 * ZenNori - Japanese Seaweed Domino Division Logic Engine (Norinori / ノリノリ)
 * Pure JavaScript logic puzzle solver, validator, and deductive hint engine.
 */

const CELL_STATE = {
  EMPTY: 0,
  SHADED: 1, // Roasted nori sheet ■
  DOT: 2     // Confirmed rice grain ·
};

/**
 * Validates the current board state according to Norinori rules:
 * 1. Exactly 2 shaded nori cells in each outlined room/chamber.
 * 2. Every connected group of shaded cells must be an orthogonal domino of size exactly 2.
 * 3. No two dominoes touch orthogonally (implied by rule 2).
 */
function validateBoard(grid, rows, cols, rooms) {
  if (Array.isArray(rows) && cols === undefined) {
    rooms = rows;
    rows = grid.length;
    cols = grid[0].length;
  }
  const cellToRoom = Array.from({ length: rows }, () => Array(cols).fill(-1));
  rooms.forEach((rm, idx) => {
    rm.cells.forEach(([r, c]) => {
      cellToRoom[r][c] = idx;
    });
  });

  const roomStatus = [];
  let allRoomsValid = true;
  let totalShaded = 0;

  // 1. Room capacity check (exactly 2 shaded cells per room)
  for (let idx = 0; idx < rooms.length; idx++) {
    const rm = rooms[idx];
    const shadedCells = rm.cells.filter(([r, c]) => grid[r][c] === CELL_STATE.SHADED);
    totalShaded += shadedCells.length;

    const valid = (shadedCells.length === 2);
    if (!valid) allRoomsValid = false;

    roomStatus.push({
      id: idx,
      name: rm.name || `Chamber ${idx + 1}`,
      shadedCount: shadedCells.length,
      valid,
      exceeded: shadedCells.length > 2
    });
  }

  // 2. Connected component analysis of all shaded cells
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const dominoes = []; // Array of arrays of [r, c] for size-2 dominoes
  const singletonViolations = []; // [r, c] with no shaded neighbors
  const oversizeViolations = []; // [r, c] in components of size >= 3
  const ORTHO = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === CELL_STATE.SHADED && !visited[r][c]) {
        const comp = [];
        const queue = [[r, c]];
        visited[r][c] = true;

        while (queue.length > 0) {
          const [cr, cc] = queue.shift();
          comp.push([cr, cc]);

          for (const [dr, dc] of ORTHO) {
            const nr = cr + dr;
            const nc = cc + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
              if (grid[nr][nc] === CELL_STATE.SHADED && !visited[nr][nc]) {
                visited[nr][nc] = true;
                queue.push([nr, nc]);
              }
            }
          }
        }

        if (comp.length === 2) {
          dominoes.push(comp);
        } else if (comp.length === 1) {
          singletonViolations.push(comp[0]);
        } else if (comp.length >= 3) {
          comp.forEach(p => oversizeViolations.push(p));
        }
      }
    }
  }

  const expectedShaded = rooms.length * 2;
  const isComplete =
    allRoomsValid &&
    totalShaded === expectedShaded &&
    singletonViolations.length === 0 &&
    oversizeViolations.length === 0 &&
    dominoes.length * 2 === totalShaded;

  return {
    isComplete,
    allRoomsValid,
    totalShaded,
    expectedShaded,
    roomStatus,
    dominoes,
    singletonViolations,
    oversizeViolations
  };
}

/**
 * Solve a Norinori puzzle and verify solution uniqueness.
 */
function solveNorinori(rows, cols, rooms, maxSolutions = 2, timeLimitMs = 250) {
  const cellToRoom = Array.from({ length: rows }, () => Array(cols).fill(-1));
  rooms.forEach((rm, idx) => {
    rm.cells.forEach(([r, c]) => {
      cellToRoom[r][c] = idx;
    });
  });

  const grid = Array.from({ length: rows }, () => Array(cols).fill(CELL_STATE.EMPTY));
  const roomShadedCount = Array(rooms.length).fill(0);
  const roomEmptyCount = rooms.map(rm => rm.cells.length);
  const solutions = [];
  const deadline = Date.now() + timeLimitMs;
  let timedOut = false;

  const ORTHO = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  // Flatten cells list in standard order
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push([r, c]);
    }
  }

  function getShadedNeighbors(r, c) {
    let count = 0;
    for (const [dr, dc] of ORTHO) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === CELL_STATE.SHADED) {
        count++;
      }
    }
    return count;
  }

  function getCandidateNeighbors(r, c) {
    let count = 0;
    for (const [dr, dc] of ORTHO) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] !== CELL_STATE.DOT) {
        count++;
      }
    }
    return count;
  }

  let steps = 0;
  function search(idx) {
    if (solutions.length >= maxSolutions) return;
    if ((++steps & 511) === 0 && Date.now() > deadline) {
      timedOut = true;
      return;
    }

    if (idx === cells.length) {
      // Validate full board
      const res = validateBoard(grid, rows, cols, rooms);
      if (res.isComplete) {
        solutions.push(grid.map(row => [...row]));
      }
      return;
    }

    const [r, c] = cells[idx];
    const rm = cellToRoom[r][c];

    // Check if cell must be DOT or SHADED
    // If room already has 2 shaded cells, this MUST be DOT
    if (roomShadedCount[rm] === 2) {
      grid[r][c] = CELL_STATE.DOT;
      roomEmptyCount[rm]--;
      search(idx + 1);
      roomEmptyCount[rm]++;
      grid[r][c] = CELL_STATE.EMPTY;
      return;
    }

    // If remaining empty cells in room equals what's needed, this MUST be SHADED
    if (roomEmptyCount[rm] === (2 - roomShadedCount[rm])) {
      // Can it be shaded without violating domino rules?
      const curShadedNbrs = getShadedNeighbors(r, c);
      if (curShadedNbrs <= 1) {
        // Also verify any already-shaded neighbor didn't already have a partner
        let partnerViolation = false;
        for (const [dr, dc] of ORTHO) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === CELL_STATE.SHADED) {
            if (getShadedNeighbors(nr, nc) >= 1) {
              partnerViolation = true;
              break;
            }
          }
        }

        if (!partnerViolation) {
          grid[r][c] = CELL_STATE.SHADED;
          roomShadedCount[rm]++;
          roomEmptyCount[rm]--;
          search(idx + 1);
          roomEmptyCount[rm]++;
          roomShadedCount[rm]--;
          grid[r][c] = CELL_STATE.EMPTY;
        }
      }
      return;
    }

    // Try Option 1: SHADED
    const curShadedNbrs = getShadedNeighbors(r, c);
    if (curShadedNbrs <= 1) {
      let partnerViolation = false;
      for (const [dr, dc] of ORTHO) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === CELL_STATE.SHADED) {
          if (getShadedNeighbors(nr, nc) >= 1) {
            partnerViolation = true;
            break;
          }
        }
      }

      // Check if it has at least 1 candidate neighbor to complete a domino
      const candNbrs = getCandidateNeighbors(r, c);
      if (!partnerViolation && candNbrs >= 1) {
        grid[r][c] = CELL_STATE.SHADED;
        roomShadedCount[rm]++;
        roomEmptyCount[rm]--;
        search(idx + 1);
        roomEmptyCount[rm]++;
        roomShadedCount[rm]--;
        grid[r][c] = CELL_STATE.EMPTY;
        if (solutions.length >= maxSolutions || timedOut) return;
      }
    }

    // Try Option 2: DOT
    // Before making it DOT, ensure any already-shaded neighbor didn't lose its only candidate!
    let isolatesNeighbor = false;
    for (const [dr, dc] of ORTHO) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === CELL_STATE.SHADED) {
        if (getShadedNeighbors(nr, nc) === 0) {
          // It needs at least one candidate among its remaining neighbors
          let otherCands = 0;
          for (const [ddr, ddc] of ORTHO) {
            const nnr = nr + ddr;
            const nnc = nc + ddc;
            if (nnr >= 0 && nnr < rows && nnc >= 0 && nnc < cols && !(nnr === r && nnc === c)) {
              if (grid[nnr][nnc] !== CELL_STATE.DOT) otherCands++;
            }
          }
          if (otherCands === 0) {
            isolatesNeighbor = true;
            break;
          }
        }
      }
    }

    if (!isolatesNeighbor) {
      grid[r][c] = CELL_STATE.DOT;
      roomEmptyCount[rm]--;
      search(idx + 1);
      roomEmptyCount[rm]++;
      grid[r][c] = CELL_STATE.EMPTY;
    }
  }

  search(0);
  return {
    count: solutions.length,
    isUnique: !timedOut && solutions.length === 1,
    solutions,
    timedOut
  };
}

/**
 * Deductive hint generator for step-by-step logic guidance.
 */
function getHint(grid, rows, cols, rooms, solvedGrid) {
  if (Array.isArray(rows) && (cols === undefined || Array.isArray(cols))) {
    solvedGrid = cols;
    rooms = rows;
    rows = grid.length;
    cols = grid[0].length;
  }
  const ORTHO = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  // 1. Room Full Deduction: room already has 2 shaded cells -> mark remaining empty as DOT
  for (let rmIdx = 0; rmIdx < rooms.length; rmIdx++) {
    const rm = rooms[rmIdx];
    const shaded = rm.cells.filter(([r, c]) => grid[r][c] === CELL_STATE.SHADED);
    const empty = rm.cells.filter(([r, c]) => grid[r][c] === CELL_STATE.EMPTY);

    if (shaded.length === 2 && empty.length > 0) {
      const [er, ec] = empty[0];
      return {
        r: er,
        c: ec,
        row: er,
        col: ec,
        targetState: CELL_STATE.DOT,
        message: `${rm.name || 'This chamber'} already has its 2 nori sheets. Mark remaining cells as rice floor.`
      };
    }
  }

  // 2. Room Forced Shaded: remaining candidate cells equals what's needed for 2
  for (let rmIdx = 0; rmIdx < rooms.length; rmIdx++) {
    const rm = rooms[rmIdx];
    const shaded = rm.cells.filter(([r, c]) => grid[r][c] === CELL_STATE.SHADED);
    const available = rm.cells.filter(([r, c]) => grid[r][c] !== CELL_STATE.DOT);
    const empty = rm.cells.filter(([r, c]) => grid[r][c] === CELL_STATE.EMPTY);

    if (shaded.length < 2 && available.length === 2 && empty.length > 0) {
      const [er, ec] = empty[0];
      return {
        r: er,
        c: ec,
        row: er,
        col: ec,
        targetState: CELL_STATE.SHADED,
        message: `${rm.name || 'This chamber'} requires 2 nori sheets and only 2 candidate spots remain.`
      };
    }
  }

  // 3. Domino Completion: single shaded cell has only 1 available orthogonal candidate
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === CELL_STATE.SHADED) {
        // Count shaded neighbors
        const shadedNbrs = [];
        const candNbrs = [];

        for (const [dr, dc] of ORTHO) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            if (grid[nr][nc] === CELL_STATE.SHADED) shadedNbrs.push([nr, nc]);
            else if (grid[nr][nc] === CELL_STATE.EMPTY) candNbrs.push([nr, nc]);
          }
        }

        if (shadedNbrs.length === 0 && candNbrs.length === 1) {
          const [er, ec] = candNbrs[0];
          return {
            r: er,
            c: ec,
            row: er,
            col: ec,
            targetState: CELL_STATE.SHADED,
            message: `Cell (${r + 1}, ${c + 1}) must complete an orthogonal domino; only cell (${er + 1}, ${ec + 1}) is available.`
          };
        }
      }
    }
  }

  // 4. Domino Isolation: domino of size 2 is formed -> all its orthogonal neighbors must be DOT
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === CELL_STATE.SHADED) {
        // Find if it has exactly 1 shaded neighbor (forming a domino)
        let partner = null;
        let partnerCount = 0;
        for (const [dr, dc] of ORTHO) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === CELL_STATE.SHADED) {
            partner = [nr, nc];
            partnerCount++;
          }
        }

        if (partnerCount === 1) {
          // For both [r, c] and partner, any orthogonal neighbor that is EMPTY must be DOT
          const cellsInDomino = [[r, c], partner];
          for (const [dr, dc] of cellsInDomino) {
            for (const [odr, odc] of ORTHO) {
              const onr = dr + odr;
              const onc = dc + odc;
              if (onr >= 0 && onr < rows && onc >= 0 && onc < cols) {
                if (grid[onr][onc] === CELL_STATE.EMPTY) {
                  return {
                    r: onr,
                    c: onc,
                    row: onr,
                    col: onc,
                    targetState: CELL_STATE.DOT,
                    message: `To prevent dominoes from touching orthogonally, cell (${onr + 1}, ${onc + 1}) must be marked as rice floor.`
                  };
                }
              }
            }
          }
        }
      }
    }
  }

  // 5. Dead Cell: an EMPTY cell that has 0 candidate neighbors cannot form a domino
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === CELL_STATE.EMPTY) {
        let validNeighbors = 0;
        for (const [dr, dc] of ORTHO) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            if (grid[nr][nc] !== CELL_STATE.DOT) validNeighbors++;
          }
        }
        if (validNeighbors === 0) {
          return {
            r,
            c,
            row: r,
            col: c,
            targetState: CELL_STATE.DOT,
            message: `Cell (${r + 1}, ${c + 1}) has no available neighbors to form a domino, so it must be rice floor.`
          };
        }
      }
    }
  }

  // 6. Fallback to solution-guided hint
  if (solvedGrid) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] === CELL_STATE.EMPTY) {
          const target = solvedGrid[r][c] === 1 ? CELL_STATE.SHADED : CELL_STATE.DOT;
          return {
            r,
            c,
            row: r,
            col: c,
            targetState: target,
            message: target === CELL_STATE.SHADED
              ? `Cell (${r + 1}, ${c + 1}) is part of a savory nori domino.`
              : `Cell (${r + 1}, ${c + 1}) should be rice floor.`
          };
        }
      }
    }
  }

  return null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CELL_STATE,
    validateBoard,
    solveNorinori,
    getHint,
    getDeductiveHint: getHint
  };
}
if (typeof window !== 'undefined') {
  window.CELL_STATE = CELL_STATE;
  window.validateBoard = validateBoard;
  window.solveNorinori = solveNorinori;
  window.getHint = getHint;
  window.getDeductiveHint = getHint;
  window.ZenNoriEngine = {
    CELL_STATE,
    validateBoard,
    solveNorinori,
    getHint,
    getDeductiveHint: getHint
  };
}
