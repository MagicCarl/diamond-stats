// Diamond Stats - API Client (Supabase PostgREST direct)
// No backend server needed - talks to Supabase directly

export class API {
    constructor(auth) {
        this.auth = auth;
    }

    get db() {
        return this.auth.client;
    }

    // ===== Organizations =====
    async getOrCreateOrg() {
        const userId = this.auth.getUserId();
        const { data, error } = await this.db
            .from('organizations')
            .select('*')
            .eq('owner_id', userId)
            .limit(1);
        if (error) throw new Error(error.message);
        if (data.length > 0) return data[0];

        // Auto-create org
        const { data: newOrg, error: err2 } = await this.db
            .from('organizations')
            .insert({ name: 'My Organization', owner_id: userId })
            .select()
            .single();
        if (err2) throw new Error(err2.message);
        return newOrg;
    }

    // ===== Teams =====
    async listTeams() {
        const { data, error } = await this.db
            .from('teams')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return data;
    }

    async createTeam(input) {
        const org = await this.getOrCreateOrg();
        // Map camelCase input to snake_case columns
        const row = {
            organization_id: org.id,
            name: input.name,
            sport: input.sport,
            level: input.level,
            default_innings: input.defaultInnings,
        };
        const { data, error } = await this.db
            .from('teams')
            .insert(row)
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    }

    async getTeam(id) {
        const { data: team, error } = await this.db
            .from('teams')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw new Error(error.message);

        const [playersRes, seasonsRes, gamesRes] = await Promise.all([
            this.db.from('players').select('*').eq('team_id', id).eq('is_active', true).order('jersey_number'),
            this.db.from('seasons').select('*').eq('team_id', id).order('created_at', { ascending: false }),
            this.db.from('games').select('id', { count: 'exact', head: true }).eq('team_id', id),
        ]);

        return {
            team,
            players: playersRes.data || [],
            seasons: seasonsRes.data || [],
            gameCount: gamesRes.count || 0,
        };
    }

    async updateTeam(id, input) {
        const { data, error } = await this.db
            .from('teams')
            .update({ name: input.name, sport: input.sport, level: input.level, default_innings: input.defaultInnings })
            .eq('id', id)
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    }

    async deleteTeam(id) {
        const { error } = await this.db.from('teams').delete().eq('id', id);
        if (error) throw new Error(error.message);
    }

    // ===== Players =====
    async listPlayers(teamId) {
        const { data, error } = await this.db
            .from('players')
            .select('*')
            .eq('team_id', teamId)
            .eq('is_active', true)
            .order('jersey_number');
        if (error) throw new Error(error.message);
        return data;
    }

    async createPlayer(teamId, input) {
        const row = {
            team_id: teamId,
            first_name: input.firstName,
            last_name: input.lastName,
            jersey_number: input.jerseyNumber,
            bats: input.bats || 'right',
            throws: input.throwsHand || 'right',
            primary_position: input.primaryPosition,
        };
        const { data, error } = await this.db
            .from('players')
            .insert(row)
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    }

    async updatePlayer(teamId, playerId, input) {
        const updates = {};
        if (input.firstName !== undefined) updates.first_name = input.firstName;
        if (input.lastName !== undefined) updates.last_name = input.lastName;
        if (input.jerseyNumber !== undefined) updates.jersey_number = input.jerseyNumber;
        if (input.bats !== undefined) updates.bats = input.bats;
        if (input.throwsHand !== undefined) updates.throws = input.throwsHand;
        if (input.primaryPosition !== undefined) updates.primary_position = input.primaryPosition;
        const { data, error } = await this.db
            .from('players')
            .update(updates)
            .eq('id', playerId)
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    }

    async deletePlayer(teamId, playerId) {
        const { error } = await this.db.from('players').update({ is_active: false }).eq('id', playerId);
        if (error) throw new Error(error.message);
    }

    // ===== Seasons =====
    async listSeasons(teamId) {
        const { data, error } = await this.db
            .from('seasons')
            .select('*')
            .eq('team_id', teamId)
            .order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return data;
    }

