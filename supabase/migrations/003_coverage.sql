-- Coverage table: which levels are live, and where
-- Most-specific scope wins: division (a city/county OCD id) > state (2-letter) > 'us' (nationwide)
CREATE TABLE IF NOT EXISTS coverage (
  level      TEXT NOT NULL CHECK (level IN ('federal','state','local')),
  scope      TEXT NOT NULL DEFAULT 'us',
  status     TEXT NOT NULL CHECK (status IN ('live','pending','unavailable')) DEFAULT 'pending',
  note       TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (level, scope)
);

ALTER TABLE coverage ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='coverage' AND policyname='public_read_coverage') THEN
    CREATE POLICY "public_read_coverage" ON coverage FOR SELECT USING (true);
  END IF;
END $$;

GRANT SELECT ON coverage TO anon, authenticated;

-- Seed: federal + state live nationwide; local pending until a metro is onboarded.
INSERT INTO coverage (level, scope, status, note) VALUES
  ('federal','us','live',    'Congress via congress-legislators + WhoBoughtMyRep'),
  ('state','us','live',      'Open States + state disclosure portals'),
  ('local','us','pending',   'Rolling out city by city via Cicero / curated records')
ON CONFLICT (level, scope) DO NOTHING;
