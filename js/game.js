// ============================================================
// DOMINOES-QUATTRO — ИГРОВАЯ ЛОГИКА
// ============================================================

// ============================================================
// АУДИО — звуковые эффекты
// ============================================================

let audioCtx = null;
let soundEnabled = true;   // ← переключатель звука

const SOUND_KEY = 'dominoes_sound_enabled';

function loadSoundSetting() {
    const saved = localStorage.getItem(SOUND_KEY);
    soundEnabled = saved !== 'false';   // по умолчанию — включено
}

function saveSoundSetting() {
    try {
        localStorage.setItem(SOUND_KEY, soundEnabled ? 'true' : 'false');
    } catch (e) { /* ignore */ }
}

function initAudio() {
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('AudioContext не поддерживается');
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

document.addEventListener('click', function once() {
    initAudio();
    document.removeEventListener('click', once);
}, { once: true });

// Универсальный генератор одного тона
function playTone({
    type = 'sine',
    freqStart = 440,
    freqEnd = null,
    duration = 0.1,
    volume = 0.1,
    delay = 0
}) {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime + delay;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    if (freqEnd !== null) {
        osc.frequency.exponentialRampToValueAtTime(freqEnd, now + duration);
    }

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.start(now);
    osc.stop(now + duration);
}

function playSound(type) {
    if (!soundEnabled) return;
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    switch (type) {
        case 'rotate':
            playTone({ type: 'sine', freqStart: 800, freqEnd: 400, duration: 0.1, volume: 0.1 });
            break;

        case 'place':
            playTone({ type: 'triangle', freqStart: 150, freqEnd: 50, duration: 0.15, volume: 0.2 });
            break;

        case 'error':
            playTone({ type: 'sawtooth', freqStart: 150, freqEnd: 100, duration: 0.2, volume: 0.1 });
            break;

        case 'click':
            playTone({ type: 'square', freqStart: 500, freqEnd: 400, duration: 0.05, volume: 0.05 });
            break;

        case 'pick':
            playTone({ type: 'sine', freqStart: 600, freqEnd: 900, duration: 0.12, volume: 0.12 });
            break;

        case 'win':
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
                playTone({
                    type: 'sine',
                    freqStart: freq,
                    duration: 0.4,
                    volume: 0.15,
                    delay: i * 0.1
                });
            });
            break;

        case 'lose':
            [523.25, 440.00, 349.23, 261.63].forEach((freq, i) => {
                playTone({
                    type: 'sine',
                    freqStart: freq,
                    duration: 0.35,
                    volume: 0.15,
                    delay: i * 0.12
                });
            });
            break;

        case 'draw':
            [440.00, 440.00].forEach((freq, i) => {
                playTone({
                    type: 'sine',
                    freqStart: freq,
                    duration: 0.25,
                    volume: 0.13,
                    delay: i * 0.2
                });
            });
            break;
    }
}

// Переключатель звука — для внешнего вызова (например, с кнопки)
function toggleSound() {
    soundEnabled = !soundEnabled;
    saveSoundSetting();
    if (soundEnabled) playSound('click');
    return soundEnabled;
}

// ============================================================
// СОХРАНЕНИЕ
// ============================================================

const STORAGE_KEY = 'dominoes_quattro_stats';
const EXTRA_KEY = 'dominoes_quattro_extra';
const DIFFICULTY_KEY = 'dominoes_difficulty';

function loadStats() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const stats = JSON.parse(saved);
            playerScore = stats.playerScore || 0;
            computerScore = stats.computerScore || 0;
            playerMoves = stats.playerMoves || 0;
            computerMoves = stats.computerMoves || 0;
            playerTotalContacts = stats.playerTotalContacts || 0;
            computerTotalContacts = stats.computerTotalContacts || 0;
        } catch (e) {
            console.error('Ошибка загрузки статистики:', e);
        }
    }
}

