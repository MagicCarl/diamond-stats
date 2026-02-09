-- 002_organizations.sql

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organizations"
    ON organizations FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can create organizations"
    ON organizations FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own organizations"
    ON organizations FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own organizations"
    ON organizations FOR DELETE USING (owner_id = auth.uid());
