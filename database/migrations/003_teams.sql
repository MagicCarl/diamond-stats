-- 003_teams.sql

CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sport sport_type NOT NULL DEFAULT 'baseball',
    level team_level NOT NULL DEFAULT 'high_school',
    default_innings INT NOT NULL DEFAULT 9,
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_innings CHECK (default_innings IN (7, 9))
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage teams in own orgs"
    ON teams FOR ALL USING (
        organization_id IN (
            SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
    );