function saveStats() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            playerScore, computerScore, playerMoves, computerMoves,
            playerTotalContacts, computerTotalContacts
        }));
    } catch (e) {
        console.error('Ошибка сохранения:', e);
    }
}

function saveGameResult(winner) {
    let extra = { playerWins: 0, computerWins: 0, draws: 0 };
    try {
        const saved = localStorage.getItem(EXTRA_KEY);
        if (saved) extra = JSON.parse(saved);
    } catch (e) { /* ignore */ }

    if (winner === 'player') extra.playerWins = (extra.playerWins || 0) + 1;
    else if (winner === 'computer') extra.computerWins = (extra.computerWins || 0) + 1;
    else extra.draws = (extra.draws || 0) + 1;

    try {
        localStorage.setItem(EXTRA_KEY, JSON.stringify(extra));
    } catch (e) { /* ignore */ }
}

function getDifficulty() {
    const d = localStorage.getItem(DIFFICULTY_KEY);
    if (d === 'easy' || d === 'medium' || d === 'hard') return d;
    return 'medium';
}

function difficultyLabel(d) {
    if (d === 'easy') return 'Лёгкая';
    if (d === 'hard') return 'Сложная';
    return 'Средняя';
}

function showMessage(text) {
    const messageArea = document.getElementById('messageArea');
    if (messageArea) messageArea.textContent = text;
}

// ============================================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ============================================================

let CELL_SIZE = 29;
let TILE_SIZE = 64;
let YELLOW_SIZE = 25;

let board = [];
let selectedTileIndex = 0;
let currentRotation = 0;
let moveCount = 0;
let shiftType = null;
let yellowDirection = null;
let yellowCells = [];

let deck = [];
let playerHand = [];
let computerHand = [];
let isComputerTurn = false;
let isGameOver = false;
let isWaitingForPlayerExtraTurn = false;

let playerScore = 0;
let computerScore = 0;
let playerMoves = 0;
let computerMoves = 0;
let playerTotalContacts = 0;
let computerTotalContacts = 0;

let maxMoves = 0;
let extraTurnsNeeded = 0;
let extraTurnsCompleted = 0;
let gameWinner = null;
let winReason = '';

let moveBonusGiven = false;
let currentDifficulty = 'medium';

// ============================================================
// РАЗМЕРЫ
// ============================================================

function getSizes() {
    const width = window.innerWidth;
    const gap = 2;
    const border = 2;
    const extra = gap + border * 2;   // 6
    let tileSize, cellSize, yellowSize;

    if (width <= 420) {
        cellSize = 13; tileSize = cellSize * 2 + extra; yellowSize = cellSize - 1;
    } else if (width <= 550) {
        cellSize = 15; tileSize = cellSize * 2 + extra; yellowSize = cellSize - 2;
    } else if (width <= 700) {
        cellSize = 18; tileSize = cellSize * 2 + extra; yellowSize = cellSize - 3;
    } else if (width <= 850) {
        cellSize = 23; tileSize = cellSize * 2 + extra; yellowSize = cellSize - 4;
    } else {
        cellSize = 29; tileSize = cellSize * 2 + extra; yellowSize = cellSize - 4;
    }

    return { tileSize, cellSize, yellowSize };
}

function updateSizes() {
    const sizes = getSizes();
    TILE_SIZE = sizes.tileSize;
    CELL_SIZE = sizes.cellSize;
    YELLOW_SIZE = sizes.yellowSize;
}

// ============================================================
// ГЕНЕРАЦИЯ
// ============================================================

function generateAllTiles() {
    const tiles = [];
    for (let a = 1; a <= 6; a++)
        for (let b = a; b <= 6; b++)
            for (let c = b; c <= 6; c++)
                for (let d = c; d <= 6; d++)
                    tiles.push([a, b, c, d]);
    return tiles;
}

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ============================================================
// ПОВОРОТЫ
// ============================================================

function rotateTileCW(tile) {
    return [tile[2], tile[0], tile[3], tile[1]];
}

