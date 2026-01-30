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
  executeRunContractsPhase,
  executeCLOPhase,
  executePaymentsPhase,
  type SetupOptions,
  type TokenizationOptions,
  type LoanOptions,
  type CLOOptions,
  type PaymentOptions,
  DEFAULT_LOAN_DEFINITIONS,
} from './actions'
import { advanceEmulatorTime } from '@/services/api'

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
    mode,
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
    mode,
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
  // Phase 4: Run Contracts (Accept, Pay, Complete, Collect)
  // ========================================
  // Create time advancement function for emulator mode
  const advanceTime = mode === 'emulator'
    ? async (period: number) => {
        try {
          // Advance emulator by 1 month per timing period (30 days * 24 hours * 60 minutes)
          const slots = period * 30 * 24 * 60 // ~1 month in slots (1 slot per minute)
          await advanceEmulatorTime(slots)
          log(`  ⏱ Emulator time advanced to period ${period}`, 'info')
        } catch (err) {
          log(`  ⚠ Failed to advance time: ${(err as Error).message}`, 'warning')
        }
      }
    : undefined

  result = await runPhase(3, 'Run Contracts', async () => {
    return executeRunContractsPhase(loanOpts, advanceTime)
  }, options)

  if (!result.success) {
    log(`  Warning: Some contract actions failed: ${result.message}`, 'warning')
  }

  if (await checkBreakpoint(5, 'Run Contracts', options)) return

  // ========================================
  // Phase 5: CLO Bundle & Distribution
  // ========================================
  result = await runPhase(4, 'Collateral Bundle & CLO', async () => {
    return executeCLOPhase(cloOpts)
  }, options)

  if (!result.success) {
    finalizePipeline(options, false)
    return
  }

  if (await checkBreakpoint(6, 'CLO Bundle & Distribution', options)) return

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
              mode: options.mode,
              identities,
              phases: options.phases,
              currentStepName,
              log,
            })
          )
          step.status = result.success ? 'passed' : 'failed'
          return result
        }
        if (step.action === 'fund-wallets') {
          const result = await import('./actions/setup').then(m =>
            m.fundWallets({
              mode: options.mode,
              identities,
              phases: options.phases,
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
            // Capture txHash from result data
            if (result.data?.txHash) {
              step.txHash = result.data.txHash
            }
            return result
          }
        }
        break

      case 3:
        // Loan creation phase
        if ('loanIndex' in step) {
          // Create a single loan using the loan definition from config
          const loanIndex = step.loanIndex as number
          const result = await import('./actions/loans').then(m =>
            m.createLoan(
              {
                borrowerId: step.borrowerId || null,
                originatorId: step.originatorId,
                asset: step.asset,
                qty: step.qty || 1,
                principal: step.principal || 500,
                apr: step.apr || 5,
                termLength: step.termLength || '12 months',
                reservedBuyer: !!step.borrowerId,
              },
              {
                mode: options.mode,
                identities,
                phases: options.phases,
                currentStepName,
                log,
                loanContracts,
                testRunId: options.testRunId || { value: null } as any,
              },
              loanIndex
            )
          )
          step.status = result.success ? 'passed' : 'failed'
          if (result.data?.txHash) {
            step.txHash = result.data.txHash
          }
          return result
        }
        log(`  Manual loan creation: step missing loanIndex`, 'warning')
        step.status = 'failed'
        return { success: false, message: 'Step missing loanIndex' }

      case 4:
        // Run Contracts phase (accept, pay, complete, collect)
        if ('actionType' in step && 'loanIndex' in step) {
          const actionType = step.actionType as string
          const loanIndex = step.loanIndex as number
          const loan = loanContracts.value.find(l => l.loanIndex === loanIndex)

          if (!loan) {
            log(`  Loan with index ${loanIndex} not found - run phase 3 first`, 'warning')
            step.status = 'failed'
            return { success: false, message: `Loan index ${loanIndex} not found` }
          }

          if (actionType === 'accept') {
            // Find the buyer for this loan
            const buyerId = step.borrowerId || loan.borrower
            const buyer = identities.value.find(i => i.id === buyerId || i.name === buyerId)
            if (!buyer) {
              log(`  Buyer not found for loan acceptance`, 'warning')
              step.status = 'failed'
              return { success: false, message: 'Buyer not found' }
            }
            const result = await import('./actions/loans').then(m =>
              m.acceptLoan(loan.id, buyer.id, {
                mode: options.mode,
                identities,
                phases: options.phases,
                currentStepName,
                log,
                loanContracts,
                testRunId: options.testRunId || { value: null } as any,
              })
            )
            step.status = result.success ? 'passed' : 'failed'
            if (result.data?.txHash) {
              step.txHash = result.data.txHash
            }
            return result
          }

          if (actionType === 'pay') {
            const amount = step.amount || 100 // Default payment in ADA
            const result = await import('./actions/loans').then(m =>
              m.makePayment(loan.id, amount, {
                mode: options.mode,
                identities,
                phases: options.phases,
                currentStepName,
                log,
                loanContracts,
                testRunId: options.testRunId || { value: null } as any,
              })
            )
            step.status = result.success ? 'passed' : 'failed'
            if (result.data?.txHash) {
              step.txHash = result.data.txHash
            }
            return result
          }

          if (actionType === 'collect') {
            const result = await import('./actions/loans').then(m =>
              m.collectPayment(loan.id, loan.state?.balance || 0, {
                mode: options.mode,
                identities,
                phases: options.phases,
                currentStepName,
                log,
                loanContracts,
                testRunId: options.testRunId || { value: null } as any,
              })
            )
            step.status = result.success ? 'passed' : 'failed'
            if (result.data?.txHash) {
              step.txHash = result.data.txHash
            }
            return result
          }

          log(`  Action type '${actionType}' not implemented yet`, 'warning')
          step.status = 'pending'
          return { success: false, message: `Action '${actionType}' not implemented` }
        }
        log(`  Manual contract step: missing actionType or loanIndex`, 'warning')
        step.status = 'failed'
        return { success: false, message: 'Step missing actionType or loanIndex' }

      case 5:
        // CLO Bundle & Distribution phase
        log(`  Manual CLO step not implemented yet`, 'warning')
        step.status = 'pending'
        return { success: false, message: 'CLO steps not implemented yet' }
    }

    // No handler matched - this is an error, don't mark as passed
    log(`  Step handler not found for phase ${phase.id}, action: ${step.action || 'unknown'}`, 'warning')
    step.status = 'failed'
    return { success: false, message: `No handler for step in phase ${phase.id}` }
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
  // Check for explicit action/actionType first
  if (step?.action) {
    const actionMap: Record<string, string> = {
      'create-wallets': 'Create',
      'fund-wallets': 'Fund',
      'mint-credentials': 'Mint',
      'mint': 'Mint',
      'init': 'Initialize',
      'update': 'Update',
      'cancel': 'Cancel',
      'accept': 'Accept',
      'pay': 'Pay',
      'complete': 'Complete',
      'collect': 'Collect',
      'default': 'Default',
      'bundle': 'Bundle',
      'deploy': 'Deploy',
      'distribute': 'Distribute',
    }
    if (actionMap[step.action]) return actionMap[step.action]
  }
  // Fallback to phase-based
  switch (phaseId) {
    case 1: return 'Setup'
    case 2: return 'Mint'
    case 3: return 'Initialize'
    case 4: return 'Run'
    case 5: return 'CLO'
    default: return 'Run'
  }
}

