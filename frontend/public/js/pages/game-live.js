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
                    const idx = this.lineup.findIndex(l => l.player?.id === lastAB.player?.id || l.$player?.id === lastAB.$player?.id);
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
        const halfInning = g.isTopOfInning ? 'Top' : 'Bot';
        const currentBatter = this.lineup[this.currentBatterIndex];

        container.innerHTML = `
            <div class="game-live">
                <!-- Scoreboard -->
                <div class="scoreboard">
                    <div class="scoreboard-teams">
                        <div class="scoreboard-team">
                            <span class="scoreboard-team-name">${g.isHome ? 'AWAY' : this.esc(g.team?.name || 'US')}</span>
                            <span class="scoreboard-score">${g.isHome ? g.opponentScore : g.ourScore}</span>
                        </div>
                        <span class="scoreboard-vs">-</span>
                        <div class="scoreboard-team">
                            <span class="scoreboard-team-name">${g.isHome ? this.esc(g.team?.name || 'US') : 'AWAY'}</span>
                            <span class="scoreboard-score">${g.isHome ? g.ourScore : g.opponentScore}</span>
                        </div>
                    </div>
                    <div class="scoreboard-info">
                        <div class="scoreboard-inning">
                            <span class="half">${halfInning}</span>
                            ${g.currentInning}
                        </div>
                        <div class="scoreboard-outs">
                            <span style="font-size:var(--font-size-xs);color:var(--text-secondary);margin-right:var(--space-xs);">OUTS</span>
                            <span class="out-dot ${g.outsInCurrentInning >= 1 ? 'filled' : ''}"></span>
                            <span class="out-dot ${g.outsInCurrentInning >= 2 ? 'filled' : ''}"></span>
                            <span class="out-dot ${g.outsInCurrentInning >= 3 ? 'filled' : ''}"></span>
                        </div>
                    </div>
                    <div class="scoreboard-actions">
                        ${!isLive ? `<button class="btn btn-primary btn-sm" id="start-game-btn">Start Game</button>` : ''}
                        ${isLive ? `<button class="btn btn-danger btn-sm" id="end-game-btn">End Game</button>` : ''}
                        <a href="#/games/${this.gameId}/box" class="btn btn-sm">Box Score</a>
                        <a href="#/teams/${g.team?.id || g.$team?.id}" class="btn btn-sm">Back</a>
                    </div>
                </div>

                <!-- Lineup Panel (left sidebar) -->
                <div class="lineup-panel">
                    <div class="lineup-title">Batting Order</div>
                    ${this.lineup.length === 0
                        ? `<div class="empty-state" style="padding:var(--space-md);"><p>No lineup set</p><button class="btn btn-sm" id="setup-lineup-btn">Set Lineup</button></div>`
                        : this.lineup.map((entry, i) => {
                            const p = entry.player || {};
                            const isActive = i === this.currentBatterIndex && isLive;
                            const playerABs = this.atBats.filter(ab =>
                                (ab.player?.id || ab.$player?.id) === (p.id || entry.$player?.id)
                            );
                            return `
                                <div class="lineup-item ${isActive ? 'active' : ''}"
                                     data-index="${i}" ${isLive ? 'style="cursor:pointer"' : ''}>
                                    <span class="lineup-number">${entry.battingOrder}</span>
                                    <span class="lineup-name">${this.esc(p.firstName || '')} ${this.esc(p.lastName || '')}</span>
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
        const p = batter?.player || {};
        return `
            <div class="at-bat-header">
                <span class="at-bat-batter">
                    #${p.jerseyNumber || '?'} ${this.esc(p.firstName || '')} ${this.esc(p.lastName || '')}
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
                <p>Final: ${this.game.ourScore} - ${this.game.opponentScore}</p>
                <a href="#/games/${this.gameId}/box" class="btn btn-primary">View Box Score</a>
            </div>
        `;
    }

    renderPitcherSummary() {
        const current = this.pitching[this.pitching.length - 1];
        if (!current) return '';
        const p = current.player || {};
        return `
            <div class="pitcher-summary">
                <div class="pitcher-summary-title">Pitcher</div>
                <div style="font-weight:600; margin-bottom:var(--space-xs);">
                    ${this.esc(p.firstName || '')} ${this.esc(p.lastName || '')}
                </div>
                <div class="pitcher-stat-row">
                    <span class="pitcher-stat-label">IP</span>
                    <span>${this.formatIP(current.outsRecorded)}</span>
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
                    <span>${current.hitsAllowed}</span>
                </div>
                ${current.pitchesThrown != null ? `
                <div class="pitcher-stat-row">
                    <span class="pitcher-stat-label">PC</span>
                    <span>${current.pitchesThrown}</span>
                </div>` : ''}
            </div>
        `;
    }

    bindEvents() {
        // Start game
        document.getElementById('start-game-btn')?.addEventListener('click', () => this.startGame());

        // End game
        document.getElementById('end-game-btn')?.addEventListener('click', () => this.endGame());

        // Result buttons
        document.querySelectorAll('[data-result]').forEach(btn => {
            btn.addEventListener('click', () => this.recordResult(btn.dataset.result));
        });

        // RBI buttons
        document.querySelectorAll('[data-rbi]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectedRBI = parseInt(btn.dataset.rbi);
                document.querySelectorAll('[data-rbi]').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });

        // Scored toggle
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

        // Undo
        document.getElementById('undo-btn')?.addEventListener('click', () => this.undoLast());

        // Lineup click to switch batter
        document.querySelectorAll('.lineup-item[data-index]').forEach(item => {
            item.addEventListener('click', () => {
                this.currentBatterIndex = parseInt(item.dataset.index);
                this.renderGame(document.getElementById('app'));
            });
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

        const playerId = batter.player?.id || batter.$player?.id;
        const data = {
            playerId,
            result,
            rbi: this.selectedRBI,
            runnerScored: this.selectedScored,
        };

        try {
            if (navigator.onLine) {
                const response = await this.app.api.recordAtBat(this.gameId, data);
                // Update local state from server response
                this.atBats.push(response.atBat);
                this.game.currentInning = response.gameState.currentInning;
                this.game.isTopOfInning = response.gameState.isTopOfInning;
                this.game.outsInCurrentInning = response.gameState.outsInCurrentInning;
                this.game.ourScore = response.gameState.ourScore;
                this.game.opponentScore = response.gameState.opponentScore;
                this.game.status = response.gameState.status;
            } else {
                // Offline: queue operation
                await this.app.sync.enqueue('record_at_bat', {
                    gameId: this.gameId,
                    playerId,
                    inning: this.game.currentInning,
                    isTop: this.game.isTopOfInning,
                    result,
                    rbi: this.selectedRBI,
                    runnerScored: this.selectedScored,
                });
                this.app.showToast('At-bat queued (offline)', 'info');
            }

            // Reset extras and advance batter
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
            const gameState = await this.app.api.undoAtBat(this.gameId, lastAB.id);
            this.atBats.pop();
            this.game.currentInning = gameState.currentInning;
            this.game.isTopOfInning = gameState.isTopOfInning;
            this.game.outsInCurrentInning = gameState.outsInCurrentInning;
            this.game.ourScore = gameState.ourScore;
            this.game.opponentScore = gameState.opponentScore;

            // Move batter index back
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
