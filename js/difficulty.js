// ============================================================
// DOMINOES-QUATTRO — СЛОЖНОСТЬ
// ============================================================

const KEY = 'dominoes_difficulty';

function applyActive() {
    const current = localStorage.getItem(KEY) || 'medium';
    document.querySelectorAll('.difficulty-card').forEach(card => {
        card.classList.toggle('active', card.dataset.level === current);
    });
}

document.querySelectorAll('.difficulty-card').forEach(card => {
    card.addEventListener('click', () => {
        localStorage.setItem(KEY, card.dataset.level);
        applyActive();
    });
});

document.getElementById('backBtn').addEventListener('click', () => {
    window.location.href = 'menu.html';
});

applyActive();