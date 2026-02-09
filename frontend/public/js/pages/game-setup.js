// Diamond Stats - Game Setup Page

export class GameSetupPage {
    constructor(app) {
        this.app = app;
        // Get teamId from query string
        const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
        this.teamId = params.get('teamId');
    }

    async render(container) {
        container.innerHTML = `
            <nav class="nav-bar">
                <a href="#/dashboard" class="logo">Diamond<span>Stats</span></a>
                <div class="nav-links">
                    <a href="#/dashboard" class="nav-link">Dashboard</a>
                </div>
            </nav>
            <div class="page">
                <div class="page-header">
                    <h1 class="page-title">New Game</h1>
                </div>
                <div class="card" style="max-width: 600px;">
                    <form id="game-form">
                        <div class="form-group">
                            <label class="form-label">Opponent</label>
                            <input class="form-input" id="opponent" required placeholder="Opponent team name">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Date</label>
                                <input class="form-input" type="date" id="game-date" required
                                       value="${new Date().toISOString().split('T')[0]}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Home/Away</label>
                                <select class="form-select" id="is-home">
                                    <option value="true">Home</option>
                                    <option value="false">Away</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Location</label>
                            <input class="form-input" id="location" placeholder="Field name (optional)">
                        </div>
                        <button class="btn btn-primary btn-lg" type="submit" style="width:100%; margin-top:var(--space-md);">
                            Create Game
                        </button>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('game-form').addEventListener('submit', (e) => this.handleCreate(e));
    }

    async handleCreate(e) {
        e.preventDefault();
        if (!this.teamId) {
            this.app.showToast('No team selected', 'error');
            return;
        }

        try {
            const game = await this.app.api.createGame({
                teamId: this.teamId,
                opponentName: document.getElementById('opponent').value.trim(),
                gameDate: document.getElementById('game-date').value,
                isHome: document.getElementById('is-home').value === 'true',
                location: document.getElementById('location').value.trim() || null,
            });
            this.app.showToast('Game created!', 'success');
            window.location.hash = `#/games/${game.id}/live`;
        } catch (err) {
            this.app.showToast(err.message, 'error');
        }
    }
}
