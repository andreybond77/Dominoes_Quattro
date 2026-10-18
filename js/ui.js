// ============================================================
// UI — DOMINOES-QUATTRO
// ============================================================

let boardEl = null;
let handTilesTrack = null;
let hoverPos = null;
let resizeTimeout = null;

// ← ИЗМЕНЕНО: drag-and-drop поля
let isDragging = false;
let dragMoved = false;
let dragStartX = 0;
let dragStartY = 0;
let dragScrollLeft = 0;
let dragScrollTop = 0;

const VISIBLE_COUNT = 7;
const CENTER_INDEX = 3;

// ============================================================
// ОТРИСОВКА ТОЧЕК
// ============================================================

function renderDots(number) {
    const dotPositions = {
        1: ['center'],
        2: ['top-left', 'bottom-right'],
        3: ['top-left', 'center', 'bottom-right'],
        4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
        5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
        6: ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right']
    };
    const positions = dotPositions[number] || [];

    const dotSize = Math.max(3, Math.round(CELL_SIZE * 0.22));

    return positions.map(pos =>
        `<div class="domino-dot dot-${pos}" style="width:${dotSize}px;height:${dotSize}px"></div>`
    ).join('');
}

function renderTileContent(values) {
    return values.map(v => `<div class="cell">${renderDots(v)}</div>`).join('');
}

// ============================================================
// РАЗМЕРЫ КОСТЯШКИ
// ============================================================

function applyTileSizes(el) {
    const gap = 2;
    const border = 2;
    const cell = CELL_SIZE;
    const total = cell * 2 + gap + border * 2;

    el.style.width = total + 'px';
    el.style.height = total + 'px';
    el.style.gridTemplateColumns = cell + 'px ' + cell + 'px';
    el.style.gridTemplateRows = cell + 'px ' + cell + 'px';
    el.style.gap = gap + 'px';
}

function applySliderHeight() {
    const slider = document.getElementById('handSlider');
    if (slider) {
        slider.style.height = Math.round(TILE_SIZE * 1.3) + 'px';
    }
}

// ============================================================
// ПРОКРУТКА ПОЛЯ — ЦЕНТРИРОВАНИЕ
// ============================================================

function centerBoardView() {
    const wrapper = document.querySelector('.board-wrapper');
    if (wrapper && boardEl) {
        wrapper.scrollLeft = (boardEl.offsetWidth - wrapper.clientWidth) / 2;
        wrapper.scrollTop = (boardEl.offsetHeight - wrapper.clientHeight) / 2;
    }
}

// ============================================================
// ОБНОВЛЕНИЕ СЧЁТА
// ============================================================

function updateScoreDisplay() {
    const playerScoreEl = document.getElementById('playerScoreDisplay');
    const computerScoreEl = document.getElementById('computerScoreDisplay');
    if (playerScoreEl) playerScoreEl.textContent = playerScore;
    if (computerScoreEl) computerScoreEl.textContent = computerScore;
}

// ============================================================
// ВИДИМЫЕ 7 СЛОТОВ
// ============================================================

function getVisibleTiles() {
    const result = [];
    const total = playerHand.length;

    if (total === 0) {
        for (let i = 0; i < VISIBLE_COUNT; i++) {
            result.push({
                isReal: false,
                index: -1,
                tile: null,
                isCenter: i === CENTER_INDEX
            });
        }
        return result;
    }

    for (let i = 0; i < VISIBLE_COUNT; i++) {
        const offset = i - CENTER_INDEX;
        const realIndex = (selectedTileIndex + offset + total) % total;
        const isCenterCell = (i === CENTER_INDEX);
        const tile = playerHand[realIndex];

        if (tile === null || tile === undefined) {
            result.push({
                isReal: false,
                index: realIndex,
                tile: null,
                isCenter: isCenterCell
            });
        } else {
            result.push({
                isReal: true,
                index: realIndex,
                tile: tile,
                isCenter: isCenterCell
            });
        }
    }

    return result;
}

// ============================================================
// ОТРИСОВКА ПОЛЯ
// ============================================================

