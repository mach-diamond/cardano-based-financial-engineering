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
 * For emulator: wallets are pre-funded automatically
 * For preview: MUST check real blockchain balances and FAIL if insufficient
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

    // =====================================================
    // PREVIEW MODE - Check REAL blockchain balances
    // =====================================================
    log(`  Querying Preview testnet via Blockfrost...`, 'info')

    const state = ctx.getContextState()
    if (state.wallets.length === 0) {
      step.status = 'failed'
      log(`  ERROR: No wallets configured`, 'error')
      return { success: false, message: 'No wallets configured' }
    }

    // This actually calls Blockfrost API to check real on-chain balances
    const fundingStatus = await ctx.checkWalletFunding(state.wallets)

    // Update identity balances with REAL values
    for (const identity of identities.value) {
      const ws = fundingStatus.walletStatus.find(w => w.name === identity.name)
      if (ws && identity.wallets[0]) {
        identity.wallets[0].balance = ws.balance
      }
    }

    // Log summary
    log(`  Total on-chain: ${fundingStatus.totalBalanceAda.toFixed(2)} ADA`, 'info')
    log(`  Total required: ${fundingStatus.totalRequiredAda.toFixed(2)} ADA`, 'info')

    if (fundingStatus.allFunded) {
      log(`  All ${fundingStatus.fundedCount} wallets have sufficient funds`, 'success')
      step.status = 'passed'
      return { success: true, message: 'All wallets funded' }
    }

    // NOT ALL FUNDED - Show detailed breakdown
    log(``, 'info')
    log(`  FUNDING SHORTFALL DETECTED`, 'error')
    log(`  ─────────────────────────────────────────`, 'info')

    for (const ws of fundingStatus.walletStatus) {
      const balanceAda = Number(ws.balance) / 1_000_000
      const requiredAda = Number(ws.required) / 1_000_000
      const shortfallAda = Number(ws.shortfall) / 1_000_000

      if (ws.isFunded) {
        log(`  ✓ ${ws.name}: ${balanceAda.toFixed(2)} ADA (OK)`, 'success')
      } else {
        log(`  ✗ ${ws.name}: ${balanceAda.toFixed(2)} / ${requiredAda.toFixed(2)} ADA (need ${shortfallAda.toFixed(2)} more)`, 'error')
      }
    }

    log(``, 'info')

    // Check if redistribution is possible
    if (fundingStatus.canRedistribute && fundingStatus.redistributionSource) {
      const source = fundingStatus.redistributionSource
      const sourceAda = Number(source.balance) / 1_000_000
      log(`  REDISTRIBUTION POSSIBLE`, 'warning')
      log(`  Source wallet: ${source.name} (${sourceAda.toFixed(2)} ADA)`, 'info')
      log(`  Address: ${source.address}`, 'info')
      log(``, 'info')
      log(`  To redistribute, fund from this wallet or use faucet first.`, 'info')

      step.status = 'failed'
      return {
        success: false,
        message: `Wallets need funding. Redistribution possible from ${source.name}.`,
        data: {
          canRedistribute: true,
          source: fundingStatus.redistributionSource,
          walletStatus: fundingStatus.walletStatus,
        }
      }
    }

    // No redistribution possible - need faucet
    log(`  NO WALLET HAS SUFFICIENT FUNDS FOR REDISTRIBUTION`, 'error')
    log(``, 'info')
    log(`  Options:`, 'info')
    log(`  1. Fund a wallet from faucet: https://docs.cardano.org/cardano-testnet/tools/faucet`, 'info')
    log(`  2. Copy a wallet address above and request ~10,000 tADA`, 'info')
    log(`  3. Re-run this phase after funding`, 'info')

    step.status = 'failed'
    return {
      success: false,
      message: `${fundingStatus.unfundedCount} wallets need funding. Total shortfall: ${(fundingStatus.totalRequiredAda - fundingStatus.totalBalanceAda).toFixed(2)} ADA`,
      data: {
        canRedistribute: false,
        walletStatus: fundingStatus.walletStatus,
      }
    }
  } catch (err) {
    step.status = 'failed'
    const error = err as Error
    log(`  Failed to check funding: ${error.message}`, 'error')
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
