/**
 * Pipeline Context Manager
 * Manages test state and communicates with backend for Lucid operations
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
  getTestnetBalance,
  getTestnetStatus,
  type WalletFromDB,
  type WalletConfig,
  type TestSetupConfig,
} from '@/services/api'
import type { TestNetwork, PipelineState, Identity } from './types'
import { NAME_TO_ID_MAP } from './types'

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

interface ContextState {
  network: TestNetwork
  isInitialized: boolean
  wallets: TestWallet[]
  config: TestSetupConfig | null
  currentTime: number // Simulated blockchain time (slot)
  startTime: number // Real start time
}

// Global state
let contextState: ContextState = {
  network: 'emulator',
  isInitialized: false,
  wallets: [],
  config: null,
  currentTime: 0,
  startTime: Date.now(),
}

/**
 * Get the current context state
 */
export function getContextState(): ContextState {
  return contextState
}

/**
 * Get current simulated time
 */
export function getCurrentTime(): { slot: number; realTime: number; elapsed: number } {
  return {
    slot: contextState.currentTime,
    realTime: Date.now(),
    elapsed: Date.now() - contextState.startTime,
  }
}

/**
 * Advance simulated time by slots
 */
export async function advanceTime(slots: number): Promise<void> {
  contextState.currentTime += slots
  await apiAdvanceTime(slots)
}

/**
 * Reset time to start
 */
export function resetTime(): void {
  contextState.currentTime = 0
  contextState.startTime = Date.now()
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
  contextState.startTime = Date.now()
  contextState.currentTime = 0

  return { wallets: testWallets }
}

/**
 * Initialize for Preview testnet (wallets need external funding)
 */
export async function initializePreview(walletConfigs: WalletConfig[]): Promise<{
  wallets: TestWallet[]
}> {
  const result = await initEmulator(walletConfigs)

  const testWallets: TestWallet[] = result.wallets.map((w, i) => ({
    id: i + 1,
    name: w.name,
    role: w.role,
    address: w.address,
    paymentKeyHash: w.paymentKeyHash,
    balance: 0n,
    requiredBalance: getRequiredFunding(w.role, contextState.config || undefined),
    isFunded: false,
  }))

  contextState.wallets = testWallets
  contextState.network = 'preview'
  contextState.isInitialized = true
  contextState.startTime = Date.now()
  contextState.currentTime = 0

  return { wallets: testWallets }
}

/**
 * Reset the emulator
 */
export async function resetEmulator(): Promise<void> {
  await apiResetEmulator()
  contextState.isInitialized = false
  contextState.wallets = []
  contextState.currentTime = 0
}

/**
 * Select wallet for operations
 */
export async function selectWallet(walletName: string): Promise<boolean> {
  return selectEmulatorWallet(walletName)
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
  await deleteAllWallets()

  for (const wallet of wallets) {
    await createWallet({
      name: wallet.name,
      role: wallet.role,
      address: wallet.address,
      paymentKeyHash: wallet.paymentKeyHash,
      privateKey: generateMockPrivateKey(),
    })
  }
}

/**
 * Check wallet funding status using REAL blockchain data via Blockfrost
 * This is for preview testnet mode - actually checks on-chain balances
 */
export async function checkWalletFunding(wallets: TestWallet[]): Promise<{
  allFunded: boolean
  fundedCount: number
  unfundedCount: number
  totalBalanceAda: number
  totalRequiredAda: number
  canRedistribute: boolean
  redistributionSource: { name: string; address: string; balance: bigint } | null
  walletStatus: {
    name: string
    address: string
    balance: bigint
    required: bigint
    isFunded: boolean
    shortfall: bigint
  }[]
}> {
  // First check if Blockfrost is configured
  const testnetStatus = await getTestnetStatus()
  if (!testnetStatus.configured) {
    throw new Error('Blockfrost API not configured. Set BLOCKFROST_API_KEY in backend .env file.')
  }

  const walletStatus: {
    name: string
    address: string
    balance: bigint
    required: bigint
    isFunded: boolean
    shortfall: bigint
  }[] = []

  let fundedCount = 0
  let unfundedCount = 0
  let totalBalance = 0n
  let totalRequired = 0n

  // Check each wallet's ACTUAL on-chain balance
  for (const wallet of wallets) {
    let balance = 0n
    try {
      const result = await getTestnetBalance(wallet.address)
      balance = BigInt(result.balance)
    } catch (err) {
      // Address might not exist on chain yet (0 balance)
      balance = 0n
    }

    const isFunded = balance >= wallet.requiredBalance
    const shortfall = isFunded ? 0n : wallet.requiredBalance - balance

    if (isFunded) {
      fundedCount++
    } else {
      unfundedCount++
    }

    totalBalance += balance
    totalRequired += wallet.requiredBalance

    walletStatus.push({
      name: wallet.name,
      address: wallet.address,
      balance,
      required: wallet.requiredBalance,
      isFunded,
      shortfall,
    })

    // Update the context state wallet balance
    const ctxWallet = contextState.wallets.find(w => w.address === wallet.address)
    if (ctxWallet) {
      ctxWallet.balance = balance
      ctxWallet.isFunded = isFunded
    }
  }

  // Check if we can redistribute from a funded wallet
  const fundedWallets = walletStatus.filter(w => w.balance > w.required)
  const totalShortfall = walletStatus.reduce((sum, w) => sum + w.shortfall, 0n)

  // Find a wallet that has enough excess to cover the shortfall
  // Need to account for TX fees (~2 ADA per TX)
  const txFeeBuffer = BigInt(walletStatus.length * 2) * 1_000_000n
  const redistributionSource = fundedWallets.find(w =>
    (w.balance - w.required) >= (totalShortfall + txFeeBuffer)
  )

  return {
    allFunded: unfundedCount === 0,
    fundedCount,
    unfundedCount,
    totalBalanceAda: Number(totalBalance) / 1_000_000,
    totalRequiredAda: Number(totalRequired) / 1_000_000,
    canRedistribute: redistributionSource !== null,
    redistributionSource: redistributionSource ? {
      name: redistributionSource.name,
      address: redistributionSource.address,
      balance: redistributionSource.balance,
    } : null,
    walletStatus,
  }
}

/**
 * Convert DB wallets to Identity format
 */
export function walletsToIdentities(wallets: WalletFromDB[] | TestWallet[]): Identity[] {
  return wallets.map((w) => ({
    id: NAME_TO_ID_MAP[w.name] || `wallet-${w.id}`,
    name: w.name,
    role: w.role,
    address: w.address,
    wallets: [{
      id: `w${w.id}`,
      name: 'Main',
      address: w.address,
      balance: 'balance' in w ? (typeof w.balance === 'bigint' ? w.balance : BigInt(w.balance)) : 0n,
      assets: [],
    }],
  }))
}
