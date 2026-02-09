// Diamond Stats - Roster Page (team detail + players)

export class RosterPage {
    constructor(app, params) {
        this.app = app;
        this.teamId = params.teamId;
        this.team = null;
        this.players = [];
        this.seasons = [];
    }

    async render(container) {
        container.innerHTML = `
            <nav class="nav-bar">
                <a href="#/dashboard" class="logo">Diamond<span>Stats</span></a>
                <div class="nav-links">
                    <a href="#/dashboard" class="nav-link">Dashboard</a>
                    <a href="#/teams" class="nav-link">Teams</a>
                </div>
            </nav>
            <div class="page" id="roster-page">
                <div class="loading-spinner"><div class="spinner"></div></div>
            </div>
        `;
        await this.loadTeam();
    }

    async loadTeam() {
        const page = document.getElementById('roster-page');
        try {
            const detail = await this.app.api.getTeam(this.teamId);
            this.team = detail.team;
            this.players = detail.players;
            this.seasons = detail.seasons;

            page.innerHTML = `
                <div class="page-header">
                    <div>
                        <h1 class="page-title">${this.esc(this.team.name)}</h1>
                        <p class="page-subtitle">
                            ${this.team.sport} &middot; ${this.team.level.replace('_', ' ')} &middot;
                            ${detail.gameCount} games
                        </p>
                    </div>
                    <div class="btn-group">
                        <a href="#/stats/${this.teamId}" class="btn">Stats</a>
                        <a href="#/games/new?teamId=${this.teamId}" class="btn btn-primary">+ New Game</a>
                    </div>
                </div>

                <div class="tabs">
                    <button class="tab active" data-tab="roster">Roster</button>
                    <button class="tab" data-tab="games">Games</button>
                    <button class="tab" data-tab="seasons">Seasons</button>
                </div>

                <div id="tab-content"></div>

                <!-- Add player modal -->
                <div id="add-player-modal" hidden></div>
            `;

            page.querySelectorAll('.tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    page.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    this.showTab(tab.dataset.tab);
                });
            });

            this.showTab('roster');
        } catch (err) {
            page.innerHTML = `<div class="empty-state"><p style="color:var(--offline);">${this.esc(err.message)}</p></div>`;
        }
    }

    showTab(tab) {
        const content = document.getElementById('tab-content');
        if (tab === 'roster') this.renderRoster(content);
        else if (tab === 'games') this.renderGames(content);
        else if (tab === 'seasons') this.renderSeasons(content);
    }

    renderRoster(container) {
        if (this.players.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No players on the roster yet.</p>
                    <button class="btn btn-primary" id="add-first-player">+ Add Player</button>
                </div>
            `;
            document.getElementById('add-first-player')?.addEventListener('click', () => this.showAddPlayerModal());
            return;
        }

        container.innerHTML = `
            <div class="flex justify-between items-center mb-md">
                <span class="card-subtitle">${this.players.length} players</span>
                <button class="btn btn-sm" id="add-player-btn">+ Add Player</button>
            </div>
            <div class="stat-table-wrap">
                <table class="stat-table">
                    <thead>
                        <tr>
                            <th style="text-align:left">#</th>
                            <th style="text-align:left">Name</th>
                            <th>Bats</th>
                            <th>Throws</th>
                            <th>Pos</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.players.map(p => `
                            <tr>
                                <td style="text-align:left; font-family:var(--font-mono);">${p.jerseyNumber ?? '-'}</td>
                                <td style="text-align:left">${this.esc(p.firstName)} ${this.esc(p.lastName)}</td>
                                <td>${p.bats === 'switch' ? 'S' : p.bats.charAt(0).toUpperCase()}</td>
                                <td>${p.throwsHand.charAt(0).toUpperCase()}</td>
                                <td>${this.esc(p.primaryPosition || '-')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        document.getElementById('add-player-btn')?.addEventListener('click', () => this.showAddPlayerModal());
    }

    showAddPlayerModal() {
        const modal = document.getElementById('add-player-modal');
        modal.hidden = false;
        modal.innerHTML = `
            <div class="modal-overlay" id="modal-overlay">
                <div class="modal">
                    <div class="modal-header">
                        <h2 class="modal-title">Add Player</h2>
                        <button class="modal-close" id="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="add-player-form">
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">First Name</label>
                                    <input class="form-input" id="p-first" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Last Name</label>
                                    <input class="form-input" id="p-last" required>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Jersey #</label>
                                    <input class="form-input" type="number" id="p-jersey" min="0" max="99">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Position</label>
                                    <select class="form-select" id="p-position">
                                        <option value="">--</option>
                                        <option value="P">P</option>
                                        <option value="C">C</option>
                                        <option value="1B">1B</option>
                                        <option value="2B">2B</option>
                                        <option value="3B">3B</option>
                                        <option value="SS">SS</option>
                                        <option value="LF">LF</option>
                                        <option value="CF">CF</option>
                                        <option value="RF">RF</option>
                                        <option value="DH">DH</option>
                                        <option value="DP">DP</option>
                                        <option value="UTIL">UTIL</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Bats</label>
                                    <select class="form-select" id="p-bats">
                                        <option value="right">Right</option>
                                        <option value="left">Left</option>
                                        <option value="switch">Switch</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Throws</label>
                                    <select class="form-select" id="p-throws">
                                        <option value="right">Right</option>
                                        <option value="left">Left</option>
                                    </select>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn" id="modal-cancel">Cancel</button>
                        <button class="btn btn-primary" id="modal-save">Add Player</button>
                    </div>
                </div>
            </div>
        `;

        const close = () => { modal.hidden = true; modal.innerHTML = ''; };
        document.getElementById('modal-close').addEventListener('click', close);
        document.getElementById('modal-cancel').addEventListener('click', close);
        document.getElementById('modal-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'modal-overlay') close();
        });

        document.getElementById('modal-save').addEventListener('click', async () => {
            const data = {
                firstName: document.getElementById('p-first').value.trim(),
                lastName: document.getElementById('p-last').value.trim(),
                jerseyNumber: document.getElementById('p-jersey').value ? parseInt(document.getElementById('p-jersey').value) : null,
                primaryPosition: document.getElementById('p-position').value || null,
                bats: document.getElementById('p-bats').value,
                throwsHand: document.getElementById('p-throws').value,
            };
            if (!data.firstName || !data.lastName) return;

            try {
                await this.app.api.createPlayer(this.teamId, data);
                close();
                this.app.showToast('Player added!', 'success');
                await this.loadTeam();
            } catch (err) {
                this.app.showToast(err.message, 'error');
            }
        });
    }

    async renderGames(container) {
        container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div></div>`;
        try {
            const games = await this.app.api.listGames(this.teamId);
            if (games.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <p>No games scheduled yet.</p>
                        <a href="#/games/new?teamId=${this.teamId}" class="btn btn-primary">+ Schedule Game</a>
                    </div>
                `;
                return;
            }

            container.innerHTML = `
                <div class="flex justify-between items-center mb-md">
                    <span class="card-subtitle">${games.length} games</span>
                    <a href="#/games/new?teamId=${this.teamId}" class="btn btn-sm btn-primary">+ New Game</a>
                </div>
                ${games.map(g => {
                    const date = new Date(g.gameDate).toLocaleDateString();
                    const statusBadge = g.status === 'in_progress'
                        ? '<span class="badge badge-live">LIVE</span>'
                        : `<span class="badge badge-status">${g.status}</span>`;
                    const score = g.status === 'scheduled' ? '' : `${g.ourScore} - ${g.opponentScore}`;
                    const link = g.status === 'in_progress'
                        ? `#/games/${g.id}/live`
                        : g.status === 'final' ? `#/games/${g.id}/box` : `#/games/${g.id}/live`;

                    return `
                        <a href="${link}" class="card card-clickable mb-sm" style="display:block; text-decoration:none; color:inherit;">
                            <div class="flex justify-between items-center">
                                <div>
                                    <strong>${g.isHome ? 'vs' : '@'} ${this.esc(g.opponentName)}</strong>
                                    <span style="color:var(--text-secondary); margin-left:var(--space-sm);">${date}</span>
                                </div>
                                <div class="flex items-center gap-sm">
                                    ${score ? `<span style="font-family:var(--font-mono); font-weight:600;">${score}</span>` : ''}
                                    ${statusBadge}
                                </div>
                            </div>
                        </a>
                    `;
                }).join('')}
            `;
        } catch (err) {
            container.innerHTML = `<p style="color:var(--offline);">${this.esc(err.message)}</p>`;
        }
    }

    renderSeasons(container) {
        container.innerHTML = `
            <div class="flex justify-between items-center mb-md">
                <span class="card-subtitle">${this.seasons.length} seasons</span>
            </div>
            ${this.seasons.length === 0 ? '<p style="color:var(--text-secondary)">No seasons created.</p>' :
                this.seasons.map(s => `
                    <div class="card mb-sm">
                        <div class="flex justify-between items-center">
                            <strong>${this.esc(s.name)}</strong>
                            ${s.isActive ? '<span class="badge badge-hit">Active</span>' : ''}
                        </div>
                    </div>
                `).join('')
            }
        `;
    }

    esc(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }
}
