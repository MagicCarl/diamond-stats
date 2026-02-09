// Diamond Stats - Live Game Scoring Screen (PRIMARY SCREEN)
// iPad landscape optimized: left sidebar lineup, main area at-bat controls + game log

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
        const halfInning = g.is_top_of_inning ? 'TOP' : 'BOT';
        const currentBatter = this.lineup[this.currentBatterIndex];
        const teamName = g.teams?.name || 'US';
        const oppName = g.opponent_name || 'OPP';

        container.innerHTML = `
            <div class="game-live">
                <!-- Scoreboard -->
                <div class="scoreboard">
                    <div class="scoreboard-teams">
                        <div class="scoreboard-team ${!g.is_top_of_inning && isLive ? 'batting' : ''}">
                            <span class="scoreboard-team-name">${g.is_home ? this.esc(oppName) : this.esc(teamName)}</span>
                            <span class="scoreboard-score">${g.is_home ? g.opponent_score : g.our_score}</span>
                        </div>
                        <div class="scoreboard-inning-display">
                            <span class="inning-half">${halfInning}</span>
                            <span class="inning-num">${g.current_inning}</span>
                        </div>
                        <div class="scoreboard-team ${g.is_top_of_inning && isLive ? 'batting' : ''}">
                            <span class="scoreboard-team-name">${g.is_home ? this.esc(teamName) : this.esc(oppName)}</span>
                            <span class="scoreboard-score">${g.is_home ? g.our_score : g.opponent_score}</span>
                        </div>
                    </div>
                    <div class="scoreboard-outs">
                        <span class="outs-label">OUTS</span>
                        <span class="out-dot ${g.outs_in_current_inning >= 1 ? 'filled' : ''}"></span>
                        <span class="out-dot ${g.outs_in_current_inning >= 2 ? 'filled' : ''}"></span>
                    </div>
                    <div class="scoreboard-actions">
                        ${g.status === 'scheduled' ? `
                            <button class="btn btn-sm" id="setup-lineup-btn">Set Lineup</button>
                            <button class="btn btn-primary btn-sm" id="start-game-btn">Start Game</button>
                        ` : ''}
                        ${isLive ? `
                            <button class="btn btn-sm" id="edit-lineup-btn">Lineup</button>
                            <button class="btn btn-danger btn-sm" id="end-game-btn">End Game</button>
                        ` : ''}
                        <a href="#/games/${this.gameId}/box" class="btn btn-sm">Box Score</a>
                        <a href="#/teams/${g.team_id}" class="btn btn-sm">Back</a>
                    </div>
                </div>

                <!-- Lineup Panel (left sidebar) -->
                <div class="lineup-panel">
                    <div class="lineup-header">
                        <span class="lineup-title">BATTING ORDER</span>
                        <span class="lineup-count">${this.lineup.length} players</span>
                    </div>
                    ${this.lineup.length === 0
                        ? `<div class="empty-state" style="padding:var(--space-md); min-height:auto;">
                               <p style="font-size:var(--font-size-sm);">No lineup set yet</p>
                               <button class="btn btn-primary btn-sm" id="setup-lineup-btn-side">Set Lineup</button>
                           </div>`
                        : this.lineup.map((entry, i) => {
                            const p = entry.players || {};
                            const isActive = i === this.currentBatterIndex && isLive;
                            const playerABs = this.atBats.filter(ab =>
                                ab.player_id === (p.id || entry.player_id)
                            );
                            const pStats = this.quickBatterLine(playerABs);
                            return `
                                <div class="lineup-item ${isActive ? 'active' : ''}"
                                     data-index="${i}" ${isLive ? 'style="cursor:pointer"' : ''}>
                                    <span class="lineup-number">${entry.batting_order}</span>
                                    <div class="lineup-info">
                                        <span class="lineup-name">#${p.jersey_number ?? '?'} ${this.esc(p.last_name || '')}</span>
                                        <span class="lineup-stats-line">${pStats}</span>
                                    </div>
                                    <span class="lineup-position">${this.esc(entry.position)}</span>
                                </div>
                            `;
                        }).join('')
                    }

                    ${this.pitching.length > 0 ? this.renderPitcherSummary() : ''}
                </div>

                <!-- Main Content Area -->
                <div class="at-bat-panel">
                    ${!isLive ? this.renderNotLiveState() : this.renderLiveContent(currentBatter)}
                </div>
            </div>
        `;

        this.bindEvents();
    }

    renderLiveContent(batter) {
        const p = batter?.players || {};
        return `
            <!-- Current At-Bat -->
            <div class="at-bat-header">
                <div class="at-bat-batter-info">
                    <span class="at-bat-label">NOW BATTING</span>
                    <span class="at-bat-batter">
                        #${p.jersey_number || '?'} ${this.esc(p.first_name || '')} ${this.esc(p.last_name || '')}
                    </span>
                </div>
                <span class="at-bat-position">${this.esc(batter?.position || '')}</span>
            </div>

            <!-- Result Buttons -->
            <div class="result-grid">
                <div class="result-row">
                    <span class="result-section-label">HITS</span>
                    <button class="result-btn hit" data-result="single">1B</button>
                    <button class="result-btn hit" data-result="double">2B</button>
                    <button class="result-btn hit" data-result="triple">3B</button>
                    <button class="result-btn hr" data-result="home_run">HR</button>
                </div>
                <div class="result-row">
                    <span class="result-section-label">WALKS</span>
                    <button class="result-btn walk" data-result="walk">BB</button>
                    <button class="result-btn walk" data-result="hit_by_pitch">HBP</button>
                    <button class="result-btn walk" data-result="intentional_walk">IBB</button>
                </div>
                <div class="result-row">
                    <span class="result-section-label">OUTS</span>
                    <button class="result-btn strikeout" data-result="strikeout_swinging">K</button>
                    <button class="result-btn strikeout" data-result="strikeout_looking">KL</button>
                    <button class="result-btn out" data-result="ground_out">GO</button>
                    <button class="result-btn out" data-result="fly_out">FO</button>
                    <button class="result-btn out" data-result="line_out">LO</button>
                    <button class="result-btn out" data-result="pop_out">PO</button>
                </div>
                <div class="result-row">
                    <span class="result-section-label">OTHER</span>
                    <button class="result-btn out" data-result="fielders_choice">FC</button>
                    <button class="result-btn out" data-result="double_play">DP</button>
                    <button class="result-btn other" data-result="sacrifice_fly">SF</button>
                    <button class="result-btn other" data-result="sacrifice_bunt">SAC</button>
                    <button class="result-btn other" data-result="reached_on_error">E</button>
                </div>
            </div>

            <!-- RBI / Scored / Undo -->
            <div class="extras-row">
                <div class="extras-group">
                    <span class="extras-label">RBI</span>
                    ${[0,1,2,3,4].map(n => `
                        <button class="rbi-btn ${n === this.selectedRBI ? 'selected' : ''}" data-rbi="${n}">${n}</button>
                    `).join('')}
                </div>
                <div class="extras-group">
                    <span class="extras-label">Scored?</span>
                    <button class="btn btn-sm ${this.selectedScored ? 'btn-primary' : ''}" id="scored-yes">Yes</button>
                    <button class="btn btn-sm ${!this.selectedScored ? 'btn-primary' : ''}" id="scored-no">No</button>
                </div>
                <button class="btn btn-danger btn-sm" id="undo-btn" ${this.atBats.length === 0 ? 'disabled' : ''}
                    style="margin-left:auto;">
                    Undo Last
                </button>
            </div>

            <!-- Game Log / Scoresheet -->
            <div class="game-log">
                <div class="game-log-title">GAME LOG</div>
                <div class="game-log-entries">
                    ${this.atBats.length === 0
                        ? '<div class="game-log-empty">No at-bats recorded yet. Tap a result button above to score.</div>'
                        : this.renderGameLog()
                    }
                </div>
            </div>
        `;
    }

    renderGameLog() {
        // Group at-bats by inning + half
        const grouped = {};
        for (const ab of this.atBats) {
            const key = `${ab.inning}-${ab.is_top ? 'top' : 'bot'}`;
            if (!grouped[key]) grouped[key] = { inning: ab.inning, isTop: ab.is_top, abs: [] };
            grouped[key].abs.push(ab);
        }

        return Object.values(grouped).map(group => {
            const half = group.isTop ? 'Top' : 'Bot';
            return `
                <div class="log-inning-header">${half} ${group.inning}</div>
                ${group.abs.map(ab => {
                    const p = ab.players || {};
                    const name = p.last_name || '?';
                    const resultLabel = this.resultLabel(ab.result);
                    const resultClass = this.resultDotClass(ab.result);
                    const extras = [];
                    if (ab.rbi > 0) extras.push(`${ab.rbi} RBI`);
                    if (ab.runner_scored) extras.push('R');
                    return `
                        <div class="log-entry">
                            <span class="log-result-badge ${resultClass}">${resultLabel}</span>
                            <span class="log-player">${this.esc(name)}</span>
                            ${extras.length > 0 ? `<span class="log-extras">${extras.join(', ')}</span>` : ''}
                        </div>
                    `;
                }).join('')}
            `;
        }).join('');
    }

    renderNotLiveState() {
        if (this.game.status === 'scheduled') {
            return `
                <div class="empty-state" style="min-height:auto; padding:var(--space-2xl);">
                    <div class="empty-state-icon">&#9918;</div>
                    <h2>Game: ${this.esc(this.game.teams?.name || 'Us')} vs ${this.esc(this.game.opponent_name)}</h2>
                    <p style="max-width:400px;">
                        ${this.lineup.length === 0
                            ? 'Step 1: Set your batting lineup. Step 2: Start the game.'
                            : `Lineup set with ${this.lineup.length} players. Ready to play!`
                        }
                    </p>
                    ${this.lineup.length === 0
                        ? '<button class="btn btn-primary btn-lg" id="setup-lineup-btn-main">Set Lineup to Start</button>'
                        : '<button class="btn btn-primary btn-lg" id="start-game-btn-main">Start Game</button>'
                    }
                </div>
            `;
        }
        return `
            <div class="empty-state" style="min-height:auto; padding:var(--space-2xl);">
                <div class="empty-state-icon">&#127942;</div>
                <h2>Final Score</h2>
                <div style="font-size:var(--font-size-2xl); font-weight:700; font-family:var(--font-mono); margin:var(--space-md) 0;">
                    ${this.game.our_score} - ${this.game.opponent_score}
                </div>
                <a href="#/games/${this.gameId}/box" class="btn btn-primary">View Full Box Score</a>
            </div>
            ${this.atBats.length > 0 ? `
                <div class="game-log">
                    <div class="game-log-title">GAME LOG</div>
                    <div class="game-log-entries">${this.renderGameLog()}</div>
                </div>
            ` : ''}
        `;
    }

    renderPitcherSummary() {
        const current = this.pitching[this.pitching.length - 1];
        if (!current) return '';
        const p = current.players || {};
        return `
            <div class="pitcher-summary">
                <div class="pitcher-summary-title">PITCHER</div>
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
        // Scoreboard buttons
        document.getElementById('start-game-btn')?.addEventListener('click', () => this.startGame());
        document.getElementById('end-game-btn')?.addEventListener('click', () => this.endGame());
        document.getElementById('setup-lineup-btn')?.addEventListener('click', () => this.showLineupSetup());
        document.getElementById('edit-lineup-btn')?.addEventListener('click', () => this.showLineupSetup());

        // Main content buttons
        document.getElementById('setup-lineup-btn-side')?.addEventListener('click', () => this.showLineupSetup());
        document.getElementById('setup-lineup-btn-main')?.addEventListener('click', () => this.showLineupSetup());
        document.getElementById('start-game-btn-main')?.addEventListener('click', () => this.startGame());

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

        // Lineup click to change batter
        document.querySelectorAll('.lineup-item[data-index]').forEach(item => {
            item.addEventListener('click', () => {
                if (this.game.status !== 'in_progress') return;
                this.currentBatterIndex = parseInt(item.dataset.index);
                this.renderGame(document.getElementById('app'));
            });
        });
    }

    async showLineupSetup() {
        let players;
        try {
            players = await this.app.api.listPlayers(this.game.team_id);
        } catch (err) {
            this.app.showToast(err.message, 'error');
            return;
        }

        if (players.length === 0) {
            this.app.showToast('No players on the roster. Add players to the team first.', 'error');
            window.location.hash = `#/teams/${this.game.team_id}`;
            return;
        }

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
                        <p style="color:var(--text-secondary); font-size:var(--font-size-sm); margin-bottom:var(--space-md);">
                            Select players for each batting order slot and assign their field position.
                        </p>
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
                                                        #${p.jersey_number ?? '?'} ${p.first_name} ${p.last_name} (${p.primary_position || '?'})
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

        // Auto-set position when player is selected based on their primary position
        modalDiv.querySelectorAll('.lineup-player-select').forEach(sel => {
            sel.addEventListener('change', () => {
                const playerId = sel.value;
                if (!playerId) return;
                const player = players.find(p => p.id === playerId);
                if (player?.primary_position) {
                    const order = sel.dataset.order;
                    const posSelect = modalDiv.querySelector(`.lineup-pos-select[data-order="${order}"]`);
                    if (posSelect && positions.includes(player.primary_position)) {
                        posSelect.value = player.primary_position;
                    }
                }
            });
        });

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
                this.app.showToast('Select at least one player for the lineup', 'error');
                return;
            }

            try {
                const saveBtn = document.getElementById('lineup-save');
                saveBtn.disabled = true;
                saveBtn.textContent = 'Saving...';

                const newLineup = await this.app.api.setLineup(this.gameId, entries);
                this.lineup = newLineup;
                this.currentBatterIndex = 0;
                close();
                this.app.showToast(`Lineup set (${entries.length} players)`, 'success');
                this.renderGame(document.getElementById('app'));
            } catch (err) {
                this.app.showToast(err.message, 'error');
                const saveBtn = document.getElementById('lineup-save');
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Save Lineup';
                }
            }
        });
    }

    async startGame() {
        // Require lineup first
        if (this.lineup.length === 0) {
            this.app.showToast('Set your batting lineup before starting the game', 'error');
            this.showLineupSetup();
            return;
        }

        try {
            const game = await this.app.api.startGame(this.gameId);
            this.game = game;
            this.app.showToast('Game started! Tap a result for each at-bat.', 'success');
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
            this.app.showToast('No batter selected — set lineup first', 'error');
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

    // Quick stat line for lineup sidebar (e.g., "1-3, HR, 2 RBI")
    quickBatterLine(playerABs) {
        if (playerABs.length === 0) return '';
        const hits = playerABs.filter(ab => ['single', 'double', 'triple', 'home_run'].includes(ab.result));
        const abs = playerABs.filter(ab => !['walk', 'intentional_walk', 'hit_by_pitch', 'sacrifice_fly', 'sacrifice_bunt'].includes(ab.result));
        return `${hits.length}-${abs.length}`;
    }

    resultLabel(result) {
        const labels = {
            single: '1B', double: '2B', triple: '3B', home_run: 'HR',
            walk: 'BB', intentional_walk: 'IBB', hit_by_pitch: 'HBP',
            strikeout_swinging: 'K', strikeout_looking: 'KL',
            ground_out: 'GO', fly_out: 'FO', line_out: 'LO', pop_out: 'PO',
            fielders_choice: 'FC', double_play: 'DP',
            sacrifice_fly: 'SF', sacrifice_bunt: 'SAC',
            reached_on_error: 'E',
        };
        return labels[result] || result;
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
