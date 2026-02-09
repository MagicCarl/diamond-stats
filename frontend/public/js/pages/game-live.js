// Diamond Stats - Live Game Scoring Screen (PRIMARY SCREEN)
// iPad landscape optimized: left sidebar lineup, main area at-bat buttons

export class GameLivePage {
    constructor(app, params) {
        this.app = app;
        this.gameId = params.gameId;
        this.game = null;
        this.lineup = [];
        this.atBats = [];
        this.pitching = [];
        this.currentBatterIndex = 0;
        this.selectedRBI = 0;
        this.selectedScored = false;
    }

    async render(container) {
        container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div></div>`;
        await this.loadGame(container);
    }

    async loadGame(container) {
        try {
            const detail = await this.app.api.getGame(this.gameId);
            this.game = detail.game;
            this.lineup = detail.lineup;
            this.atBats = detail.atBats;
            this.pitching = detail.pitching;

            // Find current batter position in lineup
            if (this.lineup.length > 0) {
                const lastAB = this.atBats[this.atBats.length - 1];
                if (lastAB) {
                    const idx = this.lineup.findIndex(l => {
                        const lineupPlayerId = l.players?.id || l.player_id;
                        return lineupPlayerId === lastAB.player_id;
                    });
                    this.currentBatterIndex = idx >= 0 ? (idx + 1) % this.lineup.length : 0;
                }
            }

            this.renderGame(container);
        } catch (err) {
            container.innerHTML = `<div class="empty-state"><p style="color:var(--offline);">${this.esc(err.message)}</p></div>`;
        }
    }

    renderGame(container) {
        const g = this.game;
        const isLive = g.status === 'in_progress';
        const halfInning = g.is_top_of_inning ? 'Top' : 'Bot';
        const currentBatter = this.lineup[this.currentBatterIndex];
        const teamName = g.teams?.name || 'US';

        container.innerHTML = `
            <div class="game-live">
                <!-- Scoreboard -->
                <div class="scoreboard">
                    <div class="scoreboard-teams">
                        <div class="scoreboard-team">
                            <span class="scoreboard-team-name">${g.is_home ? 'AWAY' : this.esc(teamName)}</span>
                            <span class="scoreboard-score">${g.is_home ? g.opponent_score : g.our_score}</span>
                        </div>
                        <span class="scoreboard-vs">-</span>
                        <div class="scoreboard-team">
                            <span class="scoreboard-team-name">${g.is_home ? this.esc(teamName) : 'AWAY'}</span>
                            <span class="scoreboard-score">${g.is_home ? g.our_score : g.opponent_score}</span>
                        </div>
                    </div>
                    <div class="scoreboard-info">
                        <div class="scoreboard-inning">
                            <span class="half">${halfInning}</span>
                            ${g.current_inning}
                        </div>
                        <div class="scoreboard-outs">
                            <span style="font-size:var(--font-size-xs);color:var(--text-secondary);margin-right:var(--space-xs);">OUTS</span>
                            <span class="out-dot ${g.outs_in_current_inning >= 1 ? 'filled' : ''}"></span>
                            <span class="out-dot ${g.outs_in_current_inning >= 2 ? 'filled' : ''}"></span>
                            <span class="out-dot ${g.outs_in_current_inning >= 3 ? 'filled' : ''}"></span>
                        </div>
                    </div>
                    <div class="scoreboard-actions">
                        ${!isLive ? `<button class="btn btn-primary btn-sm" id="start-game-btn">Start Game</button>` : ''}
                        ${isLive ? `<button class="btn btn-danger btn-sm" id="end-game-btn">End Game</button>` : ''}
                        <button class="btn btn-sm" id="edit-lineup-btn">Lineup</button>
                        <a href="#/games/${this.gameId}/box" class="btn btn-sm">Box Score</a>
                        <a href="#/teams/${g.team_id}" class="btn btn-sm">Back</a>
                    </div>
                </div>

                <!-- Lineup Panel (left sidebar) -->
                <div class="lineup-panel">
                    <div class="lineup-title">Batting Order</div>
                    ${this.lineup.length === 0
                        ? `<div class="empty-state" style="padding:var(--space-md);"><p>No lineup set</p><button class="btn btn-sm" id="setup-lineup-btn">Set Lineup</button></div>`
                        : this.lineup.map((entry, i) => {
                            const p = entry.players || {};
                            const isActive = i === this.currentBatterIndex && isLive;
                            const playerABs = this.atBats.filter(ab =>
                                ab.player_id === (p.id || entry.player_id)
                            );
                            return `
                                <div class="lineup-item ${isActive ? 'active' : ''}"
                                     data-index="${i}" ${isLive ? 'style="cursor:pointer"' : ''}>
                                    <span class="lineup-number">${entry.batting_order}</span>
                                    <span class="lineup-name">${this.esc(p.first_name || '')} ${this.esc(p.last_name || '')}</span>
                                    <span class="lineup-position">${this.esc(entry.position)}</span>
                                    <span class="lineup-result-dots">
                                        ${playerABs.map(ab => `<span class="result-dot ${this.resultDotClass(ab.result)}"></span>`).join('')}
                                    </span>
                                </div>
                            `;
                        }).join('')
                    }

                    ${this.pitching.length > 0 ? this.renderPitcherSummary() : ''}
                </div>

                <!-- At-Bat Panel (main area) -->
                <div class="at-bat-panel">
                    ${!isLive ? this.renderNotLiveState() : this.renderAtBatControls(currentBatter)}
                </div>
            </div>
        `;

        this.bindEvents();
    }

    renderAtBatControls(batter) {
        const p = batter?.players || {};
        return `
            <div class="at-bat-header">
                <span class="at-bat-batter">
                    #${p.jersey_number || '?'} ${this.esc(p.first_name || '')} ${this.esc(p.last_name || '')}
                </span>
                <span class="at-bat-batter-info">${this.esc(batter?.position || '')}</span>
            </div>

            <div class="result-grid">
                <!-- Hits -->
                <div class="result-section">
                    <span class="result-section-label">Hits</span>
                    <div class="result-buttons">
                        <button class="result-btn hit" data-result="single">1B</button>
                        <button class="result-btn hit" data-result="double">2B</button>
                        <button class="result-btn hit" data-result="triple">3B</button>
                        <button class="result-btn hr" data-result="home_run">HR</button>
                    </div>
                </div>

                <!-- Walks -->
                <div class="result-section">
                    <span class="result-section-label">Walks</span>
                    <div class="result-buttons">
                        <button class="result-btn walk" data-result="walk">BB</button>
                        <button class="result-btn walk" data-result="hit_by_pitch">HBP</button>
                        <button class="result-btn walk" data-result="intentional_walk">IBB</button>
                    </div>
                </div>

                <!-- Strikeouts -->
                <div class="result-section">
                    <span class="result-section-label">Strikeouts</span>
                    <div class="result-buttons">
                        <button class="result-btn strikeout" data-result="strikeout_swinging">K</button>
                        <button class="result-btn strikeout" data-result="strikeout_looking">K-L</button>
                    </div>
                </div>

                <!-- Outs -->
                <div class="result-section">
                    <span class="result-section-label">Outs</span>
                    <div class="result-buttons">
                        <button class="result-btn out" data-result="ground_out">GO</button>
                        <button class="result-btn out" data-result="fly_out">FO</button>
                        <button class="result-btn out" data-result="line_out">LO</button>
                        <button class="result-btn out" data-result="pop_out">PO</button>
                    </div>
                </div>

                <!-- Other -->
                <div class="result-section">
                    <span class="result-section-label">Other</span>
                    <div class="result-buttons">
                        <button class="result-btn out" data-result="fielders_choice">FC</button>
                        <button class="result-btn out" data-result="double_play">DP</button>
                        <button class="result-btn other" data-result="sacrifice_fly">SF</button>
                        <button class="result-btn other" data-result="sacrifice_bunt">SAC</button>
                        <button class="result-btn other" data-result="reached_on_error">E</button>
                    </div>
                </div>
            </div>

            <!-- RBI / Extras -->
            <div class="extras-row">
                <div class="extras-group">
                    <span class="extras-label">RBI</span>
                    ${[0,1,2,3,4].map(n => `
                        <button class="rbi-btn ${n === this.selectedRBI ? 'selected' : ''}" data-rbi="${n}">${n}</button>
                    `).join('')}
                </div>
                <div class="extras-group scored-toggle">
                    <span class="extras-label">Scored?</span>
                    <button class="btn btn-sm ${this.selectedScored ? 'btn-primary' : ''}" id="scored-yes">Yes</button>
                    <button class="btn btn-sm ${!this.selectedScored ? 'btn-primary' : ''}" id="scored-no">No</button>
                </div>
            </div>

            <!-- Undo -->
            <div style="margin-top:var(--space-lg); display:flex; justify-content:flex-end;">
                <button class="btn btn-danger btn-sm" id="undo-btn" ${this.atBats.length === 0 ? 'disabled' : ''}>
                    Undo Last At-Bat
                </button>
            </div>
        `;
    }

    renderNotLiveState() {
        if (this.game.status === 'scheduled') {
            return `
                <div class="empty-state">
                    <div class="empty-state-icon">&#9918;</div>
                    <h2>Game not started</h2>
                    <p>${this.lineup.length === 0 ? 'Set your lineup, then start the game.' : 'Ready to play!'}</p>
                </div>
            `;
        }
        return `
            <div class="empty-state">
                <div class="empty-state-icon">&#127942;</div>
                <h2>Game Over</h2>
                <p>Final: ${this.game.our_score} - ${this.game.opponent_score}</p>
                <a href="#/games/${this.gameId}/box" class="btn btn-primary">View Box Score</a>
            </div>
        `;
    }

    renderPitcherSummary() {
        const current = this.pitching[this.pitching.length - 1];
        if (!current) return '';
        const p = current.players || {};
        return `
            <div class="pitcher-summary">
                <div class="pitcher-summary-title">Pitcher</div>
                <div style="font-weight:600; margin-bottom:var(--space-xs);">
                    ${this.esc(p.first_name || '')} ${this.esc(p.last_name || '')}
                </div>
                <div class="pitcher-stat-row">
                    <span class="pitcher-stat-label">IP</span>
                    <span>${this.formatIP(current.outs_recorded)}</span>
                </div>
                <div class="pitcher-stat-row">
                    <span class="pitcher-stat-label">K</span>
                    <span>${current.strikeouts}</span>
                </div>
                <div class="pitcher-stat-row">
                    <span class="pitcher-stat-label">BB</span>
                    <span>${current.walks}</span>
                </div>
                <div class="pitcher-stat-row">
                    <span class="pitcher-stat-label">H</span>
                    <span>${current.hits_allowed}</span>
                </div>
                ${current.pitches_thrown != null ? `
                <div class="pitcher-stat-row">
                    <span class="pitcher-stat-label">PC</span>
                    <span>${current.pitches_thrown}</span>
                </div>` : ''}
            </div>
        `;
    }

    bindEvents() {
        document.getElementById('start-game-btn')?.addEventListener('click', () => this.startGame());
        document.getElementById('end-game-btn')?.addEventListener('click', () => this.endGame());
        document.getElementById('setup-lineup-btn')?.addEventListener('click', () => this.showLineupSetup());
        document.getElementById('edit-lineup-btn')?.addEventListener('click', () => this.showLineupSetup());

        document.querySelectorAll('[data-result]').forEach(btn => {
            btn.addEventListener('click', () => this.recordResult(btn.dataset.result));
        });

        document.querySelectorAll('[data-rbi]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectedRBI = parseInt(btn.dataset.rbi);
                document.querySelectorAll('[data-rbi]').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });

        document.getElementById('scored-yes')?.addEventListener('click', () => {
            this.selectedScored = true;
            document.getElementById('scored-yes').classList.add('btn-primary');
            document.getElementById('scored-no').classList.remove('btn-primary');
        });
        document.getElementById('scored-no')?.addEventListener('click', () => {
            this.selectedScored = false;
            document.getElementById('scored-no').classList.add('btn-primary');
            document.getElementById('scored-yes').classList.remove('btn-primary');
        });

        document.getElementById('undo-btn')?.addEventListener('click', () => this.undoLast());

        document.querySelectorAll('.lineup-item[data-index]').forEach(item => {
            item.addEventListener('click', () => {
                this.currentBatterIndex = parseInt(item.dataset.index);
                this.renderGame(document.getElementById('app'));
            });
        });
    }

    async showLineupSetup() {
        // Fetch team players
        let players;
        try {
            players = await this.app.api.listPlayers(this.game.team_id);
        } catch (err) {
            this.app.showToast(err.message, 'error');
            return;
        }

        if (players.length === 0) {
            this.app.showToast('No players on the roster. Add players first.', 'error');
            window.location.hash = `#/teams/${this.game.team_id}`;
            return;
        }

