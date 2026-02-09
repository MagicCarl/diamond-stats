// Diamond Stats - SPA Entry Point
import { Auth } from './auth.js';
import { API } from './api.js';
import { Router } from './router.js';
import { SyncManager } from './sync.js';

class App {
    constructor() {
        this.auth = new Auth();
        this.api = new API(this.auth);
        this.sync = new SyncManager(this.api);
        this.router = new Router(this);
    }

    async init() {
        // Check auth state
        await this.auth.init();

        // Register Service Worker
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('/sw.js');
            } catch (e) {
                console.warn('SW registration failed:', e);
            }
        }

        // Online/offline handling
        window.addEventListener('online', () => this.onOnline());
        window.addEventListener('offline', () => this.onOffline());
        this.updateConnectionStatus();

        // Start router
        this.router.init();
    }

    onOnline() {
        this.updateConnectionStatus();
        this.sync.processQueue();
        this.showToast('Back online — syncing...', 'info');
    }

    onOffline() {
        this.updateConnectionStatus();
        this.showToast('Offline — changes will sync when connected', 'info');
    }

    updateConnectionStatus() {
        const bar = document.getElementById('status-bar');
        const text = document.getElementById('status-text');
        if (navigator.onLine) {
            bar.hidden = true;
        } else {
            bar.hidden = false;
            bar.className = 'status-bar offline';
            text.textContent = 'Offline — changes saved locally';
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }
}

// Boot
const app = new App();
app.init();

// Make accessible for pages
window.app = app;
