/**
 * Tokenization Actions
 * Asset minting operations for originators
 *
 * EMULATOR MODE: Calls backend /api/loan/mint which builds real Lucid transactions
 * PREVIEW MODE: Will also call backend (when testnet minting is implemented)
 */

import type { Ref } from 'vue'
import type { Identity, Phase, LogFunction, ActionResult } from '../types'
import { mintTestToken } from '@/services/api'

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
  /**
   * Used to find step in phases by loanIndex for status updates
   */
  updateStepStatus?: (originatorId: string, asset: string, status: 'passed' | 'failed') => void
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
 * Calls backend /api/loan/mint which uses Lucid Evolution to build real transactions.
 * In emulator mode, the backend submits to the emulator.
 * In preview mode, the backend submits to the Preview testnet.
 */
export async function mintAsset(
  originator: Identity,
  config: MintConfig | { originatorId: string; asset: string; qty: bigint; id?: string },
  options: TokenizationOptions
): Promise<ActionResult> {
  const { currentStepName, log, mode = 'emulator' } = options

  const asset = config.asset
  const qty = Number(config.qty)

  currentStepName.value = `Minting ${asset} tokens for ${originator.name}`
  log(`  ${originator.name}: Minting ${qty} ${asset} tokens...`, 'info')

  try {
    // Call backend API to mint tokens via Lucid Evolution
    const result = await mintTestToken(originator.name, asset, qty)

    if (!result.success) {
      log(`  ✗ Failed to mint: ${result.error || 'Unknown error'}`, 'error')
      // Update step status in phase 2 to failed
      const phase2 = options.phases.value.find(p => p.id === 2)
      if (phase2) {
        const step = phase2.steps.find((s: any) =>
          s.originatorId === originator.id && s.asset === asset
        )
        if (step) {
          step.status = 'failed'
        }
      }
      return {
        success: false,
        message: result.error || `Failed to mint ${asset}`,
      }
    }

    // Add asset to originator's wallet in local state
    originator.wallets[0].assets.push({
      policyId: result.policyId || 'policy_' + asset.toLowerCase(),
      assetName: asset,
      quantity: BigInt(qty),
    })

    log(`  ✓ Minted ${qty} ${asset} tokens`, 'success')
    log(`    TX: ${result.txHash}`, 'info')
    log(`    Policy: ${result.policyId}`, 'info')

    // Update step status in phase 2 (Asset Tokenization)
    const phase2 = options.phases.value.find(p => p.id === 2)
    if (phase2) {
      const step = phase2.steps.find((s: any) =>
        s.originatorId === originator.id && s.asset === asset
      )
      if (step) {
        step.status = 'passed'
      }
    }

    return {
      success: true,
      message: `Minted ${qty} ${asset}`,
      data: {
        txHash: result.txHash,
        policyId: result.policyId,
      }
    }
  } catch (err) {
    const error = err as Error
    log(`  ✗ Failed to mint ${asset}: ${error.message}`, 'error')
    // Update step status in phase 2 to failed
    const phase2 = options.phases.value.find(p => p.id === 2)
    if (phase2) {
      const step = phase2.steps.find((s: any) =>
        s.originatorId === originator.id && s.asset === asset
      )
      if (step) {
        step.status = 'failed'
      }
    }
    return {
      success: false,
      message: error.message,
      error,
    }
  }
}

/**
 * Execute full tokenization phase
 *
 * Calls backend API to mint tokens via Lucid Evolution.
 * Works in both emulator and testnet modes.
 */
export async function executeTokenizationPhase(
  options: TokenizationOptions,
  mintConfig: MintConfig[] = DEFAULT_MINT_CONFIG
): Promise<ActionResult> {
  const { identities, log, mode = 'emulator' } = options

  log('Phase 2: Asset Tokenization', 'phase')
  log(`  Mode: ${mode}`, 'info')

  let successCount = 0
  let failCount = 0

  for (const config of mintConfig) {
    const originator = identities.value.find(i => i.id === config.id)
    if (!originator) {
      log(`  Originator ${config.id} not found, skipping`, 'warning')
      continue
    }

    const result = await mintAsset(originator, config, options)
    if (result.success) {
      successCount++
    } else {
      failCount++
      // Continue with other mints even if one fails
      log(`  Continuing with remaining mints...`, 'info')
    }
  }

  if (failCount > 0 && successCount === 0) {
    return { success: false, message: `All ${failCount} mint operations failed` }
  }

  log(`  Tokenization complete: ${successCount} succeeded, ${failCount} failed`, successCount > 0 ? 'success' : 'warning')
  return { success: true, message: `Asset tokenization complete (${successCount}/${successCount + failCount})` }
}