        // Build lineup slots from existing lineup or defaults
        const positions = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
        const existingMap = {};
        for (const entry of this.lineup) {
            existingMap[entry.batting_order] = { playerId: entry.player_id, position: entry.position };
        }

        const slotCount = Math.max(9, players.length);
        const slots = [];
        for (let i = 1; i <= slotCount; i++) {
            slots.push({
                order: i,
                playerId: existingMap[i]?.playerId || '',
                position: existingMap[i]?.position || '',
            });
        }

        // Create modal
        const container = document.getElementById('app');
        const modalDiv = document.createElement('div');
        modalDiv.id = 'lineup-modal';
        modalDiv.innerHTML = `
            <div class="modal-overlay" id="lineup-overlay">
                <div class="modal" style="max-width:700px; max-height:90vh;">
                    <div class="modal-header">
                        <h2 class="modal-title">Set Batting Lineup</h2>
                        <button class="modal-close" id="lineup-close">&times;</button>
                    </div>
                    <div class="modal-body" style="max-height:60vh; overflow-y:auto;">
                        <table class="stat-table" style="font-family:var(--font-body);">
                            <thead>
                                <tr>
                                    <th style="text-align:center; width:40px;">#</th>
                                    <th style="text-align:left;">Player</th>
                                    <th style="text-align:left; width:100px;">Position</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${slots.map(s => `
                                    <tr>
                                        <td style="text-align:center; font-weight:600;">${s.order}</td>
                                        <td style="text-align:left;">
                                            <select class="form-select lineup-player-select" data-order="${s.order}" style="min-height:40px;">
                                                <option value="">-- Select Player --</option>
                                                ${players.map(p => `
                                                    <option value="${p.id}" ${s.playerId === p.id ? 'selected' : ''}>
                                                        #${p.jersey_number ?? '?'} ${p.first_name} ${p.last_name}
                                                    </option>
                                                `).join('')}
                                            </select>
                                        </td>
                                        <td style="text-align:left;">
                                            <select class="form-select lineup-pos-select" data-order="${s.order}" style="min-height:40px;">
                                                ${positions.map(pos => `
                                                    <option value="${pos}" ${s.position === pos ? 'selected' : ''}>${pos}</option>
                                                `).join('')}
                                            </select>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    <div class="modal-footer">
                        <button class="btn" id="lineup-cancel">Cancel</button>
                        <button class="btn btn-primary" id="lineup-save">Save Lineup</button>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(modalDiv);

