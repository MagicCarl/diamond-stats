// Diamond Stats - Hash-based SPA Router

import { LoginPage } from './pages/login.js';
import { DashboardPage } from './pages/dashboard.js';
import { TeamsPage } from './pages/teams.js';
import { RosterPage } from './pages/roster.js';
import { GameSetupPage } from './pages/game-setup.js';
import { GameLivePage } from './pages/game-live.js';
import { BoxScorePage } from './pages/boxscore.js';
import { StatsPage } from './pages/stats.js';

export class Router {
    constructor(app) {
        this.app = app;
        this.currentPage = null;
        this.routes = {
            '/login':               LoginPage,
            '/':                    DashboardPage,
            '/dashboard':           DashboardPage,
            '/teams':               TeamsPage,
            '/teams/:teamId':       RosterPage,
            '/games/new':           GameSetupPage,
            '/games/:gameId/live':  GameLivePage,
            '/games/:gameId/box':   BoxScorePage,
            '/stats/:teamId':       StatsPage,
        };
    }

    init() {
        window.addEventListener('hashchange', () => this.route());
        this.route();
    }

    route() {
        const fullHash = window.location.hash.slice(1) || '/';

        // Strip query string for route matching (pages read query params from window.location.hash)
        const hash = fullHash.split('?')[0];

        // Auth guard
        if (!this.app.auth.isAuthenticated() && hash !== '/login') {
            window.location.hash = '#/login';
            return;
        }

        // If authenticated and trying to access login, redirect to dashboard
        if (this.app.auth.isAuthenticated() && hash === '/login') {
            window.location.hash = '#/dashboard';
            return;
        }

        // Match route
        const { PageClass, params } = this.matchRoute(hash);

        if (!PageClass) {
            this.render404();
            return;
        }

        // Tear down current page
        if (this.currentPage && this.currentPage.destroy) {
            this.currentPage.destroy();
        }

        // Render new page
        this.currentPage = new PageClass(this.app, params);
        const container = document.getElementById('app');
        container.innerHTML = '';
        this.currentPage.render(container);
    }

    matchRoute(hash) {
        // Try exact match first
        if (this.routes[hash]) {
            return { PageClass: this.routes[hash], params: {} };
        }

        // Try parameterized routes
        const hashParts = hash.split('/').filter(Boolean);

        for (const [pattern, PageClass] of Object.entries(this.routes)) {
            const patternParts = pattern.split('/').filter(Boolean);

            if (patternParts.length !== hashParts.length) continue;

            const params = {};
            let match = true;

            for (let i = 0; i < patternParts.length; i++) {
                if (patternParts[i].startsWith(':')) {
                    params[patternParts[i].slice(1)] = hashParts[i];
                } else if (patternParts[i] !== hashParts[i]) {
                    match = false;
                    break;
                }
            }

            if (match) return { PageClass, params };
        }

        return { PageClass: null, params: {} };
    }

    render404() {
        const container = document.getElementById('app');
        container.innerHTML = `
            <div class="page">
                <div class="empty-state">
                    <div class="empty-state-icon">404</div>
                    <p>Page not found</p>
                    <a href="#/dashboard" class="btn btn-primary">Back to Dashboard</a>
                </div>
            </div>
        `;
    }

    navigate(path) {
        window.location.hash = '#' + path;
    }
}
