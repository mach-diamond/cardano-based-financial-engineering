-- MintMatrix Test Environment Schema

-- Wallets table: stores generated test wallets
CREATE TABLE IF NOT EXISTS wallets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Originator', 'Borrower', 'Analyst', 'Investor')),
    address TEXT NOT NULL UNIQUE,
    payment_key_hash TEXT NOT NULL,
    staking_key_hash TEXT,
    -- Encrypted/encoded private keys (for test environment only!)
    private_key TEXT NOT NULL,
    -- ADA balance in lovelace (fetched from blockchain)
    balance BIGINT NOT NULL DEFAULT 0,
    -- Last time balance was synced from blockchain
    balance_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wallet assets: tracks assets held by each wallet
CREATE TABLE IF NOT EXISTS wallet_assets (
    id SERIAL PRIMARY KEY,
    wallet_id INTEGER NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    policy_id TEXT NOT NULL,
    asset_name TEXT NOT NULL,
    quantity BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(wallet_id, policy_id, asset_name)
);

-- Test runs: tracks test execution history
CREATE TABLE IF NOT EXISTS test_runs (
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

-- Contracts table: stores deployed contract instances
CREATE TABLE IF NOT EXISTS contracts (
    id SERIAL PRIMARY KEY,
    test_run_id INTEGER REFERENCES test_runs(id) ON DELETE SET NULL,
    contract_type VARCHAR(50) NOT NULL CHECK (contract_type IN ('Loan', 'CLO')),
    process_id TEXT UNIQUE,
    alias VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    contract_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wallets_role ON wallets(role);
CREATE INDEX IF NOT EXISTS idx_wallets_address ON wallets(address);
CREATE INDEX IF NOT EXISTS idx_wallet_assets_wallet_id ON wallet_assets(wallet_id);
CREATE INDEX IF NOT EXISTS idx_contracts_test_run_id ON contracts(test_run_id);
CREATE INDEX IF NOT EXISTS idx_contracts_type ON contracts(contract_type);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables
DROP TRIGGER IF EXISTS update_wallets_updated_at ON wallets;
CREATE TRIGGER update_wallets_updated_at
    BEFORE UPDATE ON wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wallet_assets_updated_at ON wallet_assets;
CREATE TRIGGER update_wallet_assets_updated_at
    BEFORE UPDATE ON wallet_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contracts_updated_at ON contracts;
CREATE TRIGGER update_contracts_updated_at
    BEFORE UPDATE ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
