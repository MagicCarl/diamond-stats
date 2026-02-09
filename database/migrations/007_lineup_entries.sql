-- 007_lineup_entries.sql

CREATE TABLE lineup_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    batting_order INT NOT NULL,
    position TEXT NOT NULL,
    is_starter BOOLEAN NOT NULL DEFAULT true,
    entered_game_inning INT,
    exited_game_inning INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_batting_order CHECK (batting_order BETWEEN 1 AND 12)
);

ALTER TABLE lineup_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage lineups for own games"
    ON lineup_entries FOR ALL USING (
        game_id IN (
            SELECT g.id FROM games g
            JOIN teams t ON g.team_id = t.id
            JOIN organizations o ON t.organization_id = o.id
            WHERE o.owner_id = auth.uid()
        )
    );
