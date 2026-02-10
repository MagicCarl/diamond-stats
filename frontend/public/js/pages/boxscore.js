// Diamond Stats - Box Score Page

export class BoxScorePage {
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
                </div>
            </nav>
            <div class="page" id="boxscore-page">
                <div class="loading-spinner"><div class="spinner"></div></div>
            </div>
        `;
        await this.loadBoxScore();
    }

    async loadBoxScore() {
        const page = document.getElementById('boxscore-page');
        try {
            const data = await this.app.api.boxScore(this.gameId);
            const g = data.game;

            const teamName = g.teams?.name || 'Us';
            const oppName = g.opponent_name;
            const homeName = g.is_home ? teamName : oppName;
            const awayName = g.is_home ? oppName : teamName;

            // Determine final score display
            const isWin = g.our_score > g.opponent_score;
            const isLoss = g.our_score < g.opponent_score;
            const isFinal = g.status === 'final';
            const resultBadge = isFinal
                ? (isWin ? '<span class="badge" style="background:var(--hit);color:#fff;">W</span>'
                   : isLoss ? '<span class="badge" style="background:var(--offline);color:#fff;">L</span>'
                   : '<span class="badge" style="background:var(--warning);color:#fff;">T</span>')
                : `<span class="badge badge-status">${g.status}</span>`;

            // Final score header
            const finalScore = `${g.our_score} - ${g.opponent_score}`;

            // Compute batting totals
            const totals = { ab: 0, r: 0, h: 0, doubles: 0, triples: 0, hr: 0, rbi: 0, bb: 0, k: 0 };
            for (const b of data.batting) {
                totals.ab += b.stats.ab;
                totals.r += b.stats.r;
                totals.h += b.stats.h;
                totals.doubles += b.stats.doubles;
                totals.triples += b.stats.triples;
                totals.hr += b.stats.hr;
                totals.rbi += b.stats.rbi;
                totals.bb += b.stats.bb;
                totals.k += b.stats.k;
            }

            page.innerHTML = `
                <div class="page-header">
                    <div>
                        <h1 class="page-title">${this.esc(teamName)} vs ${this.esc(oppName)}</h1>
                        <p class="page-subtitle">
                            ${new Date(g.game_date).toLocaleDateString()} &middot;
                            ${resultBadge}
                            ${isFinal ? `<span style="font-family:var(--font-mono);font-weight:700;margin-left:var(--space-sm);">${finalScore}</span>` : ''}
                        </p>
                    </div>
                    <div class="btn-group">
                        <a href="#/games/${this.gameId}/live" class="btn btn-sm">Live View</a>
                        <a href="#/teams/${g.team_id}" class="btn btn-sm">Back</a>
                    </div>
                </div>