    async createSeason(teamId, input) {
        const { data, error } = await this.db
            .from('seasons')
            .insert({ team_id: teamId, name: input.name, start_date: input.startDate, end_date: input.endDate })
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    }

    // ===== Games =====
    async listGames(teamId, seasonId) {
        let query = this.db
            .from('games')
            .select('*')
            .eq('team_id', teamId)
            .order('game_date', { ascending: false });
        if (seasonId) query = query.eq('season_id', seasonId);
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return data;
    }

    async createGame(input) {
        const { data: team } = await this.db.from('teams').select('default_innings').eq('id', input.teamId).single();
        const row = {
            team_id: input.teamId,
            opponent_name: input.opponentName,
            game_date: input.gameDate,
            is_home: input.isHome,
            location: input.location,
            innings_count: team?.default_innings || 9,
            season_id: input.seasonId || null,
        };
        const { data, error } = await this.db
            .from('games')
            .insert(row)
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    }

    async getGame(id) {
        const [gameRes, lineupRes, atBatsRes, pitchingRes] = await Promise.all([
            this.db.from('games').select('*, teams(*)').eq('id', id).single(),
            this.db.from('lineup_entries').select('*, players(*)').eq('game_id', id).order('batting_order'),
            this.db.from('at_bats').select('*, players(*)').eq('game_id', id).order('at_bat_number_in_game'),
            this.db.from('pitching_appearances').select('*, players(*)').eq('game_id', id).order('appearance_order'),
        ]);
        if (gameRes.error) throw new Error(gameRes.error.message);

        return {
            game: gameRes.data,
            lineup: lineupRes.data || [],
            atBats: atBatsRes.data || [],
            pitching: pitchingRes.data || [],
        };
    }

    async updateGame(id, input) {
        const { data, error } = await this.db
            .from('games')
            .update(input)
            .eq('id', id)
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    }

    async deleteGame(id) {
        const { error } = await this.db.from('games').delete().eq('id', id);
        if (error) throw new Error(error.message);
    }

    async startGame(id) {
        return this.updateGame(id, { status: 'in_progress' });
    }

    async endGame(id) {
        return this.updateGame(id, { status: 'final' });
    }

    // ===== Lineup =====
    async getLineup(gameId) {
        const { data, error } = await this.db
            .from('lineup_entries')
            .select('*, players(*)')
            .eq('game_id', gameId)
            .order('batting_order');
        if (error) throw new Error(error.message);
        return data;
    }

    async setLineup(gameId, entries) {
        // Delete existing lineup
        await this.db.from('lineup_entries').delete().eq('game_id', gameId);
        // Insert new entries
        const rows = entries.map(e => ({
            game_id: gameId,
            player_id: e.playerId,
            batting_order: e.battingOrder,
            position: e.position,
            is_starter: e.isStarter !== false,
        }));
        const { data, error } = await this.db
            .from('lineup_entries')
            .insert(rows)
            .select('*, players(*)');
        if (error) throw new Error(error.message);
        return data;
    }

    // ===== At-bats (with game state management) =====
    async recordAtBat(gameId, input) {
        // Get current game state
        const { data: game, error: gameErr } = await this.db
            .from('games')
            .select('*')
            .eq('id', gameId)
            .single();
        if (gameErr) throw new Error(gameErr.message);

        // Count existing at-bats for numbering
        const { count } = await this.db
            .from('at_bats')
            .select('id', { count: 'exact', head: true })
            .eq('game_id', gameId);

        const row = {
            game_id: gameId,
            player_id: input.playerId,
            inning: game.current_inning,
            is_top: game.is_top_of_inning,
            at_bat_number_in_game: (count || 0) + 1,
            result: input.result,
            rbi: input.rbi || 0,
            runner_scored: input.runnerScored || false,
        };

        const { data: atBat, error: abErr } = await this.db
            .from('at_bats')
            .insert(row)
            .select('*, players(*)')
            .single();
        if (abErr) throw new Error(abErr.message);

        // Update game state
        const outsProduced = this.getOutsProduced(input.result);
        let newOuts = game.outs_in_current_inning + outsProduced;
        let newInning = game.current_inning;
        let newIsTop = game.is_top_of_inning;
        let newOurScore = game.our_score + (input.rbi || 0);
        let newOppScore = game.opponent_score;

        // Runner scored adds to our score
        if (input.runnerScored) {
            newOurScore += 1;
        }

        // Check for inning change (3 outs)
        if (newOuts >= 3) {
            newOuts = 0;
            if (newIsTop) {
                newIsTop = false;
            } else {
                newIsTop = true;
                newInning += 1;
            }
        }

        const gameUpdate = {
            our_score: newOurScore,
            opponent_score: newOppScore,
            current_inning: newInning,
            is_top_of_inning: newIsTop,
            outs_in_current_inning: newOuts,
        };

        const { data: updatedGame, error: ugErr } = await this.db
            .from('games')
            .update(gameUpdate)
            .eq('id', gameId)
            .select()
            .single();
        if (ugErr) throw new Error(ugErr.message);

        return { atBat, gameState: updatedGame };
    }