function rotateTileCCW(tile) {
    return [tile[1], tile[3], tile[0], tile[2]];
}

function getRotatedTile(tile, rotation) {
    let result = [...tile];
    for (let i = 0; i < rotation; i++) result = rotateTileCW(result);
    return result;
}

function rotateSelectedTileCW() {
    const tile = playerHand[selectedTileIndex];
    if (tile === null || tile === undefined) {
        showMessage('⚠️ Активный слот пуст!');
        playSound('error');
        return;
    }
    currentRotation = (currentRotation + 1) % 4;
    playSound('rotate');
    if (typeof renderBoard === 'function') renderBoard();
    if (typeof updateUI === 'function') updateUI();
}

function rotateSelectedTileCCW() {
    const tile = playerHand[selectedTileIndex];
    if (tile === null || tile === undefined) {
        showMessage('⚠️ Активный слот пуст!');
        playSound('error');
        return;
    }
    currentRotation = (currentRotation - 1 + 4) % 4;
    playSound('rotate');
    if (typeof renderBoard === 'function') renderBoard();
    if (typeof updateUI === 'function') updateUI();
}

// ============================================================
// КОЛОДА И РАЗДАЧА
// ============================================================

function drawTile() {
    if (deck.length === 0) return null;
    return deck.pop();
}

function dealTiles() {
    const allTiles = generateAllTiles();
    shuffleArray(allTiles);
    deck = [...allTiles];
    playerHand = [];
    computerHand = [];

    playerScore = 0;
    computerScore = 0;
    playerMoves = 0;
    computerMoves = 0;
    playerTotalContacts = 0;
    computerTotalContacts = 0;
    saveStats();

    maxMoves = 0;
    extraTurnsNeeded = 0;
    extraTurnsCompleted = 0;
    gameWinner = null;
    winReason = '';
    isWaitingForPlayerExtraTurn = false;
    selectedTileIndex = 0;
    currentRotation = 0;

    moveBonusGiven = false;
    currentDifficulty = getDifficulty();

    updateSizes();

    for (let i = 0; i < 7; i++) {
        if (deck.length > 0) playerHand.push(deck.pop());
    }
    for (let i = 0; i < 7; i++) {
        if (deck.length > 0) computerHand.push(deck.pop());
    }
}

function takeTileForComputer() {
    if (deck.length === 0) return false;
    const tile = drawTile();
    if (tile) {
        computerHand.push(tile);
        return true;
    }
    return false;
}

function addTileForPlayer() {
    if (isComputerTurn || isGameOver) return false;
    if (deck.length === 0) return false;

    const tile = deck.pop();
    const emptyIdx = playerHand.indexOf(null);

    if (emptyIdx !== -1) {
        playerHand[emptyIdx] = tile;
    } else {
        playerHand.push(tile);
    }
    return true;
}

// ============================================================
// КООРДИНАТЫ
// ============================================================

function getTilePosition(pos) {
    const boardEl = document.getElementById('board');
    if (!boardEl) return { left: 0, top: 0 };
    const rect = boardEl.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    updateSizes();
    return {
        left: centerX + pos.x * CELL_SIZE - TILE_SIZE / 2,
        top: centerY + pos.y * CELL_SIZE - TILE_SIZE / 2
    };
}

function getYellowPosition(pos) {
    const boardEl = document.getElementById('board');
    if (!boardEl) return { left: 0, top: 0 };
    const rect = boardEl.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    updateSizes();
    return {
        left: centerX + pos.x * CELL_SIZE - YELLOW_SIZE / 2,
        top: centerY + pos.y * CELL_SIZE - YELLOW_SIZE / 2
    };
}

function getGridPosFromClick(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const x = e.clientX - rect.left - centerX;
    const y = e.clientY - rect.top - centerY;
    updateSizes();
    return {
        x: Math.round(x / CELL_SIZE),
        y: Math.round(y / CELL_SIZE)
    };
}

