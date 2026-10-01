-- CONTROL records when the scout last audited each published site, so the
-- scheduled fan-out throttles without opening every workspace database.
ALTER TABLE sites ADD COLUMN scouted INTEGER NOT NULL DEFAULT 0;
