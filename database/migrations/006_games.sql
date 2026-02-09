-- 006_games.sql

CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
    opponent_name TEXT NOT NULL,
    game_date DATE NOT NULL,
    game_time TIME,
    location TEXT,
    is_home BOOLEAN NOT NULL DEFAULT true,
    innings_count INT NOT NULL DEFAULT 9,
    status game_status NOT NULL DEFAULT 'scheduled',
    our_score INT NOT NULL DEFAULT 0,
    opponent_score INT NOT NULL DEFAULT 0,
    current_inning INT NOT NULL DEFAULT 1,
    is_top_of_inning BOOLEAN NOT NULL DEFAULT true,
    outs_in_current_inning INT NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_game_innings CHECK (innings_count BETWEEN 5 AND 12),
    CONSTRAINT valid_outs CHECK (outs_in_current_inning BETWEEN 0 AND 3)
);

ALTER TABLE games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage games for own teams"
    ON games FOR ALL USING (
        team_id IN (
            SELECT t.id FROM teams t
            JOIN organizations o ON t.organization_id = o.id
            WHERE o.owner_id = auth.uid()
        )
    );