// ============================================================
// НАПРАВЛЕНИЯ И КОНТАКТЫ
// ============================================================

function determineShiftType(dx, dy) {
    if (Math.abs(dx) === 1 && Math.abs(dy) === 2) return '1x2';
    if (Math.abs(dx) === 2 && Math.abs(dy) === 1) return '2x1';
    return null;
}

const DIRECTIONS = [
    { dx: 1, dy: -2, name: 'СВЕРХУ СПРАВА' },
    { dx: -1, dy: -2, name: 'СВЕРХУ СЛЕВА' },
    { dx: 1, dy: 2, name: 'СНИЗУ СПРАВА' },
    { dx: -1, dy: 2, name: 'СНИЗУ СЛЕВА' },
    { dx: 2, dy: -1, name: 'СПРАВА ВВЕРХ' },
    { dx: 2, dy: 1, name: 'СПРАВА ВНИЗ' },
    { dx: -2, dy: -1, name: 'СЛЕВА ВВЕРХ' },
    { dx: -2, dy: 1, name: 'СЛЕВА ВНИЗ' }
];

const YELLOW_POSITIONS_BY_DIRECTION = {
    'СВЕРХУ СПРАВА': [{ dx: 0.5, dy: 1.5 }, { dx: -0.5, dy: -1.5 }, { dx: 1.5, dy: -0.5 }, { dx: -1.5, dy: 0.5 }],
    'СВЕРХУ СЛЕВА': [{ dx: -0.5, dy: 1.5 }, { dx: 0.5, dy: -1.5 }, { dx: -1.5, dy: -0.5 }, { dx: 1.5, dy: 0.5 }],
    'СНИЗУ СПРАВА': [{ dx: 0.5, dy: -1.5 }, { dx: -0.5, dy: 1.5 }, { dx: 1.5, dy: 0.5 }, { dx: -1.5, dy: -0.5 }],
    'СНИЗУ СЛЕВА': [{ dx: 0.5, dy: 1.5 }, { dx: -0.5, dy: -1.5 }, { dx: 1.5, dy: -0.5 }, { dx: -1.5, dy: 0.5 }],
    'СПРАВА ВВЕРХ': [{ dx: 1.5, dy: 0.5 }, { dx: 0.5, dy: -1.5 }, { dx: -1.5, dy: -0.5 }, { dx: -0.5, dy: 1.5 }],
    'СПРАВА ВНИЗ': [{ dx: 1.5, dy: -0.5 }, { dx: 0.5, dy: 1.5 }, { dx: -1.5, dy: 0.5 }, { dx: -0.5, dy: -1.5 }],
    'СЛЕВА ВВЕРХ': [{ dx: 0.5, dy: 1.5 }, { dx: -0.5, dy: -1.5 }, { dx: 1.5, dy: -0.5 }, { dx: -1.5, dy: 0.5 }],
    'СЛЕВА ВНИЗ': [{ dx: 1.5, dy: 0.5 }, { dx: 0.5, dy: -1.5 }, { dx: -1.5, dy: -0.5 }, { dx: -0.5, dy: 1.5 }]
};

function getTileCells(tilePos) {
    return [
        { x: tilePos.x - 0.5, y: tilePos.y - 0.5 },
        { x: tilePos.x + 0.5, y: tilePos.y - 0.5 },
        { x: tilePos.x - 0.5, y: tilePos.y + 0.5 },
        { x: tilePos.x + 0.5, y: tilePos.y + 0.5 }
    ];
}

function isOverlappingYellow(tilePos) {
    const tileCells = getTileCells(tilePos);
    for (const tileCell of tileCells) {
        for (const yellowCell of yellowCells) {
            if (Math.abs(tileCell.x - yellowCell.x) < 0.01 && Math.abs(tileCell.y - yellowCell.y) < 0.01) {
                return true;
            }
        }
    }
    return false;
}

