/**
 * API Service - connects frontend to backend
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3005'

export interface WalletFromDB {
    id: number
    name: string
    role: 'Originator' | 'Borrower' | 'Analyst' | 'Investor'
    address: string
    paymentKeyHash: string
    stakingKeyHash: string | null
    createdAt: string
    updatedAt: string
}

export interface WalletConfig {
    name: string
    role: 'Originator' | 'Borrower' | 'Analyst' | 'Investor'
    initialAda: number
}

export interface TestSetupConfig {
    wallets: WalletConfig[]
    assets: Array<{
        policyId: string
        assetName: string
        quantity: number
        mintTo: string
    }>
    defaultFunding: {
        originator: number
        borrower: number
        analyst: number
        investor: number
    }
}

/**
 * Check API health
 */
export async function checkHealth(): Promise<{ status: string; db: string }> {
    const res = await fetch(`${API_BASE}/health`)
    return res.json()
}

/**
 * Get all wallets from DB
 */
export async function getWallets(): Promise<WalletFromDB[]> {
    const res = await fetch(`${API_BASE}/api/wallets`)
    const data = await res.json()
    return data.wallets || []
}

/**
 * Get test setup configuration
 */
export async function getTestConfig(): Promise<TestSetupConfig> {
    const res = await fetch(`${API_BASE}/api/wallets/config`)
    return res.json()
}

/**
 * Create a new wallet
 */
export async function createWallet(wallet: {
    name: string
    role: 'Originator' | 'Borrower' | 'Analyst' | 'Investor'
    address: string
    paymentKeyHash: string
    stakingKeyHash?: string
    privateKey: string
}): Promise<WalletFromDB> {
    const res = await fetch(`${API_BASE}/api/wallets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wallet)
    })
    if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create wallet')
    }
    return res.json()
}

/**
 * Delete all wallets (reset)
 */
export async function deleteAllWallets(): Promise<void> {
    const res = await fetch(`${API_BASE}/api/wallets`, {
        method: 'DELETE'
    })
    if (!res.ok) {
        throw new Error('Failed to delete wallets')
    }
}

/**
 * Generate a mock private key (for testing only!)
 */
export function generateMockPrivateKey(): string {
    return Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
    ).join('')
}

/**
 * Generate a mock address
 */
export function generateMockAddress(): string {
    const randomBytes = Array.from({ length: 56 }, () =>
        Math.floor(Math.random() * 16).toString(16)
    ).join('')
    return 'addr_test1qz' + randomBytes
}

/**
 * Generate a mock payment key hash
 */
export function generateMockPaymentKeyHash(): string {
    return Array.from({ length: 56 }, () =>
        Math.floor(Math.random() * 16).toString(16)
    ).join('')
}

// =============================================================================
// Emulator API - all Lucid operations happen on backend
// =============================================================================

export interface EmulatorWallet {
    name: string
    role: 'Originator' | 'Borrower' | 'Analyst' | 'Investor'
    address: string
    paymentKeyHash: string
    balance: string
}

export interface EmulatorStatus {
    initialized: boolean
    walletCount?: number
    wallets?: EmulatorWallet[]
}

/**
 * Initialize emulator with wallets
 */
export async function initEmulator(wallets: WalletConfig[]): Promise<{
    success: boolean
    wallets: EmulatorWallet[]
}> {
    const res = await fetch(`${API_BASE}/api/emulator/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallets })
    })
    if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to initialize emulator')
    }
    return res.json()
}

/**
 * Get emulator status
 */
export async function getEmulatorStatus(): Promise<EmulatorStatus> {
    const res = await fetch(`${API_BASE}/api/emulator/status`)
    return res.json()
}

/**
 * Reset emulator
 */
export async function resetEmulator(): Promise<void> {
    await fetch(`${API_BASE}/api/emulator/reset`, { method: 'POST' })
}

/**
 * Select active wallet in emulator
 */
export async function selectEmulatorWallet(walletName: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/api/emulator/select-wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletName })
    })
    const data = await res.json()
    return data.success
}

/**
 * Get UTxOs for address
 */
export async function getEmulatorUtxos(address: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/api/emulator/utxos/${encodeURIComponent(address)}`)
    const data = await res.json()
    return data.utxos || []
}

/**
 * Get balance for address
 */
export async function getEmulatorBalance(address: string): Promise<bigint> {
    const res = await fetch(`${API_BASE}/api/emulator/balance/${encodeURIComponent(address)}`)
    const data = await res.json()
    return BigInt(data.balance || '0')
}

/**
 * Advance emulator time
 */
export async function advanceEmulatorTime(slots: number): Promise<void> {
    await fetch(`${API_BASE}/api/emulator/advance-time`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots })
    })
}
