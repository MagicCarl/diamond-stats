// Diamond Stats - Dashboard Page

export class DashboardPage {
    constructor(app) {
        this.app = app;
        this.teams = [];
    }

    async render(container) {
        container.innerHTML = `
            <nav class="nav-bar">
                <a href="#/dashboard" class="logo">Diamond<span>Stats</span></a>
                <div class="nav-links">
                    <a href="#/dashboard" class="nav-link active">Dashboard</a>
                    <a href="#/teams" class="nav-link">Teams</a>
                    <button class="btn btn-sm" id="logout-btn">Sign Out</button>
                </div>
            </nav>
            <div class="page">
                <div class="page-header">
                    <div>
                        <h1 class="page-title">Dashboard</h1>
                        <p class="page-subtitle">Welcome, ${this.app.auth.getEmail() || 'Coach'}</p>
                    </div>
                    <a href="#/teams" class="btn btn-primary">+ New Team</a>
                </div>
                <div id="dashboard-content">
                    <div class="loading-spinner"><div class="spinner"></div></div>
                </div>
            </div>
        `;

        document.getElementById('logout-btn').addEventListener('click', async () => {
            await this.app.auth.signOut();
            window.location.hash = '#/login';
        });

        await this.loadData();
    }

    async loadData() {
        const content = document.getElementById('dashboard-content');
        try {
            this.teams = await this.app.api.listTeams();

            if (this.teams.length === 0) {
                content.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">&#9918;</div>
                        <h2>No teams yet</h2>
                        <p>Create your first team to start tracking stats.</p>
                        <a href="#/teams" class="btn btn-primary btn-lg">+ Create Team</a>
                    </div>
                `;
                return;
            }

            content.innerHTML = `
                <div class="grid-2">
                    ${this.teams.map(team => `
                        <div class="card card-clickable" onclick="window.location.hash='#/teams/${team.id}'">
                            <div class="card-header">
                                <h3 class="card-title">${this.escapeHtml(team.name)}</h3>
                                <span class="badge badge-status">${team.sport}</span>
                            </div>
                            <div class="card-subtitle">${(team.level || '').replace('_', ' ')} &middot; ${team.default_innings} innings</div>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (err) {
            content.innerHTML = `
                <div class="empty-state">
                    <p style="color: var(--offline);">Failed to load teams: ${this.escapeHtml(err.message)}</p>
                    <button class="btn" onclick="location.reload()">Retry</button>
                </div>
            `;
        }
    }

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}
