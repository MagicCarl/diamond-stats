-- 005_players.sql

CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    jersey_number INT,
    bats bats_type NOT NULL DEFAULT 'right',
    throws throws_type NOT NULL DEFAULT 'right',
    primary_position TEXT,
    secondary_position TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    graduation_year INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage players for own teams"
    ON players FOR ALL USING (
        team_id IN (
            SELECT t.id FROM teams t
            JOIN organizations o ON t.organization_id = o.id
            WHERE o.owner_id = auth.uid()
        )
    );
