-- 008_at_bats.sql - THE CORE TABLE

CREATE TABLE at_bats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    inning INT NOT NULL,
    is_top BOOLEAN NOT NULL,
    at_bat_number_in_game INT NOT NULL,
    result at_bat_result NOT NULL,
    rbi INT NOT NULL DEFAULT 0,
    runner_scored BOOLEAN NOT NULL DEFAULT false,
    pitch_count INT,
    stolen_bases INT NOT NULL DEFAULT 0,
    caught_stealing INT NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_rbi CHECK (rbi BETWEEN 0 AND 4),
    CONSTRAINT valid_inning CHECK (inning >= 1)
);

ALTER TABLE at_bats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage at-bats for own games"
    ON at_bats FOR ALL USING (
        game_id IN (
            SELECT g.id FROM games g
            JOIN teams t ON g.team_id = t.id
            JOIN organizations o ON t.organization_id = o.id
            WHERE o.owner_id = auth.uid()
        )
    );
