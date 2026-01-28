/**
 * Setup Actions
 * Wallet creation and funding operations
 */

import type { Ref } from 'vue'
import type { Identity, Phase, LogFunction, ActionResult } from '../types'
import { NAME_TO_ID_MAP } from '../types'
import * as ctx from '../context'

export interface SetupOptions {
  mode: 'emulator' | 'preview'
  identities: Ref<Identity[]>
  phases: Ref<Phase[]>
  currentStepName: Ref<string>
  log: LogFunction
}

/**
 * Execute wallet creation step
 */
export async function createWallets(options: SetupOptions): Promise<ActionResult> {
  const { mode, identities, phases, currentStepName, log } = options
  const step = phases.value[0].steps[0]

  step.status = 'running'
  currentStepName.value = 'Checking existing wallets...'

  try {
    const existingWallets = await ctx.checkExistingWallets()
    const config = await ctx.loadTestConfig()
    const expectedWalletCount = config.wallets.length

    if (existingWallets.exists && existingWallets.count === expectedWalletCount) {
      log(`  Found ${existingWallets.count} existing wallets in database`, 'success')
      log(`  Skipping wallet creation (already exists)`, 'info')

      if (identities.value.length === 0) {
        identities.value = ctx.walletsToIdentities(existingWallets.wallets)
      }
      step.status = 'passed'
      return { success: true, message: 'Wallets already exist' }
    }

    log(`  Creating ${expectedWalletCount} wallets...`, 'info')

    if (mode === 'emulator') {
      const { wallets: emulatorWallets } = await ctx.initializeEmulator(config.wallets)
      log(`  Saving wallets to database...`, 'info')
      await ctx.saveWalletsToDatabase(emulatorWallets)
      identities.value = ctx.walletsToIdentities(emulatorWallets)
      log(`  Created ${emulatorWallets.length} wallets (emulator)`, 'success')
    } else {
      const { wallets: previewWallets } = await ctx.initializePreview(config.wallets)
      await ctx.saveWalletsToDatabase(previewWallets)
      identities.value = ctx.walletsToIdentities(previewWallets)
      log(`  Created ${previewWallets.length} wallets (preview)`, 'success')
      log(`  Wallets need funding from faucet!`, 'warning')
    }

    step.status = 'passed'
    return { success: true, message: 'Wallets created successfully' }
  } catch (err) {
    step.status = 'failed'
    const error = err as Error
    log(`  Failed to create wallets: ${error.message}`, 'error')
    return { success: false, message: error.message, error }
  }
}

/**
 * Execute wallet funding step
 */
export async function fundWallets(options: SetupOptions): Promise<ActionResult> {
  const { mode, identities, phases, currentStepName, log } = options
  const step = phases.value[0].steps[1]

  step.status = 'running'
  currentStepName.value = 'Checking wallet funding status...'

  try {
    const config = await ctx.loadTestConfig()

    if (mode === 'emulator') {
      const state = ctx.getContextState()

      if (state.isInitialized && state.wallets.length > 0) {
        log(`  All ${state.wallets.length} wallets pre-funded by emulator`, 'success')

        for (const identity of identities.value) {
          const ctxWallet = state.wallets.find(w => w.name === identity.name)
          if (ctxWallet && identity.wallets[0]) {
            identity.wallets[0].balance = ctxWallet.balance
          }
        }
      } else {
        log(`  Initializing emulator with funding...`, 'info')
        const { wallets } = await ctx.initializeEmulator(config.wallets)

        for (const identity of identities.value) {
          const ctxWallet = wallets.find(w => w.name === identity.name)
          if (ctxWallet && identity.wallets[0]) {
            identity.wallets[0].balance = ctxWallet.balance
          }
        }
        log(`  Funded all wallets via emulator`, 'success')
      }

      step.status = 'passed'
      return { success: true, message: 'Wallets funded' }
    }

    // Preview mode - check actual funding status
    log(`  Checking funding status on preview testnet...`, 'info')

    const state = ctx.getContextState()
    if (state.wallets.length > 0) {
      const fundingStatus = await ctx.checkWalletFunding(state.wallets)

      if (fundingStatus.allFunded) {
        log(`  All ${fundingStatus.fundedCount} wallets funded`, 'success')
        step.status = 'passed'
      } else {
        log(`  ${fundingStatus.unfundedCount} wallets need funding:`, 'error')
        for (const ws of fundingStatus.walletStatus.filter(w => !w.isFunded)) {
          const needed = Number(ws.required - ws.balance) / 1_000_000
          log(`    - ${ws.name}: needs ${needed.toFixed(2)} ADA`, 'info')
        }
        log(`  Use faucet: https://docs.cardano.org/cardano-testnet/tools/faucet`, 'info')
        step.status = 'failed'
        return { success: false, message: 'Some wallets need funding' }
      }

      for (const identity of identities.value) {
        if (identity.wallets[0]) {
          const ctxWallet = state.wallets.find(w => w.name === identity.name)
          identity.wallets[0].balance = ctxWallet?.balance || 0n
        }
      }
    }

    step.status = 'passed'
    log(`  Funded all wallets with testnet ADA`, 'success')
    return { success: true, message: 'Wallets funded' }
  } catch (err) {
    step.status = 'failed'
    const error = err as Error
    log(`  Failed to fund wallets: ${error.message}`, 'error')
    return { success: false, message: error.message, error }
  }
}

/**
 * Execute full setup phase
 */
export async function executeSetupPhase(options: SetupOptions): Promise<ActionResult> {
  const { log } = options

  log('Phase 1: Setup & Identities', 'phase')

  const createResult = await createWallets(options)
  if (!createResult.success) {
    return createResult
  }

  const fundResult = await fundWallets(options)
  return fundResult
}
