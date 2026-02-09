// Diamond Stats - API Client

export class API {
    constructor(auth) {
        this.auth = auth;
        this.baseURL = window.API_URL || 'http://localhost:8080/api';
    }

    async request(method, path, body = null) {
        const headers = {
            'Content-Type': 'application/json',
        };

        const token = this.auth.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const opts = { method, headers };
        if (body) {
            opts.body = JSON.stringify(body);
        }

        const res = await fetch(`${this.baseURL}${path}`, opts);

        if (res.status === 401) {
            // Token expired, redirect to login
            window.location.hash = '#/login';
            throw new Error('Unauthorized');
        }

        if (!res.ok) {
            const err = await res.json().catch(() => ({ reason: res.statusText }));
            throw new Error(err.reason || err.error || `HTTP ${res.status}`);
        }

        if (res.status === 204) return null;
        return res.json();
    }

    get(path) { return this.request('GET', path); }
    post(path, body) { return this.request('POST', path, body); }
    put(path, body) { return this.request('PUT', path, body); }
    del(path) { return this.request('DELETE', path); }

    // ===== Teams =====
    listTeams() { return this.get('/teams'); }
    createTeam(data) { return this.post('/teams', data); }
    getTeam(id) { return this.get(`/teams/${id}`); }
    updateTeam(id, data) { return this.put(`/teams/${id}`, data); }
    deleteTeam(id) { return this.del(`/teams/${id}`); }

    // Players
    listPlayers(teamId) { return this.get(`/teams/${teamId}/players`); }
    createPlayer(teamId, data) { return this.post(`/teams/${teamId}/players`, data); }
    updatePlayer(teamId, playerId, data) { return this.put(`/teams/${teamId}/players/${playerId}`, data); }
    deletePlayer(teamId, playerId) { return this.del(`/teams/${teamId}/players/${playerId}`); }

    // Seasons
    listSeasons(teamId) { return this.get(`/teams/${teamId}/seasons`); }
    createSeason(teamId, data) { return this.post(`/teams/${teamId}/seasons`, data); }

    // ===== Games =====
    listGames(teamId, seasonId) {
        let path = `/games?teamId=${teamId}`;
        if (seasonId) path += `&seasonId=${seasonId}`;
        return this.get(path);
    }
    createGame(data) { return this.post('/games', data); }
    getGame(id) { return this.get(`/games/${id}`); }
    updateGame(id, data) { return this.put(`/games/${id}`, data); }
    deleteGame(id) { return this.del(`/games/${id}`); }
    startGame(id) { return this.post(`/games/${id}/start`); }
    endGame(id) { return this.post(`/games/${id}/end`); }

    // Lineup
    getLineup(gameId) { return this.get(`/games/${gameId}/lineup`); }
    setLineup(gameId, entries) { return this.post(`/games/${gameId}/lineup`, entries); }

    // At-bats
    listAtBats(gameId) { return this.get(`/games/${gameId}/at-bats`); }
    recordAtBat(gameId, data) { return this.post(`/games/${gameId}/at-bats`, data); }
    undoAtBat(gameId, atBatId) { return this.del(`/games/${gameId}/at-bats/${atBatId}`); }

    // Pitching
    listPitching(gameId) { return this.get(`/games/${gameId}/pitching`); }
    addPitching(gameId, data) { return this.post(`/games/${gameId}/pitching`, data); }
    updatePitching(gameId, pitchingId, data) { return this.put(`/games/${gameId}/pitching/${pitchingId}`, data); }

    // ===== Stats =====
    battingStats(teamId, seasonId) {
        let path = `/stats/batting?teamId=${teamId}`;
        if (seasonId) path += `&seasonId=${seasonId}`;
        return this.get(path);
    }
    pitchingStats(teamId, seasonId) {
        let path = `/stats/pitching?teamId=${teamId}`;
        if (seasonId) path += `&seasonId=${seasonId}`;
        return this.get(path);
    }
    teamRecord(teamId, seasonId) {
        let path = `/stats/team?teamId=${teamId}`;
        if (seasonId) path += `&seasonId=${seasonId}`;
        return this.get(path);
    }
    playerBatting(playerId, seasonId) {
        let path = `/stats/player/${playerId}/batting`;
        if (seasonId) path += `?seasonId=${seasonId}`;
        return this.get(path);
    }
    playerPitching(playerId, seasonId) {
        let path = `/stats/player/${playerId}/pitching`;
        if (seasonId) path += `?seasonId=${seasonId}`;
        return this.get(path);
    }
    boxScore(gameId) { return this.get(`/stats/game/${gameId}/boxscore`); }

    // ===== Sync =====
    syncBatch(operations) { return this.post('/sync', { operations }); }
}
