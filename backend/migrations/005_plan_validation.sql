-- What the council's plan costs line by line, and the checks it passed or failed before being shown.
ALTER TABLE final_plans ADD COLUMN IF NOT EXISTS cost_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE final_plans ADD COLUMN IF NOT EXISTS validation jsonb;
