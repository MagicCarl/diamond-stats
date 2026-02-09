// Diamond Stats - Offline Sync Manager (IndexedDB queue)

const DB_NAME = 'diamond-stats-offline';
const DB_VERSION = 1;

export class SyncManager {
    constructor(api) {
        this.api = api;
        this.db = null;
    }

    async openDB() {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('sync_queue')) {
                    db.createObjectStore('sync_queue', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('cached_data')) {
                    db.createObjectStore('cached_data', { keyPath: 'key' });
                }
                if (!db.objectStoreNames.contains('active_game')) {
                    db.createObjectStore('active_game', { keyPath: 'gameId' });
                }
            };

            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(this.db);
            };

            request.onerror = () => reject(request.error);
        });
    }

    // Queue an operation for sync
    async enqueue(type, payload) {
        const db = await this.openDB();
        const op = {
            id: crypto.randomUUID(),
            type,
            timestamp: new Date().toISOString(),
            payload,
        };

        return new Promise((resolve, reject) => {
            const tx = db.transaction('sync_queue', 'readwrite');
            tx.objectStore('sync_queue').add(op);
            tx.oncomplete = () => resolve(op.id);
            tx.onerror = () => reject(tx.error);
        });
    }

    // Get all queued operations
    async getQueue() {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('sync_queue', 'readonly');
            const request = tx.objectStore('sync_queue').getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Remove a processed operation
    async dequeue(id) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('sync_queue', 'readwrite');
            tx.objectStore('sync_queue').delete(id);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    // Process the sync queue when back online
    async processQueue() {
        if (!navigator.onLine) return;

        const queue = await this.getQueue();
        if (queue.length === 0) return;

        try {
            const results = await this.api.syncBatch(queue);

            // Remove successful operations
            for (const result of results.results) {
                if (result.success) {
                    await this.dequeue(result.operationId);
                }
            }

            const succeeded = results.results.filter(r => r.success).length;
            const failed = results.results.filter(r => !r.success).length;

            if (succeeded > 0) {
                window.app?.showToast(`Synced ${succeeded} operations`, 'success');
            }
            if (failed > 0) {
                window.app?.showToast(`${failed} operations failed to sync`, 'error');
            }
        } catch (e) {
            console.error('Sync failed:', e);
        }
    }

    // Cache data for offline reading
    async cacheData(key, data) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('cached_data', 'readwrite');
            tx.objectStore('cached_data').put({ key, data, updatedAt: Date.now() });
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async getCachedData(key) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('cached_data', 'readonly');
            const request = tx.objectStore('cached_data').get(key);
            request.onsuccess = () => resolve(request.result?.data ?? null);
            request.onerror = () => reject(request.error);
        });
    }

    // Save active game state for offline scoring
    async saveGameState(gameId, state) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('active_game', 'readwrite');
            tx.objectStore('active_game').put({ gameId, ...state, updatedAt: Date.now() });
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async getGameState(gameId) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('active_game', 'readonly');
            const request = tx.objectStore('active_game').get(gameId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getQueueLength() {
        const queue = await this.getQueue();
        return queue.length;
    }
}