    async undoAtBat(gameId, atBatId) {
        // Get the at-bat being undone
        const { data: atBat } = await this.db
            .from('at_bats')
            .select('*')
            .eq('id', atBatId)
            .single();

        if (!atBat) throw new Error('At-bat not found');

        // Get current game state
        const { data: game } = await this.db
            .from('games')
            .select('*')
            .eq('id', gameId)
            .single();

        // Reverse the game state changes
        const outsProduced = this.getOutsProduced(atBat.result);
        let newOuts = game.outs_in_current_inning - outsProduced;
        let newInning = game.current_inning;
        let newIsTop = game.is_top_of_inning;
        let newOurScore = game.our_score - (atBat.rbi || 0);

        if (atBat.runner_scored) {
            newOurScore -= 1;
        }

        // If we crossed an inning boundary, reverse it
        if (newOuts < 0) {
            // We went back across an inning boundary
            if (!newIsTop) {
                // Was bottom, go back to top
                newIsTop = true;
                newOuts = 3 + newOuts; // e.g., -1 → 2 outs
            } else {
                // Was top, go back to previous inning bottom
                newIsTop = false;
                newInning -= 1;
                newOuts = 3 + newOuts;
            }
        }

        const gameUpdate = {
            our_score: Math.max(0, newOurScore),
            current_inning: Math.max(1, newInning),
            is_top_of_inning: newIsTop,
            outs_in_current_inning: Math.max(0, newOuts),
        };

        // Delete the at-bat and update game
        await this.db.from('at_bats').delete().eq('id', atBatId);
        const { data: updatedGame } = await this.db
            .from('games')
            .update(gameUpdate)
            .eq('id', gameId)
            .select()
            .single();

        return updatedGame;
    }

    getOutsProduced(result) {
        const outResults = [
            'strikeout_swinging', 'strikeout_looking',
            'ground_out', 'fly_out', 'line_out', 'pop_out',
            'fielders_choice', 'sacrifice_fly', 'sacrifice_bunt',
        ];
        if (result === 'double_play') return 2;
        if (result === 'triple_play') return 3;
        if (outResults.includes(result)) return 1;
        return 0;
    }

    // ===== Pitching =====
    async listPitching(gameId) {
        const { data, error } = await this.db
            .from('pitching_appearances')
            .select('*, players(*)')
            .eq('game_id', gameId)
            .order('appearance_order');
        if (error) throw new Error(error.message);
        return data;
    }

    async addPitching(gameId, input) {
        const { count } = await this.db
            .from('pitching_appearances')
            .select('id', { count: 'exact', head: true })
            .eq('game_id', gameId);

        const row = {
            game_id: gameId,
            player_id: input.playerId,
            appearance_order: (count || 0) + 1,
            outs_recorded: input.outsRecorded || 0,
            hits_allowed: input.hitsAllowed || 0,
            runs_allowed: input.runsAllowed || 0,
            earned_runs: input.earnedRuns || 0,
            walks: input.walks || 0,
            strikeouts: input.strikeouts || 0,
            home_runs_allowed: input.homeRunsAllowed || 0,
            pitches_thrown: input.pitchesThrown || null,
            hit_batters: input.hitBatters || 0,
            wild_pitches: input.wildPitches || 0,
        };
        const { data, error } = await this.db
            .from('pitching_appearances')
            .insert(row)
            .select('*, players(*)')
            .single();
        if (error) throw new Error(error.message);
        return data;
    }

