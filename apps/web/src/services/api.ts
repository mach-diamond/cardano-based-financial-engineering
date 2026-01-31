/**
 * API Service - connects frontend to backend
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3005'

/**
 * BigInt-safe JSON stringify - converts BigInt values to strings
 */
function safeJsonStringify(obj: unknown): string {
    return JSON.stringify(obj, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    )
}

export interface WalletFromDB {
    id: number
    name: string
    role: 'Originator' | 'Borrower' | 'Analyst' | 'Investor'
    address: string
    paymentKeyHash: string
    stakingKeyHash: string | null
    balance: string // lovelace as string (bigint serialized)
    balanceSyncedAt: string | null
    createdAt: string
    updatedAt: string
}

export interface WalletAssetFromDB {
    id: number
    walletId: number
    policyId: string
    assetName: string
    quantity: number
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
 * Update wallet balance
 */
export async function updateWalletBalance(walletId: number, balance: bigint): Promise<void> {
    const res = await fetch(`${API_BASE}/api/wallets/${walletId}/balance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balance: balance.toString() })
    })
    if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update wallet balance')
    }
}

/**
 * Sync multiple wallet balances to database
 */
export interface WalletBalanceUpdate {
    address: string
    balance: string // lovelace as string
    assets?: Array<{
        policyId: string
        assetName: string
        quantity: number
    }>
}

export async function syncWalletBalances(balances: WalletBalanceUpdate[]): Promise<{
    success: boolean
    updated: number
    total: number
}> {
    const res = await fetch(`${API_BASE}/api/wallets/sync-balances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balances })
    })
    if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to sync wallet balances')
    }
    return res.json()
}

/**
 * Get assets for a wallet
 */
export async function getWalletAssets(walletId: number): Promise<WalletAssetFromDB[]> {
    const res = await fetch(`${API_BASE}/api/wallets/${walletId}/assets`)
    const data = await res.json()
    return data.assets || []
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

/**
 * Generate a real Cardano wallet address via backend (uses Lucid)
 * This creates valid addresses that can receive funds on Preview testnet
 */
export interface GeneratedWallet {
    seedPhrase: string
    address: string
    paymentKeyHash: string
}

export async function generateRealWallet(): Promise<GeneratedWallet> {
    const res = await fetch(`${API_BASE}/api/wallets/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to generate wallet')
    }
    return res.json()
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
export async function advanceEmulatorTime(slots: number): Promise<{ slot: number; timestamp: number }> {
    const res = await fetch(`${API_BASE}/api/emulator/advance-time`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots })
    })
    const data = await res.json()
    return { slot: data.slot, timestamp: data.timestamp }
}

/**
 * Get current emulator slot
 */
export async function getEmulatorSlot(): Promise<{ slot: number; timestamp: number }> {
    const res = await fetch(`${API_BASE}/api/emulator/current-slot`)
    return res.json()
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
 * Complete loan transfer - buyer receives base asset, burns liability token
 */
export async function completeLoanTransfer(
    buyerWalletName: string,
    contractAddress: string
): Promise<LoanContractResult> {
    const res = await fetch(`${API_BASE}/api/loan/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerWalletName, contractAddress })
    })
    return res.json()
}

/**
 * Cancel loan - seller retrieves base asset, burns collateral token
 */
