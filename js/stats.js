// ============================================================
// DOMINOES-QUATTRO — СТАТИСТИКА
// ============================================================

const STATS_KEY = 'dominoes_quattro_stats';
const EXTRA_KEY = 'dominoes_quattro_extra';

function loadAll() {
    let stats = {};
    let extra = { playerWins: 0, computerWins: 0, draws: 0 };

    try {
        stats = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
    } catch (e) { stats = {}; }

    try {
        extra = JSON.parse(localStorage.getItem(EXTRA_KEY) || '{}');
    } catch (e) { extra = {}; }

    const playerWins = extra.playerWins || 0;
    const computerWins = extra.computerWins || 0;
    const draws = extra.draws || 0;
    const totalGames = playerWins + computerWins + draws;

    document.getElementById('playerWins').textContent = playerWins;
    document.getElementById('computerWins').textContent = computerWins;
    document.getElementById('draws').textContent = draws;
    document.getElementById('totalGames').textContent = totalGames;

    document.getElementById('playerScore').textContent = stats.playerScore || 0;
    document.getElementById('computerScore').textContent = stats.computerScore || 0;

    document.getElementById('playerMoves').textContent = stats.playerMoves || 0;
    document.getElementById('computerMoves').textContent = stats.computerMoves || 0;

    document.getElementById('playerContacts').textContent = stats.playerTotalContacts || 0;
    document.getElementById('computerContacts').textContent = stats.computerTotalContacts || 0;
}

document.getElementById('backBtn').addEventListener('click', () => {
    window.location.href = 'menu.html';
});

document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('Сбросить всю статистику?')) {
        localStorage.removeItem(STATS_KEY);
        localStorage.removeItem(EXTRA_KEY);
        loadAll();
    }
});

loadAll();