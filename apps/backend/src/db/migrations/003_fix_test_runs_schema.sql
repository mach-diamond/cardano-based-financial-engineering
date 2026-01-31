-- Migration: Fix test_runs table schema
-- The schema.sql had an old version with 'mode' column, but test.service.ts expects 'network_mode'

-- Drop and recreate the test_runs table with correct schema
-- Note: This will delete existing test run data (which is acceptable for dev/test data)

DROP TABLE IF EXISTS test_runs CASCADE;

CREATE TABLE test_runs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    network_mode VARCHAR(20) NOT NULL DEFAULT 'emulator' CHECK (network_mode IN ('demo', 'emulator', 'preview', 'preprod')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'passed', 'failed')),
    config_hash VARCHAR(64),
    state JSONB NOT NULL DEFAULT '{}',
    contract_ids INTEGER[] DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    paused_at TIMESTAMP WITH TIME ZONE,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_test_runs_status ON test_runs(status);
CREATE INDEX IF NOT EXISTS idx_test_runs_network_mode ON test_runs(network_mode);
CREATE INDEX IF NOT EXISTS idx_test_runs_config_hash ON test_runs(config_hash);

-- Re-add foreign key reference from contracts table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contracts') THEN
        -- Check if the column exists and add FK
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'test_run_id') THEN
            -- Drop existing FK if any
            ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_test_run_id_fkey;
            -- Re-add FK
            ALTER TABLE contracts ADD CONSTRAINT contracts_test_run_id_fkey
                FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Notify completion
SELECT 'test_runs table schema fixed' as result;
