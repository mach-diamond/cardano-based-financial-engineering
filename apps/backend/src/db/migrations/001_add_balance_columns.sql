-- Migration: Add balance tracking columns to wallets table
-- Safe to run multiple times (checks if columns exist)

-- Add balance column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'wallets' AND column_name = 'balance'
    ) THEN
        ALTER TABLE wallets ADD COLUMN balance BIGINT NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Add balance_synced_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'wallets' AND column_name = 'balance_synced_at'
    ) THEN
        ALTER TABLE wallets ADD COLUMN balance_synced_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'wallets'
ORDER BY ordinal_position;
