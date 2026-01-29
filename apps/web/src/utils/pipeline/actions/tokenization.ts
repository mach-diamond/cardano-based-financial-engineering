/**
 * Tokenization Actions
 * Asset minting operations for originators
 */

import type { Ref } from 'vue'
import type { Identity, Phase, LogFunction, ActionResult } from '../types'
import { delay } from '../runner'

export interface MintConfig {
  id: string
  asset: string
  qty: bigint
  type: string
}

export interface TokenizationOptions {
  mode?: 'emulator' | 'preview' | 'preprod'
  identities: Ref<Identity[]>
  phases: Ref<Phase[]>
  currentStepName: Ref<string>
  log: LogFunction
}

/**
 * Default mint configuration for test assets
 */
export const DEFAULT_MINT_CONFIG: MintConfig[] = [
  { id: 'orig-jewelry', asset: 'Diamond', qty: 2n, type: 'jewelry' },
  { id: 'orig-airplane', asset: 'Airplane', qty: 10n, type: 'airplane' },
  { id: 'orig-home', asset: 'Home', qty: 1n, type: 'realestate' },
  { id: 'orig-realestate', asset: 'RealEstate', qty: 10n, type: 'realestate' },
  { id: 'orig-yacht', asset: 'Boat', qty: 3n, type: 'boat' },
]

/**
 * Mint assets for a single originator
 *
 * EMULATOR MODE: Adds mock assets to local state (emulator handles this)
 * PREVIEW MODE: FAILS - Real minting requires loan-contract actions to be wired up
 */
export async function mintAsset(
  originator: Identity,
  config: MintConfig | { originatorId: string; asset: string; qty: bigint; id?: string },
  options: TokenizationOptions
): Promise<ActionResult> {
  const { currentStepName, log, mode = 'emulator' } = options

  const asset = config.asset
  const qty = config.qty

  currentStepName.value = `Minting ${asset} tokens for ${originator.name}`

  if (mode === 'preview') {
    // PREVIEW MODE - Cannot mint without real contract integration
    log(`  ${originator.name}: Cannot mint ${qty} ${asset} tokens`, 'error')
    log(`    Real minting requires loan-contract actions to be wired up`, 'error')
    log(`    Address: ${originator.address}`, 'info')
    return {
      success: false,
      message: `Cannot mint ${asset} on Preview testnet - contract integration not implemented`,
    }
  }

  // EMULATOR MODE - Mock mint
  log(`  ${originator.name}: Minting ${qty} ${asset} tokens...`, 'info')
  await delay(400)

  // Add asset to originator's wallet in emulator
  originator.wallets[0].assets.push({
    policyId: 'policy_' + asset.toLowerCase(),
    assetName: asset,
    quantity: qty,
  })

  log(`  Confirmed ${qty} ${asset} in wallet`, 'success')
  return { success: true, message: `Minted ${qty} ${asset}` }
}

/**
 * Execute full tokenization phase
 *
 * EMULATOR: Mints mock assets
 * PREVIEW: FAILS with clear message about what's needed
 */
export async function executeTokenizationPhase(
  options: TokenizationOptions,
  mintConfig: MintConfig[] = DEFAULT_MINT_CONFIG
): Promise<ActionResult> {
  const { identities, log, mode = 'emulator' } = options

  log('Phase 2: Asset Tokenization', 'phase')

  if (mode === 'preview') {
    // Preview mode - explain what's needed
    log(``, 'info')
    log(`  PREVIEW MODE - Token Minting Not Implemented`, 'error')
    log(`  ─────────────────────────────────────────`, 'info')
    log(`  Real token minting on Preview testnet requires:`, 'info')
    log(`  1. Minting policy script from loan-contract package`, 'info')
    log(`  2. Signed transaction via Lucid Evolution`, 'info')
    log(`  3. Wallet with sufficient ADA for TX fees`, 'info')
    log(``, 'info')
    log(`  This functionality is not yet wired up.`, 'warning')
    log(`  Use EMULATOR mode for full pipeline testing.`, 'info')

    return {
      success: false,
      message: 'Token minting on Preview testnet not yet implemented. Use Emulator mode.',
    }
  }

  // Emulator mode - proceed with mock minting
  for (const config of mintConfig) {
    const originator = identities.value.find(i => i.id === config.id)
    if (!originator) {
      log(`  Originator ${config.id} not found, skipping`, 'warning')
      continue
    }

    const result = await mintAsset(originator, config, options)
    if (!result.success) {
      return result
    }
  }

  return { success: true, message: 'Asset tokenization complete' }
}
