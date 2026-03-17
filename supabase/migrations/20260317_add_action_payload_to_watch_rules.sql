-- ATLAS-OPTIMUS-WATCHLIST-METADATA-ENABLE-9826
-- Add action_payload column to watch_rules if missing

DO $$
BEGIN
    -- Add action_payload column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'watch_rules' 
        AND column_name = 'action_payload'
    ) THEN
        ALTER TABLE watch_rules ADD COLUMN action_payload JSONB DEFAULT '{}';
        RAISE NOTICE 'Added action_payload column to watch_rules';
    ELSE
        RAISE NOTICE 'action_payload column already exists in watch_rules';
    END IF;
END $$;

-- Ensure the column has proper default
ALTER TABLE watch_rules ALTER COLUMN action_payload SET DEFAULT '{}';

-- Update any NULL values to empty object
UPDATE watch_rules SET action_payload = '{}' WHERE action_payload IS NULL;
