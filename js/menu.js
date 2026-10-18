// ============================================================
// DOMINOES-QUATTRO — МЕНЮ (навигация)
// ============================================================

document.getElementById('playBtn').addEventListener('click', () => {
    window.location.href = 'game.html';      // ← было ../index.html
});

document.getElementById('rulesBtn').addEventListener('click', () => {
    window.location.href = 'rules.html';
});

document.getElementById('difficultyBtn').addEventListener('click', () => {
    window.location.href = 'difficulty.html';
});

document.getElementById('statsBtn').addEventListener('click', () => {
    window.location.href = 'stats.html';
});