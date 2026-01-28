/**
 * CLO Actions
 * Collateral bundling and CLO bond operations
 */

import type { Ref } from 'vue'
import type { Identity, Phase, LogFunction, ActionResult, LoanContract, CLOContract, Tranche } from '../types'
import { delay } from '../runner'
import { createContractRecord } from '@/services/api'

export interface CLOOptions {
  mode: 'emulator' | 'preview'
  identities: Ref<Identity[]>
  phases: Ref<Phase[]>
  currentStepName: Ref<string>
  log: LogFunction
  loanContracts: Ref<LoanContract[]>
  cloContracts: Ref<CLOContract[]>
  testRunId: Ref<number | null>
}

export interface CLODefinition {
  name: string
  tranches: Tranche[]
}

/**
 * Default CLO configuration
 */
export const DEFAULT_CLO_CONFIG: CLODefinition = {
  name: 'MintMatrix CLO Series 1',
  tranches: [
    { name: 'Senior', allocation: 60, yieldModifier: 0.8 },
    { name: 'Mezzanine', allocation: 25, yieldModifier: 1.0 },
    { name: 'Junior', allocation: 15, yieldModifier: 1.5 },
  ],
}

/**
 * Bundle collateral tokens from active loans
 */
export async function bundleCollateral(options: CLOOptions): Promise<ActionResult> {
  const { identities, phases, currentStepName, log, loanContracts } = options

  const analyst = identities.value.find(i => i.role === 'Analyst')
  if (!analyst) {
    return { success: false, message: 'Analyst (CLO manager) not found' }
  }

  // Only bundle loans that are active (accepted)
  const activeLoans = loanContracts.value.filter(l => l.state?.isActive)
  const loanCount = activeLoans.length

  if (loanCount === 0) {
    log('  No active loans to bundle', 'warning')
    return { success: false, message: 'No active loans available for bundling' }
  }

  currentStepName.value = `${analyst.name}: Bundling ${loanCount} Collateral Tokens`
  log(`  Bundling ${loanCount} Loan Collateral Tokens into CLO`, 'info')

  await delay(600)

  // Give analyst the CLO manager NFT
  analyst.wallets[0].assets.push({
    policyId: 'policy_clo_manager',
    assetName: 'CLO-Manager-NFT',
    quantity: 1n,
  })

  log(`  Collateral bundle created with ${loanCount} loans`, 'success')

  phases.value[3].steps[0].status = 'passed'

  return { success: true, message: `Bundled ${loanCount} loans` }
}

/**
 * Deploy CLO contract with tranches
 */
export async function deployCLO(
  options: CLOOptions,
  config: CLODefinition = DEFAULT_CLO_CONFIG
): Promise<ActionResult> {
  const { mode, identities, phases, currentStepName, log, loanContracts, cloContracts, testRunId } = options

  const analyst = identities.value.find(i => i.role === 'Analyst')
  if (!analyst) {
    return { success: false, message: 'Analyst (CLO manager) not found' }
  }

  currentStepName.value = 'Deploying CLO Contract with tranches'
  log(`  Deploying CLO: ${config.name}`, 'info')
  log(`    Tranches: ${config.tranches.map(t => t.name).join(', ')}`, 'info')

  await delay(500)

  // Calculate total value from active loans
  const activeLoans = loanContracts.value.filter(l => l.state?.isActive)
  const totalValue = activeLoans.reduce((sum, l) => sum + l.principal, 0)

  const cloContract: CLOContract = {
    id: `CLO-${Date.now()}`,
    alias: config.name,
    subtype: 'Waterfall',
    tranches: config.tranches,
    totalValue,
    collateralCount: activeLoans.length,
    status: 'passed',
    manager: analyst.name,
  }

  cloContracts.value.push(cloContract)

  // Save to database
  if (testRunId.value) {
    try {
      await createContractRecord({
        testRunId: testRunId.value,
        contractType: 'CLO',
        contractSubtype: 'Waterfall',
        alias: cloContract.alias,
        contractData: {
          tranches: cloContract.tranches,
          collateralCount: cloContract.collateralCount,
          manager: cloContract.manager,
        },
        contractDatum: {
          totalValue: cloContract.totalValue,
          isActive: true,
          isMatured: false,
        },
        policyId: 'policy_clo_manager',
        networkId: mode === 'emulator' ? 0 : 1,
      })
      log(`  CLO Contract saved to DB`, 'info')
    } catch (err) {
      log(`  Warning: Could not save CLO contract to DB: ${(err as Error).message}`, 'error')
    }
  }

  log(`  CLO deployed with ${config.tranches.length} tranches`, 'success')
  log(`    Total Value: ${(totalValue / 1_000_000).toLocaleString()} ADA`, 'info')

  phases.value[3].steps[1].status = 'passed'

  return { success: true, message: 'CLO deployed', data: cloContract }
}

/**
 * Distribute tranche tokens to investors
 */
export async function distributeTranches(options: CLOOptions): Promise<ActionResult> {
  const { identities, phases, currentStepName, log, cloContracts } = options

  const clo = cloContracts.value[0]
  if (!clo) {
    return { success: false, message: 'No CLO contract found' }
  }

  currentStepName.value = 'Distributing Tranche Tokens to Investors'
  log(`  Distributing tranche tokens for ${clo.alias}`, 'info')

  await delay(400)

  // Map tranches to investors
  const trancheInvestorMap: Record<string, string> = {
    'Senior': 'inv-1',
    'Mezzanine': 'inv-2',
    'Junior': 'inv-3',
  }

  for (const tranche of clo.tranches) {
    const investorId = trancheInvestorMap[tranche.name]
    const investor = identities.value.find(i => i.id === investorId)

    if (investor) {
      // Calculate tranche value
      const trancheValue = Math.floor((clo.totalValue * tranche.allocation) / 100)
      const tokenQuantity = BigInt(Math.floor(trancheValue / 1_000_000)) // 1 token per ADA

      investor.wallets[0].assets.push({
        policyId: 'policy_tranche',
        assetName: `${tranche.name}-Tranche`,
        quantity: tokenQuantity,
      })

      log(`    ${investor.name}: ${tokenQuantity} ${tranche.name} tokens (${tranche.allocation}%)`, 'success')
    }
  }

  log(`  Tranche tokens distributed to investors`, 'success')

  phases.value[3].steps[2].status = 'passed'

  return { success: true, message: 'Tranches distributed' }
}

/**
 * Execute full CLO phase
 */
export async function executeCLOPhase(
  options: CLOOptions,
  config: CLODefinition = DEFAULT_CLO_CONFIG
): Promise<ActionResult> {
  const { log } = options

  log('Phase 4: Collateral Bundle & CLO', 'phase')

  // Step 1: Bundle collateral
  const bundleResult = await bundleCollateral(options)
  if (!bundleResult.success) {
    return bundleResult
  }

  // Step 2: Deploy CLO
  const deployResult = await deployCLO(options, config)
  if (!deployResult.success) {
    return deployResult
  }

  // Step 3: Distribute tranches
  const distributeResult = await distributeTranches(options)
  if (!distributeResult.success) {
    return distributeResult
  }

  return { success: true, message: 'CLO phase complete' }
}
