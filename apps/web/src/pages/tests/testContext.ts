/**
 * Test Context Manager
 *
 * Frontend test context that communicates with backend for all Lucid operations.
 * All heavy crypto/transaction operations happen on the backend.
 */

import {
  getWallets,
  getTestConfig,
  initEmulator,
  getEmulatorStatus,
  resetEmulator as apiResetEmulator,
  selectEmulatorWallet,
  getEmulatorBalance,
  advanceEmulatorTime as apiAdvanceTime,
  createWallet,
  deleteAllWallets,
  generateMockPrivateKey,
  type WalletFromDB,
  type WalletConfig,
  type TestSetupConfig,
  type EmulatorWallet,
} from '@/services/api'

export type TestNetwork = 'emulator' | 'preview'

export interface TestWallet {
  id: number
  name: string
  role: 'Originator' | 'Borrower' | 'Analyst' | 'Investor'
  address: string
  paymentKeyHash: string
  balance: bigint
  requiredBalance: bigint
  isFunded: boolean
}

export interface TestContextState {
  network: TestNetwork
  isInitialized: boolean
  wallets: TestWallet[]
  config: TestSetupConfig | null
}

// Global state
let contextState: TestContextState = {
  network: 'emulator',
  isInitialized: false,
  wallets: [],
  config: null,
}

/**
 * Get the current test context state
 */
export function getTestContextState(): TestContextState {
  return contextState
}

/**
 * Check if wallets already exist in the database
 */
export async function checkExistingWallets(): Promise<{
  exists: boolean
  wallets: WalletFromDB[]
  count: number
}> {
  try {
    const wallets = await getWallets()
    return {
      exists: wallets.length > 0,
      wallets,
      count: wallets.length,
    }
  } catch (err) {
    console.warn('Could not check existing wallets:', err)
    return { exists: false, wallets: [], count: 0 }
  }
}

/**
 * Load test configuration from backend
 */
export async function loadTestConfig(): Promise<TestSetupConfig> {
  const config = await getTestConfig()
  contextState.config = config
  return config
}

/**
 * Calculate required funding for a wallet based on role
 */
export function getRequiredFunding(role: string, config?: TestSetupConfig): bigint {
  const funding = config?.defaultFunding || {
    originator: 10000,
    borrower: 5000,
    analyst: 1000,
    investor: 50000,
  }

  const key = role.toLowerCase() as keyof typeof funding
  return BigInt(funding[key] || 1000) * 1_000_000n
}

/**
 * Check funding status for all wallets
 */
export async function checkFundingStatus(): Promise<{
  allFunded: boolean
  unfundedCount: number
  walletStatus: { name: string; funded: boolean; balance: string }[]
}> {
  const walletStatus: { name: string; funded: boolean; balance: string }[] = []
  let unfundedCount = 0

  for (const wallet of contextState.wallets) {
    const balance = await getEmulatorBalance(wallet.address)
    const funded = balance >= wallet.requiredBalance
    if (!funded) unfundedCount++

    walletStatus.push({
      name: wallet.name,
      funded,
      balance: (balance / 1_000_000n).toString() + ' ADA',
    })
  }

  return {
    allFunded: unfundedCount === 0,
    unfundedCount,
    walletStatus,
  }
}

/**
 * Initialize the emulator via backend API
 */
export async function initializeEmulator(walletConfigs: WalletConfig[]): Promise<{
  wallets: TestWallet[]
}> {
  const result = await initEmulator(walletConfigs)

  const testWallets: TestWallet[] = result.wallets.map((w, i) => ({
    id: i + 1,
    name: w.name,
    role: w.role,
    address: w.address,
    paymentKeyHash: w.paymentKeyHash,
    balance: BigInt(w.balance),
    requiredBalance: BigInt(w.balance),
    isFunded: true,
  }))

  contextState.wallets = testWallets
  contextState.network = 'emulator'
  contextState.isInitialized = true

  return { wallets: testWallets }
}

/**
 * Reset the emulator
 */
export async function resetEmulator(): Promise<void> {
  await apiResetEmulator()
  contextState.isInitialized = false
  contextState.wallets = []
}

/**
 * Select wallet for operations
 */
export async function selectWallet(walletName: string): Promise<boolean> {
  return selectEmulatorWallet(walletName)
}

/**
 * Advance emulator time
 */
export function advanceEmulatorTime(slots: number): void {
  apiAdvanceTime(slots)
}

/**
 * Get emulator status from backend
 */
export async function getStatus(): Promise<{
  initialized: boolean
  walletCount: number
}> {
  const status = await getEmulatorStatus()
  return {
    initialized: status.initialized,
    walletCount: status.walletCount || 0,
  }
}

/**
 * Save wallets to database for persistence
 */
export async function saveWalletsToDatabase(wallets: TestWallet[]): Promise<void> {
  // First clear existing wallets
  await deleteAllWallets()

  // Save each wallet
  for (const wallet of wallets) {
    await createWallet({
      name: wallet.name,
      role: wallet.role,
      address: wallet.address,
      paymentKeyHash: wallet.paymentKeyHash,
      privateKey: generateMockPrivateKey(), // Placeholder - real key is in emulator
    })
  }
}

/**
 * Initialize for Preview testnet (wallets need external funding)
 */
export async function initializePreview(walletConfigs: WalletConfig[]): Promise<{
  wallets: TestWallet[]
}> {
  // For preview, we create wallet addresses but don't fund them
  // They need to be funded from faucet
  const result = await initEmulator(walletConfigs)

  const testWallets: TestWallet[] = result.wallets.map((w, i) => ({
    id: i + 1,
    name: w.name,
    role: w.role,
    address: w.address,
    paymentKeyHash: w.paymentKeyHash,
    balance: 0n, // Preview wallets start unfunded
    requiredBalance: getRequiredFunding(w.role, contextState.config || undefined),
    isFunded: false,
  }))

  contextState.wallets = testWallets
  contextState.network = 'preview'
  contextState.isInitialized = true

  return { wallets: testWallets }
}

/**
 * Check wallet funding status (for preview mode)
 */
export async function checkWalletFunding(wallets: TestWallet[]): Promise<{
  allFunded: boolean
  fundedCount: number
  unfundedCount: number
  walletStatus: {
    name: string
    address: string
    balance: bigint
    required: bigint
    isFunded: boolean
  }[]
}> {
  const walletStatus: {
    name: string
    address: string
    balance: bigint
    required: bigint
    isFunded: boolean
  }[] = []

  let fundedCount = 0
  let unfundedCount = 0

  for (const wallet of wallets) {
    const balance = await getEmulatorBalance(wallet.address)
    const isFunded = balance >= wallet.requiredBalance

    if (isFunded) {
      fundedCount++
    } else {
      unfundedCount++
    }

    walletStatus.push({
      name: wallet.name,
      address: wallet.address,
      balance,
      required: wallet.requiredBalance,
      isFunded,
    })
  }

  return {
    allFunded: unfundedCount === 0,
    fundedCount,
    unfundedCount,
    walletStatus,
  }
}