function checkTilesContact(newPos, newTile, existingPos, existingTile) {
    const dx = newPos.x - existingPos.x;
    const dy = newPos.y - existingPos.y;

    if (dx === 1 && dy === -2) return existingTile[1] === newTile[2];
    if (dx === -1 && dy === -2) return existingTile[0] === newTile[3];
    if (dx === 1 && dy === 2) return existingTile[3] === newTile[0];
    if (dx === -1 && dy === 2) return existingTile[2] === newTile[1];
    if (dx === 2 && dy === -1) return existingTile[1] === newTile[2];
    if (dx === 2 && dy === 1) return existingTile[3] === newTile[0];
    if (dx === -2 && dy === -1) return existingTile[0] === newTile[3];
    if (dx === -2 && dy === 1) return existingTile[2] === newTile[1];
    return false;
}

function countContacts(newPos, newTile) {
    let contactCount = 0;
    for (const existing of board) {
        const dx = newPos.x - existing.x;
        const dy = newPos.y - existing.y;
        if (!DIRECTIONS.some(dir => dir.dx === dx && dir.dy === dy)) continue;
        if (checkTilesContact(newPos, newTile, existing, existing.values)) contactCount++;
    }
    return contactCount;
}

function getScoreForContacts(contactCount) {
    return contactCount;
}

function checkAllContacts(newPos, newTile) {
    let contactCount = 0;
    let successCount = 0;

    for (const existing of board) {
        const dx = newPos.x - existing.x;
        const dy = newPos.y - existing.y;
        if (!DIRECTIONS.some(dir => dir.dx === dx && dir.dy === dy)) continue;
        contactCount++;
        if (checkTilesContact(newPos, newTile, existing, existing.values)) successCount++;
        else return false;
    }
    return contactCount > 0 && successCount === contactCount;
}

function canPlaceTileWithScore(pos, values) {
    for (const tile of board) {
        if (tile.x === pos.x && tile.y === pos.y) return { canPlace: false, contacts: 0 };
    }
    if (isOverlappingYellow(pos)) return { canPlace: false, contacts: 0 };
    if (board.length === 0) return { canPlace: true, contacts: 0 };

    const contacts = countContacts(pos, values);
    if (contacts === 0) return { canPlace: false, contacts: 0 };
    if (!checkAllContacts(pos, values)) return { canPlace: false, contacts: 0 };

    return { canPlace: true, contacts };
}

function updateYellowCells() {
    yellowCells = [];
    if (moveCount < 2 || !yellowDirection) return;

    const positions = YELLOW_POSITIONS_BY_DIRECTION[yellowDirection];
    if (!positions) return;

    for (const tile of board) {
        for (const delta of positions) {
            const pos = { x: tile.x + delta.dx, y: tile.y + delta.dy };
            if (board.some(t => t.x === pos.x && t.y === pos.y)) continue;
            if (!yellowCells.some(c => c.x === pos.x && c.y === pos.y)) {
                yellowCells.push({ x: pos.x, y: pos.y });
            }
        }
    }
}

// ============================================================
// РАЗМЕЩЕНИЕ КОСТЯШКИ + ПОДСЧЁТ ОЧКОВ
// ============================================================

function placeTileWithScore(pos, values, isComputer = false) {
    const result = canPlaceTileWithScore(pos, values);
    if (!result.canPlace) return { success: false, contacts: 0, score: 0, moveBonus: 0 };

    if (board.length === 1 && moveCount === 1) {
        const last = board[board.length - 1];
        shiftType = determineShiftType(pos.x - last.x, pos.y - last.y);
        for (const dir of DIRECTIONS) {
            if (dir.dx === pos.x - last.x && dir.dy === pos.y - last.y) {
                yellowDirection = dir.name;
                break;
            }
        }
    }

    board.push({ x: pos.x, y: pos.y, values: values });
    moveCount++;

    const contacts = result.contacts;

    let moveBonus = 0;
    if (!moveBonusGiven) {
        moveBonus = 1;
        moveBonusGiven = true;
    }

    const score = moveBonus + contacts;

    if (isComputer) {
        computerScore += score;
        computerMoves++;
        computerTotalContacts += contacts;
    } else {
        playerScore += score;
        playerMoves++;
        playerTotalContacts += contacts;
    }

    saveStats();
    updateYellowCells();
    return { success: true, contacts, score, moveBonus };
}

