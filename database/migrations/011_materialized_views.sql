-- 011_materialized_views.sql - Stat aggregation views

-- Batting stats aggregation by player and season
CREATE MATERIALIZED VIEW batting_stats_summary AS
SELECT
    p.id AS player_id,
    p.first_name,
    p.last_name,
    p.team_id,
    g.season_id,
    COUNT(*) FILTER (WHERE ab.result IN (
        'single','double','triple','home_run',
        'ground_out','fly_out','line_out','pop_out',
        'fielders_choice','double_play','triple_play',
        'strikeout_swinging','strikeout_looking',
        'reached_on_error'
    )) AS at_bats,
    COUNT(*) AS plate_appearances,
    COUNT(*) FILTER (WHERE ab.result IN ('single','double','triple','home_run')) AS hits,
    COUNT(*) FILTER (WHERE ab.result = 'single') AS singles,
    COUNT(*) FILTER (WHERE ab.result = 'double') AS doubles,
    COUNT(*) FILTER (WHERE ab.result = 'triple') AS triples,
    COUNT(*) FILTER (WHERE ab.result = 'home_run') AS home_runs,
    SUM(ab.rbi) AS rbi,
    COUNT(*) FILTER (WHERE ab.runner_scored) AS runs,
    COUNT(*) FILTER (WHERE ab.result IN ('walk','intentional_walk')) AS walks,
    COUNT(*) FILTER (WHERE ab.result IN ('strikeout_swinging','strikeout_looking')) AS strikeouts,
    COUNT(*) FILTER (WHERE ab.result = 'hit_by_pitch') AS hit_by_pitch,
    COUNT(*) FILTER (WHERE ab.result = 'sacrifice_fly') AS sacrifice_flies,
    COUNT(*) FILTER (WHERE ab.result = 'sacrifice_bunt') AS sacrifice_bunts,
    COUNT(*) FILTER (WHERE ab.result = 'double_play') AS gidp,
    SUM(ab.stolen_bases) AS stolen_bases,
    SUM(ab.caught_stealing) AS caught_stealing,
    COUNT(DISTINCT ab.game_id) AS games
FROM at_bats ab
JOIN players p ON ab.player_id = p.id
JOIN games g ON ab.game_id = g.id
WHERE g.status = 'final'
GROUP BY p.id, p.first_name, p.last_name, p.team_id, g.season_id;

CREATE UNIQUE INDEX idx_batting_stats_player_season
    ON batting_stats_summary(player_id, season_id);

-- Pitching stats aggregation by player and season
CREATE MATERIALIZED VIEW pitching_stats_summary AS
SELECT
    p.id AS player_id,
    p.first_name,
    p.last_name,
    p.team_id,
    g.season_id,
    SUM(pa.outs_recorded) AS total_outs,
    SUM(pa.hits_allowed) AS hits_allowed,
    SUM(pa.runs_allowed) AS runs_allowed,
    SUM(pa.earned_runs) AS earned_runs,
    SUM(pa.walks) AS walks,
    SUM(pa.strikeouts) AS strikeouts,
    SUM(pa.home_runs_allowed) AS home_runs_allowed,
    SUM(pa.pitches_thrown) AS pitches_thrown,
    SUM(pa.strikes_thrown) AS strikes_thrown,
    SUM(pa.hit_batters) AS hit_batters,
    SUM(pa.wild_pitches) AS wild_pitches,
    COUNT(*) FILTER (WHERE pa.is_winner) AS wins,
    COUNT(*) FILTER (WHERE pa.is_loser) AS losses,
    COUNT(*) FILTER (WHERE pa.is_save) AS saves,
    COUNT(*) FILTER (WHERE pa.is_hold) AS holds,
    COUNT(DISTINCT pa.game_id) AS games,
    COUNT(*) FILTER (WHERE pa.appearance_order = 1) AS games_started
FROM pitching_appearances pa
JOIN players p ON pa.player_id = p.id
JOIN games g ON pa.game_id = g.id
WHERE g.status = 'final'
GROUP BY p.id, p.first_name, p.last_name, p.team_id, g.season_id;

CREATE UNIQUE INDEX idx_pitching_stats_player_season
    ON pitching_stats_summary(player_id, season_id);

-- Team record by season
CREATE MATERIALIZED VIEW team_record_summary AS
SELECT
    g.team_id,
    g.season_id,
    COUNT(*) FILTER (WHERE g.our_score > g.opponent_score) AS wins,
    COUNT(*) FILTER (WHERE g.our_score < g.opponent_score) AS losses,
    COUNT(*) FILTER (WHERE g.our_score = g.opponent_score) AS ties,
    SUM(g.our_score) AS runs_scored,
    SUM(g.opponent_score) AS runs_allowed,
    COUNT(*) AS games_played
FROM games g
WHERE g.status = 'final'
GROUP BY g.team_id, g.season_id;

-- To refresh after a game is finalized:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY batting_stats_summary;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY pitching_stats_summary;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY team_record_summary;