    async updatePitching(gameId, pitchingId, input) {
        const updates = {};
        if (input.outsRecorded !== undefined) updates.outs_recorded = input.outsRecorded;
        if (input.hitsAllowed !== undefined) updates.hits_allowed = input.hitsAllowed;
        if (input.runsAllowed !== undefined) updates.runs_allowed = input.runsAllowed;
        if (input.earnedRuns !== undefined) updates.earned_runs = input.earnedRuns;
        if (input.walks !== undefined) updates.walks = input.walks;
        if (input.strikeouts !== undefined) updates.strikeouts = input.strikeouts;
        if (input.homeRunsAllowed !== undefined) updates.home_runs_allowed = input.homeRunsAllowed;
        if (input.pitchesThrown !== undefined) updates.pitches_thrown = input.pitchesThrown;
        const { data, error } = await this.db
            .from('pitching_appearances')
            .update(updates)
            .eq('id', pitchingId)
            .select('*, players(*)')
            .single();
        if (error) throw new Error(error.message);
        return data;
    }

    // ===== Stats (computed client-side) =====
    async battingStats(teamId, seasonId) {
        // Get all players on team
        const { data: players } = await this.db
            .from('players')
            .select('*')
            .eq('team_id', teamId);

        // Get all at-bats for team's games
        let gamesQuery = this.db.from('games').select('id').eq('team_id', teamId);
        if (seasonId) gamesQuery = gamesQuery.eq('season_id', seasonId);
        const { data: games } = await gamesQuery;
        const gameIds = (games || []).map(g => g.id);

        if (gameIds.length === 0) return [];

        const { data: atBats } = await this.db
            .from('at_bats')
            .select('*')
            .in('game_id', gameIds);

        return (players || []).map(player => {
            const pABs = (atBats || []).filter(ab => ab.player_id === player.id);
            const stats = this.calcBattingStats(pABs);
            stats.games = new Set(pABs.map(ab => ab.game_id)).size;
            return {
                playerName: `${player.first_name} ${player.last_name}`,
                playerId: player.id,
                stats,
            };
        }).filter(p => p.stats.pa > 0);
    }

    async pitchingStats(teamId, seasonId) {
        const { data: players } = await this.db
            .from('players')
            .select('*')
            .eq('team_id', teamId);

        let gamesQuery = this.db.from('games').select('id').eq('team_id', teamId);
        if (seasonId) gamesQuery = gamesQuery.eq('season_id', seasonId);
        const { data: games } = await gamesQuery;
        const gameIds = (games || []).map(g => g.id);

        if (gameIds.length === 0) return [];

        const { data: appearances } = await this.db
            .from('pitching_appearances')
            .select('*')
            .in('game_id', gameIds);

        // Determine sport for ERA multiplier
        const { data: team } = await this.db.from('teams').select('sport').eq('id', teamId).single();
        const gameInnings = team?.sport === 'softball' ? 7 : 9;

        return (players || []).map(player => {
            const pApps = (appearances || []).filter(a => a.player_id === player.id);
            if (pApps.length === 0) return null;
            const stats = this.calcPitchingStats(pApps, gameInnings);
            return {
                playerName: `${player.first_name} ${player.last_name}`,
                playerId: player.id,
                stats,
            };
        }).filter(Boolean);
    }

