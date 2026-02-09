-- 009_pitching_appearances.sql

CREATE TABLE pitching_appearances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    appearance_order INT NOT NULL DEFAULT 1,
    outs_recorded INT NOT NULL DEFAULT 0,
    hits_allowed INT NOT NULL DEFAULT 0,
    runs_allowed INT NOT NULL DEFAULT 0,
    earned_runs INT NOT NULL DEFAULT 0,
    walks INT NOT NULL DEFAULT 0,
    strikeouts INT NOT NULL DEFAULT 0,
    home_runs_allowed INT NOT NULL DEFAULT 0,
    pitches_thrown INT,
    strikes_thrown INT,
    balls_thrown INT,
    hit_batters INT NOT NULL DEFAULT 0,
    wild_pitches INT NOT NULL DEFAULT 0,
    balks INT NOT NULL DEFAULT 0,
    is_winner BOOLEAN,
    is_loser BOOLEAN,
    is_save BOOLEAN,
    is_hold BOOLEAN,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_earned_runs CHECK (earned_runs <= runs_allowed)
);

ALTER TABLE pitching_appearances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage pitching for own games"
    ON pitching_appearances FOR ALL USING (
        game_id IN (
            SELECT g.id FROM games g
            JOIN teams t ON g.team_id = t.id
            JOIN organizations o ON t.organization_id = o.id
            WHERE o.owner_id = auth.uid()
        )
    );