function renderBoard() {
    if (!boardEl) return;
    boardEl.innerHTML = '';
    updateSizes();

    for (const tile of board) {
        const div = document.createElement('div');
        div.className = 'tile';
        const pos = getTilePosition({ x: tile.x, y: tile.y });
        div.style.left = pos.left + 'px';
        div.style.top = pos.top + 'px';
        applyTileSizes(div);
        div.innerHTML = renderTileContent(tile.values);
        boardEl.appendChild(div);
    }

    for (const cell of yellowCells) {
        const div = document.createElement('div');
        div.className = 'yellow-cell';
        const pos = getYellowPosition({ x: cell.x, y: cell.y });
        div.style.left = pos.left + 'px';
        div.style.top = pos.top + 'px';
        div.style.width = YELLOW_SIZE + 'px';
        div.style.height = YELLOW_SIZE + 'px';
        boardEl.appendChild(div);
    }

    const activeTile = playerHand[selectedTileIndex];
    if (hoverPos && activeTile !== null && activeTile !== undefined
        && !isComputerTurn && !isGameOver) {
        const rotatedTile = getRotatedTile(activeTile, currentRotation);
        let canPlace = true;

        for (const tile of board) {
            if (tile.x === hoverPos.x && tile.y === hoverPos.y) { canPlace = false; break; }
        }

        if (canPlace) {
            const tileCells = getTileCells(hoverPos);
            for (const tc of tileCells) {
                for (const yc of yellowCells) {
                    if (Math.abs(tc.x - yc.x) < 0.01 && Math.abs(tc.y - yc.y) < 0.01) {
                        canPlace = false; break;
                    }
                }
                if (!canPlace) break;
            }
        }

        if (canPlace && board.length > 0) {
            const result = canPlaceTileWithScore(hoverPos, rotatedTile);
            canPlace = result.canPlace;
        }

        const preview = document.createElement('div');
        preview.className = `tile-preview ${canPlace ? 'valid' : 'invalid'}`;
        const pos = getTilePosition(hoverPos);
        preview.style.left = pos.left + 'px';
        preview.style.top = pos.top + 'px';
        applyTileSizes(preview);
        preview.innerHTML = renderTileContent(rotatedTile);
        boardEl.appendChild(preview);
    }

    renderHand();
}

// ============================================================
// ОТРИСОВКА КАРУСЕЛИ
// ============================================================

function renderHand() {
    if (!handTilesTrack) return;
    handTilesTrack.innerHTML = '';

    applySliderHeight();
    updateScoreDisplay();

    const scrollLeftBtn = document.getElementById('scrollLeftBtn');
    const scrollRightBtn = document.getElementById('scrollRightBtn');

    const canScroll = playerHand.length >= 2 && !isComputerTurn && !isGameOver;

    if (scrollLeftBtn) {
        scrollLeftBtn.disabled = !canScroll;
        scrollLeftBtn.style.opacity = canScroll ? 1 : 0.3;
    }
    if (scrollRightBtn) {
        scrollRightBtn.disabled = !canScroll;
        scrollRightBtn.style.opacity = canScroll ? 1 : 0.3;
    }

    const visibleTiles = getVisibleTiles();

    for (let i = 0; i < visibleTiles.length; i++) {
        const v = visibleTiles[i];
        const div = document.createElement('div');

        if (v.isReal) {
            const isCenter = v.isCenter;
            let className = 'hand-tile';

            if (isCenter) {
                className += ' center-active';
                div.innerHTML = renderTileContent(getRotatedTile(v.tile, currentRotation));
            } else {
                className += ' side';
                div.innerHTML = renderTileContent(v.tile);
            }

            div.className = className;
            div.dataset.realIndex = v.index;
            applyTileSizes(div);
        } else {
            div.className = 'hand-tile empty';
            div.innerHTML = `<div class="cell"></div>`.repeat(4);
            applyTileSizes(div);
        }

        handTilesTrack.appendChild(div);
    }
}

// ============================================================
// ОБНОВЛЕНИЕ КНОПОК
// ============================================================