export async function cancelLoanContract(
    sellerWalletName: string,
    contractAddress: string
): Promise<LoanContractResult> {
    const res = await fetch(`${API_BASE}/api/loan/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerWalletName, contractAddress })
    })
    return res.json()
}

/**
 * Claim default - seller retrieves base asset after buyer defaults
 */
export async function claimLoanDefault(
    sellerWalletName: string,
    contractAddress: string
): Promise<LoanContractResult> {
    const res = await fetch(`${API_BASE}/api/loan/default`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerWalletName, contractAddress })
    })
    return res.json()
}

/**
 * Get full wallet state from emulator (real ADA + tokens)
 */
export interface WalletStateResult {
    success: boolean
    error?: string
    wallet?: {
        name: string
        address: string
        lovelace: string
        ada: number
        assets: Array<{
            policyId: string
            assetName: string
            quantity: string
        }>
    }
}

export async function getWalletState(walletName: string): Promise<WalletStateResult> {
    const res = await fetch(`${API_BASE}/api/loan/wallet/${encodeURIComponent(walletName)}`)
    return res.json()
}

/**
 * Refresh wallet state from emulator and update identity
 */
export async function refreshWalletState(
    identity: { name: string; wallets?: Array<{ address: string; assets?: Array<{ policyId: string; assetName: string; quantity: bigint }> }> },
    log?: (msg: string, type?: string) => void
): Promise<boolean> {
    try {
        const result = await getWalletState(identity.name)
        if (!result.success || !result.wallet) {
            if (log) log(`  ⚠ Could not refresh wallet for ${identity.name}: ${result.error}`, 'warning')
            return false
        }

        // Update wallet state with real data
        if (identity.wallets?.[0]) {
            identity.wallets[0].address = result.wallet.address
            identity.wallets[0].assets = result.wallet.assets.map(a => ({
                policyId: a.policyId,
                assetName: a.assetName,
                quantity: BigInt(a.quantity),
            }))
            // Store ADA balance - both as lovelace BigInt and as various properties for compatibility
            const lovelace = BigInt(result.wallet.lovelace)
            ;(identity.wallets[0] as any).balance = lovelace
            ;(identity.wallets[0] as any).lovelace = lovelace
            ;(identity.wallets[0] as any).ada = result.wallet.ada
        }

        return true
    } catch (err) {
        if (log) log(`  ⚠ Error refreshing wallet: ${(err as Error).message}`, 'warning')
        return false
    }
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
    networkMode: 'emulator' | 'preview' | 'preprod'
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
    networkMode: 'emulator' | 'preview' | 'preprod'
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
        body: safeJsonStringify({ state })
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
    testRunId?: number
    statusCode?: number
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

// =============================================================================
// Testnet API - Balance checking for Preview/Preprod testnet via Blockfrost
// =============================================================================

export type TestnetNetwork = 'preview' | 'preprod'

export interface TestnetStatus {
    configured: boolean
    network: string
    provider: string | null
    available: string[]
}

export interface TestnetBalance {
    address: string
    balance: string
    balanceAda: number
    network?: TestnetNetwork
}

export interface FundingNeed {
    address: string
    currentAda: number
    requiredAda: number
    needsFunding: boolean
}

export interface FundingCheckResult {
    wallets: FundingNeed[]
    summary: {
        totalWallets: number
        walletsNeedingFunding: number
        totalAdaNeeded: number
    }
    network: TestnetNetwork
}

/**
 * Check if Blockfrost API is configured on backend
 */
export async function getTestnetStatus(network: TestnetNetwork = 'preview'): Promise<TestnetStatus> {
    const res = await fetch(`${API_BASE}/api/testnet/status?network=${network}`)
    return res.json()
}

/**
 * Get balance for address on testnet (preview or preprod)
 */
export async function getTestnetBalance(address: string, network: TestnetNetwork = 'preview'): Promise<TestnetBalance> {
    const res = await fetch(`${API_BASE}/api/testnet/balance/${encodeURIComponent(address)}?network=${network}`)
    if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to get testnet balance')
    }
    return res.json()
}

/**
 * Get UTxOs for address on testnet
 */
export async function getTestnetUtxos(address: string, network: TestnetNetwork = 'preview'): Promise<any[]> {
    const res = await fetch(`${API_BASE}/api/testnet/utxos/${encodeURIComponent(address)}?network=${network}`)
    if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to get testnet UTxOs')
    }
    const data = await res.json()
    return data.utxos || []
}

/**
 * Get balances for multiple addresses on Preview testnet
 */
export async function getTestnetBalances(addresses: string[]): Promise<Record<string, TestnetBalance>> {
    const res = await fetch(`${API_BASE}/api/testnet/balances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresses })
    })
    if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to get testnet balances')
    }
    const data = await res.json()
    return data.balances || {}
}

/**
 * Check which wallets need funding on Preview testnet
 */
export async function checkTestnetFundingNeeds(
    wallets: { address: string; requiredAda: number }[]
): Promise<FundingCheckResult> {
    const res = await fetch(`${API_BASE}/api/testnet/check-funding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallets })
    })
    if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to check funding needs')
    }
    return res.json()
}

/**
 * Get balance for an address (works for both emulator and testnet mode)
 */
export async function getWalletBalance(address: string, networkMode: 'emulator' | 'preview' | 'preprod'): Promise<bigint> {
    if (networkMode === 'emulator') {
        return getEmulatorBalance(address)
    } else {
        const result = await getTestnetBalance(address)
        return BigInt(result.balance)
    }
}
