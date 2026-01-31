/**
 * Emulator Service - handles Lucid/Emulator operations
 * This runs in Node/Bun where CommonJS deps work properly
 */

import {
  Lucid,
  Emulator,
  generateSeedPhrase,
  paymentCredentialOf,
  type LucidEvolution,
  type EmulatorAccount,
  type UTxO,
} from '@lucid-evolution/lucid'

// Preview network slot configuration (from @lucid-evolution/plutus)
// This must match the SLOT_CONFIG_NETWORK.Preview values
const PREVIEW_SLOT_CONFIG = {
  zeroTime: 1666656000000, // Oct 25, 2022 in milliseconds
  zeroSlot: 0,
  slotLength: 1000, // 1 second per slot
}

/**
 * Calculate the current slot number for Preview network
 */
function getCurrentPreviewSlot(): number {
  const timePassed = Date.now() - PREVIEW_SLOT_CONFIG.zeroTime
  return Math.floor(timePassed / PREVIEW_SLOT_CONFIG.slotLength) + PREVIEW_SLOT_CONFIG.zeroSlot
}

export interface EmulatorWallet {
  name: string
  role: 'Originator' | 'Borrower' | 'Analyst' | 'Investor'
  seedPhrase: string
  address: string
  paymentKeyHash: string
  balance: bigint
}

export interface EmulatorState {
  lucid: LucidEvolution
  emulator: Emulator
  wallets: EmulatorWallet[]
  isInitialized: boolean
  currentSlot?: number // Track emulator slot for time simulation
  initialEmulatorNow?: number // The emulator.now() value when Lucid was initialized (Lucid's zeroTime)
}

// Global emulator state (single instance per server)
let emulatorState: EmulatorState | null = null

/**
 * Initialize emulator with wallets
 */
export async function initializeEmulator(
  walletConfigs: { name: string; role: string; initialAda: number }[]
): Promise<{ wallets: EmulatorWallet[] }> {
  // Create temporary Lucid to generate addresses
  const tempEmulator = new Emulator([])
  const tempLucid = await Lucid(tempEmulator, 'Preview')

  const wallets: EmulatorWallet[] = []
  const accounts: EmulatorAccount[] = []

  for (let i = 0; i < walletConfigs.length; i++) {
    const config = walletConfigs[i]
    const seed = generateSeedPhrase()
    tempLucid.selectWallet.fromSeed(seed)
    const address = await tempLucid.wallet().address()
    const paymentKeyHash = paymentCredentialOf(address).hash

    const balance = BigInt(config.initialAda) * 1_000_000n

    wallets.push({
      name: config.name,
      role: config.role as EmulatorWallet['role'],
      seedPhrase: seed,
      address,
      paymentKeyHash,
      balance,
    })

    // Create EmulatorAccount for this wallet
    // Type cast needed as Lucid Evolution types may vary between versions
    accounts.push({
      seedPhrase: seed,
      address,
      assets: { lovelace: balance },
    } as unknown as EmulatorAccount)
  }

  // Create emulator with funded accounts
  const emulator = new Emulator(accounts as EmulatorAccount[])

  // CRITICAL: Advance the emulator to the current real-world slot
  // This ensures validity windows (which use Date.now()) will be valid
  // The emulator starts at slot 0, but Lucid uses Preview network's slot config
  // which maps Date.now() to a much higher slot number
  const currentSlot = getCurrentPreviewSlot()
  console.log(`[Emulator] Advancing to current Preview network slot: ${currentSlot}`)
  emulator.awaitSlot(currentSlot)

  // IMPORTANT: Capture emulator.now() BEFORE creating Lucid
  // When Lucid is initialized with Emulator, it sets:
  //   SLOT_CONFIG['Preview'] = { zeroTime: emulator.now(), zeroSlot: 0, slotLength: 1000 }
  // This zeroTime is used for all slot conversions, so we must use the same value
  // for our validity window calculations, even after time is advanced.
  const initialEmulatorNow = emulator.now()
  console.log(`[Emulator] Initial emulator.now() (Lucid's zeroTime): ${initialEmulatorNow}`)

  const lucid = await Lucid(emulator, 'Preview')

  emulatorState = {
    lucid,
    emulator,
    wallets,
    isInitialized: true,
    currentSlot: currentSlot,
    initialEmulatorNow: initialEmulatorNow,
  }

  return { wallets }
}