// ============================================================
// ИИ — 3 УРОВНЯ СЛОЖНОСТИ
// ============================================================

function getPossiblePositions() {
    const positions = new Set();
    for (const tile of board) {
        for (const dir of DIRECTIONS) {
            positions.add(`${tile.x + dir.dx},${tile.y + dir.dy}`);
        }
    }
    return Array.from(positions).map(s => {
        const [x, y] = s.split(',').map(Number);
        return { x, y };
    });
}

function getAllComputerMoves() {
    const moves = [];

    if (board.length === 0) {
        for (let i = 0; i < computerHand.length; i++) {
            moves.push({
                pos: { x: 0, y: 0 },
                values: computerHand[i],
                rotation: 0,
                tileIndex: i,
                contacts: 0,
                score: 0
            });
        }
        return moves;
    }

    const positions = getPossiblePositions();
    for (let i = 0; i < computerHand.length; i++) {
        for (let rotation = 0; rotation < 4; rotation++) {
            const rotatedTile = getRotatedTile(computerHand[i], rotation);
            for (const pos of positions) {
                const result = canPlaceTileWithScore(pos, rotatedTile);
                if (result.canPlace) {
                    moves.push({
                        pos,
                        values: rotatedTile,
                        rotation,
                        tileIndex: i,
                        contacts: result.contacts,
                        score: result.contacts
                    });
                }
            }
        }
    }
    return moves;
}

function findComputerMoveEasy() {
    const moves = getAllComputerMoves();
    if (moves.length === 0) return null;
    return moves[Math.floor(Math.random() * moves.length)];
}

function findComputerMoveMedium() {
    const moves = getAllComputerMoves();
    if (moves.length === 0) return null;

    let best = moves[0];
    for (const m of moves) {
        if (m.contacts > best.contacts) best = m;
    }
    return best;
}

function cloneBoard(b) {
    return b.map(t => ({ x: t.x, y: t.y, values: [...t.values] }));
}

function simulatePlace(b, pos, values) {
    b.push({ x: pos.x, y: pos.y, values: [...values] });
}

function bestPlayerResponseScore(b, playerHandSnapshot) {
    let bestContacts = 0;
    const positions = new Set();
    for (const tile of b) {
        for (const dir of DIRECTIONS) {
            positions.add(`${tile.x + dir.dx},${tile.y + dir.dy}`);
        }
    }
    const positionsArr = Array.from(positions).map(s => {
        const [x, y] = s.split(',').map(Number);
        return { x, y };
    });

    for (const t of playerHandSnapshot) {
        if (t === null || t === undefined) continue;
        for (let rotation = 0; rotation < 4; rotation++) {
            const rotated = getRotatedTile(t, rotation);
            for (const pos of positionsArr) {
                let occupied = false;
                for (const ex of b) {
                    if (ex.x === pos.x && ex.y === pos.y) { occupied = true; break; }
                }
                if (occupied) continue;

                let contacts = 0;
                let allMatch = true;
                let anyContact = false;
                for (const ex of b) {
                    const dx = pos.x - ex.x;
                    const dy = pos.y - ex.y;
                    if (!DIRECTIONS.some(dir => dir.dx === dx && dir.dy === dy)) continue;
                    anyContact = true;
                    if (checkTilesContact(pos, rotated, ex, ex.values)) contacts++;
                    else { allMatch = false; break; }
                }
                if (anyContact && allMatch && contacts > bestContacts) {
                    bestContacts = contacts;
                }
            }
        }
    }
    return bestContacts;
}

