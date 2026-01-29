-- Migration: Add 'preprod' to test_runs network_mode check constraint
-- Safe to run multiple times

-- Check if preprod is already in the constraint
DO $$
BEGIN
    -- First, check if there's an existing check constraint on network_mode
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_name LIKE '%network_mode%'
    ) THEN
        -- Drop the old constraint
        BEGIN
            ALTER TABLE test_runs DROP CONSTRAINT IF EXISTS test_runs_network_mode_check;
        EXCEPTION WHEN OTHERS THEN
            -- Ignore if doesn't exist
        END;
    END IF;

    -- Add the updated constraint to include 'preprod'
    -- Note: If column has no constraint, this adds one
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE check_clause LIKE '%preprod%'
        AND constraint_name LIKE '%test_runs%'
    ) THEN
        -- Try to add constraint (might fail if values exist that don't match)
        BEGIN
            ALTER TABLE test_runs ADD CONSTRAINT test_runs_network_mode_check
                CHECK (network_mode IN ('demo', 'emulator', 'preview', 'preprod'));
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not add constraint - may already exist or have conflicting values';
        END;
    END IF;
END $$;

-- Show current constraints
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%test_runs%';
