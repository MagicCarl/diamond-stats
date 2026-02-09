-- 004_seasons.sql

CREATE TABLE seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage seasons for own teams"
    ON seasons FOR ALL USING (
        team_id IN (
            SELECT t.id FROM teams t
            JOIN organizations o ON t.organization_id = o.id
            WHERE o.owner_id = auth.uid()
        )
    );