                <!-- Linescore -->
                <div class="card mb-lg" style="padding:0;overflow:auto;">
                    <table class="stat-table" style="margin:0;">
                        <thead>
                            <tr>
                                <th style="text-align:left;min-width:100px;">Team</th>
                                ${data.linescore.innings.map(inn => `<th style="min-width:32px;">${inn.inning}</th>`).join('')}
                                <th style="min-width:36px;font-weight:700;border-left:2px solid var(--card-border);">R</th>
                                <th style="min-width:36px;font-weight:700;">H</th>
                                <th style="min-width:36px;font-weight:700;">E</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="font-weight:600;">${this.esc(awayName)}</td>
                                ${data.linescore.innings.map(inn => {
                                    const runs = g.is_home ? inn.opponentRuns : inn.ourRuns;
                                    return `<td style="font-family:var(--font-mono);">${runs}</td>`;
                                }).join('')}
                                <td style="font-weight:700;font-family:var(--font-mono);border-left:2px solid var(--card-border);">${g.is_home ? data.linescore.opponentTotal.r : data.linescore.ourTotal.r}</td>
                                <td style="font-weight:700;font-family:var(--font-mono);">${g.is_home ? data.linescore.opponentTotal.h : data.linescore.ourTotal.h}</td>
                                <td style="font-weight:700;font-family:var(--font-mono);">${g.is_home ? data.linescore.opponentTotal.e : data.linescore.ourTotal.e}</td>
                            </tr>
                            <tr>
                                <td style="font-weight:600;">${this.esc(homeName)}</td>
                                ${data.linescore.innings.map(inn => {
                                    const runs = g.is_home ? inn.ourRuns : inn.opponentRuns;
                                    return `<td style="font-family:var(--font-mono);">${runs}</td>`;
                                }).join('')}
                                <td style="font-weight:700;font-family:var(--font-mono);border-left:2px solid var(--card-border);">${g.is_home ? data.linescore.ourTotal.r : data.linescore.opponentTotal.r}</td>
                                <td style="font-weight:700;font-family:var(--font-mono);">${g.is_home ? data.linescore.ourTotal.h : data.linescore.opponentTotal.h}</td>
                                <td style="font-weight:700;font-family:var(--font-mono);">${g.is_home ? data.linescore.ourTotal.e : data.linescore.opponentTotal.e}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Batting Stats -->
                <h2 style="margin-bottom:var(--space-sm);">Batting - ${this.esc(teamName)}</h2>
                <div class="stat-table-wrap mb-lg">
                    <table class="stat-table">
                        <thead>
                            <tr>
                                <th style="text-align:left;">Player</th>
                                <th>AB</th>
                                <th>R</th>
                                <th>H</th>
                                <th>2B</th>
                                <th>3B</th>
                                <th>HR</th>
                                <th>RBI</th>
                                <th>BB</th>
                                <th>K</th>
                                <th>AVG</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.batting.map(b => `
                                <tr>
                                    <td style="text-align:left;font-weight:500;">${this.esc(b.playerName)}</td>
                                    <td>${b.stats.ab}</td>
                                    <td>${b.stats.r}</td>
                                    <td>${this.highlightNonZero(b.stats.h, 'var(--hit)')}</td>
                                    <td>${this.highlightNonZero(b.stats.doubles, 'var(--hit)')}</td>
                                    <td>${this.highlightNonZero(b.stats.triples, 'var(--hit)')}</td>
                                    <td>${this.highlightNonZero(b.stats.hr, 'var(--hr)')}</td>
                                    <td>${this.highlightNonZero(b.stats.rbi, 'var(--text-primary)')}</td>
                                    <td>${b.stats.bb}</td>
                                    <td>${b.stats.k}</td>
                                    <td style="font-family:var(--font-mono);">${b.stats.avgDisplay}</td>
                                </tr>
                            `).join('')}
                            <tr style="border-top:2px solid var(--card-border);font-weight:700;">
                                <td style="text-align:left;">Totals</td>
                                <td>${totals.ab}</td>
                                <td>${totals.r}</td>
                                <td>${totals.h}</td>
                                <td>${totals.doubles}</td>
                                <td>${totals.triples}</td>
                                <td>${totals.hr}</td>
                                <td>${totals.rbi}</td>
                                <td>${totals.bb}</td>
                                <td>${totals.k}</td>
                                <td style="font-family:var(--font-mono);">${totals.ab > 0 ? (totals.h / totals.ab).toFixed(3).replace(/^0/, '') : '---'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Pitching Stats -->
                <h2 style="margin-bottom:var(--space-sm);">Pitching - ${this.esc(teamName)}</h2>
                <div class="stat-table-wrap">
                    <table class="stat-table">
                        <thead>
                            <tr>
                                <th style="text-align:left;">Pitcher</th>
                                <th>IP</th>
                                <th>H</th>
                                <th>R</th>
                                <th>ER</th>
                                <th>BB</th>
                                <th>K</th>
                                <th>HR</th>
                                <th>PC</th>
                                <th>ERA</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.pitching.length > 0 ? data.pitching.map(p => `
                                <tr>
                                    <td style="text-align:left;font-weight:500;">${this.esc(p.playerName)}</td>
                                    <td style="font-family:var(--font-mono);">${p.stats.ipDisplay}</td>
                                    <td>${p.stats.h}</td>
                                    <td>${p.stats.r}</td>
                                    <td>${p.stats.er}</td>
                                    <td>${p.stats.bb}</td>
                                    <td>${this.highlightNonZero(p.stats.k, 'var(--strikeout)')}</td>
                                    <td>${p.stats.hr || 0}</td>
                                    <td>${p.stats.pc || '---'}</td>
                                    <td style="font-family:var(--font-mono);">${p.stats.eraDisplay}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="10" style="text-align:center;color:var(--text-muted);">No pitching data entered</td></tr>'}
                        </tbody>
                    </table>
                </div>

                ${g.location ? `<p style="margin-top:var(--space-lg);color:var(--text-muted);font-size:var(--font-size-sm);">Location: ${this.esc(g.location)}</p>` : ''}
            `;
        } catch (err) {
            console.error('Box score load failed:', err);
            page.innerHTML = `<div class="empty-state"><p style="color:var(--offline);">${this.esc(err.message)}</p><a href="#/dashboard" class="btn btn-primary" style="margin-top:var(--space-md);">Back to Dashboard</a></div>`;
        }
    }

    highlightNonZero(val, color) {
        if (val > 0) return `<span style="color:${color};font-weight:600;">${val}</span>`;
        return `${val}`;
    }

    esc(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }
}
