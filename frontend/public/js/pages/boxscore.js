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

            const teamName = g.team?.name || 'Us';
            const oppName = g.opponentName;
            const homeName = g.isHome ? teamName : oppName;
            const awayName = g.isHome ? oppName : teamName;

            page.innerHTML = `
                <div class="page-header">
                    <div>
                        <h1 class="page-title">${this.esc(teamName)} vs ${this.esc(oppName)}</h1>
                        <p class="page-subtitle">
                            ${new Date(g.gameDate).toLocaleDateString()} &middot;
                            <span class="badge badge-status">${g.status}</span>
                        </p>
                    </div>
                    <div class="btn-group">
                        <a href="#/games/${this.gameId}/live" class="btn btn-sm">Live View</a>
                        <a href="#/teams/${g.team?.id || g.$team?.id}" class="btn btn-sm">Back</a>
                    </div>
                </div>

                <!-- Linescore -->
                <div class="linescore">
                    <table>
                        <thead>
                            <tr>
                                <th style="text-align:left">Team</th>
                                ${data.linescore.innings.map(inn => `<th>${inn.inning}</th>`).join('')}
                                <th class="total-col">R</th>
                                <th class="total-col">H</th>
                                <th class="total-col">E</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>${this.esc(awayName)}</td>
                                ${data.linescore.innings.map(inn => {
                                    const runs = g.isHome ? inn.opponentRuns : inn.ourRuns;
                                    return `<td>${runs}</td>`;
                                }).join('')}
                                <td class="total-col">${g.isHome ? data.linescore.opponentTotal.r : data.linescore.ourTotal.r}</td>
                                <td class="total-col">${g.isHome ? data.linescore.opponentTotal.h : data.linescore.ourTotal.h}</td>
                                <td class="total-col">${g.isHome ? data.linescore.opponentTotal.e : data.linescore.ourTotal.e}</td>
                            </tr>
                            <tr>
                                <td>${this.esc(homeName)}</td>
                                ${data.linescore.innings.map(inn => {
                                    const runs = g.isHome ? inn.ourRuns : inn.opponentRuns;
                                    return `<td>${runs}</td>`;
                                }).join('')}
                                <td class="total-col">${g.isHome ? data.linescore.ourTotal.r : data.linescore.opponentTotal.r}</td>
                                <td class="total-col">${g.isHome ? data.linescore.ourTotal.h : data.linescore.opponentTotal.h}</td>
                                <td class="total-col">${g.isHome ? data.linescore.ourTotal.e : data.linescore.opponentTotal.e}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Batting Stats -->
                <h2 style="margin-bottom:var(--space-md);">Batting</h2>
                <div class="stat-table-wrap mb-lg">
                    <table class="stat-table">
                        <thead>
                            <tr>
                                <th>Player</th>
                                <th>AB</th>
                                <th>R</th>
                                <th>H</th>
                                <th>RBI</th>
                                <th>BB</th>
                                <th>K</th>
                                <th>AVG</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.batting.map(b => `
                                <tr>
                                    <td>${this.esc(b.playerName)}</td>
                                    <td>${b.stats.ab}</td>
                                    <td>${b.stats.r}</td>
                                    <td>${b.stats.h}</td>
                                    <td>${b.stats.rbi}</td>
                                    <td>${b.stats.bb}</td>
                                    <td>${b.stats.k}</td>
                                    <td>${b.stats.avgDisplay}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Pitching Stats -->
                <h2 style="margin-bottom:var(--space-md);">Pitching</h2>
                <div class="stat-table-wrap">
                    <table class="stat-table">
                        <thead>
                            <tr>
                                <th>Pitcher</th>
                                <th>IP</th>
                                <th>H</th>
                                <th>R</th>
                                <th>ER</th>
                                <th>BB</th>
                                <th>K</th>
                                <th>ERA</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.pitching.map(p => `
                                <tr>
                                    <td>${this.esc(p.playerName)}</td>
                                    <td>${p.stats.ipDisplay}</td>
                                    <td>${p.stats.h}</td>
                                    <td>${p.stats.r}</td>
                                    <td>${p.stats.er}</td>
                                    <td>${p.stats.bb}</td>
                                    <td>${p.stats.k}</td>
                                    <td>${p.stats.eraDisplay}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (err) {
            page.innerHTML = `<div class="empty-state"><p style="color:var(--offline);">${this.esc(err.message)}</p></div>`;
        }
    }

    esc(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }
}