/**
 * Get CSS class for step action button
 */
export function getStepActionClass(phaseId: number, step?: any): string {
  // Check for explicit action/actionType first
  if (step?.action) {
    const classMap: Record<string, string> = {
      'create-wallets': 'create',
      'fund-wallets': 'fund',
      'mint-credentials': 'mint',
      'mint': 'mint',
      'init': 'init',
      'update': 'update',
      'cancel': 'cancel',
      'accept': 'accept',
      'pay': 'pay',
      'complete': 'complete',
      'collect': 'collect',
      'default': 'default',
      'bundle': 'clo',
      'deploy': 'clo',
      'distribute': 'clo',
    }
    if (classMap[step.action]) return classMap[step.action]
  }
  // Fallback to phase-based
  switch (phaseId) {
    case 1: return 'fund'
    case 2: return 'mint'
    case 3: return 'init'
    case 4: return 'pay'
    case 5: return 'clo'
    default: return 'default'
  }
}

/**
 * Get display entity name for a step
 */
export function getStepEntity(step: any, identities: Identity[]): string {
  // Handle wallet list steps (Phase 1)
  if ('wallets' in step && Array.isArray(step.wallets)) {
    const count = step.wallets.length
    const roles = [...new Set(step.wallets.map((w: any) => w.role))]
    return `${count} wallets (${roles.join(', ')})`
  }

  // Handle loan action steps (Phase 4 - Run Contracts)
  if (step.actionType && step.contractRef) {
    const borrowerName = step.borrowerName || 'Open Market'
    const amount = step.amount ? ` (${step.amount.toFixed(2)} ADA)` : ''
    const late = step.isLate ? ' [Late]' : ''
    const reject = step.expectedResult === 'rejection' ? ' [Reject]' : ''

    switch (step.actionType) {
      case 'accept':
        return `${borrowerName} → ${step.asset}${amount}${reject}`
      case 'pay':
        return `${borrowerName} → ${step.contractRef}${amount}${late}`
      case 'complete':
        return `${borrowerName} ← ${step.asset} (ownership transfer)`
      case 'collect':
        return `${step.originatorName || 'Originator'} collects from ${step.contractRef}`
      case 'default':
        return `${step.originatorName || 'Originator'} claims default on ${step.contractRef}`
      case 'update':
        return `${step.originatorName || 'Originator'} updates ${step.contractRef}`
      case 'cancel':
        return `${step.originatorName || 'Originator'} cancels ${step.contractRef}`
    }
  }

  // Handle init steps (Phase 3)
  if (step.actionType === 'init' || step.action === 'init') {
    const lifecycleLabel = step.lifecycleCase ? ` [${step.lifecycleCase}]` : ''
    return `${step.originatorName || 'Originator'} → ${step.asset}${lifecycleLabel}`
  }

  // Handle target ID based steps
  if ('targetId' in step) {
    const identity = identities.find(i => i.id === step.targetId)
    return identity?.name || step.name
  }

  // Handle asset tokenization steps (Phase 2)
  if ('asset' in step && !('borrowerId' in step) && !step.actionType) {
    return `${step.asset} tokens`
  }

  // Legacy: borrowerId + asset (old loan creation format)
  if ('borrowerId' in step && 'asset' in step && !step.actionType) {
    const borrower = identities.find(i => i.id === step.borrowerId)
    const marketType = step.reservedBuyer ? '(Reserved)' : '(Open)'
    return `${borrower?.name || 'Open Market'} ← ${step.asset} ${marketType}`
  }

  // Legacy: borrowerId + amount (old payment format)
  if ('borrowerId' in step && 'amount' in step && !step.actionType) {
    const borrower = identities.find(i => i.id === step.borrowerId)
    return `${borrower?.name || ''} (${step.amount} ADA)`
  }

  return step.name?.replace('Bundle ', '').replace('Deploy ', '').replace('Distribute ', '').replace('Initialize: ', '').replace('Accept: ', '').replace('Pay: ', '') || 'Step'
}
