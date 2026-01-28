/**
 * Pipeline Runner
 * CI/CD-style pipeline execution engine for financial contract lifecycle tests
 */

import type { Ref } from 'vue'
import type {
  TestNetwork,
  Identity,
  Phase,
  LogFunction,
  LoanContract,
  CLOContract,
  PipelineState,
  ActionResult,
} from './types'
import * as ctx from './context'
import {
  executeSetupPhase,
  executeTokenizationPhase,
  executeLoanPhase,
  executeAcceptPhase,
  executeCLOPhase,
  executePaymentsPhase,
  type SetupOptions,
  type TokenizationOptions,
  type LoanOptions,
  type CLOOptions,
  type PaymentOptions,
  DEFAULT_LOAN_DEFINITIONS,
} from './actions'

/**
 * Delay utility
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Pipeline execution options
 */
export interface PipelineOptions {
  mode: TestNetwork
  identities: Ref<Identity[]>
  phases: Ref<Phase[]>
  isRunning: Ref<boolean>
  currentPhase: Ref<number>
  currentStepName: Ref<string>
  log: LogFunction
  stats: Ref<{ passed: number; failed: number }>
  loanContracts: Ref<LoanContract[]>
  cloContracts: Ref<CLOContract[]>
  breakpointPhase?: Ref<number | null>
  testRunId: Ref<number | null>
  onPhaseComplete?: () => Promise<void>
}

/**
 * Run a single phase with status tracking
 */
export async function runPhase(
  index: number,
  phaseName: string,
  fn: () => Promise<ActionResult>,
  options: PipelineOptions
): Promise<ActionResult> {
  const { currentPhase, phases, log } = options

  currentPhase.value = index + 1
  phases.value[index].status = 'running'

  log(`\nPhase ${index + 1}: ${phaseName}`, 'phase')
  log('─'.repeat(40))

  try {
    const result = await fn()

    if (result.success) {
      phases.value[index].status = 'passed'
      options.stats.value.passed++
    } else {
      phases.value[index].status = 'failed'
      options.stats.value.failed++
    }

    return result
  } catch (err) {
    phases.value[index].status = 'failed'
    options.stats.value.failed++
    const error = err as Error
    log(`  Phase failed: ${error.message}`, 'error')
    return { success: false, message: error.message, error }
  }
}

/**
 * Check for breakpoint and pause if needed
 */
export async function checkBreakpoint(
  phaseNumber: number,
  phaseName: string,
  options: PipelineOptions
): Promise<boolean> {
  const { breakpointPhase, log, isRunning, currentStepName, onPhaseComplete } = options

  if (onPhaseComplete) {
    await onPhaseComplete()
  }

  if (breakpointPhase?.value === phaseNumber) {
    log(`\n⏸ Breakpoint reached after ${phaseName}`, 'phase')
    isRunning.value = false
    currentStepName.value = 'Paused at breakpoint'
    return true // Should stop
  }

  return false // Continue
}

/**
 * Main pipeline execution
 */