function findComputerMoveHard() {
    const moves = getAllComputerMoves();
    if (moves.length === 0) return null;
    if (board.length === 0) return moves[0];

    let bestScore = -Infinity;
    let bestMove = moves[0];

    for (const m of moves) {
        const myScore = m.contacts;
        const simBoard = cloneBoard(board);
        simulatePlace(simBoard, m.pos, m.values);
        const playerBest = bestPlayerResponseScore(simBoard, playerHand);
        const evalScore = myScore - playerBest;

        if (evalScore > bestScore) {
            bestScore = evalScore;
            bestMove = m;
        } else if (evalScore === bestScore && m.contacts > bestMove.contacts) {
            bestMove = m;
        }
    }

    return bestMove;
}

function findComputerMove() {
    if (currentDifficulty === 'easy') return findComputerMoveEasy();
    if (currentDifficulty === 'hard') return findComputerMoveHard();
    return findComputerMoveMedium();
}

// ============================================================
// ХОДЫ
// ============================================================

function handlePlayerTurn(pos, rotatedTile) {
    const placeResult = placeTileWithScore(pos, rotatedTile, false);
    if (!placeResult.success) {
        showMessage('❌ Ошибка при установке!');
        return;
    }

    playSound('place');

    if (selectedTileIndex >= 0 && selectedTileIndex < playerHand.length) {
        playerHand[selectedTileIndex] = null;
    }

    currentRotation = 0;
    hoverPos = null;

    if (typeof renderBoard === 'function') renderBoard();
    if (typeof updateUI === 'function') updateUI();

    if (isWaitingForPlayerExtraTurn) {
        extraTurnsCompleted++;
        if (extraTurnsCompleted >= extraTurnsNeeded) {
            isWaitingForPlayerExtraTurn = false;
            setTimeout(finalizeGame, 500);
        } else {
            showMessage(`🔄 Осталось ${extraTurnsNeeded - extraTurnsCompleted} дополнительных ходов.`);
        }
        return;
    }

    if (playerHand.every(t => t === null)) {
        maxMoves = playerMoves;
        if (computerMoves < maxMoves) {
            extraTurnsNeeded = maxMoves - computerMoves;
            extraTurnsCompleted = 0;
            showMessage(`🔄 Компьютер делает еще ${extraTurnsNeeded} ходов...`);
            setTimeout(makeComputerExtraTurn, 500);
        } else {
            finalizeGame();
        }
        return;
    }

    if (!isGameOver && !isWaitingForPlayerExtraTurn) {
        setTimeout(computerTurn, 500);
    }
}

function computerTurn() {
    if (isGameOver) return;

    isComputerTurn = true;
    showMessage(`🤖 Компьютер думает... (${difficultyLabel(currentDifficulty)})`);
    if (typeof renderBoard === 'function') renderBoard();
    if (typeof updateUI === 'function') updateUI();

    setTimeout(() => {
        let move = findComputerMove();
        let attempts = 0;

        while (!move && deck.length > 0 && attempts < 3) {
            takeTileForComputer();
            move = findComputerMove();
            attempts++;
        }

        if (move) {
            const result = placeTileWithScore(move.pos, move.values, true);
            if (result.success) {
                playSound('place');
                computerHand.splice(move.tileIndex, 1);
                if (result.moveBonus > 0) {
                    showMessage(`🤖 Компьютер: +${result.moveBonus} бонус, +${result.contacts} за совпадения. Итого +${result.score}!`);
                } else {
                    showMessage(`🤖 Компьютер поставил костяшку +${result.score} очков!`);
                }
            }
        } else {
            showMessage('🤖 Компьютер пропускает ход');
        }

        isComputerTurn = false;
        if (typeof renderBoard === 'function') renderBoard();
        if (typeof updateUI === 'function') updateUI();

        if (computerHand.length === 0) {
            maxMoves = computerMoves;
            if (playerMoves < maxMoves) {
                extraTurnsNeeded = maxMoves - playerMoves;
                extraTurnsCompleted = 0;
                isWaitingForPlayerExtraTurn = true;
                showMessage(`🔄 Вам нужно сделать еще ${extraTurnsNeeded} ходов!`);
            } else {
                finalizeGame();
            }
            return;
        }

        if (!isGameOver && !isWaitingForPlayerExtraTurn) {
            showMessage('🧑 Ваш ход! Выберите костяшку');
            if (typeof renderBoard === 'function') renderBoard();
            if (typeof updateUI === 'function') updateUI();
        }
    }, 800);
}

