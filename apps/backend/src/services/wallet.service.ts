/**
 * Wallet Service
 * Handles wallet generation, storage, and retrieval
 */

import sql from '../db'
import { testConfig, type WalletConfig } from '../config/test-setup'

export interface Wallet {
    id: number
    name: string
    role: 'Originator' | 'Borrower' | 'Analyst' | 'Investor'
    address: string
    paymentKeyHash: string
    stakingKeyHash: string | null
    privateKey: string
    balance: bigint
    balanceSyncedAt: Date | null
    createdAt: Date
    updatedAt: Date
}

export interface WalletAsset {
    id: number
    walletId: number
    policyId: string
    assetName: string
    quantity: number
}

export interface CreateWalletInput {
    name: string
    role: WalletConfig['role']
    address: string
    paymentKeyHash: string
    stakingKeyHash?: string
    privateKey: string
}

/**
 * Create a new wallet in the database
 */
export async function createWallet(input: CreateWalletInput): Promise<Wallet> {
    const [wallet] = await sql<Wallet[]>`
        INSERT INTO wallets (name, role, address, payment_key_hash, staking_key_hash, private_key)
        VALUES (${input.name}, ${input.role}, ${input.address}, ${input.paymentKeyHash}, ${input.stakingKeyHash || null}, ${input.privateKey})
        RETURNING
            id,
            name,
            role,
            address,
            payment_key_hash as "paymentKeyHash",
            staking_key_hash as "stakingKeyHash",
            private_key as "privateKey",
            created_at as "createdAt",
            updated_at as "updatedAt"
    `
    return wallet
}

/**
 * Get all wallets
 */
export async function getAllWallets(): Promise<Wallet[]> {
    return sql<Wallet[]>`
        SELECT
            id,
            name,
            role,
            address,
            payment_key_hash as "paymentKeyHash",
            staking_key_hash as "stakingKeyHash",
            private_key as "privateKey",
            balance,
            balance_synced_at as "balanceSyncedAt",
            created_at as "createdAt",
            updated_at as "updatedAt"
        FROM wallets
        ORDER BY role, name
    `
}

/**
 * Get wallets by role
 */
export async function getWalletsByRole(role: WalletConfig['role']): Promise<Wallet[]> {
    return sql<Wallet[]>`
        SELECT
            id,
            name,
            role,
            address,
            payment_key_hash as "paymentKeyHash",
            staking_key_hash as "stakingKeyHash",
            private_key as "privateKey",
            balance,
            balance_synced_at as "balanceSyncedAt",
            created_at as "createdAt",
            updated_at as "updatedAt"
        FROM wallets
        WHERE role = ${role}
        ORDER BY name
    `
}

/**
 * Get wallet by address
 */
export async function getWalletByAddress(address: string): Promise<Wallet | null> {
    const [wallet] = await sql<Wallet[]>`
        SELECT
            id,
            name,
            role,
            address,
            payment_key_hash as "paymentKeyHash",
            staking_key_hash as "stakingKeyHash",
            private_key as "privateKey",
            balance,
            balance_synced_at as "balanceSyncedAt",
            created_at as "createdAt",
            updated_at as "updatedAt"
        FROM wallets
        WHERE address = ${address}
    `
    return wallet || null
}

/**
 * Get wallet by name
 */
export async function getWalletByName(name: string): Promise<Wallet | null> {
    const [wallet] = await sql<Wallet[]>`
        SELECT
            id,
            name,
            role,
            address,
            payment_key_hash as "paymentKeyHash",
            staking_key_hash as "stakingKeyHash",
            private_key as "privateKey",
            balance,
            balance_synced_at as "balanceSyncedAt",
            created_at as "createdAt",
            updated_at as "updatedAt"
        FROM wallets
        WHERE name = ${name}
    `
    return wallet || null
}

/**
 * Delete all wallets (for test reset)
 */
export async function deleteAllWallets(): Promise<void> {
    await sql`DELETE FROM wallets`
}

/**
 * Add asset to wallet
 */
export async function addWalletAsset(
    walletId: number,
    policyId: string,
    assetName: string,
    quantity: number
): Promise<WalletAsset> {
    const [asset] = await sql<WalletAsset[]>`
        INSERT INTO wallet_assets (wallet_id, policy_id, asset_name, quantity)
        VALUES (${walletId}, ${policyId}, ${assetName}, ${quantity})
        ON CONFLICT (wallet_id, policy_id, asset_name)
        DO UPDATE SET quantity = wallet_assets.quantity + ${quantity}
        RETURNING
            id,
            wallet_id as "walletId",
            policy_id as "policyId",
            asset_name as "assetName",
            quantity
    `
    return asset
}

/**
 * Get assets for wallet
 */
export async function getWalletAssets(walletId: number): Promise<WalletAsset[]> {
    return sql<WalletAsset[]>`
        SELECT
            id,
            wallet_id as "walletId",
            policy_id as "policyId",
            asset_name as "assetName",
            quantity
        FROM wallet_assets
        WHERE wallet_id = ${walletId}
        ORDER BY policy_id, asset_name
    `
}

/**
 * Update wallet balance
 */
export async function updateWalletBalance(walletId: number, balance: bigint): Promise<void> {
    await sql`
        UPDATE wallets
        SET balance = ${balance.toString()}, balance_synced_at = NOW()
        WHERE id = ${walletId}
    `
}

/**
 * Update wallet balance by address
 */
export async function updateWalletBalanceByAddress(address: string, balance: bigint): Promise<void> {
    await sql`
        UPDATE wallets
        SET balance = ${balance.toString()}, balance_synced_at = NOW()
        WHERE address = ${address}
    `
}

/**
 * Bulk update wallet balances
 */
export async function updateWalletBalances(updates: { address: string; balance: bigint }[]): Promise<void> {
    for (const update of updates) {
        await updateWalletBalanceByAddress(update.address, update.balance)
    }
}

/**
 * Set wallet asset (upsert - replaces existing quantity)
 */
export async function setWalletAsset(
    walletId: number,
    policyId: string,
    assetName: string,
    quantity: number
): Promise<WalletAsset> {
    const [asset] = await sql<WalletAsset[]>`
        INSERT INTO wallet_assets (wallet_id, policy_id, asset_name, quantity)
        VALUES (${walletId}, ${policyId}, ${assetName}, ${quantity})
        ON CONFLICT (wallet_id, policy_id, asset_name)
        DO UPDATE SET quantity = ${quantity}
        RETURNING
            id,
            wallet_id as "walletId",
            policy_id as "policyId",
            asset_name as "assetName",
            quantity
    `
    return asset
}

/**
 * Clear all assets for a wallet
 */
export async function clearWalletAssets(walletId: number): Promise<void> {
    await sql`DELETE FROM wallet_assets WHERE wallet_id = ${walletId}`
}

/**
 * Sync wallet assets from blockchain data
 */
export async function syncWalletAssets(
    walletId: number,
    assets: { policyId: string; assetName: string; quantity: number }[]
): Promise<void> {
    // Clear existing assets and replace with new ones
    await clearWalletAssets(walletId)
    for (const asset of assets) {
        await setWalletAsset(walletId, asset.policyId, asset.assetName, asset.quantity)
    }
}

/**
 * Get test setup configuration
 */
export function getTestConfig() {
    return testConfig
}
