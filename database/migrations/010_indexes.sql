-- 010_indexes.sql - Performance indexes

-- Foreign key indexes (PostgreSQL does NOT auto-create these)
CREATE INDEX idx_teams_org_id ON teams(organization_id);
CREATE INDEX idx_seasons_team_id ON seasons(team_id);
CREATE INDEX idx_players_team_id ON players(team_id);
CREATE INDEX idx_games_team_id ON games(team_id);
CREATE INDEX idx_games_season_id ON games(season_id);
CREATE INDEX idx_lineup_game_id ON lineup_entries(game_id);
CREATE INDEX idx_lineup_player_id ON lineup_entries(player_id);
CREATE INDEX idx_at_bats_game_id ON at_bats(game_id);
CREATE INDEX idx_at_bats_player_id ON at_bats(player_id);
CREATE INDEX idx_pitching_game_id ON pitching_appearances(game_id);
CREATE INDEX idx_pitching_player_id ON pitching_appearances(player_id);

-- Composite indexes for common queries
CREATE INDEX idx_at_bats_game_inning ON at_bats(game_id, inning);
CREATE INDEX idx_games_team_status ON games(team_id, status);
CREATE INDEX idx_players_team_active ON players(team_id, is_active);

-- Partial index for active games
CREATE INDEX idx_games_in_progress ON games(team_id)
    WHERE status = 'in_progress';