    async teamRecord(teamId, seasonId) {
        let query = this.db.from('games').select('*').eq('team_id', teamId).eq('status', 'final');
        if (seasonId) query = query.eq('season_id', seasonId);
        const { data: games } = await query;

        if (!games || games.length === 0) {
            return { record: '0-0', wins: 0, losses: 0, ties: 0, winPercent: null, runDifferential: 0, runsPerGame: null, runsAllowedPerGame: null, pythagoreanWinPercent: null };
        }

        let wins = 0, losses = 0, ties = 0, rs = 0, ra = 0;
        for (const g of games) {
            rs += g.our_score;
            ra += g.opponent_score;
            if (g.our_score > g.opponent_score) wins++;
            else if (g.our_score < g.opponent_score) losses++;
            else ties++;
        }

        const total = games.length;
        const winPercent = total > 0 ? wins / total : null;
        const runDiff = rs - ra;
        const runsPerGame = total > 0 ? rs / total : null;
        const runsAllowedPerGame = total > 0 ? ra / total : null;

        // Pythagorean win %
        let pythag = null;
        if (rs > 0 || ra > 0) {
            const exp = 1.83;
            const rsExp = Math.pow(rs, exp);
            const raExp = Math.pow(ra, exp);
            pythag = rsExp / (rsExp + raExp);
        }

        const record = ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;

        return { record, wins, losses, ties, winPercent, runDifferential: runDiff, runsPerGame, runsAllowedPerGame, pythagoreanWinPercent: pythag };
    }

    async boxScore(gameId) {
        const detail = await this.getGame(gameId);
        const game = detail.game;
        const atBats = detail.atBats;
        const pitching = detail.pitching;
        const lineup = detail.lineup;

        // Build linescore
        const maxInning = Math.max(...atBats.map(ab => ab.inning), game.current_inning);
        const innings = [];
        for (let i = 1; i <= maxInning; i++) {
            const innABs = atBats.filter(ab => ab.inning === i);
            const ourRuns = innABs.filter(ab => ab.is_top === !game.is_home).reduce((s, ab) => s + (ab.rbi || 0) + (ab.runner_scored ? 1 : 0), 0);
            const oppRuns = innABs.filter(ab => ab.is_top === game.is_home).reduce((s, ab) => s + (ab.rbi || 0) + (ab.runner_scored ? 1 : 0), 0);
            innings.push({ inning: i, ourRuns, opponentRuns: oppRuns });
        }

        // Build batting stats per player in lineup order
        const batting = lineup.map(entry => {
            const player = entry.players;
            const pABs = atBats.filter(ab => ab.player_id === (player?.id || entry.player_id));
            const stats = this.calcBattingStats(pABs);
            return {
                playerName: player ? `${player.first_name} ${player.last_name}` : '?',
                stats: {
                    ...stats,
                    r: pABs.filter(ab => ab.runner_scored).length,
                    avgDisplay: stats.ab > 0 ? stats.avg.toFixed(3).replace(/^0/, '') : '---',
                },
            };
        });

        // Determine sport for ERA
        const sport = game.teams?.sport || 'baseball';
        const gameInnings = sport === 'softball' ? 7 : 9;

        // Pitching stats
        const pitchingStats = pitching.map(app => {
            const player = app.players;
            const ip = app.outs_recorded / 3;
            const era = ip > 0 ? (app.earned_runs / ip) * gameInnings : null;
            return {
                playerName: player ? `${player.first_name} ${player.last_name}` : '?',
                stats: {
                    ipDisplay: `${Math.floor(app.outs_recorded / 3)}.${app.outs_recorded % 3}`,
                    h: app.hits_allowed,
                    r: app.runs_allowed,
                    er: app.earned_runs,
                    bb: app.walks,
                    k: app.strikeouts,
                    eraDisplay: era != null ? era.toFixed(2) : '---',
                },
            };
        });

        const ourTotalH = atBats.filter(ab => this.isHit(ab.result)).length;
        const ourTotalE = atBats.filter(ab => ab.result === 'reached_on_error').length;

        return {
            game,
            linescore: {
                innings,
                ourTotal: { r: game.our_score, h: ourTotalH, e: 0 },
                opponentTotal: { r: game.opponent_score, h: 0, e: ourTotalE },
            },
            batting,
            pitching: pitchingStats,
        };
    }

    // ===== Sync (for offline queue replay) =====
    async syncBatch(operations) {
        const results = [];
        for (const op of operations) {
            try {
                let result;
                switch (op.type) {
                    case 'record_at_bat':
                        result = await this.recordAtBat(op.data.gameId, op.data);
                        break;
                    case 'update_game':
                        result = await this.updateGame(op.data.gameId, op.data);
                        break;
                    default:
                        result = { skipped: true, type: op.type };
                }
                results.push({ success: true, result });
            } catch (err) {
                results.push({ success: false, error: err.message });
            }
        }
        return results;
    }