function updateUI() {
    const rotateCWBtn = document.getElementById('rotateCWBtn');
    const rotateCCWBtn = document.getElementById('rotateCCWBtn');
    const addTileBtn = document.getElementById('addTileBtn');

    const activeTile = playerHand[selectedTileIndex];
    const hasActiveTile = activeTile !== null && activeTile !== undefined;

    const rotateDisabled = isComputerTurn || isGameOver || !hasActiveTile;

    if (rotateCWBtn) {
        rotateCWBtn.disabled = rotateDisabled;
        rotateCWBtn.style.opacity = rotateDisabled ? 0.3 : 1;
    }
    if (rotateCCWBtn) {
        rotateCCWBtn.disabled = rotateDisabled;
        rotateCCWBtn.style.opacity = rotateDisabled ? 0.3 : 1;
    }

    if (addTileBtn) {
        const addDisabled = isComputerTurn || isGameOver || deck.length === 0;
        addTileBtn.disabled = addDisabled;
        addTileBtn.style.opacity = addDisabled ? 0.3 : 1;
    }

    updateScoreDisplay();
}

// ============================================================
// НОВАЯ ИГРА / ВЫХОД
// ============================================================

function newGame() {
    clearBoard();
    dealTiles();
    selectedTileIndex = 0;
    currentRotation = 0;
    hoverPos = null;

    const messageArea = document.getElementById('messageArea');
    if (messageArea) {
        messageArea.className = 'message-area';
        messageArea.textContent = '🔄 Новая игра! Первый ход за компьютером...';
    }

    renderBoard();
    updateUI();
    updateScoreDisplay();

    // ← Прокрутка в центр после отрисовки
    setTimeout(() => {
        centerBoardView();
        computerTurn();
    }, 500);
}

function exitGame() {
    playSound('click');
    setTimeout(() => {
        window.location.href = 'menu.html';
    }, 120);
}

// ============================================================
// РЕСАЙЗ
// ============================================================

function handleResize() {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        updateSizes();
        renderBoard();
        resizeTimeout = null;
    }, 200);
}

// ============================================================
// ПРОКРУТКА — ПО КРУГУ
// ============================================================

function scrollCarouselLeft() {
    if (playerHand.length < 2) return;
    if (isComputerTurn || isGameOver) return;

    selectedTileIndex = (selectedTileIndex - 1 + playerHand.length) % playerHand.length;
    currentRotation = 0;

    playSound('rotate');
    renderHand();
    renderBoard();
    updateUI();
}

function scrollCarouselRight() {
    if (playerHand.length < 2) return;
    if (isComputerTurn || isGameOver) return;

    selectedTileIndex = (selectedTileIndex + 1) % playerHand.length;
    currentRotation = 0;

    playSound('rotate');
    renderHand();
    renderBoard();
    updateUI();
}

// ============================================================
// КНОПКА "+"
// ============================================================

function handleAddTile() {
    if (isComputerTurn || isGameOver) return;

    if (addTileForPlayer()) {
        playSound('pick');
        const realCount = playerHand.filter(t => t !== null && t !== undefined).length;
        showMessage(`📥 Взята костяшка! В руке: ${realCount} шт.`);
        renderHand();
        renderBoard();
        updateUI();
    } else {
        showMessage('❌ Колода пуста!');
        playSound('error');
    }
}

// ============================================================
// СОБЫТИЯ
// ============================================================

