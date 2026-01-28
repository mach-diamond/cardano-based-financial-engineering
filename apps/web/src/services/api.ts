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

// =============================================================================
// Loan Contract API - all contract operations happen on backend
// =============================================================================

export interface LoanTerms {
    principal: number // in ADA
    apr: number // basis points (e.g., 500 = 5%)
    frequency: number // payments per year (12 = monthly)
    installments: number // total number of payments
    lateFee: number // in ADA
    transferFeeSeller: number // in lovelace
    transferFeeBuyer: number // in lovelace
}

export interface CreateLoanParams {
    sellerWalletName: string
    asset: {
        policyId: string
        assetName: string
        quantity: number
    }
    terms: LoanTerms
    buyerAddress?: string
    deferFee?: boolean
}

export interface LoanContractResult {
    success: boolean
    txHash: string
    contractAddress?: string
    policyId?: string
    error?: string
}

export interface WalletToken {
    policyId: string
    assetName: string
    quantity: string
}

/**
 * Mint test tokens for a wallet
 */
export async function mintTestToken(
    walletName: string,
    assetName: string,
    quantity: number,
    policyId?: string
): Promise<LoanContractResult> {
    const res = await fetch(`${API_BASE}/api/loan/mint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletName, policyId, assetName, quantity })
    })
    return res.json()
}

/**
 * Get tokens owned by a wallet
 */
export async function getWalletTokens(walletName: string): Promise<WalletToken[]> {
    const res = await fetch(`${API_BASE}/api/loan/tokens/${encodeURIComponent(walletName)}`)
    const data = await res.json()
    return data.tokens || []
}

/**
 * Create a new loan contract
 */
export async function createLoan(params: CreateLoanParams): Promise<LoanContractResult> {
    const res = await fetch(`${API_BASE}/api/loan/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
    })
    return res.json()
}

/**
 * Accept loan terms and make initial payment
 */
export async function acceptLoan(
    buyerWalletName: string,
    contractAddress: string,
    initialPayment: number
): Promise<LoanContractResult> {
    const res = await fetch(`${API_BASE}/api/loan/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerWalletName, contractAddress, initialPayment })
    })
    return res.json()
}

/**
 * Make a payment on a loan
 */
export async function makeLoanPayment(
    buyerWalletName: string,
    contractAddress: string,
    amount: number
): Promise<LoanContractResult> {
    const res = await fetch(`${API_BASE}/api/loan/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerWalletName, contractAddress, amount })
    })
    return res.json()
}

/**
 * Seller collects payments from contract
 */
export async function collectLoanPayment(
    sellerWalletName: string,
    contractAddress: string,
    amount: number
): Promise<LoanContractResult> {
    const res = await fetch(`${API_BASE}/api/loan/collect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerWalletName, contractAddress, amount })
    })
    return res.json()
}

/**
 * Get all stored contracts
 */
export async function getAllContracts(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/api/loan/contracts`)
    const data = await res.json()
    return data.contracts || []
}

/**
 * Get a specific contract by address
 */
export async function getContract(address: string): Promise<any | null> {
    const res = await fetch(`${API_BASE}/api/loan/contracts/${encodeURIComponent(address)}`)
    if (!res.ok) return null
    const data = await res.json()
    return data.contract
}

/**
 * Clear all contracts (test reset)
 */
export async function clearContracts(): Promise<void> {
    await fetch(`${API_BASE}/api/loan/clear`, { method: 'POST' })
}

/**
 * Full test cleanup - reset emulator, clear contracts, delete wallets
 */
export async function fullTestCleanup(): Promise<void> {
    await Promise.all([
        resetEmulator(),
        clearContracts(),
        deleteAllWallets()
    ])
}

// =============================================================================
// Test Run API - persist test state to database (pipeline runner model)
// =============================================================================

export interface Breakpoint {
    phaseId: number
    enabled: boolean
    pauseAfter: boolean  // true = pause after phase, false = pause before
}

export interface TestRunState {
    phases: any[]
    identities: any[]
    loanContracts: any[]
    cloContracts: any[]
    currentPhase: number
    completedSteps: number
    totalSteps: number
    breakpoints?: Breakpoint[]
}

export interface TestRun {
    id: number
    name: string
    description: string | null
    networkMode: 'emulator' | 'preview'
    status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped'
    configHash: string | null
    state: TestRunState
    contractIds: number[]
    startedAt: string
    completedAt: string | null
    pausedAt: string | null
    error: string | null
    createdAt: string
    updatedAt: string
}

/**
 * Get all test runs
 */
export async function getTestRuns(limit = 20): Promise<TestRun[]> {
    const res = await fetch(`${API_BASE}/api/test/runs?limit=${limit}`)
    const data = await res.json()
    return data.runs || []
}