/**
 * Get current emulator state
 */
export function getEmulatorState(): EmulatorState | null {
  return emulatorState
}

/**
 * Reset emulator
 */
export function resetEmulator(): void {
  emulatorState = null
}

/**
 * Select wallet by name
 */
export async function selectWallet(walletName: string): Promise<boolean> {
  if (!emulatorState) return false

  const wallet = emulatorState.wallets.find((w) => w.name === walletName)
  if (!wallet) return false

  emulatorState.lucid.selectWallet.fromSeed(wallet.seedPhrase)
  return true
}

/**
 * Get wallet UTxOs
 */
export async function getWalletUtxos(address: string): Promise<UTxO[]> {
  if (!emulatorState) return []
  return emulatorState.lucid.utxosAt(address)
}

/**
 * Get wallet balance
 */
export async function getWalletBalance(address: string): Promise<bigint> {
  if (!emulatorState) return 0n
  const utxos = await emulatorState.lucid.utxosAt(address)
  return utxos.reduce((acc, u) => acc + (u.assets.lovelace || 0n), 0n)
}

/**
 * Get current emulator slot
 */
export function getCurrentSlot(): number {
  if (!emulatorState) return 0
  // Return the tracked slot which should match the emulator's internal slot
  return emulatorState.currentSlot || getCurrentPreviewSlot()
}

/**
 * Advance emulator time by N slots
 */
export function advanceTime(slots: number): { newSlot: number; timestamp: number } {
  if (!emulatorState) return { newSlot: 0, timestamp: 0 }

  // Track current slot (initialize to current Preview slot if not set)
  if (emulatorState.currentSlot === undefined) {
    emulatorState.currentSlot = getCurrentPreviewSlot()
  }

  // IMPORTANT: awaitSlot is CUMULATIVE - it adds to the current emulator slot
  // So we pass just the delta, not the target slot
  emulatorState.currentSlot += slots
  emulatorState.emulator.awaitSlot(slots)

  // Calculate timestamp based on Preview network slot config
  // timestamp = zeroTime + (slot - zeroSlot) * slotLength
  const timestamp =
    PREVIEW_SLOT_CONFIG.zeroTime +
    (emulatorState.currentSlot - PREVIEW_SLOT_CONFIG.zeroSlot) * PREVIEW_SLOT_CONFIG.slotLength

  console.log(`[Emulator] Advanced to slot ${emulatorState.currentSlot}, timestamp: ${timestamp}`)

  return {
    newSlot: emulatorState.currentSlot,
    timestamp,
  }
}

/**
 * Get the current emulator timestamp based on the tracked slot
 */
export function getEmulatorTime(): number {
  if (!emulatorState || emulatorState.currentSlot === undefined) {
    return Date.now()
  }
  // Calculate timestamp from slot using Preview network config
  return (
    PREVIEW_SLOT_CONFIG.zeroTime +
    (emulatorState.currentSlot - PREVIEW_SLOT_CONFIG.zeroSlot) * PREVIEW_SLOT_CONFIG.slotLength
  )
}

/**
 * Get Lucid instance (for advanced operations)
 */
export function getLucid(): LucidEvolution | null {
  return emulatorState?.lucid || null
}

/**
 * Advance emulator by one block and update tracked slot
 * awaitBlock(1) advances by approximately 20 seconds (20 slots)
 */
export function awaitBlockAndTrack(blocks: number = 1): void {
  if (!emulatorState) return

  // Each block is approximately 20 seconds = 20 slots
  const slotsPerBlock = 20
  const slotsAdvanced = blocks * slotsPerBlock

  emulatorState.emulator.awaitBlock(blocks)

  // Update tracked slot
  if (emulatorState.currentSlot !== undefined) {
    emulatorState.currentSlot += slotsAdvanced
  }
}
