/**
 * Payment Actions
 * Loan payment processing and distribution
 */

import type { Ref } from 'vue'
import type { Identity, Phase, LogFunction, ActionResult, LoanContract, CLOContract } from '../types'
import { delay } from '../runner'

export interface PaymentOptions {
  mode?: 'emulator' | 'preview' | 'preprod'
  identities: Ref<Identity[]>
  phases: Ref<Phase[]>
  currentStepName: Ref<string>
  log: LogFunction
  loanContracts: Ref<LoanContract[]>
  cloContracts: Ref<CLOContract[]>
}

export interface PaymentSchedule {
  borrowerId: string
  amount: number // in ADA
  installmentNumber: number
}

/**
 * Process a single payment
 */
export async function processPayment(
  schedule: PaymentSchedule,
  options: PaymentOptions
): Promise<ActionResult> {
  const { identities, phases, currentStepName, log, loanContracts } = options

  const borrower = identities.value.find(i => i.id === schedule.borrowerId)
  if (!borrower) {
    return { success: false, message: `Borrower ${schedule.borrowerId} not found` }
  }

  // Find the borrower's active loan
  const loan = loanContracts.value.find(
    l => l.borrower === borrower.name && l.state?.isActive
  )

  if (!loan) {
    return { success: false, message: `No active loan found for ${borrower.name}` }
  }

  currentStepName.value = `${borrower.name}: Payment #${schedule.installmentNumber} (${schedule.amount} ADA)`
  log(`  ${borrower.name}: Making payment #${schedule.installmentNumber} of ${schedule.amount} ADA...`, 'info')

  await delay(400)

  const paymentLovelace = BigInt(schedule.amount * 1_000_000)

  // Check balance
  if (borrower.wallets[0].balance < paymentLovelace) {
    const has = Number(borrower.wallets[0].balance) / 1_000_000
    log(`  Insufficient balance: has ${has.toFixed(2)} ADA, needs ${schedule.amount} ADA`, 'error')
    return { success: false, message: 'Insufficient balance' }
  }

  // Deduct from borrower
  borrower.wallets[0].balance -= paymentLovelace

  // Update loan state
  if (loan.state) {
    loan.state.balance -= schedule.amount * 1_000_000

    if (loan.state.balance <= 0) {
      loan.state.isPaidOff = true
      loan.state.isActive = false
      loan.status = 'passed'
      log(`  Loan fully paid off!`, 'success')
    }
  }

  log(`  Payment of ${schedule.amount} ADA processed`, 'success')

  // Update step status
  const step = phases.value[4]?.steps.find(
    (s: any) => s.borrowerId === schedule.borrowerId && s.installmentNumber === schedule.installmentNumber
  )
  if (step) step.status = 'passed'

  return { success: true, message: `Payment processed for ${borrower.name}` }
}

/**
 * Distribute payments to CLO tranches (waterfall)
 */
export async function distributePaymentsToCLO(
  totalPayment: number, // in ADA
  options: PaymentOptions
): Promise<ActionResult> {
  const { identities, currentStepName, log, cloContracts } = options

  const clo = cloContracts.value[0]
  if (!clo) {
    return { success: false, message: 'No CLO contract found' }
  }

  currentStepName.value = 'Distributing payments to CLO tranches'
  log(`  Waterfall distribution of ${totalPayment} ADA`, 'info')

  await delay(300)

  // Waterfall: Senior first, then Mezzanine, then Junior
  let remaining = totalPayment * 1_000_000 // Convert to lovelace

  for (const tranche of clo.tranches) {
    const investorId = {
      'Senior': 'inv-1',
      'Mezzanine': 'inv-2',
      'Junior': 'inv-3',
    }[tranche.name]

    const investor = identities.value.find(i => i.id === investorId)
    if (!investor) continue

    // Calculate tranche's share
    const trancheShare = Math.floor((totalPayment * 1_000_000 * tranche.allocation) / 100)
    const actualPayment = Math.min(trancheShare, remaining)

    if (actualPayment > 0) {
      investor.wallets[0].balance += BigInt(actualPayment)
      remaining -= actualPayment
      log(`    ${tranche.name}: ${(actualPayment / 1_000_000).toFixed(2)} ADA to ${investor.name}`, 'info')
    }
  }

  log(`  Waterfall distribution complete`, 'success')

  return { success: true, message: 'Payments distributed to CLO' }
}

/**
 * Execute a full payment cycle for all active loans
 */
export async function executePaymentCycle(
  installmentNumber: number,
  options: PaymentOptions
): Promise<ActionResult> {
  const { log, loanContracts, identities } = options

  log(`Payment Cycle: Installment #${installmentNumber}`, 'phase')

  const activeLoans = loanContracts.value.filter(l => l.state?.isActive && !l.state?.isPaidOff)

  if (activeLoans.length === 0) {
    log('  No active loans to process', 'info')
    return { success: true, message: 'No active loans' }
  }

  let totalCollected = 0

  for (const loan of activeLoans) {
    if (!loan.borrower) continue

    const borrower = identities.value.find(i => i.name === loan.borrower)
    if (!borrower) continue

    // Calculate payment amount
    const installments = parseInt(loan.termLength) || 12
    const principal = loan.principal / installments
    const interest = (loan.principal * (loan.apr / 100)) / 12
    const payment = Math.ceil((principal + interest) / 1_000_000) // Convert to ADA

    const result = await processPayment({
      borrowerId: borrower.id,
      amount: payment,
      installmentNumber,
    }, options)

    if (result.success) {
      totalCollected += payment
    }
  }

  // Distribute to CLO if active
  if (options.cloContracts.value.length > 0 && totalCollected > 0) {
    await distributePaymentsToCLO(totalCollected, options)
  }

  log(`  Total collected: ${totalCollected} ADA`, 'success')

  return { success: true, message: `Payment cycle ${installmentNumber} complete` }
}

/**
 * Execute full payments phase
 *
 * EMULATOR: Processes mock payments and distributions
 * PREVIEW: FAILS with clear message about what's needed
 */
export async function executePaymentsPhase(options: PaymentOptions): Promise<ActionResult> {
  const { mode = 'emulator', log } = options

  log('Phase 5: Payment Processing', 'phase')

  if (mode === 'preview') {
    // Preview mode - explain what's needed
    log(``, 'info')
    log(`  PREVIEW MODE - Payment Processing Not Implemented`, 'error')
    log(`  ─────────────────────────────────────────`, 'info')
    log(`  Real payment processing on Preview testnet requires:`, 'info')
    log(`  1. Active loan contracts on-chain`, 'info')
    log(`  2. pay action from loan-contract package`, 'info')
    log(`  3. Wallet with sufficient ADA`, 'info')
    log(`  4. Signed transactions via Lucid Evolution`, 'info')
    log(``, 'info')
    log(`  This functionality is not yet wired up.`, 'warning')
    log(`  Use EMULATOR mode for full pipeline testing.`, 'info')

    return {
      success: false,
      message: 'Payment processing on Preview testnet not yet implemented. Use Emulator mode.',
    }
  }

  // Emulator mode - process mock payments
  // Process 3 payment cycles as demonstration
  for (let i = 1; i <= 3; i++) {
    const result = await executePaymentCycle(i, options)
    if (!result.success) {
      return result
    }
    await delay(200)
  }

  return { success: true, message: 'Payment phase complete' }
}