        const close = () => modalDiv.remove();

        document.getElementById('lineup-close').addEventListener('click', close);
        document.getElementById('lineup-cancel').addEventListener('click', close);
        document.getElementById('lineup-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'lineup-overlay') close();
        });

        document.getElementById('lineup-save').addEventListener('click', async () => {
            const entries = [];
            const usedPlayers = new Set();
            const selects = modalDiv.querySelectorAll('.lineup-player-select');

            for (const sel of selects) {
                const playerId = sel.value;
                if (!playerId) continue;
                if (usedPlayers.has(playerId)) {
                    this.app.showToast('Each player can only appear once in the lineup', 'error');
                    return;
                }
                usedPlayers.add(playerId);

                const order = parseInt(sel.dataset.order);
                const posSelect = modalDiv.querySelector(`.lineup-pos-select[data-order="${order}"]`);
                entries.push({
                    playerId,
                    battingOrder: order,
                    position: posSelect.value,
                    isStarter: true,
                });
            }

            if (entries.length === 0) {
                this.app.showToast('Select at least one player', 'error');
                return;
            }

            try {
                const newLineup = await this.app.api.setLineup(this.gameId, entries);
                this.lineup = newLineup;
                this.currentBatterIndex = 0;
                close();
                this.app.showToast(`Lineup set (${entries.length} players)`, 'success');
                this.renderGame(document.getElementById('app'));
            } catch (err) {
                this.app.showToast(err.message, 'error');
            }
        });
    }

    async startGame() {
        try {
            const game = await this.app.api.startGame(this.gameId);
            this.game = game;
            this.renderGame(document.getElementById('app'));
        } catch (err) {
            this.app.showToast(err.message, 'error');
        }
    }

    async endGame() {
        if (!confirm('End this game? This marks it as final.')) return;
        try {
            const game = await this.app.api.endGame(this.gameId);
            this.game = game;
            this.renderGame(document.getElementById('app'));
        } catch (err) {
            this.app.showToast(err.message, 'error');
        }
    }

    async recordResult(result) {
        const batter = this.lineup[this.currentBatterIndex];
        if (!batter) {
            this.app.showToast('No batter selected', 'error');
            return;
        }

        const playerId = batter.players?.id || batter.player_id;
        const data = {
            playerId,
            result,
            rbi: this.selectedRBI,
            runnerScored: this.selectedScored,
        };

        try {
            if (navigator.onLine) {
                const response = await this.app.api.recordAtBat(this.gameId, data);
                this.atBats.push(response.atBat);
                this.game = response.gameState;
            } else {
                await this.app.sync.enqueue('record_at_bat', {
                    gameId: this.gameId,
                    playerId,
                    inning: this.game.current_inning,
                    isTop: this.game.is_top_of_inning,
                    result,
                    rbi: this.selectedRBI,
                    runnerScored: this.selectedScored,
                });
                this.app.showToast('At-bat queued (offline)', 'info');
            }

            this.selectedRBI = 0;
            this.selectedScored = false;
            this.currentBatterIndex = (this.currentBatterIndex + 1) % Math.max(1, this.lineup.length);

            this.renderGame(document.getElementById('app'));
        } catch (err) {
            this.app.showToast(err.message, 'error');
        }
    }

    async undoLast() {
        const lastAB = this.atBats[this.atBats.length - 1];
        if (!lastAB) return;

        if (!confirm('Undo the last at-bat?')) return;

        try {
            const updatedGame = await this.app.api.undoAtBat(this.gameId, lastAB.id);
            this.atBats.pop();
            this.game = updatedGame;

            this.currentBatterIndex = (this.currentBatterIndex - 1 + this.lineup.length) % Math.max(1, this.lineup.length);

            this.renderGame(document.getElementById('app'));
            this.app.showToast('At-bat undone', 'info');
        } catch (err) {
            this.app.showToast(err.message, 'error');
        }
    }

    resultDotClass(result) {
        const hits = ['single', 'double', 'triple'];
        if (hits.includes(result)) return 'hit';
        if (result === 'home_run') return 'hr';
        if (['walk', 'hit_by_pitch', 'intentional_walk'].includes(result)) return 'walk';
        if (['strikeout_swinging', 'strikeout_looking'].includes(result)) return 'k';
        if (result === 'reached_on_error') return 'error';
        return 'out';
    }

    formatIP(outs) {
        return `${Math.floor(outs / 3)}.${outs % 3}`;
    }

    esc(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    destroy() {
        // Cleanup if needed
    }
}