export async function runPipeline(options: PipelineOptions): Promise<void> {
  const {
    mode,
    identities,
    phases,
    isRunning,
    currentPhase,
    currentStepName,
    log,
    stats,
    loanContracts,
    cloContracts,
    testRunId,
  } = options

  isRunning.value = true
  currentPhase.value = 1

  // Reset states
  identities.value.forEach(id => {
    if (id.wallets[0]) {
      id.wallets[0].balance = 0n
      id.wallets[0].assets = []
    }
  })
  phases.value.forEach(p => {
    p.status = 'pending'
    p.steps.forEach((s: { status: string }) => (s.status = 'pending'))
  })
  loanContracts.value = []
  cloContracts.value = []

  // Reset context time
  ctx.resetTime()

  log('═'.repeat(50))
  log(`PIPELINE START: ${mode.toUpperCase()} MODE`, 'phase')
  log(`Time: ${new Date().toLocaleTimeString()}`)
  log('═'.repeat(50))

  // Build shared options for actions
  const setupOpts: SetupOptions = {
    mode,
    identities,
    phases,
    currentStepName,
    log,
  }

  const tokenOpts: TokenizationOptions = {
    identities,
    phases,
    currentStepName,
    log,
  }

  const loanOpts: LoanOptions = {
    mode,
    identities,
    phases,
    currentStepName,
    log,
    loanContracts,
    testRunId,
  }

  const cloOpts: CLOOptions = {
    mode,
    identities,
    phases,
    currentStepName,
    log,
    loanContracts,
    cloContracts,
    testRunId,
  }

  const paymentOpts: PaymentOptions = {
    identities,
    phases,
    currentStepName,
    log,
    loanContracts,
    cloContracts,
  }

  // ========================================
  // Phase 1: Setup & Identities
  // ========================================
  let result = await runPhase(0, 'Setup & Identities', async () => {
    return executeSetupPhase(setupOpts)
  }, options)

  if (!result.success) {
    finalizePipeline(options, false)
    return
  }

  if (await checkBreakpoint(2, 'Setup & Identities', options)) return

  // ========================================
  // Phase 2: Asset Tokenization
  // ========================================
  result = await runPhase(1, 'Asset Tokenization', async () => {
    return executeTokenizationPhase(tokenOpts)
  }, options)

  if (!result.success) {
    finalizePipeline(options, false)
    return
  }

  if (await checkBreakpoint(3, 'Asset Tokenization', options)) return

  // ========================================
  // Phase 3: Initialize Loan Contracts
  // ========================================
  result = await runPhase(2, 'Initialize Loan Contracts', async () => {
    return executeLoanPhase(loanOpts, DEFAULT_LOAN_DEFINITIONS)
  }, options)

  if (!result.success) {
    finalizePipeline(options, false)
    return
  }

  if (await checkBreakpoint(4, 'Initialize Loan Contracts', options)) return

  // ========================================
  // Phase 3.5: Accept Loans (new phase)
  // ========================================
  // Note: This could be a separate phase or combined
  log('\n── Loan Acceptance Phase ──', 'phase')
  result = await executeAcceptPhase(loanOpts)

  if (!result.success) {
    log(`  Warning: Some loans not accepted: ${result.message}`, 'warning')
  }

  if (await checkBreakpoint(5, 'Loan Acceptance', options)) return

  // ========================================
  // Phase 4: CLO Bundle & Distribution
  // ========================================
  result = await runPhase(3, 'Collateral Bundle & CLO', async () => {
    return executeCLOPhase(cloOpts)
  }, options)

  if (!result.success) {
    finalizePipeline(options, false)
    return
  }

  if (await checkBreakpoint(6, 'CLO Bundle & Distribution', options)) return

  // ========================================
  // Phase 5: Payment Processing (optional)
  // ========================================
  // Only run if not paused at breakpoint
  if (phases.value.length > 4) {
    result = await runPhase(4, 'Payment Processing', async () => {
      return executePaymentsPhase(paymentOpts)
    }, options)
  }

  // Finalize
  finalizePipeline(options, true)
}

/**
 * Finalize pipeline execution
 */
function finalizePipeline(options: PipelineOptions, success: boolean): void {
  const { mode, log, stats, isRunning, currentStepName, onPhaseComplete } = options

  if (onPhaseComplete) {
    onPhaseComplete()
  }

  log('\n' + '═'.repeat(50))
  log(`PIPELINE ${success ? 'COMPLETE' : 'FAILED'} (${mode.toUpperCase()} MODE)`, 'phase')
  log(`Passed: ${stats.value.passed} | Failed: ${stats.value.failed}`, success ? 'success' : 'error')
  log(`Time: ${new Date().toLocaleTimeString()}`)
  log('═'.repeat(50))

  isRunning.value = false
  currentStepName.value = success ? 'Complete' : 'Failed'
}

/**
 * Execute a single step (for manual step-by-step execution)
 */
