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
 * @param originator The originator identity
 * @param config Can be MintConfig or a step object with originatorId
 * @param options Tokenization options
 */
export async function mintAsset(
  originator: Identity,
  config: MintConfig | { originatorId: string; asset: string; qty: bigint; id?: string },
  options: TokenizationOptions
): Promise<ActionResult> {
  const { currentStepName, log } = options

  // Handle both MintConfig and step objects
  const asset = config.asset
  const qty = config.qty

  currentStepName.value = `Minting ${asset} tokens for ${originator.name}`
  log(`  ${originator.name}: Minting ${qty} ${asset} tokens...`, 'info')

  await delay(400)

  // Add asset to originator's wallet
  originator.wallets[0].assets.push({
    policyId: 'policy_' + asset.toLowerCase(),
    assetName: asset,
    quantity: qty,
  })

  log(`  Confirmed ${qty} ${asset} in wallet`, 'success')

  // Note: Step status is managed by the runner after this function returns
  return { success: true, message: `Minted ${qty} ${asset}` }
}

/**
 * Execute full tokenization phase
 */
export async function executeTokenizationPhase(
  options: TokenizationOptions,
  mintConfig: MintConfig[] = DEFAULT_MINT_CONFIG
): Promise<ActionResult> {
  const { identities, log } = options

  log('Phase 2: Asset Tokenization', 'phase')

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
