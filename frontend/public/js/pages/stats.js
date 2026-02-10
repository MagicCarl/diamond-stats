// Diamond Stats - Stats Dashboard Page

export class StatsPage {
    constructor(app, params) {
        this.app = app;
        this.teamId = params.teamId;
        this.sortCol = null;
        this.sortDir = 'desc';
        this.battingData = null;
        this.pitchingData = null;
    }

    async render(container) {
        // Fetch team name
        let teamName = 'Team';
        try {
            const { team } = await this.app.api.getTeam(this.teamId);
            teamName = team.name;
        } catch (e) { /* ignore */ }

        container.innerHTML = `
            <nav class="nav-bar">
                <a href="#/dashboard" class="logo">Diamond<span>Stats</span></a>
                <div class="nav-links">
                    <a href="#/dashboard" class="nav-link">Dashboard</a>
                    <a href="#/teams/${this.teamId}" class="nav-link">Roster</a>
                </div>
            </nav>
            <div class="page">
                <div class="page-header">
                    <h1 class="page-title">${this.esc(teamName)} Statistics</h1>
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
                this.sortCol = null;
                this.sortDir = 'desc';
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
            console.error('Stats load failed:', err);
            content.innerHTML = `<p style="color:var(--offline);">${this.esc(err.message)}</p>`;
        }
    }

    async renderBatting(container) {
        if (!this.battingData) {
            this.battingData = await this.app.api.battingStats(this.teamId);
        }
        let stats = [...this.battingData];

        // Sort
        if (this.sortCol) {
            stats.sort((a, b) => {
                const aVal = this.getNestedVal(a, this.sortCol);
                const bVal = this.getNestedVal(b, this.sortCol);
                if (aVal == null && bVal == null) return 0;
                if (aVal == null) return 1;
                if (bVal == null) return -1;
                return this.sortDir === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
            });
        }

        if (stats.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No batting data yet. Score some games first!</p></div>';
            return;
        }

        const cols = [
            { key: 'playerName', label: 'Player', align: 'left' },
            { key: 'stats.games', label: 'G' },
            { key: 'stats.pa', label: 'PA' },
            { key: 'stats.ab', label: 'AB' },
            { key: 'stats.h', label: 'H' },
            { key: 'stats.doubles', label: '2B' },
            { key: 'stats.triples', label: '3B' },
            { key: 'stats.hr', label: 'HR' },
            { key: 'stats.rbi', label: 'RBI' },
            { key: 'stats.r', label: 'R' },
            { key: 'stats.bb', label: 'BB' },
            { key: 'stats.k', label: 'K' },
            { key: 'stats.sb', label: 'SB' },
            { key: 'stats.tb', label: 'TB' },
            { key: 'stats.avg', label: 'AVG', display: 'avgDisplay' },
            { key: 'stats.obp', label: 'OBP', display: 'obpDisplay' },
            { key: 'stats.slg', label: 'SLG', display: 'slgDisplay' },
            { key: 'stats.ops', label: 'OPS', display: 'opsDisplay' },
        ];

        container.innerHTML = `
            <div class="stat-table-wrap">
                <table class="stat-table" id="batting-table">
                    <thead>
                        <tr>
                            ${cols.map(c => {
                                const active = this.sortCol === c.key;
                                const arrow = active ? (this.sortDir === 'asc' ? ' ▲' : ' ▼') : '';
                                return `<th class="sortable${active ? ' sort-active' : ''}" data-key="${c.key}" style="${c.align === 'left' ? 'text-align:left;' : ''}">${c.label}${arrow}</th>`;
                            }).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${stats.map(s => `
                            <tr>
                                <td style="text-align:left;font-weight:500;">${this.esc(s.playerName)}</td>
                                <td>${s.stats.games}</td>
                                <td>${s.stats.pa}</td>
                                <td>${s.stats.ab}</td>
                                <td>${this.hl(s.stats.h, 'var(--hit)')}</td>
                                <td>${this.hl(s.stats.doubles, 'var(--hit)')}</td>
                                <td>${this.hl(s.stats.triples, 'var(--hit)')}</td>
                                <td>${this.hl(s.stats.hr, 'var(--hr)')}</td>
                                <td>${this.hl(s.stats.rbi, 'var(--text-primary)')}</td>
                                <td>${s.stats.r}</td>
                                <td>${s.stats.bb}</td>
                                <td>${s.stats.k}</td>
                                <td>${s.stats.sb}</td>
                                <td>${s.stats.tb}</td>
                                <td class="stat-mono">${s.stats.avgDisplay}</td>
                                <td class="stat-mono">${s.stats.obpDisplay}</td>
                                <td class="stat-mono">${s.stats.slgDisplay}</td>
                                <td class="stat-mono ${this.opsColor(s.stats.ops)}">${s.stats.opsDisplay}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        // Attach sort listeners
        container.querySelectorAll('.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const key = th.dataset.key;
                if (this.sortCol === key) {
                    this.sortDir = this.sortDir === 'desc' ? 'asc' : 'desc';
                } else {
                    this.sortCol = key;
                    this.sortDir = key === 'playerName' ? 'asc' : 'desc';
                }
                this.renderBatting(container);
            });
        });
    }

    async renderPitching(container) {
        if (!this.pitchingData) {
            this.pitchingData = await this.app.api.pitchingStats(this.teamId);
        }
        let stats = [...this.pitchingData];

        if (this.sortCol) {
            stats.sort((a, b) => {
                const aVal = this.getNestedVal(a, this.sortCol);
                const bVal = this.getNestedVal(b, this.sortCol);
                if (aVal == null && bVal == null) return 0;
                if (aVal == null) return 1;
                if (bVal == null) return -1;
                return this.sortDir === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
            });
        }

        if (stats.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No pitching data yet. Add pitching appearances during games.</p></div>';
            return;
        }

        const cols = [
            { key: 'playerName', label: 'Player', align: 'left' },
            { key: 'stats.games', label: 'G' },
            { key: 'stats.gamesStarted', label: 'GS' },
            { key: 'stats.wins', label: 'W' },
            { key: 'stats.losses', label: 'L' },
            { key: 'stats.saves', label: 'SV' },
            { key: 'stats.outs', label: 'IP', display: 'ipDisplay' },
            { key: 'stats.h', label: 'H' },
            { key: 'stats.r', label: 'R' },
            { key: 'stats.er', label: 'ER' },
            { key: 'stats.bb', label: 'BB' },
            { key: 'stats.k', label: 'K' },
            { key: 'stats.hr', label: 'HR' },
            { key: 'stats.era', label: 'ERA', display: 'eraDisplay' },
            { key: 'stats.whip', label: 'WHIP', display: 'whipDisplay' },
            { key: 'stats.kPer9', label: 'K/9' },
            { key: 'stats.bbPer9', label: 'BB/9' },
        ];

        container.innerHTML = `
            <div class="stat-table-wrap">
                <table class="stat-table" id="pitching-table">
                    <thead>
                        <tr>
                            ${cols.map(c => {
                                const active = this.sortCol === c.key;
                                const arrow = active ? (this.sortDir === 'asc' ? ' ▲' : ' ▼') : '';
                                return `<th class="sortable${active ? ' sort-active' : ''}" data-key="${c.key}" style="${c.align === 'left' ? 'text-align:left;' : ''}">${c.label}${arrow}</th>`;
                            }).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${stats.map(s => `
                            <tr>
                                <td style="text-align:left;font-weight:500;">${this.esc(s.playerName)}</td>
                                <td>${s.stats.games}</td>
                                <td>${s.stats.gamesStarted}</td>
                                <td>${this.hl(s.stats.wins, 'var(--hit)')}</td>
                                <td>${this.hl(s.stats.losses, 'var(--offline)')}</td>
                                <td>${this.hl(s.stats.saves, 'var(--accent)')}</td>
                                <td class="stat-mono">${s.stats.ipDisplay}</td>
                                <td>${s.stats.h}</td>
                                <td>${s.stats.r}</td>
                                <td>${s.stats.er}</td>
                                <td>${s.stats.bb}</td>
                                <td>${this.hl(s.stats.k, 'var(--strikeout)')}</td>
                                <td>${s.stats.hr}</td>
                                <td class="stat-mono">${s.stats.eraDisplay}</td>
                                <td class="stat-mono">${s.stats.whipDisplay}</td>
                                <td class="stat-mono">${this.fmt(s.stats.kPer9)}</td>
                                <td class="stat-mono">${this.fmt(s.stats.bbPer9)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.querySelectorAll('.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const key = th.dataset.key;
                if (this.sortCol === key) {
                    this.sortDir = this.sortDir === 'desc' ? 'asc' : 'desc';
                } else {
                    this.sortCol = key;
                    this.sortDir = key === 'playerName' ? 'asc' : 'desc';
                }
                this.renderPitching(container);
            });
        });
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

    getNestedVal(obj, key) {
        return key.split('.').reduce((o, k) => o?.[k], obj);
    }

    hl(val, color) {
        if (val > 0) return `<span style="color:${color};font-weight:600;">${val}</span>`;
        return `${val}`;
    }

    opsColor(ops) {
        if (ops == null) return '';
        if (ops >= 0.900) return 'stat-elite';
        if (ops >= 0.800) return 'stat-good';
        return '';
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
