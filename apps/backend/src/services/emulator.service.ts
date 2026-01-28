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
  type UTxO,
} from '@lucid-evolution/lucid'

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
  const utxos: UTxO[] = []

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

    // Create UTxO for this wallet
    utxos.push({
      txHash: `${'0'.repeat(62)}${i.toString().padStart(2, '0')}`,
      outputIndex: 0,
      address,
      assets: { lovelace: balance },
      datum: null,
      datumHash: null,
      scriptRef: null,
    })
  }

  // Create emulator with funded wallets
  const emulator = new Emulator(utxos)
  const lucid = await Lucid(emulator, 'Preview')

  emulatorState = {
    lucid,
    emulator,
    wallets,
    isInitialized: true,
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
 * Advance emulator time
 */
export function advanceTime(slots: number): void {
  if (!emulatorState) return
  emulatorState.emulator.awaitSlot(slots)
}

/**
 * Get Lucid instance (for advanced operations)
 */
export function getLucid(): LucidEvolution | null {
  return emulatorState?.lucid || null
}
