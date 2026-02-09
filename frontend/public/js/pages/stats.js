// Diamond Stats - Stats Dashboard Page

export class StatsPage {
    constructor(app, params) {
        this.app = app;
        this.teamId = params.teamId;
        this.sortCol = null;
        this.sortDir = 'desc';
    }

    async render(container) {
        container.innerHTML = `
            <nav class="nav-bar">
                <a href="#/dashboard" class="logo">Diamond<span>Stats</span></a>
                <div class="nav-links">
                    <a href="#/dashboard" class="nav-link">Dashboard</a>
                    <a href="#/teams/${this.teamId}" class="nav-link">Team</a>
                </div>
            </nav>
            <div class="page">
                <div class="page-header">
                    <h1 class="page-title">Team Statistics</h1>
                </div>

                <div class="tabs" id="stats-tabs">
                    <button class="tab active" data-tab="batting">Batting</button>
                    <button class="tab" data-tab="pitching">Pitching</button>
                    <button class="tab" data-tab="record">Record</button>
                </div>

                <div id="stats-content">
                    <div class="loading-spinner"><div class="spinner"></div></div>
                </div>
            </div>
        `;

        document.querySelectorAll('#stats-tabs .tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('#stats-tabs .tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.loadTab(tab.dataset.tab);
            });
        });

        this.loadTab('batting');
    }

    async loadTab(tab) {
        const content = document.getElementById('stats-content');
        content.innerHTML = `<div class="loading-spinner"><div class="spinner"></div></div>`;

        try {
            if (tab === 'batting') await this.renderBatting(content);
            else if (tab === 'pitching') await this.renderPitching(content);
            else if (tab === 'record') await this.renderRecord(content);
        } catch (err) {
            content.innerHTML = `<p style="color:var(--offline);">${this.esc(err.message)}</p>`;
        }
    }

    async renderBatting(container) {
        const stats = await this.app.api.battingStats(this.teamId);

        if (stats.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No batting data yet.</p></div>';
            return;
        }

        container.innerHTML = `
            <div class="stat-table-wrap">
                <table class="stat-table" id="batting-table">
                    <thead>
                        <tr>
                            <th class="sortable" data-key="playerName">Player</th>
                            <th class="sortable" data-key="stats.games">G</th>
                            <th class="sortable" data-key="stats.pa">PA</th>
                            <th class="sortable" data-key="stats.ab">AB</th>
                            <th class="sortable" data-key="stats.h">H</th>
                            <th class="sortable" data-key="stats.doubles">2B</th>
                            <th class="sortable" data-key="stats.triples">3B</th>
                            <th class="sortable" data-key="stats.hr">HR</th>
                            <th class="sortable" data-key="stats.rbi">RBI</th>
                            <th class="sortable" data-key="stats.r">R</th>
                            <th class="sortable" data-key="stats.bb">BB</th>
                            <th class="sortable" data-key="stats.k">K</th>
                            <th class="sortable" data-key="stats.sb">SB</th>
                            <th class="sortable" data-key="stats.avg">AVG</th>
                            <th class="sortable" data-key="stats.obp">OBP</th>
                            <th class="sortable" data-key="stats.slg">SLG</th>
                            <th class="sortable" data-key="stats.ops">OPS</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${stats.map(s => `
                            <tr>
                                <td>${this.esc(s.playerName)}</td>
                                <td>${s.stats.games}</td>
                                <td>${s.stats.pa}</td>
                                <td>${s.stats.ab}</td>
                                <td>${s.stats.h}</td>
                                <td>${s.stats.doubles}</td>
                                <td>${s.stats.triples}</td>
                                <td>${s.stats.hr}</td>
                                <td>${s.stats.rbi}</td>
                                <td>${s.stats.r}</td>
                                <td>${s.stats.bb}</td>
                                <td>${s.stats.k}</td>
                                <td>${s.stats.sb}</td>
                                <td>${s.stats.avgDisplay}</td>
                                <td>${s.stats.obpDisplay}</td>
                                <td>${s.stats.slgDisplay}</td>
                                <td>${s.stats.opsDisplay}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    async renderPitching(container) {
        const stats = await this.app.api.pitchingStats(this.teamId);

        if (stats.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No pitching data yet.</p></div>';
            return;
        }

        container.innerHTML = `
            <div class="stat-table-wrap">
                <table class="stat-table">
                    <thead>
                        <tr>
                            <th>Player</th>
                            <th>G</th>
                            <th>GS</th>
                            <th>W</th>
                            <th>L</th>
                            <th>SV</th>
                            <th>IP</th>
                            <th>H</th>
                            <th>R</th>
                            <th>ER</th>
                            <th>BB</th>
                            <th>K</th>
                            <th>HR</th>
                            <th>ERA</th>
                            <th>WHIP</th>
                            <th>K/9</th>
                            <th>BB/9</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${stats.map(s => `
                            <tr>
                                <td>${this.esc(s.playerName)}</td>
                                <td>${s.stats.games}</td>
                                <td>${s.stats.gamesStarted}</td>
                                <td>${s.stats.wins}</td>
                                <td>${s.stats.losses}</td>
                                <td>${s.stats.saves}</td>
                                <td>${s.stats.ipDisplay}</td>
                                <td>${s.stats.h}</td>
                                <td>${s.stats.r}</td>
                                <td>${s.stats.er}</td>
                                <td>${s.stats.bb}</td>
                                <td>${s.stats.k}</td>
                                <td>${s.stats.hr}</td>
                                <td>${s.stats.eraDisplay}</td>
                                <td>${s.stats.whipDisplay}</td>
                                <td>${this.fmt(s.stats.kPer9)}</td>
                                <td>${this.fmt(s.stats.bbPer9)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    async renderRecord(container) {
        const record = await this.app.api.teamRecord(this.teamId);

        container.innerHTML = `
            <div class="grid-3" style="max-width: 800px;">
                <div class="card" style="text-align:center;">
                    <div class="card-subtitle">Record</div>
                    <div style="font-size:var(--font-size-2xl); font-weight:700; font-family:var(--font-mono);">
                        ${record.record}
                    </div>
                </div>
                <div class="card" style="text-align:center;">
                    <div class="card-subtitle">Win %</div>
                    <div style="font-size:var(--font-size-2xl); font-weight:700; font-family:var(--font-mono);">
                        ${record.winPercent != null ? (record.winPercent * 100).toFixed(1) + '%' : '---'}
                    </div>
                </div>
                <div class="card" style="text-align:center;">
                    <div class="card-subtitle">Run Diff</div>
                    <div style="font-size:var(--font-size-2xl); font-weight:700; font-family:var(--font-mono);
                                color: ${record.runDifferential > 0 ? 'var(--hit)' : record.runDifferential < 0 ? 'var(--offline)' : 'var(--text-primary)'};">
                        ${record.runDifferential > 0 ? '+' : ''}${record.runDifferential}
                    </div>
                </div>
                <div class="card" style="text-align:center;">
                    <div class="card-subtitle">Runs/Game</div>
                    <div style="font-size:var(--font-size-xl); font-weight:600; font-family:var(--font-mono);">
                        ${this.fmt(record.runsPerGame)}
                    </div>
                </div>
                <div class="card" style="text-align:center;">
                    <div class="card-subtitle">RA/Game</div>
                    <div style="font-size:var(--font-size-xl); font-weight:600; font-family:var(--font-mono);">
                        ${this.fmt(record.runsAllowedPerGame)}
                    </div>
                </div>
                <div class="card" style="text-align:center;">
                    <div class="card-subtitle">Pythag W%</div>
                    <div style="font-size:var(--font-size-xl); font-weight:600; font-family:var(--font-mono);">
                        ${record.pythagoreanWinPercent != null ? (record.pythagoreanWinPercent * 100).toFixed(1) + '%' : '---'}
                    </div>
                </div>
            </div>
        `;
    }

    fmt(val) {
        return val != null ? val.toFixed(2) : '---';
    }

    esc(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }
}
