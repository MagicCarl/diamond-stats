// Diamond Stats - Live Game Scoring Screen (PRIMARY SCREEN)
// iPad landscape optimized: top linescore, left lineup, main at-bat controls + game log

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
        this.selectedRunsOnPlay = 0;
        this.batterScored = false;
        this.selectedResult = null;
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

            // Find current batter position
            if (this.lineup.length > 0 && this.atBats.length > 0) {
                const lastAB = this.atBats[this.atBats.length - 1];
                const idx = this.lineup.findIndex(l => {
                    const pid = l.players?.id || l.player_id;
                    return pid === lastAB.player_id;
                });
                this.currentBatterIndex = idx >= 0 ? (idx + 1) % this.lineup.length : 0;
            }

            this.renderGame(container);
        } catch (err) {
            console.error('Failed to load game:', err);
            container.innerHTML = `<div class="empty-state"><p style="color:var(--offline);">Error: ${this.esc(err.message)}</p><a href="#/dashboard" class="btn btn-primary" style="margin-top:16px;">Dashboard</a></div>`;
        }
    }

    renderGame(container) {
        const g = this.game;
        const isLive = g.status === 'in_progress';
        const currentBatter = this.lineup[this.currentBatterIndex];
        const teamName = g.teams?.name || 'Us';
        const oppName = g.opponent_name || 'Opponent';

        // Build linescore data
        const linescore = this.buildLinescore();

        container.innerHTML = `
            <div class="game-live">
                <!-- Top Scoreboard with Linescore -->
                <div class="scoreboard">
                    <div class="scoreboard-left">
                        <div class="linescore-compact">
                            <table>
                                <thead>
                                    <tr>
                                        <th class="team-col"></th>
                                        ${linescore.innings.map(inn => `
                                            <th class="${inn.num === g.current_inning ? 'current-inning' : ''}">${inn.num}</th>
                                        `).join('')}
                                        <th class="total-col">R</th>
                                        <th class="total-col">H</th>
                                        <th class="total-col">E</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr class="${g.is_top_of_inning && isLive ? 'batting-row' : ''}">
                                        <td class="team-col">${g.is_home ? this.esc(oppName).substring(0, 10) : this.esc(teamName).substring(0, 10)}</td>
                                        ${linescore.innings.map(inn => `
                                            <td class="${inn.num === g.current_inning ? 'current-inning' : ''}">${inn.away ?? '-'}</td>
                                        `).join('')}
                                        <td class="total-col">${g.is_home ? g.opponent_score : g.our_score}</td>
                                        <td class="total-col">${g.is_home ? linescore.awayH : linescore.homeH}</td>
                                        <td class="total-col">${g.is_home ? linescore.awayE : linescore.homeE}</td>
                                    </tr>
                                    <tr class="${!g.is_top_of_inning && isLive ? 'batting-row' : ''}">
                                        <td class="team-col">${g.is_home ? this.esc(teamName).substring(0, 10) : this.esc(oppName).substring(0, 10)}</td>
                                        ${linescore.innings.map(inn => `
                                            <td class="${inn.num === g.current_inning ? 'current-inning' : ''}">${inn.home ?? '-'}</td>
                                        `).join('')}
                                        <td class="total-col">${g.is_home ? g.our_score : g.opponent_score}</td>
                                        <td class="total-col">${g.is_home ? linescore.homeH : linescore.awayH}</td>
                                        <td class="total-col">${g.is_home ? linescore.homeE : linescore.awayE}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="scoreboard-right">
                        <div class="game-situation">
                            <div class="inning-display">
                                <span class="inning-arrow">${g.is_top_of_inning ? '\u25B2' : '\u25BC'}</span>
                                <span class="inning-number">${g.current_inning}</span>
                            </div>
                            <div class="outs-display">
                                <span class="outs-label">OUTS</span>
                                <div class="outs-dots">
                                    <span class="out-dot ${g.outs_in_current_inning >= 1 ? 'filled' : ''}"></span>
                                    <span class="out-dot ${g.outs_in_current_inning >= 2 ? 'filled' : ''}"></span>
                                    <span class="out-dot ${g.outs_in_current_inning >= 3 ? 'filled' : ''}"></span>
                                </div>
                            </div>
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
                            <a href="#/games/${this.gameId}/box" class="btn btn-sm">Box</a>
                            <a href="#/games/${this.gameId}/book" class="btn btn-sm">Book</a>
                            <a href="#/teams/${g.team_id}" class="btn btn-sm">Back</a>
                        </div>
                    </div>
                </div>

                <!-- Left Sidebar: Batting Order -->
                <div class="lineup-panel">
                    <div class="lineup-header">
                        <span class="lineup-title">BATTING ORDER</span>
                        <span class="lineup-count">${this.lineup.length}P</span>
                    </div>
                    ${this.lineup.length === 0
                        ? `<div class="empty-state" style="padding:var(--space-md);min-height:auto;">
                               <p style="font-size:var(--font-size-sm);">No lineup set</p>
                               <button class="btn btn-primary btn-sm" id="setup-lineup-btn-side">Set Lineup</button>
                           </div>`
                        : this.lineup.map((entry, i) => {
                            const p = entry.players || {};
                            const isActive = i === this.currentBatterIndex && isLive;
                            const pABs = this.atBats.filter(ab => ab.player_id === (p.id || entry.player_id));
                            const line = this.quickBatterLine(pABs);
                            return `
                                <div class="lineup-item ${isActive ? 'active' : ''}"
                                     data-index="${i}">
                                    <span class="lineup-number">${entry.batting_order}</span>
                                    <div class="lineup-info">
                                        <span class="lineup-name">#${p.jersey_number ?? '?'} ${this.esc(p.last_name || '')}</span>
                                        <span class="lineup-stats-line">${line}</span>
                                    </div>
                                    <span class="lineup-position">${this.esc(entry.position)}</span>
                                </div>
                            `;
                        }).join('')
                    }
                    ${this.pitching.length > 0 ? this.renderPitcherSummary() : ''}
                </div>

                <!-- Main Content -->
                <div class="at-bat-panel">
                    ${!isLive ? this.renderNotLiveState() : this.renderLiveContent(currentBatter)}
                </div>
            </div>
        `;

        this.bindEvents();
    }

    renderLiveContent(batter) {
        const p = batter?.players || {};
        const pABs = batter ? this.atBats.filter(ab => ab.player_id === (p.id || batter.player_id)) : [];
        const line = this.quickBatterLine(pABs);

        return `
            <!-- Current Batter Header -->
            <div class="at-bat-header">
                <div class="at-bat-batter-info">
                    <span class="at-bat-label">NOW BATTING</span>
                    <span class="at-bat-batter">
                        #${p.jersey_number || '?'} ${this.esc(p.first_name || '')} ${this.esc(p.last_name || '')}
                    </span>
                </div>
                <div style="text-align:right;">
                    <span class="at-bat-position">${this.esc(batter?.position || '')}</span>
                    ${line ? `<div class="at-bat-game-stats">${line}</div>` : ''}
                </div>
            </div>

            <!-- Result Buttons Grid -->
            <div class="result-grid">
                <div class="result-row">
                    <span class="result-section-label">HITS</span>
                    <button class="result-btn hit ${this.selectedResult === 'single' ? 'result-selected' : ''}" data-result="single" data-tooltip="Single">1B</button>
                    <button class="result-btn hit ${this.selectedResult === 'double' ? 'result-selected' : ''}" data-result="double" data-tooltip="Double">2B</button>
                    <button class="result-btn hit ${this.selectedResult === 'triple' ? 'result-selected' : ''}" data-result="triple" data-tooltip="Triple">3B</button>
                    <button class="result-btn hr ${this.selectedResult === 'home_run' ? 'result-selected' : ''}" data-result="home_run" data-tooltip="Home Run">HR</button>
                </div>
                <div class="result-row">
                    <span class="result-section-label">WALKS</span>
                    <button class="result-btn walk ${this.selectedResult === 'walk' ? 'result-selected' : ''}" data-result="walk" data-tooltip="Base on Balls (Walk)">BB</button>
                    <button class="result-btn walk ${this.selectedResult === 'hit_by_pitch' ? 'result-selected' : ''}" data-result="hit_by_pitch" data-tooltip="Hit By Pitch">HBP</button>
                    <button class="result-btn walk ${this.selectedResult === 'intentional_walk' ? 'result-selected' : ''}" data-result="intentional_walk" data-tooltip="Intentional Walk">IBB</button>
                </div>
                <div class="result-row">
                    <span class="result-section-label">OUTS</span>
                    <button class="result-btn strikeout ${this.selectedResult === 'strikeout_swinging' ? 'result-selected' : ''}" data-result="strikeout_swinging" data-tooltip="Strikeout Swinging">K</button>
                    <button class="result-btn strikeout ${this.selectedResult === 'strikeout_looking' ? 'result-selected' : ''}" data-result="strikeout_looking" data-tooltip="Strikeout Looking">K&#x29C;</button>
                    <button class="result-btn out ${this.selectedResult === 'ground_out' ? 'result-selected' : ''}" data-result="ground_out" data-tooltip="Ground Out">GO</button>
                    <button class="result-btn out ${this.selectedResult === 'fly_out' ? 'result-selected' : ''}" data-result="fly_out" data-tooltip="Fly Out">FO</button>
                    <button class="result-btn out ${this.selectedResult === 'line_out' ? 'result-selected' : ''}" data-result="line_out" data-tooltip="Line Out">LO</button>
                    <button class="result-btn out ${this.selectedResult === 'pop_out' ? 'result-selected' : ''}" data-result="pop_out" data-tooltip="Pop Out">PO</button>
                </div>
                <div class="result-row">
                    <span class="result-section-label">OTHER</span>
                    <button class="result-btn out ${this.selectedResult === 'fielders_choice' ? 'result-selected' : ''}" data-result="fielders_choice" data-tooltip="Fielder's Choice">FC</button>
                    <button class="result-btn out ${this.selectedResult === 'double_play' ? 'result-selected' : ''}" data-result="double_play" data-tooltip="Double Play">DP</button>
                    <button class="result-btn other ${this.selectedResult === 'sacrifice_fly' ? 'result-selected' : ''}" data-result="sacrifice_fly" data-tooltip="Sacrifice Fly">SF</button>
                    <button class="result-btn other ${this.selectedResult === 'sacrifice_bunt' ? 'result-selected' : ''}" data-result="sacrifice_bunt" data-tooltip="Sacrifice Bunt">SAC</button>
                    <button class="result-btn other ${this.selectedResult === 'reached_on_error' ? 'result-selected' : ''}" data-result="reached_on_error" data-tooltip="Reached on Error">E</button>
                </div>
            </div>

            <!-- Runs / RBI / Extras Row -->
            <div class="extras-row">
                <div class="extras-group">
                    <span class="extras-label">RUNS</span>
                    ${[0,1,2,3,4].map(n => `
                        <button class="rbi-btn ${n === this.selectedRunsOnPlay ? 'selected' : ''}" data-runs="${n}">${n}</button>
                    `).join('')}
                </div>
                <div class="extras-group">
                    <span class="extras-label">RBI</span>
                    ${[0,1,2,3,4].map(n => `
                        <button class="rbi-btn rbi-select ${n === this.selectedRBI ? 'selected' : ''}" data-rbi="${n}">${n}</button>
                    `).join('')}
                </div>
                <div class="extras-group">
                    <span class="extras-label">Scored</span>
                    <button class="btn btn-xs ${this.batterScored ? 'btn-primary' : ''}" id="scored-toggle">${this.batterScored ? 'YES' : 'NO'}</button>
                </div>
                <div style="margin-left:auto; display:flex; gap:8px; align-items:center;">
                    <button class="btn btn-danger btn-sm" id="undo-btn" ${this.atBats.length === 0 ? 'disabled' : ''}>Undo</button>
                    <button class="next-btn ${this.selectedResult ? 'next-btn-ready' : 'next-btn-disabled'}" id="next-btn"
                        ${!this.selectedResult ? 'disabled' : ''}>Next &#x25B6;</button>
                </div>
            </div>

            <!-- Game Log -->
            <div class="game-log">
                <div class="game-log-title">
                    <span>PLAY-BY-PLAY</span>
                    <span class="game-log-count">${this.atBats.length} AB</span>
                </div>
                <div class="game-log-entries" id="game-log-entries">
                    ${this.atBats.length === 0
                        ? '<div class="game-log-empty">No at-bats recorded yet. Tap a result, set extras, then tap Next.</div>'
                        : this.renderGameLog()
                    }
                </div>
            </div>
        `;
    }

    renderGameLog() {
        const grouped = {};
        for (const ab of this.atBats) {
            const key = `${ab.inning}-${ab.is_top ? 'top' : 'bot'}`;
            if (!grouped[key]) grouped[key] = { inning: ab.inning, isTop: ab.is_top, abs: [] };
            grouped[key].abs.push(ab);
        }

        // Reverse order: most recent inning first
        const groups = Object.values(grouped).reverse();

        return groups.map(group => {
            const half = group.isTop ? '\u25B2 Top' : '\u25BC Bot';
            return `
                <div class="log-inning-header">${half} ${group.inning}</div>
                ${group.abs.map(ab => {
                    const p = ab.players || {};
                    const name = `#${p.jersey_number ?? '?'} ${p.last_name || '?'}`;
                    const label = this.resultLabel(ab.result);
                    const cls = this.resultDotClass(ab.result);
                    const extras = [];
                    if (ab.rbi > 0) extras.push(`${ab.rbi}RBI`);
                    if (ab.runner_scored) extras.push('R');
                    return `
                        <div class="log-entry">
                            <span class="log-result-badge ${cls}">${label}</span>
                            <span class="log-player">${this.esc(name)}</span>
                            ${extras.length > 0 ? `<span class="log-extras">${extras.join(' ')}</span>` : ''}
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
                    <h2 style="margin-bottom:8px;">${this.esc(this.game.teams?.name || 'Us')} vs ${this.esc(this.game.opponent_name)}</h2>
                    <p style="color:var(--text-secondary); max-width:400px; margin-bottom:16px;">
                        ${this.lineup.length === 0
                            ? 'Step 1: Set your batting lineup. Step 2: Start the game and begin scoring.'
                            : `Lineup set with ${this.lineup.length} players. Ready to play!`
                        }
                    </p>
                    ${this.lineup.length === 0
                        ? '<button class="btn btn-primary btn-lg" id="setup-lineup-btn-main">Set Lineup</button>'
                        : `<div class="btn-group"><button class="btn btn-primary btn-lg" id="start-game-btn-main">Start Game</button><button class="btn btn-lg" id="edit-lineup-btn-main">Edit Lineup</button></div>`
                    }
                </div>
            `;
        }
        // Final
        return `
            <div class="empty-state" style="min-height:auto; padding:var(--space-2xl);">
                <div class="empty-state-icon">&#127942;</div>
                <h2>Final Score</h2>
                <div style="font-size:var(--font-size-2xl); font-weight:700; font-family:var(--font-mono); margin:16px 0;">
                    ${this.game.our_score} - ${this.game.opponent_score}
                </div>
                <div class="btn-group" style="justify-content:center;">
                    <a href="#/games/${this.gameId}/box" class="btn btn-primary">View Box Score</a>
                    <a href="#/games/${this.gameId}/book" class="btn">View Scorebook</a>
                </div>
            </div>
            ${this.atBats.length > 0 ? `
                <div class="game-log">
                    <div class="game-log-title"><span>PLAY-BY-PLAY</span><span class="game-log-count">${this.atBats.length} AB</span></div>
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
                <div style="font-weight:600; margin-bottom:4px;">
                    #${p.jersey_number ?? '?'} ${this.esc(p.last_name || '')}
                </div>
                <div class="pitcher-stat-grid">
                    <span class="pitcher-stat-label">IP</span><span>${this.formatIP(current.outs_recorded)}</span>
                    <span class="pitcher-stat-label">K</span><span>${current.strikeouts}</span>
                    <span class="pitcher-stat-label">BB</span><span>${current.walks}</span>
                    <span class="pitcher-stat-label">H</span><span>${current.hits_allowed}</span>
                    ${current.pitches_thrown != null ? `<span class="pitcher-stat-label">PC</span><span>${current.pitches_thrown}</span>` : ''}
                </div>
            </div>
        `;
    }

    buildLinescore() {
        const g = this.game;
        const maxInning = Math.max(g.current_inning, ...this.atBats.map(ab => ab.inning), g.innings_count || 9);
        const totalInnings = Math.max(maxInning, g.innings_count || 9);

        const innings = [];
        let homeH = 0, awayH = 0, homeE = 0, awayE = 0;

        for (let i = 1; i <= totalInnings; i++) {
            const innABs = this.atBats.filter(ab => ab.inning === i);
            let awayRuns = null, homeRuns = null;

            if (i < g.current_inning || (i === g.current_inning && !g.is_top_of_inning) || g.status === 'final') {
                // Top of this inning is complete
                const topABs = innABs.filter(ab => ab.is_top);
                awayRuns = topABs.reduce((s, ab) => s + (ab.runs_on_play != null ? ab.runs_on_play : (ab.rbi || 0)), 0);
                topABs.forEach(ab => {
                    if (this.app.api.isHit(ab.result)) awayH++;
                    if (ab.result === 'reached_on_error') awayE++;
                });
            }

            if (i < g.current_inning || g.status === 'final') {
                // Bottom of this inning is complete
                const botABs = innABs.filter(ab => !ab.is_top);
                homeRuns = botABs.reduce((s, ab) => s + (ab.runs_on_play != null ? ab.runs_on_play : (ab.rbi || 0)), 0);
                botABs.forEach(ab => {
                    if (this.app.api.isHit(ab.result)) homeH++;
                    if (ab.result === 'reached_on_error') homeE++;
                });
            }

            // If we're visiting, swap home/away
            if (!g.is_home) {
                innings.push({ num: i, away: awayRuns, home: homeRuns });
            } else {
                innings.push({ num: i, away: awayRuns, home: homeRuns });
            }
        }

        // Count hits/errors for current in-progress half inning
        const currentABs = this.atBats.filter(ab => ab.inning === g.current_inning);
        currentABs.forEach(ab => {
            if (ab.is_top) {
                if (this.app.api.isHit(ab.result)) awayH++;
                if (ab.result === 'reached_on_error') awayE++;
            } else {
                if (this.app.api.isHit(ab.result)) homeH++;
                if (ab.result === 'reached_on_error') homeE++;
            }
        });

        return { innings, homeH, awayH, homeE, awayE };
    }

    bindEvents() {
        const $ = id => document.getElementById(id);

        // Game control buttons
        $('start-game-btn')?.addEventListener('click', () => this.startGame());
        $('start-game-btn-main')?.addEventListener('click', () => this.startGame());
        $('end-game-btn')?.addEventListener('click', () => this.endGame());
        $('setup-lineup-btn')?.addEventListener('click', () => this.showLineupSetup());
        $('setup-lineup-btn-side')?.addEventListener('click', () => this.showLineupSetup());
        $('setup-lineup-btn-main')?.addEventListener('click', () => this.showLineupSetup());
        $('edit-lineup-btn')?.addEventListener('click', () => this.showLineupSetup());
        $('edit-lineup-btn-main')?.addEventListener('click', () => this.showLineupSetup());

        // Result buttons - select/highlight only (Next button confirms)
        document.querySelectorAll('[data-result]').forEach(btn => {
            btn.addEventListener('click', () => this.selectResult(btn.dataset.result));
        });

        // Next button - confirms and records the at-bat
        $('next-btn')?.addEventListener('click', () => {
            if (this.selectedResult) {
                this.recordResult(this.selectedResult);
            }
        });

        // Runs on play buttons
        document.querySelectorAll('[data-runs]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectedRunsOnPlay = parseInt(btn.dataset.runs);
                document.querySelectorAll('[data-runs]').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });

        // RBI buttons
        document.querySelectorAll('[data-rbi]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectedRBI = parseInt(btn.dataset.rbi);
                document.querySelectorAll('.rbi-select').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });

        // Scored toggle
        $('scored-toggle')?.addEventListener('click', () => {
            this.batterScored = !this.batterScored;
            const btn = $('scored-toggle');
            btn.textContent = this.batterScored ? 'YES' : 'NO';
            btn.classList.toggle('btn-primary', this.batterScored);
        });

        // Undo
        $('undo-btn')?.addEventListener('click', () => this.undoLast());

        // Lineup click to change batter
        document.querySelectorAll('.lineup-item[data-index]').forEach(item => {
            item.addEventListener('click', () => {
                if (this.game.status !== 'in_progress') return;
                this.currentBatterIndex = parseInt(item.dataset.index);
                this.renderGame(document.getElementById('app'));
            });
        });

        // Auto-scroll game log to top (most recent)
        const logEl = document.getElementById('game-log-entries');
        if (logEl) logEl.scrollTop = 0;
    }

    async showLineupSetup() {
        console.log('[Diamond Stats] showLineupSetup called, teamId:', this.game.team_id);

        let players;
        try {
            players = await this.app.api.listPlayers(this.game.team_id);
            console.log('[Diamond Stats] listPlayers returned:', players.length, 'players');
        } catch (err) {
            console.error('[Diamond Stats] listPlayers failed:', err);
            alert('Error loading players: ' + err.message);
            return;
        }

        if (!players || players.length === 0) {
            const goToRoster = confirm(
                'No players on the roster yet.\n\nGo to the team page to add players first?'
            );
            if (goToRoster) {
                window.location.hash = `#/teams/${this.game.team_id}`;
            }
            return;
        }

        const positions = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'EH'];
        const existingMap = {};
        for (const entry of this.lineup) {
            existingMap[entry.batting_order] = { playerId: entry.player_id, position: entry.position };
        }

        const slotCount = Math.max(9, this.lineup.length, Math.min(players.length, 12));
        const slots = [];
        for (let i = 1; i <= slotCount; i++) {
            slots.push({
                order: i,
                playerId: existingMap[i]?.playerId || '',
                position: existingMap[i]?.position || '',
            });
        }

        // Create modal
        const modalDiv = document.createElement('div');
        modalDiv.id = 'lineup-modal';
        modalDiv.innerHTML = `
            <div class="modal-overlay" id="lineup-overlay">
                <div class="modal" style="max-width:720px; max-height:90vh;">
                    <div class="modal-header">
                        <h2 class="modal-title">Set Batting Lineup</h2>
                        <button class="modal-close" id="lineup-close">&times;</button>
                    </div>
                    <div class="modal-body" style="max-height:60vh; overflow-y:auto; padding:12px 24px;">
                        <p style="color:var(--text-secondary); font-size:13px; margin-bottom:12px;">
                            Select a player for each batting order slot. Position auto-fills from their profile.
                        </p>
                        <table class="stat-table" style="font-family:var(--font-body);">
                            <thead>
                                <tr>
                                    <th style="text-align:center; width:36px;">#</th>
                                    <th style="text-align:left;">Player</th>
                                    <th style="text-align:left; width:90px;">Pos</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${slots.map(s => `
                                    <tr>
                                        <td style="text-align:center; font-weight:700; font-family:var(--font-mono);">${s.order}</td>
                                        <td style="text-align:left;">
                                            <select class="form-select lineup-player-select" data-order="${s.order}" style="min-height:40px; width:100%;">
                                                <option value="">-- empty --</option>
                                                ${players.map(p => `
                                                    <option value="${p.id}" ${s.playerId === p.id ? 'selected' : ''}>
                                                        #${p.jersey_number ?? '?'} ${p.first_name} ${p.last_name} (${p.primary_position || '?'})
                                                    </option>
                                                `).join('')}
                                            </select>
                                        </td>
                                        <td style="text-align:left;">
                                            <select class="form-select lineup-pos-select" data-order="${s.order}" style="min-height:40px; width:100%;">
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

        document.getElementById('app').appendChild(modalDiv);

        // Auto-set position when player selected
        modalDiv.querySelectorAll('.lineup-player-select').forEach(sel => {
            sel.addEventListener('change', () => {
                if (!sel.value) return;
                const player = players.find(p => p.id === sel.value);
                if (player?.primary_position) {
                    const posSelect = modalDiv.querySelector(`.lineup-pos-select[data-order="${sel.dataset.order}"]`);
                    if (posSelect && positions.includes(player.primary_position)) {
                        posSelect.value = player.primary_position;
                    }
                }
            });
        });

        const close = () => modalDiv.remove();
        document.getElementById('lineup-close').addEventListener('click', close);
        document.getElementById('lineup-cancel').addEventListener('click', close);
        document.getElementById('lineup-overlay').addEventListener('click', e => {
            if (e.target.id === 'lineup-overlay') close();
        });

        document.getElementById('lineup-save').addEventListener('click', async () => {
            const entries = [];
            const usedPlayers = new Set();

            for (const sel of modalDiv.querySelectorAll('.lineup-player-select')) {
                if (!sel.value) continue;
                if (usedPlayers.has(sel.value)) {
                    alert('Each player can only appear once in the lineup.');
                    return;
                }
                usedPlayers.add(sel.value);
                const order = parseInt(sel.dataset.order);
                const posSelect = modalDiv.querySelector(`.lineup-pos-select[data-order="${order}"]`);
                entries.push({
                    playerId: sel.value,
                    battingOrder: order,
                    position: posSelect.value,
                    isStarter: true,
                });
            }

            if (entries.length === 0) {
                alert('Select at least one player for the lineup.');
                return;
            }

            const saveBtn = document.getElementById('lineup-save');
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';

            try {
                const newLineup = await this.app.api.setLineup(this.gameId, entries);
                this.lineup = newLineup;
                this.currentBatterIndex = 0;
                close();
                this.app.showToast(`Lineup saved (${entries.length} players)`, 'success');
                this.renderGame(document.getElementById('app'));
            } catch (err) {
                console.error('[Diamond Stats] setLineup failed:', err);
                alert('Failed to save lineup: ' + err.message);
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Lineup';
            }
        });
    }

    async startGame() {
        if (this.lineup.length === 0) {
            this.app.showToast('Set your batting lineup first', 'error');
            this.showLineupSetup();
            return;
        }
        try {
            const game = await this.app.api.startGame(this.gameId);
            this.game = game;
            this.app.showToast('Game started! Tap a result for each at-bat.', 'success');
            this.renderGame(document.getElementById('app'));
        } catch (err) {
            alert('Failed to start game: ' + err.message);
        }
    }

    async endGame() {
        if (!confirm('End this game and mark it as final?')) return;
        try {
            const game = await this.app.api.endGame(this.gameId);
            this.game = game;
            this.renderGame(document.getElementById('app'));
        } catch (err) {
            alert('Failed to end game: ' + err.message);
        }
    }

    selectResult(result) {
        this.selectedResult = result;

        // Update visual highlight
        document.querySelectorAll('[data-result]').forEach(b => b.classList.remove('result-selected'));
        const selected = document.querySelector(`[data-result="${result}"]`);
        if (selected) selected.classList.add('result-selected');

        // Auto-set HR defaults when selecting home run
        if (result === 'home_run') {
            if (this.selectedRunsOnPlay === 0) {
                this.selectedRunsOnPlay = 1;
                document.querySelectorAll('[data-runs]').forEach(b => b.classList.remove('selected'));
                document.querySelector('[data-runs="1"]')?.classList.add('selected');
            }
            if (this.selectedRBI === 0) {
                this.selectedRBI = 1;
                document.querySelectorAll('.rbi-select').forEach(b => b.classList.remove('selected'));
                document.querySelector('[data-rbi="1"]')?.classList.add('selected');
            }
            if (!this.batterScored) {
                this.batterScored = true;
                const scoredBtn = document.getElementById('scored-toggle');
                if (scoredBtn) {
                    scoredBtn.textContent = 'YES';
                    scoredBtn.classList.add('btn-primary');
                }
            }
        }

        // Enable Next button
        const nextBtn = document.getElementById('next-btn');
        if (nextBtn) {
            nextBtn.disabled = false;
            nextBtn.className = 'next-btn next-btn-ready';
        }
    }

    async recordResult(result) {
        const batter = this.lineup[this.currentBatterIndex];
        if (!batter) {
            alert('No batter selected. Set your lineup first.');
            return;
        }

        // Disable Next button to prevent double-tap
        const nextBtn = document.getElementById('next-btn');
        if (nextBtn) {
            nextBtn.disabled = true;
            nextBtn.textContent = 'Saving...';
        }

        const playerId = batter.players?.id || batter.player_id;

        // Auto-set minimums for HR
        let runs = this.selectedRunsOnPlay;
        let rbi = this.selectedRBI;
        let scored = this.batterScored;
        if (result === 'home_run') {
            runs = Math.max(runs, 1);
            rbi = Math.max(rbi, 1);
            scored = true;
        }

        const data = {
            playerId,
            result,
            rbi,
            runsOnPlay: runs,
            runnerScored: scored,
        };

        try {
            if (navigator.onLine) {
                const response = await this.app.api.recordAtBat(this.gameId, data);
                this.atBats.push(response.atBat);
                this.game = response.gameState;
            } else {
                await this.app.sync.enqueue('record_at_bat', {
                    gameId: this.gameId, playerId,
                    inning: this.game.current_inning,
                    isTop: this.game.is_top_of_inning,
                    result, rbi, runsOnPlay: runs, runnerScored: scored,
                });
                this.app.showToast('At-bat queued (offline)', 'info');
            }

            // Reset all selections and advance batter
            this.selectedRBI = 0;
            this.selectedRunsOnPlay = 0;
            this.batterScored = false;
            this.selectedResult = null;
            this.currentBatterIndex = (this.currentBatterIndex + 1) % Math.max(1, this.lineup.length);

            this.renderGame(document.getElementById('app'));
        } catch (err) {
            alert('Error recording at-bat: ' + err.message);
            if (nextBtn) {
                nextBtn.disabled = false;
                nextBtn.textContent = 'Next \u25B6';
            }
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
            alert('Error undoing at-bat: ' + err.message);
        }
    }

    quickBatterLine(playerABs) {
        if (playerABs.length === 0) return '';
        const hits = playerABs.filter(ab => ['single', 'double', 'triple', 'home_run'].includes(ab.result));
        const abs = playerABs.filter(ab => !['walk', 'intentional_walk', 'hit_by_pitch', 'sacrifice_fly', 'sacrifice_bunt'].includes(ab.result));
        const extras = [];
        const hr = playerABs.filter(ab => ab.result === 'home_run').length;
        const rbi = playerABs.reduce((s, ab) => s + (ab.rbi || 0), 0);
        if (hr > 0) extras.push(`${hr}HR`);
        if (rbi > 0) extras.push(`${rbi}RBI`);
        return `${hits.length}-${abs.length}${extras.length ? ', ' + extras.join(', ') : ''}`;
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
        if (['single', 'double', 'triple'].includes(result)) return 'hit';
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

    destroy() {}
}