/**
 * Get the latest test run
 */
export async function getLatestTestRun(): Promise<TestRun | null> {
    const res = await fetch(`${API_BASE}/api/test/runs/latest`)
    const data = await res.json()
    return data.run || null
}

/**
 * Get a test run by ID
 */
export async function getTestRun(id: number): Promise<TestRun | null> {
    const res = await fetch(`${API_BASE}/api/test/runs/${id}`)
    if (!res.ok) return null
    const data = await res.json()
    return data.run || null
}

/**
 * Create a new test run
 */
export async function createTestRun(params: {
    name: string
    description?: string
    networkMode: 'emulator' | 'preview'
    state: TestRunState
}): Promise<TestRun> {
    const res = await fetch(`${API_BASE}/api/test/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
    })
    if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create test run')
    }
    const data = await res.json()
    return data.run
}

/**
 * Update test run state
 */
export async function updateTestRunState(id: number, state: TestRunState): Promise<TestRun | null> {
    const res = await fetch(`${API_BASE}/api/test/runs/${id}/state`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state })
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.run || null
}

/**
 * Complete a test run
 */
export async function completeTestRun(
    id: number,
    status: 'passed' | 'failed',
    error?: string
): Promise<TestRun | null> {
    const res = await fetch(`${API_BASE}/api/test/runs/${id}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, error })
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.run || null
}

/**
 * Delete a test run
 */
export async function deleteTestRun(id: number): Promise<boolean> {
    const res = await fetch(`${API_BASE}/api/test/runs/${id}`, {
        method: 'DELETE'
    })
    return res.ok
}

/**
 * Delete all test runs
 */
export async function deleteAllTestRuns(): Promise<void> {
    await fetch(`${API_BASE}/api/test/runs`, { method: 'DELETE' })
}

// =============================================================================
// Contract API - stored in process_smart_contract table
// =============================================================================

export interface CreateContractParams {
    testRunId: number
    contractType: 'Transfer' | 'CLO'
    contractSubtype?: string
    alias?: string
    contractData?: {
        collateral?: {
            policyId: string
            assetName: string
            quantity: number
        }
        principal?: number
        apr?: number
        termLength?: string
        installments?: number
        tranches?: Array<{
            name: string
            allocation: number
            yieldModifier: number
        }>
        collateralCount?: number
        originator?: string
        borrower?: string
        manager?: string
    }
    contractDatum?: Record<string, unknown>
    contractAddress?: string
    policyId?: string
    networkId?: number
}

export interface ProcessSmartContract {
    processId: string
    userId: number | null
    contractDatum: Record<string, unknown> | null
    contractData: Record<string, unknown> | null
    contractAddress: string | null
    instantiated: string
    modified: string
    policyId: string | null
    contractType: string
    deployment: string | null
    contractVersion: string
    statusCode: number
    networkId: number
    contractSubtype: string | null
    alias: string | null
    txs: string[]
    parameters: Record<string, unknown> | null
    raId: string | null
    testRunId: number | null
}

/**
 * Create a contract in process_smart_contract table
 */
export async function createContractRecord(params: CreateContractParams): Promise<ProcessSmartContract> {
    const res = await fetch(`${API_BASE}/api/test/contracts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
    })
    if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create contract')
    }
    const data = await res.json()
    return data.contract
}

/**
 * Get contracts for a test run
 */
export async function getContractsByTestRun(testRunId: number): Promise<ProcessSmartContract[]> {
    const res = await fetch(`${API_BASE}/api/test/contracts?testRunId=${testRunId}`)
    const data = await res.json()
    return data.contracts || []
}

/**
 * Get a specific contract by process ID (from process_smart_contract table)
 */
export async function getTestContract(processId: string): Promise<ProcessSmartContract | null> {
    const res = await fetch(`${API_BASE}/api/test/contracts/${encodeURIComponent(processId)}`)
    if (!res.ok) return null
    const data = await res.json()
    return data.contract || null
}

/**
 * Update a contract's datum (state) by process ID
 */
export async function updateContractDatum(processId: string, datum: Record<string, any>): Promise<ProcessSmartContract | null> {
    const res = await fetch(`${API_BASE}/api/test/contracts/${encodeURIComponent(processId)}/datum`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datum })
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.contract || null
}

/**
 * Update a contract's data and datum by process ID
 */
export async function updateContractState(processId: string, updates: {
    contractData?: Record<string, any>
    contractDatum?: Record<string, any>
}): Promise<ProcessSmartContract | null> {
    const res = await fetch(`${API_BASE}/api/test/contracts/${encodeURIComponent(processId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.contract || null
}

/**
 * Delete all contracts
 */
export async function deleteAllContractRecords(): Promise<void> {
    await fetch(`${API_BASE}/api/test/contracts`, { method: 'DELETE' })
}