function initEvents() {
    if (!boardEl) return;

    // ───── Drag-and-drop прокрутка поля ─────
    const wrapper = document.querySelector('.board-wrapper');
    if (wrapper) {
        wrapper.addEventListener('mousedown', (e) => {
            // Игнорируем клики по костяшкам и кнопкам
            if (e.button !== 0) return;
            isDragging = true;
            dragMoved = false;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            dragScrollLeft = wrapper.scrollLeft;
            dragScrollTop = wrapper.scrollTop;
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - dragStartX;
            const dy = e.clientY - dragStartY;

            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                dragMoved = true;
            }

            wrapper.scrollLeft = dragScrollLeft - dx;
            wrapper.scrollTop = dragScrollTop - dy;
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
        });

        // Тач-события для мобильных
        wrapper.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1) return;
            isDragging = true;
            dragMoved = false;
            dragStartX = e.touches[0].clientX;
            dragStartY = e.touches[0].clientY;
            dragScrollLeft = wrapper.scrollLeft;
            dragScrollTop = wrapper.scrollTop;
        }, { passive: true });

        wrapper.addEventListener('touchmove', (e) => {
            if (!isDragging || e.touches.length !== 1) return;
            const dx = e.touches[0].clientX - dragStartX;
            const dy = e.touches[0].clientY - dragStartY;

            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                dragMoved = true;
            }

            wrapper.scrollLeft = dragScrollLeft - dx;
            wrapper.scrollTop = dragScrollTop - dy;
        }, { passive: true });

        wrapper.addEventListener('touchend', () => {
            isDragging = false;
        });
    }

    // ───── Наведение / предпросмотр ─────
    boardEl.addEventListener('mousemove', function(e) {
        if (isComputerTurn || isGameOver || isDragging) {
            if (hoverPos) { hoverPos = null; renderBoard(); }
            return;
        }
        const pos = getGridPosFromClick(e);
        if (!hoverPos || hoverPos.x !== pos.x || hoverPos.y !== pos.y) {
            hoverPos = pos;
            renderBoard();
        }
    });

    boardEl.addEventListener('mouseleave', function() {
        if (hoverPos) { hoverPos = null; renderBoard(); }
    });

    // ───── Клик по полю ─────
    boardEl.addEventListener('click', function(e) {
        // ← Если было перетаскивание — игнорируем клик
        if (dragMoved) {
            dragMoved = false;
            return;
        }

        if (isComputerTurn) { showMessage('⏳ Сейчас ход компьютера!'); playSound('error'); return; }
        if (isGameOver) { showMessage('🏁 Игра окончена!'); return; }

        const activeTile = playerHand[selectedTileIndex];
        if (activeTile === null || activeTile === undefined) {
            showMessage('⚠️ Активный слот пуст! Прокрутите карусель.');
            playSound('error');
            return;
        }

        const pos = getGridPosFromClick(e);

        for (const tile of board) {
            if (tile.x === pos.x && tile.y === pos.y) {
                showMessage('❌ Место занято!');
                playSound('error');
                return;
            }
        }

        const rotatedTile = getRotatedTile(activeTile, currentRotation);
        const result = canPlaceTileWithScore(pos, rotatedTile);

        if (!result.canPlace) {
            showMessage('❌ Сюда нельзя поставить!');
            playSound('error');
            return;
        }

        handlePlayerTurn(pos, rotatedTile);
    });

    // ───── Кнопки ─────
    const scrollLeftBtn = document.getElementById('scrollLeftBtn');
    const scrollRightBtn = document.getElementById('scrollRightBtn');
    if (scrollLeftBtn) scrollLeftBtn.addEventListener('click', scrollCarouselRight);
    if (scrollRightBtn) scrollRightBtn.addEventListener('click', scrollCarouselLeft);

    const rotateCWBtn = document.getElementById('rotateCWBtn');
    const rotateCCWBtn = document.getElementById('rotateCCWBtn');
    if (rotateCWBtn) rotateCWBtn.addEventListener('click', rotateSelectedTileCCW);
    if (rotateCCWBtn) rotateCCWBtn.addEventListener('click', rotateSelectedTileCW);

    const addTileBtn = document.getElementById('addTileBtn');
    if (addTileBtn) addTileBtn.addEventListener('click', handleAddTile);

    const exitBtn = document.getElementById('exitBtn');
    if (exitBtn) exitBtn.addEventListener('click', exitGame);

    const soundBtn = document.getElementById('soundBtn');
    if (soundBtn) {
        soundBtn.addEventListener('click', () => {
            const enabled = toggleSound();
            soundBtn.textContent = enabled ? '🔊' : '🔇';
            soundBtn.classList.toggle('muted', !enabled);
        });
        soundBtn.textContent = soundEnabled ? '🔊' : '🔇';
        soundBtn.classList.toggle('muted', !soundEnabled);
    }

    window.addEventListener('resize', handleResize);
}

// ============================================================
// ЗАПУСК
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    boardEl = document.getElementById('board');
    handTilesTrack = document.getElementById('handTilesTrack');

    if (!boardEl) {
        console.error('❌ Не найден #board');
        return;
    }

    loadSoundSetting();
    loadStats();
    initEvents();
    newGame();
});