    // ===== Stats Calculation Helpers =====
    calcBattingStats(atBats) {
        let pa = 0, ab = 0, h = 0, doubles = 0, triples = 0, hr = 0;
        let rbi = 0, bb = 0, k = 0, hbp = 0, sf = 0, sac = 0, sb = 0, cs = 0;

        for (const a of atBats) {
            pa++;
            rbi += a.rbi || 0;
            sb += a.stolen_bases || 0;
            cs += a.caught_stealing || 0;

            switch (a.result) {
                case 'single': ab++; h++; break;
                case 'double': ab++; h++; doubles++; break;
                case 'triple': ab++; h++; triples++; break;
                case 'home_run': ab++; h++; hr++; break;
                case 'walk': case 'intentional_walk': bb++; break;
                case 'hit_by_pitch': hbp++; break;
                case 'strikeout_swinging': case 'strikeout_looking': ab++; k++; break;
                case 'sacrifice_fly': sf++; break;
                case 'sacrifice_bunt': sac++; break;
                default: ab++; break; // ground_out, fly_out, etc.
            }
        }

        const singles = h - doubles - triples - hr;
        const tb = singles + 2 * doubles + 3 * triples + 4 * hr;
        const avg = ab > 0 ? h / ab : null;
        const obpDenom = ab + bb + hbp + sf;
        const obp = obpDenom > 0 ? (h + bb + hbp) / obpDenom : null;
        const slg = ab > 0 ? tb / ab : null;
        const ops = (obp != null && slg != null) ? obp + slg : null;
        const iso = (slg != null && avg != null) ? slg - avg : null;
        const babipDenom = ab - k - hr + sf;
        const babip = babipDenom > 0 ? (h - hr) / babipDenom : null;
        const kPct = pa > 0 ? k / pa : null;
        const bbPct = pa > 0 ? bb / pa : null;

        const fmtRate = (v) => v != null ? v.toFixed(3).replace(/^0/, '') : '---';

        return {
            pa, ab, h, doubles, triples, hr, rbi, bb, k, hbp, sf, sac, sb, cs, tb,
            avg, obp, slg, ops, iso, babip, kPct, bbPct,
            avgDisplay: fmtRate(avg),
            obpDisplay: fmtRate(obp),
            slgDisplay: fmtRate(slg),
            opsDisplay: fmtRate(ops),
        };
    }

    calcPitchingStats(appearances, gameInnings = 9) {
        let outs = 0, h = 0, r = 0, er = 0, bb = 0, k = 0, hrA = 0, hbp = 0;
        let wins = 0, losses = 0, saves = 0, games = appearances.length;
        let gamesStarted = 0, pitches = 0;

        for (const a of appearances) {
            outs += a.outs_recorded;
            h += a.hits_allowed;
            r += a.runs_allowed;
            er += a.earned_runs;
            bb += a.walks;
            k += a.strikeouts;
            hrA += a.home_runs_allowed;
            hbp += a.hit_batters || 0;
            if (a.is_winner) wins++;
            if (a.is_loser) losses++;
            if (a.is_save) saves++;
            if (a.appearance_order === 1) gamesStarted++;
            pitches += a.pitches_thrown || 0;
        }

        const ip = outs / 3;
        const era = ip > 0 ? (er / ip) * gameInnings : null;
        const whip = ip > 0 ? (bb + h) / ip : null;
        const kPer9 = ip > 0 ? (k / ip) * 9 : null;
        const bbPer9 = ip > 0 ? (bb / ip) * 9 : null;
        const kPerBB = bb > 0 ? k / bb : null;

        return {
            games, gamesStarted, wins, losses, saves,
            outs, h, r, er, bb, k, hr: hrA, hbp, pitches,
            ipDisplay: `${Math.floor(outs / 3)}.${outs % 3}`,
            era, whip, kPer9, bbPer9, kPerBB,
            eraDisplay: era != null ? era.toFixed(2) : '---',
            whipDisplay: whip != null ? whip.toFixed(2) : '---',
        };
    }

    isHit(result) {
        return ['single', 'double', 'triple', 'home_run'].includes(result);
    }
}