export async function executeStep(
  phase: Phase,
  step: any,
  options: PipelineOptions
): Promise<ActionResult> {
  const { identities, isRunning, currentStepName, log, loanContracts, cloContracts } = options

  isRunning.value = true
  step.status = 'running'
  phase.status = 'running'
  currentStepName.value = step.name

  try {
    // Delegate to appropriate action based on phase
    switch (phase.id) {
      case 1:
        // Setup phase
        if (step.action === 'create-wallets') {
          const result = await import('./actions/setup').then(m =>
            m.createWallets({
              mode: 'emulator',
              identities,
              phases: { value: [phase] } as any,
              currentStepName,
              log,
            })
          )
          step.status = result.success ? 'passed' : 'failed'
          return result
        }
        break

      case 2:
        // Tokenization phase
        if ('originatorId' in step) {
          const orig = identities.value.find(i => i.id === step.originatorId)
          if (orig) {
            const result = await import('./actions/tokenization').then(m =>
              m.mintAsset(orig, step, {
                identities,
                phases: { value: [phase] } as any,
                currentStepName,
                log,
              })
            )
            step.status = result.success ? 'passed' : 'failed'
            return result
          }
        }
        break

      case 3:
        // Loan creation phase
        if ('borrowerId' in step && 'originatorId' in step) {
          // This would create a single loan
          log(`  Manual loan creation not implemented`, 'warning')
        }
        break

      case 4:
        // CLO phase
        log(`  Manual CLO step not implemented`, 'warning')
        break

      case 5:
        // Payment phase
        if ('borrowerId' in step && 'amount' in step) {
          const result = await import('./actions/payments').then(m =>
            m.processPayment({
              borrowerId: step.borrowerId,
              amount: step.amount,
              installmentNumber: step.installmentNumber || 1,
            }, {
              identities,
              phases: { value: [phase] } as any,
              currentStepName,
              log,
              loanContracts,
              cloContracts,
            })
          )
          step.status = result.success ? 'passed' : 'failed'
          return result
        }
        break
    }

    step.status = 'passed'
    return { success: true, message: 'Step completed' }
  } catch (err) {
    step.status = 'failed'
    phase.status = 'failed'
    const error = err as Error
    log(`  Step failed: ${error.message}`, 'error')
    return { success: false, message: error.message, error }
  } finally {
    isRunning.value = false
    currentStepName.value = ''

    // Check if all steps in phase are complete
    const allStepsPassed = phase.steps.every((s: { status: string }) => s.status === 'passed')
    if (allStepsPassed) {
      phase.status = 'passed'
    }
  }
}

/**
 * Execute an entire phase (for manual phase-by-phase execution)
 */
export async function executePhase(phase: Phase, options: PipelineOptions): Promise<ActionResult> {
  const { log } = options

  log(`Starting Phase: ${phase.name}`, 'phase')

  for (const step of phase.steps) {
    // Skip disabled steps
    if (step.disabled || step.status === 'disabled') {
      log(`  Skipping disabled step: ${step.name}`, 'info')
      continue
    }

    if (step.status === 'pending') {
      const result = await executeStep(phase, step, options)
      if (!result.success) {
        return result
      }
      await delay(100)
    }
  }

  log(`Completed Phase: ${phase.name}`, 'success')
  return { success: true, message: `Phase ${phase.name} complete` }
}

/**
 * Get action label for a step
 */
export function getStepAction(phaseId: number, step?: any): string {
  if (phaseId === 1 && step?.action) {
    if (step.action === 'create-wallets') return 'Create'
    if (step.action === 'fund-wallets') return 'Fund'
    if (step.action === 'mint-credentials') return 'Mint'
  }
  switch (phaseId) {
    case 1: return 'Setup'
    case 2: return 'Mint'
    case 3: return 'Create'
    case 4: return 'Accept'
    case 5: return 'CLO'
    case 6: return 'Pay'
    default: return 'Run'
  }
}

/**
 * Get CSS class for step action button
 */
export function getStepActionClass(phaseId: number, step?: any): string {
  if (phaseId === 1 && step?.action) {
    if (step.action === 'create-wallets') return 'create'
    if (step.action === 'fund-wallets') return 'fund'
    if (step.action === 'mint-credentials') return 'mint'
  }
  switch (phaseId) {
    case 1: return 'fund'
    case 2: return 'mint'
    case 3: return 'loan'
    case 4: return 'accept'
    case 5: return 'clo'
    case 6: return 'payment'
    default: return 'default'
  }
}

/**
 * Get display entity name for a step
 */
export function getStepEntity(step: any, identities: Identity[]): string {
  if ('wallets' in step && Array.isArray(step.wallets)) {
    const count = step.wallets.length
    const roles = [...new Set(step.wallets.map((w: any) => w.role))]
    return `${count} wallets (${roles.join(', ')})`
  }
  if ('targetId' in step) {
    const identity = identities.find(i => i.id === step.targetId)
    return identity?.name || step.name
  }
  if ('asset' in step && !('borrowerId' in step)) {
    return `${step.asset} tokens`
  }
  if ('borrowerId' in step && 'asset' in step) {
    const borrower = identities.find(i => i.id === step.borrowerId)
    const marketType = step.reservedBuyer ? '(Reserved)' : '(Open)'
    return `${borrower?.name || 'Open Market'} ← ${step.asset} ${marketType}`
  }
  if ('borrowerId' in step && 'amount' in step) {
    const borrower = identities.find(i => i.id === step.borrowerId)
    return `${borrower?.name || ''} (${step.amount} ADA)`
  }
  return step.name?.replace('Bundle ', '').replace('Deploy ', '').replace('Distribute ', '') || 'Step'
}
