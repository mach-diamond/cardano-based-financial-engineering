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
 */
export async function mintAsset(
  originator: Identity,
  config: MintConfig,
  options: TokenizationOptions
): Promise<ActionResult> {
  const { phases, currentStepName, log } = options

  currentStepName.value = `Minting ${config.asset} tokens for ${originator.name}`
  log(`  ${originator.name}: Minting ${config.qty} ${config.asset} tokens...`, 'info')

  await delay(400)

  // Add asset to originator's wallet
  originator.wallets[0].assets.push({
    policyId: 'policy_' + config.asset.toLowerCase(),
    assetName: config.asset,
    quantity: config.qty,
  })

  log(`  Confirmed ${config.qty} ${config.asset} in wallet`, 'success')

  // Update step status
  const step = phases.value[1].steps.find((s: any) => s.originatorId === config.id)
  if (step) step.status = 'passed'

  return { success: true, message: `Minted ${config.qty} ${config.asset}` }
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
