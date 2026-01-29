/**
 * Loan Actions
 * Loan contract creation, acceptance, and payment operations
 */

import type { Ref } from 'vue'
import type { Identity, Phase, LogFunction, ActionResult, LoanContract } from '../types'
import { delay } from '../runner'
import { createContractRecord, updateContractState } from '@/services/api'

export interface LoanDefinition {
  borrowerId: string | null // null = open to market
  originatorId: string
  asset: string
  qty: number
  principal: number // in ADA
  apr: number
  termLength: string
  reservedBuyer: boolean // true = reserved for borrowerId, false = open market
}

export interface LoanOptions {
  mode: 'emulator' | 'preview'
  identities: Ref<Identity[]>
  phases: Ref<Phase[]>
  currentStepName: Ref<string>
  log: LogFunction
  loanContracts: Ref<LoanContract[]>
  testRunId: Ref<number | null>
}

/**
 * Default loan definitions with mix of reserved and open buyers
 */
export const DEFAULT_LOAN_DEFINITIONS: LoanDefinition[] = [
  // Reserved buyer loans - buyer must accept
  { borrowerId: 'bor-alice', originatorId: 'orig-jewelry', asset: 'Diamond', qty: 2, principal: 500, apr: 6, termLength: '12 months', reservedBuyer: true },
  { borrowerId: 'bor-cardanoair', originatorId: 'orig-airplane', asset: 'Airplane', qty: 5, principal: 2000, apr: 4, termLength: '60 months', reservedBuyer: true },
  { borrowerId: 'bor-officeop', originatorId: 'orig-realestate', asset: 'RealEstate', qty: 5, principal: 500, apr: 5, termLength: '24 months', reservedBuyer: true },

  // Open market loans - any buyer can accept
  { borrowerId: null, originatorId: 'orig-airplane', asset: 'Airplane', qty: 5, principal: 2000, apr: 4.5, termLength: '60 months', reservedBuyer: false },
  { borrowerId: null, originatorId: 'orig-realestate', asset: 'RealEstate', qty: 5, principal: 500, apr: 5.5, termLength: '24 months', reservedBuyer: false },
  { borrowerId: null, originatorId: 'orig-yacht', asset: 'Boat', qty: 3, principal: 800, apr: 7, termLength: '36 months', reservedBuyer: false },
]

/**
 * Create a single loan contract
 *
 * EMULATOR MODE: Creates mock loan contract in local state
 * PREVIEW MODE: FAILS - Real loan creation requires loan-contract actions
 */
export async function createLoan(
  loan: LoanDefinition,
  options: LoanOptions
): Promise<ActionResult> {
  const { mode, identities, phases, currentStepName, log, loanContracts, testRunId } = options

  const originator = identities.value.find(i => i.id === loan.originatorId)
  if (!originator) {
    return { success: false, message: `Originator ${loan.originatorId} not found` }
  }

  const borrower = loan.borrowerId
    ? identities.value.find(i => i.id === loan.borrowerId)
    : null

  const borrowerName = borrower?.name || 'Open Market'
  const marketType = loan.reservedBuyer ? 'Reserved' : 'Open'

  currentStepName.value = `Loan: ${borrowerName} - ${loan.qty} ${loan.asset} from ${originator.name}`

  // PREVIEW MODE - Cannot create contracts without real integration
  if (mode === 'preview') {
    log(`  Cannot create loan contract on Preview testnet`, 'error')
    log(`    Loan: ${loan.qty} ${loan.asset} @ ${loan.principal} ADA`, 'info')
    log(`    Originator: ${originator.name} (${originator.address})`, 'info')
    log(`    Buyer: ${borrowerName}`, 'info')
    log(``, 'info')
    log(`  Real loan creation requires:`, 'info')
    log(`  1. send_to_market action from loan-contract package`, 'info')
    log(`  2. Collateral token locked at contract address`, 'info')
    log(`  3. Signed transaction via Lucid Evolution`, 'info')
    return {
      success: false,
      message: `Cannot create loan on Preview testnet - contract integration not implemented`,
    }
  }

  // EMULATOR MODE - Mock contract creation
  log(`  Creating ${marketType} Loan: ${loan.qty} ${loan.asset} @ ${loan.principal} ADA`, 'info')
  log(`    Originator: ${originator.name}`, 'info')
  log(`    Buyer: ${borrowerName}${loan.reservedBuyer ? ' (Reserved)' : ' (Open to anyone)'}`, 'info')

  await delay(300)

  // Transfer asset from originator (escrow into contract)
  const origAsset = originator.wallets[0].assets.find(a => a.assetName === loan.asset)
  if (origAsset) {
    origAsset.quantity -= BigInt(loan.qty)
    if (origAsset.quantity <= 0n) {
      originator.wallets[0].assets = originator.wallets[0].assets.filter(a => a.assetName !== loan.asset)
    }
  }

  // Create loan contract record
  const contractId = `LOAN-${loan.originatorId}-${loan.asset}-${Date.now()}`
  const loanContract: LoanContract = {
    id: contractId,
    alias: loan.reservedBuyer
      ? `${borrowerName} - ${loan.asset} Loan`
      : `Open Market - ${loan.asset} Loan`,
    subtype: loan.reservedBuyer ? 'Reserved' : 'Open-Market',
    collateral: {
      quantity: loan.qty,
      assetName: loan.asset,
      policyId: 'policy_' + loan.asset.toLowerCase(),
    },
    principal: loan.principal * 1_000_000, // Convert to lovelace
    apr: loan.apr,
    termLength: loan.termLength,
    status: 'pending', // Waiting for Accept action
    borrower: borrower?.name || null,
    originator: originator.name,
    state: {
      balance: loan.principal * 1_000_000,
      isActive: false, // Not active until accepted
      isPaidOff: false,
    }
  }

  loanContracts.value.push(loanContract)

  // Save to database
  if (testRunId.value) {
    try {
      const dbContract = await createContractRecord({
        testRunId: testRunId.value,
        contractType: 'Transfer',
        contractSubtype: loanContract.subtype,
        alias: loanContract.alias,
        contractData: {
          collateral: loanContract.collateral,
          principal: loanContract.principal,
          apr: loanContract.apr,
          termLength: loanContract.termLength,
          borrower: loanContract.borrower,
          originator: loanContract.originator,
          reservedBuyer: loan.reservedBuyer,
        },
        contractDatum: loanContract.state,
        policyId: 'policy_' + loan.asset.toLowerCase(),
        networkId: mode === 'emulator' ? 0 : 1,
      })
      // Store the database processId for later updates
      loanContract.id = dbContract.processId
      log(`  Contract saved to DB: ${dbContract.processId}`, 'info')
    } catch (err) {
      log(`  Warning: Could not save contract to DB: ${(err as Error).message}`, 'error')
    }
  }

  log(`  Collateral escrowed, awaiting Accept`, 'success')

  // Update step status
  const step = phases.value[2].steps.find((s: any) =>
    s.borrowerId === loan.borrowerId || (s.asset === loan.asset && !s.borrowerId)
  )
  if (step) step.status = 'passed'

  return { success: true, message: `Loan created: ${contractId}`, data: loanContract }
}

