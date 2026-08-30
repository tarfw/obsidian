ALTER TABLE spaces ADD COLUMN workspace_number INTEGER;

UPDATE spaces
SET workspace_number = (
  SELECT COUNT(*)
  FROM spaces AS earlier
  WHERE earlier.owner = spaces.owner
    AND (earlier.created < spaces.created OR (earlier.created = spaces.created AND earlier.id <= spaces.id))
)
WHERE workspace_number IS NULL;

CREATE UNIQUE INDEX spaces_owner_workspace_number ON spaces(owner, workspace_number);
