// Diamond Stats - Scorebook Sheet View
// Traditional baseball scorebook layout showing at-bats per player per inning

export class ScorebookPage {
    constructor(app, params) {
        this.app = app;
        this.gameId = params.gameId;
    }

    async render(container) {
        container.innerHTML = `
            <nav class="nav-bar">
                <a href="#/dashboard" class="logo">Diamond<span>Stats</span></a>
                <div class="nav-links">
                    <a href="#/dashboard" class="nav-link">Dashboard</a>
                    <a href="#/help" class="nav-link">Help</a>
                </div>
            </nav>
            <div class="page" id="scorebook-page">
                <div class="loading-spinner"><div class="spinner"></div></div>
            </div>
        `;
        await this.loadScorebook();
    }

    async loadScorebook() {
        const page = document.getElementById('scorebook-page');
        try {
            const detail = await this.app.api.getGame(this.gameId);
            const game = detail.game;
            const lineup = detail.lineup;
            const atBats = detail.atBats;

            const teamName = game.teams?.name || 'Us';
            const oppName = game.opponent_name || 'Opponent';
            const totalInnings = Math.max(
                game.innings_count || 9,
                game.current_inning,
                ...atBats.map(ab => ab.inning)
            );

            // Build per-player per-inning at-bat data
            const playerRows = lineup.map(entry => {
                const player = entry.players || {};
                const playerId = player.id || entry.player_id;
                const pABs = atBats.filter(ab => ab.player_id === playerId);

                // Group at-bats by inning
                const byInning = {};
                for (const ab of pABs) {
                    if (!byInning[ab.inning]) byInning[ab.inning] = [];
                    byInning[ab.inning].push(ab);
                }

                // Compute per-player game totals
                const stats = this.calcPlayerGameStats(pABs);

                return {
                    order: entry.batting_order,
                    name: `#${player.jersey_number ?? '?'} ${player.last_name || '?'}`,
                    position: entry.position || '?',
                    byInning,
                    stats,
                };
            });

            // Build inning headers
            const inningHeaders = [];
            for (let i = 1; i <= totalInnings; i++) {
                inningHeaders.push(i);
            }

            page.innerHTML = `
                <div class="page-header">
                    <div>
                        <h1 class="page-title">Scorebook</h1>
                        <p class="page-subtitle">
                            ${this.esc(teamName)} vs ${this.esc(oppName)} &middot;
                            ${new Date(game.game_date).toLocaleDateString()} &middot;
                            <span class="badge badge-status">${game.status}</span>
                            <span style="font-family:var(--font-mono);font-weight:700;margin-left:8px;">
                                ${game.our_score} - ${game.opponent_score}
                            </span>
                        </p>
                    </div>
                    <div class="btn-group">
                        <a href="#/games/${this.gameId}/live" class="btn btn-sm">Live</a>
                        <a href="#/games/${this.gameId}/box" class="btn btn-sm">Box Score</a>
                        <a href="#/teams/${game.team_id}" class="btn btn-sm">Back</a>
                    </div>
                </div>

                <div class="scorebook-sheet">
                    <table class="scorebook-table">
                        <thead>
                            <tr>
                                <th class="player-col">Player</th>
                                <th style="width:36px;">Pos</th>
                                ${inningHeaders.map(i => `<th>${i}</th>`).join('')}
                                <th class="totals-col">AB</th>
                                <th class="totals-col">R</th>
                                <th class="totals-col">H</th>
                                <th class="totals-col">RBI</th>
                                <th class="totals-col">BB</th>
                                <th class="totals-col">K</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${playerRows.map(row => `
                                <tr>
                                    <td class="player-col">${this.esc(row.name)}</td>
                                    <td style="font-size:10px;color:var(--text-muted);">${this.esc(row.position)}</td>
                                    ${inningHeaders.map(inn => {
                                        const abs = row.byInning[inn] || [];
                                        return `<td class="inning-cell ${abs.length > 0 ? this.cellBgClass(abs[0].result) : ''}">${this.renderInningCell(abs)}</td>`;
                                    }).join('')}
                                    <td class="totals-col">${row.stats.ab}</td>
                                    <td class="totals-col">${row.stats.r > 0 ? `<span style="color:var(--hit);">${row.stats.r}</span>` : '0'}</td>
                                    <td class="totals-col">${row.stats.h > 0 ? `<span style="color:var(--hit);">${row.stats.h}</span>` : '0'}</td>
                                    <td class="totals-col">${row.stats.rbi > 0 ? `<span style="font-weight:700;">${row.stats.rbi}</span>` : '0'}</td>
                                    <td class="totals-col">${row.stats.bb}</td>
                                    <td class="totals-col">${row.stats.k}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr style="font-weight:700; background:var(--bg-raised);">
                                <td class="player-col" style="background:var(--bg-raised);">TOTALS</td>
                                <td></td>
                                ${inningHeaders.map(inn => {
                                    // Runs scored in this inning
                                    const innABs = atBats.filter(ab => ab.inning === inn);
                                    const runs = innABs.reduce((s, ab) => s + (ab.rbi || 0) + (ab.runner_scored && (ab.rbi || 0) === 0 ? 1 : 0), 0);
                                    return `<td style="font-family:var(--font-mono);">${runs}</td>`;
                                }).join('')}
                                <td class="totals-col">${playerRows.reduce((s, r) => s + r.stats.ab, 0)}</td>
                                <td class="totals-col">${playerRows.reduce((s, r) => s + r.stats.r, 0)}</td>
                                <td class="totals-col">${playerRows.reduce((s, r) => s + r.stats.h, 0)}</td>
                                <td class="totals-col">${playerRows.reduce((s, r) => s + r.stats.rbi, 0)}</td>
                                <td class="totals-col">${playerRows.reduce((s, r) => s + r.stats.bb, 0)}</td>
                                <td class="totals-col">${playerRows.reduce((s, r) => s + r.stats.k, 0)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div style="margin-top:var(--space-lg); display:flex; gap:var(--space-md); flex-wrap:wrap;">
                    <div style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-secondary);">
                        <span style="width:14px;height:14px;border-radius:3px;background:var(--hit-bg);border:1px solid var(--hit);display:inline-block;"></span> Hit
                    </div>
                    <div style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-secondary);">
                        <span style="width:14px;height:14px;border-radius:3px;background:var(--hr-bg);border:1px solid var(--hr);display:inline-block;"></span> Home Run
                    </div>
                    <div style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-secondary);">
                        <span style="width:14px;height:14px;border-radius:3px;background:var(--walk-bg);border:1px solid var(--walk);display:inline-block;"></span> Walk / HBP
                    </div>
                    <div style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-secondary);">
                        <span style="width:14px;height:14px;border-radius:3px;background:var(--strikeout-bg);border:1px solid var(--strikeout);display:inline-block;"></span> Strikeout
                    </div>
                    <div style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-secondary);">
                        <span style="width:14px;height:14px;border-radius:3px;background:var(--out-bg);border:1px solid var(--out);display:inline-block;"></span> Out
                    </div>
                    <div style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-secondary);">
                        <span style="width:14px;height:14px;border-radius:3px;background:var(--error-bg);border:1px solid var(--error-play);display:inline-block;"></span> Error
                    </div>
                </div>
            `;
        } catch (err) {
            console.error('Scorebook load failed:', err);
            page.innerHTML = `<div class="empty-state"><p style="color:var(--offline);">${this.esc(err.message)}</p><a href="#/dashboard" class="btn btn-primary" style="margin-top:var(--space-md);">Dashboard</a></div>`;
        }
    }

    renderInningCell(abs) {
        if (abs.length === 0) return '';

        return abs.map(ab => {
            const label = this.resultLabel(ab.result);
            const cls = this.resultColorClass(ab.result);
            const extras = [];
            if (ab.rbi > 0) extras.push(`${ab.rbi}R`);
            if (ab.runner_scored) extras.push('\u25C6'); // diamond = scored

            return `<span class="ab-result ${cls}">${label}</span>${extras.length > 0 ? `<span class="ab-detail">${extras.join(' ')}</span>` : ''}`;
        }).join('');
    }

    cellBgClass(result) {
        if (['single', 'double', 'triple'].includes(result)) return 'hit-cell';
        if (result === 'home_run') return 'hr-cell';
        if (['walk', 'intentional_walk', 'hit_by_pitch'].includes(result)) return 'walk-cell';
        if (['strikeout_swinging', 'strikeout_looking'].includes(result)) return 'k-cell';
        if (result === 'reached_on_error') return 'error-cell';
        return 'out-cell';
    }

    resultColorClass(result) {
        if (['single', 'double', 'triple'].includes(result)) return 'hit';
        if (result === 'home_run') return 'hr';
        if (['walk', 'intentional_walk', 'hit_by_pitch'].includes(result)) return 'walk';
        if (['strikeout_swinging', 'strikeout_looking'].includes(result)) return 'k';
        if (result === 'reached_on_error') return 'error';
        return 'out';
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

    calcPlayerGameStats(pABs) {
        let ab = 0, h = 0, r = 0, rbi = 0, bb = 0, k = 0;
        for (const a of pABs) {
            rbi += a.rbi || 0;
            if (a.runner_scored) r++;

            switch (a.result) {
                case 'single': case 'double': case 'triple': case 'home_run':
                    ab++; h++; break;
                case 'walk': case 'intentional_walk':
                    bb++; break;
                case 'hit_by_pitch': break;
                case 'strikeout_swinging': case 'strikeout_looking':
                    ab++; k++; break;
                case 'sacrifice_fly': case 'sacrifice_bunt': break;
                default: ab++; break;
            }
        }
        return { ab, h, r, rbi, bb, k };
    }

    esc(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    destroy() {}
}