/**
 * Accept a loan contract (buyer makes first payment)
 */
export async function acceptLoan(
  loanId: string,
  buyerId: string,
  options: LoanOptions
): Promise<ActionResult> {
  const { identities, currentStepName, log, loanContracts } = options

  const loan = loanContracts.value.find(l => l.id === loanId)
  if (!loan) {
    return { success: false, message: `Loan ${loanId} not found` }
  }

  const buyer = identities.value.find(i => i.id === buyerId)
  if (!buyer) {
    return { success: false, message: `Buyer ${buyerId} not found` }
  }

  // Check if loan is reserved for a different buyer
  if (loan.borrower && loan.borrower !== buyer.name) {
    return { success: false, message: `Loan is reserved for ${loan.borrower}, not ${buyer.name}` }
  }

  currentStepName.value = `${buyer.name}: Accepting loan ${loanId}`
  log(`  ${buyer.name}: Accepting loan for ${loan.collateral.assetName}...`, 'info')

  await delay(400)

  // Calculate first payment (principal / installments + interest)
  const installments = parseInt(loan.termLength) || 12
  const monthlyPayment = Math.ceil(loan.principal / installments)
  const interestPayment = Math.ceil((loan.principal * (loan.apr / 100)) / 12)
  const firstPayment = monthlyPayment + interestPayment

  // Deduct from buyer's wallet
  if (buyer.wallets[0]) {
    const paymentLovelace = BigInt(firstPayment)
    if (buyer.wallets[0].balance < paymentLovelace) {
      log(`  Insufficient balance: ${buyer.name} needs ${firstPayment / 1_000_000} ADA`, 'error')
      return { success: false, message: 'Insufficient balance for first payment' }
    }
    buyer.wallets[0].balance -= paymentLovelace
  }

  // Update loan state
  loan.borrower = buyer.name
  loan.status = 'running'
  if (loan.state) {
    loan.state.isActive = true
    loan.state.balance -= firstPayment
    loan.state.startTime = Date.now()
    loan.state.paymentCount = 1 // First payment made on accept
  }

  log(`  First payment of ${(firstPayment / 1_000_000).toFixed(2)} ADA processed`, 'success')
  log(`  Loan now active. Remaining: ${((loan.state?.balance || 0) / 1_000_000).toFixed(2)} ADA`, 'info')

  // Persist state to database
  try {
    await updateContractState(loan.id, {
      contractData: {
        borrower: buyer.name
      },
      contractDatum: {
        balance: loan.state?.balance,
        isActive: loan.state?.isActive,
        isPaidOff: loan.state?.isPaidOff || false,
        isDefaulted: loan.state?.isDefaulted || false,
        startTime: loan.state?.startTime,
        paymentCount: loan.state?.paymentCount
      }
    })
    log(`  Contract state persisted to DB`, 'info')
  } catch (err) {
    log(`  Warning: Could not persist state: ${(err as Error).message}`, 'error')
  }

  return { success: true, message: `Loan accepted by ${buyer.name}`, data: loan }
}