function makeComputerExtraTurn() {
    const move = findComputerMove();
    if (move) {
        const result = placeTileWithScore(move.pos, move.values, true);
        if (result.success) {
            playSound('place');
            computerHand.splice(move.tileIndex, 1);
            showMessage(`🔄 Доп. ход компьютера! +${result.score} очков`);
        }
    } else if (deck.length > 0) {
        takeTileForComputer();
        setTimeout(makeComputerExtraTurn, 300);
        return;
    }

    extraTurnsCompleted++;
    if (typeof renderBoard === 'function') renderBoard();
    if (typeof updateUI === 'function') updateUI();

    if (extraTurnsCompleted >= extraTurnsNeeded) {
        setTimeout(finalizeGame, 500);
    } else {
        setTimeout(makeComputerExtraTurn, 500);
    }
}

// ============================================================
// ФИНАЛИЗАЦИЯ
// ============================================================

function finalizeGame() {
    isGameOver = true;
    isWaitingForPlayerExtraTurn = false;

    const playerReal = playerHand.filter(t => t !== null && t !== undefined).length;

    if (playerReal === 0 && computerHand.length === 0) {
        gameWinner = playerScore > computerScore ? 'player'
            : (computerScore > playerScore ? 'computer' : 'draw');
        winReason = 'больше очков';
    } else if (playerReal === 0) {
        gameWinner = 'player'; winReason = 'выложил все костяшки';
    } else if (computerHand.length === 0) {
        gameWinner = 'computer'; winReason = 'выложил все костяшки';
    } else {
        gameWinner = playerReal < computerHand.length ? 'player'
            : (computerHand.length < playerReal ? 'computer' : 'draw');
        winReason = gameWinner === 'draw' ? 'ничья' : 'меньше костяшек осталось';
    }

    // ← ЗВУК по результату игры
    if (gameWinner === 'player') playSound('win');
    else if (gameWinner === 'computer') playSound('lose');
    else playSound('draw');

    saveGameResult(gameWinner);

    const messageArea = document.getElementById('messageArea');
    let message = '🏁 ИГРА ОКОНЧЕНА! ';
    let className = 'message-area winner';

    if (gameWinner === 'player') {
        message += `🏆 ВЫ ПОБЕДИЛИ! (${winReason})`;
        className += ' winner-player';
    } else if (gameWinner === 'computer') {
        message += `💻 ПОБЕДИЛ КОМПЬЮТЕР! (${winReason})`;
        className += ' winner-computer';
    } else {
        message += `🤝 НИЧЬЯ! (${winReason})`;
        className += ' winner-draw';
    }

    if (messageArea) {
        messageArea.className = className;
        messageArea.textContent = message;
    }

    if (typeof renderBoard === 'function') renderBoard();
    if (typeof updateUI === 'function') updateUI();
}

function clearBoard() {
    board = [];
    moveCount = 0;
    shiftType = null;
    yellowDirection = null;
    yellowCells = [];
    selectedTileIndex = 0;
    currentRotation = 0;
    isComputerTurn = false;
    isGameOver = false;
    isWaitingForPlayerExtraTurn = false;
    maxMoves = 0;
    extraTurnsNeeded = 0;
    extraTurnsCompleted = 0;
    gameWinner = null;
    winReason = '';
    moveBonusGiven = false;
}