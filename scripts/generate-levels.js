const fs = require('fs');
const path = require('path');
const { CELL_STATE, solveNorinori } = require('../src/norinori-engine.js');

console.log('Generating 50 solver-verified Norinori levels across 5 packs...');

const PACKS = [
  { name: 'Bento • Novice', size: 6, minRooms: 6, maxRooms: 8, count: 10 },
  { name: 'Onigiri • Apprentice', size: 7, minRooms: 8, maxRooms: 10, count: 10 },
  { name: 'Kaiseki • Journeyman', size: 8, minRooms: 12, maxRooms: 14, count: 10 },
  { name: 'Izakaya • Artisan', size: 9, minRooms: 15, maxRooms: 17, count: 10 },
  { name: 'Shokunin • Master', size: 10, minRooms: 17, maxRooms: 19, count: 10 }
];

const LEVEL_NAMES = [
  // Bento • Novice (1-10)
  "Bamboo Bento", "Crispy Nori", "Morning Rice", "Sesame Sprinkle", "Tamagoyaki",
  "Pickled Plum", "Edamame Pods", "Steamed Dumpling", "Green Tea Sip", "Cedar Chopsticks",
  // Onigiri • Apprentice (11-20)
  "Salmon Flakes", "Seaweed Ribbon", "Warm Rice Ball", "Bonito Shavings", "Toasted Sesame",
  "Shiso Leaf", "Lotus Root", "Sweet Mirin", "Miso Warmth", "Wooden Steamer",
  // Kaiseki • Journeyman (21-30)
  "Kyoto Garden", "Autumn Ginkgo", "Earthenware Dish", "Spring Bamboo", "Stone Pathway",
  "Silver River", "Pine Needle", "Winter Camellia", "Evening Lantern", "Zen Courtyard",
  // Izakaya • Artisan (31-40)
  "Yakitori Skewer", "Sizzling Plate", "Paper Lantern", "Cedar Counter", "Warm Sake",
  "Summer Breeze", "Charcoal Grill", "Smoky Hearth", "Rustic Tavern", "Night Whispers",
  // Shokunin • Master (41-50)
  "Master Carpenter", "Harmonious Joinery", "Pure Craftsmanship", "Silent Reflection", "Temple Veranda",
  "Ancient Cypress", "Morning Mist", "Golden Leaf", "Sacred Bell", "Eternal Harmony"
];

const ORTHO = [[-1, 0], [1, 0], [0, -1], [0, 1]];

function generateReverseNorinori(rows, cols, numRooms, seed) {
  let s = seed;
  function rand() {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  }
  function randInt(min, max) {
    return Math.floor(rand() * (max - min)) + min;
  }

  for (let attempt = 0; attempt < 400; attempt++) {
    const grid = Array.from({ length: rows }, () => Array(cols).fill(CELL_STATE.EMPTY));
    const roomAssignments = Array.from({ length: rows }, () => Array(cols).fill(-1));
    const placedDominoes = [];

    const cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) cells.push([r, c]);
    }
    for (let i = cells.length - 1; i > 0; i--) {
      const j = randInt(0, i + 1);
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }

    for (let rm = 0; rm < numRooms; rm++) {
      let placed = false;
      for (const [r, c] of cells) {
        if (grid[r][c] !== CELL_STATE.EMPTY) continue;
        let touches = false;
        for (const [dr, dc] of ORTHO) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === CELL_STATE.SHADED) {
            touches = true;
            break;
          }
        }
        if (touches) continue;

        const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        if (rand() > 0.5) dirs.reverse();

        for (const [dr, dc] of dirs) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === CELL_STATE.EMPTY) {
            let pTouches = false;
            for (const [odr, odc] of ORTHO) {
              const onr = nr + odr, onc = nc + odc;
              if (onr >= 0 && onr < rows && onc >= 0 && onc < cols && !(onr === r && onc === c)) {
                if (grid[onr][onc] === CELL_STATE.SHADED) {
                  pTouches = true;
                  break;
                }
              }
            }
            if (!pTouches) {
              grid[r][c] = CELL_STATE.SHADED;
              grid[nr][nc] = CELL_STATE.SHADED;
              roomAssignments[r][c] = rm;
              roomAssignments[nr][nc] = rm;
              placedDominoes.push([[r, c], [nr, nc]]);
              placed = true;
              break;
            }
          }
        }
        if (placed) break;
      }
      if (!placed) break;
    }

    if (placedDominoes.length < numRooms) continue;

    // Pick expandable rooms: 22% for 9x9 and 10x10 to lock in unique dominoes, 40% for smaller
    const expandable = new Set();
    const growFraction = rows >= 9 ? 0.22 : 0.4;
    const growCount = Math.max(2, Math.floor(numRooms * growFraction));
    const shuffledRooms = Array.from({ length: numRooms }, (_, i) => i);
    for (let i = shuffledRooms.length - 1; i > 0; i--) {
      const j = randInt(0, i + 1);
      [shuffledRooms[i], shuffledRooms[j]] = [shuffledRooms[j], shuffledRooms[i]];
    }
    for (let i = 0; i < growCount; i++) expandable.add(shuffledRooms[i]);

    let unassigned = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) if (roomAssignments[r][c] === -1) unassigned++;
    }

    let iterations = 0;
    while (unassigned > 0 && iterations++ < 50) {
      let changed = false;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (roomAssignments[r][c] === -1) {
            const nbrs = [];
            for (const [dr, dc] of ORTHO) {
              const nr = r + dr, nc = c + dc;
              if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && roomAssignments[nr][nc] !== -1) {
                if (expandable.has(roomAssignments[nr][nc])) {
                  nbrs.push(roomAssignments[nr][nc]);
                }
              }
            }
            if (nbrs.length > 0) {
              roomAssignments[r][c] = nbrs[randInt(0, nbrs.length)];
              unassigned--;
              changed = true;
            }
          }
        }
      }
      if (!changed) {
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (roomAssignments[r][c] === -1) {
              for (const [dr, dc] of ORTHO) {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && roomAssignments[nr][nc] !== -1) {
                  roomAssignments[r][c] = roomAssignments[nr][nc];
                  unassigned--;
                  changed = true;
                  break;
                }
              }
            }
          }
        }
      }
    }

    if (unassigned > 0) continue;

    const roomMap = new Map();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const id = roomAssignments[r][c];
        if (!roomMap.has(id)) roomMap.set(id, []);
        roomMap.get(id).push([r, c]);
      }
    }

    const roomsDef = Array.from(roomMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([id, cellList]) => ({ id, name: `Chamber ${id + 1}`, cells: cellList }));

    const res = solveNorinori(rows, cols, roomsDef, 2, 120);
    if (!res.timedOut && res.count === 1) {
      return {
        rows,
        cols,
        rooms: roomsDef,
        solution: res.solutions[0]
      };
    }
  }
  return null;
}