/**
 * Make a payment on a loan
 */
export async function makePayment(
  loanId: string,
  amount: number, // in ADA
  options: LoanOptions
): Promise<ActionResult> {
  const { identities, currentStepName, log, loanContracts } = options

  const loan = loanContracts.value.find(l => l.id === loanId)
  if (!loan) {
    return { success: false, message: `Loan ${loanId} not found` }
  }

  if (!loan.borrower) {
    return { success: false, message: 'Loan has no borrower - accept loan first' }
  }

  const borrower = identities.value.find(i => i.name === loan.borrower)
  if (!borrower) {
    return { success: false, message: `Borrower ${loan.borrower} not found` }
  }

  currentStepName.value = `${borrower.name}: Making payment of ${amount} ADA`
  log(`  ${borrower.name}: Making payment of ${amount} ADA...`, 'info')

  await delay(400)

  const paymentLovelace = BigInt(amount * 1_000_000)

  // Check balance
  if (borrower.wallets[0] && borrower.wallets[0].balance < paymentLovelace) {
    log(`  Insufficient balance: has ${Number(borrower.wallets[0].balance) / 1_000_000} ADA`, 'error')
    return { success: false, message: 'Insufficient balance' }
  }

  // Deduct from borrower
  if (borrower.wallets[0]) {
    borrower.wallets[0].balance -= paymentLovelace
  }

  // Update loan state
  if (loan.state) {
    loan.state.balance -= amount * 1_000_000
    if (loan.state.balance <= 0) {
      loan.state.isPaidOff = true
      loan.state.isActive = false
      loan.status = 'passed'
      log(`  Loan fully paid off!`, 'success')
    }
  }

  log(`  Payment of ${amount} ADA processed for ${borrower.name}`, 'success')

  return { success: true, message: `Payment of ${amount} ADA processed` }
}

/**
 * Execute full loan creation phase
 *
 * EMULATOR: Creates mock loan contracts
 * PREVIEW: FAILS with clear message about what's needed
 */
export async function executeLoanPhase(
  options: LoanOptions,
  loanDefs: LoanDefinition[] = DEFAULT_LOAN_DEFINITIONS
): Promise<ActionResult> {
  const { mode, log } = options

  log('Phase 3: Initialize Loan Contracts', 'phase')

  if (mode === 'preview') {
    // Preview mode - explain what's needed
    log(``, 'info')
    log(`  PREVIEW MODE - Loan Contract Creation Not Implemented`, 'error')
    log(`  ─────────────────────────────────────────`, 'info')
    log(`  Real loan contract creation on Preview testnet requires:`, 'info')
    log(`  1. send_to_market action from loan-contract package`, 'info')
    log(`  2. Collateral tokens minted and available`, 'info')
    log(`  3. Contract validator script deployed`, 'info')
    log(`  4. Signed transactions via Lucid Evolution`, 'info')
    log(``, 'info')
    log(`  This functionality is not yet wired up.`, 'warning')
    log(`  Use EMULATOR mode for full pipeline testing.`, 'info')

    return {
      success: false,
      message: 'Loan contract creation on Preview testnet not yet implemented. Use Emulator mode.',
    }
  }

  // Emulator mode - proceed with mock creation
  for (const loan of loanDefs) {
    const result = await createLoan(loan, options)
    if (!result.success) {
      return result
    }
  }

  return { success: true, message: 'Loan contracts created' }
}

/**
 * Execute accept phase for all pending loans
 */
export async function executeAcceptPhase(options: LoanOptions): Promise<ActionResult> {
  const { identities, loanContracts, log } = options

  log('Phase: Accept Loans', 'phase')

  // Get all pending loans
  const pendingLoans = loanContracts.value.filter(l => l.status === 'pending')

  if (pendingLoans.length === 0) {
    log('  No pending loans to accept', 'info')
    return { success: true, message: 'No pending loans' }
  }

  for (const loan of pendingLoans) {
    // For open market loans, pick an available buyer
    let buyerId: string

    if (loan.borrower) {
      // Reserved loan - find the buyer by name
      const buyer = identities.value.find(i => i.name === loan.borrower)
      if (!buyer) {
        log(`  Skipping ${loan.alias}: Reserved buyer ${loan.borrower} not found`, 'warning')
        continue
      }
      buyerId = buyer.id
    } else {
      // Open market loan - find an available buyer
      const availableBuyers = identities.value.filter(i =>
        i.role === 'Borrower' &&
        !loanContracts.value.some(l => l.borrower === i.name && l.status === 'running')
      )

      if (availableBuyers.length === 0) {
        log(`  No available buyers for open market loan ${loan.alias}`, 'warning')
        continue
      }

      // Pick first available buyer
      buyerId = availableBuyers[0].id
    }

    const result = await acceptLoan(loan.id, buyerId, options)
    if (!result.success) {
      log(`  Failed to accept loan: ${result.message}`, 'error')
    }
  }

  return { success: true, message: 'Loan acceptance phase complete' }
}
