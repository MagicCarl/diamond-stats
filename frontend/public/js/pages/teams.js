// Diamond Stats - Teams Page (create/manage teams)

export class TeamsPage {
    constructor(app) {
        this.app = app;
    }

    render(container) {
        container.innerHTML = `
            <nav class="nav-bar">
                <a href="#/dashboard" class="logo">Diamond<span>Stats</span></a>
                <div class="nav-links">
                    <a href="#/dashboard" class="nav-link">Dashboard</a>
                    <a href="#/teams" class="nav-link active">Teams</a>
                </div>
            </nav>
            <div class="page">
                <div class="page-header">
                    <h1 class="page-title">Create Team</h1>
                </div>
                <div class="card" style="max-width: 600px;">
                    <form id="create-team-form">
                        <div class="form-group">
                            <label class="form-label" for="team-name">Team Name</label>
                            <input class="form-input" type="text" id="team-name" required
                                   placeholder="e.g., Eagles, Tigers">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label" for="sport">Sport</label>
                                <select class="form-select" id="sport">
                                    <option value="baseball">Baseball</option>
                                    <option value="softball">Softball</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="level">Level</label>
                                <select class="form-select" id="level">
                                    <option value="little_league">Little League</option>
                                    <option value="travel">Travel Ball</option>
                                    <option value="high_school" selected>High School</option>
                                    <option value="college">College</option>
                                    <option value="minor_league">Minor League</option>
                                    <option value="rec">Recreational</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="innings">Default Innings Per Game</label>
                            <select class="form-select" id="innings">
                                <option value="7">7 innings</option>
                                <option value="9" selected>9 innings</option>
                            </select>
                        </div>
                        <div id="create-error" style="color: var(--offline); font-size: var(--font-size-sm); display: none;"></div>
                        <button class="btn btn-primary btn-lg" type="submit" style="width: 100%; margin-top: var(--space-md);">
                            Create Team
                        </button>
                    </form>
                </div>
            </div>
        `;

        // Auto-set innings when sport changes
        document.getElementById('sport').addEventListener('change', (e) => {
            document.getElementById('innings').value = e.target.value === 'softball' ? '7' : '9';
        });

        document.getElementById('create-team-form').addEventListener('submit', (e) => this.handleCreate(e));
    }

    async handleCreate(e) {
        e.preventDefault();
        const name = document.getElementById('team-name').value.trim();
        const sport = document.getElementById('sport').value;
        const level = document.getElementById('level').value;
        const innings = parseInt(document.getElementById('innings').value);
        const errorEl = document.getElementById('create-error');

        try {
            errorEl.style.display = 'none';
            const team = await this.app.api.createTeam({
                name, sport, level, defaultInnings: innings
            });
            this.app.showToast(`Team "${name}" created!`, 'success');
            window.location.hash = `#/teams/${team.id}`;
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.style.display = 'block';
        }
    }
}