const verifiedLevels = [];
let seedCounter = 20261015;

for (let pIdx = 0; pIdx < PACKS.length; pIdx++) {
  const pack = PACKS[pIdx];
  console.log(`Generating pack: ${pack.name} (${pack.size}x${pack.size})...`);
  let packFound = 0;

  while (packFound < pack.count) {
    const levelId = verifiedLevels.length + 1;
    const name = LEVEL_NAMES[levelId - 1] || `Chamber ${levelId}`;
    const numRooms = pack.minRooms + Math.floor((packFound / pack.count) * (pack.maxRooms - pack.minRooms + 1));

    let lvl = null;
    while (!lvl) {
      lvl = generateReverseNorinori(pack.size, pack.size, numRooms, seedCounter++);
    }

    packFound++;
    verifiedLevels.push({
      id: levelId,
      name,
      pack: pack.name,
      rows: pack.size,
      cols: pack.size,
      rooms: lvl.rooms,
      solution: lvl.solution
    });
    console.log(`  ✓ Level ${levelId} "${name}" (${pack.name}) verified unique!`);
  }
}

console.log('All 50 levels successfully generated!');

// Compact storage format
const compactLevels = verifiedLevels.map(lvl => {
  let gridStr = '';
  for (let r = 0; r < lvl.rows; r++) {
    for (let c = 0; c < lvl.cols; c++) {
      const rm = lvl.rooms.findIndex(rm => rm.cells.some(p => p[0] === r && p[1] === c));
      gridStr += rm.toString(36);
    }
  }
  let solStr = '';
  for (let r = 0; r < lvl.rows; r++) {
    for (let c = 0; c < lvl.cols; c++) {
      solStr += lvl.solution[r][c].toString();
    }
  }
  return {
    id: lvl.id,
    name: lvl.name,
    pack: lvl.pack,
    rows: lvl.rows,
    cols: lvl.cols,
    grid: gridStr,
    sol: solStr
  };
});

const fileContent = `/**
 * ZenNori - 50 Handcrafted Solver-Verified Levels
 * All levels verified with unique solution by the Norinori constraint solver.
 */

const RAW_LEVELS = ${JSON.stringify(compactLevels)};

const LEVELS = RAW_LEVELS.map(d => {
  const roomMap = new Map();
  for (let r = 0; r < d.rows; r++) {
    for (let c = 0; c < d.cols; c++) {
      const id = parseInt(d.grid[r * d.cols + c], 36);
      if (!roomMap.has(id)) roomMap.set(id, []);
      roomMap.get(id).push([r, c]);
    }
  }
  const rooms = Array.from(roomMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([id, cells]) => ({ id, name: 'Chamber ' + (id + 1), cells }));
  const solution = [];
  for (let r = 0; r < d.rows; r++) {
    const row = [];
    for (let c = 0; c < d.cols; c++) {
      row.push(parseInt(d.sol[r * d.cols + c], 10));
    }
    solution.push(row);
  }
  return { id: d.id, name: d.name, pack: d.pack, rows: d.rows, cols: d.cols, rooms, solution };
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LEVELS };
}
if (typeof window !== 'undefined') {
  window.LEVELS = LEVELS;
  window.ZENNORI_LEVELS = LEVELS;
}
`;

fs.writeFileSync(path.join(__dirname, '..', 'src', 'levels.js'), fileContent, 'utf8');
console.log('Saved src/levels.js successfully!');
