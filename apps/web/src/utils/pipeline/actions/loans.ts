/**
 * Loan Actions
 * Loan contract creation, acceptance, and payment operations
 *
 * Calls backend /api/loan/* endpoints which use Lucid Evolution for real transactions.
 * In emulator mode, transactions are submitted to the Lucid emulator.
 * In preview/preprod mode, transactions are submitted to the actual testnet.
 */

import type { Ref } from 'vue'
import type { Identity, Phase, LogFunction, ActionResult, LoanContract } from '../types'
import {
  createContractRecord,
  updateContractState,
  createLoan as apiCreateLoan,
  acceptLoan as apiAcceptLoan,
  makeLoanPayment as apiMakeLoanPayment,
  collectLoanPayment as apiCollectPayment,
  completeLoanTransfer as apiCompleteLoan,
  cancelLoanContract as apiCancelLoan,
  claimLoanDefault as apiClaimDefault,
  updateLoanTerms as apiUpdateTerms,
  refreshWalletState,
} from '@/services/api'

export interface LoanDefinition {
  borrowerId: string | null // null = open to market
  originatorId: string
  asset: string
  qty: number
  principal: number // in ADA
  apr: number
  frequency?: number // Payment periods per year (12=Monthly, 4=Quarterly, etc.)
  termLength: string
  reservedBuyer: boolean // true = reserved for borrowerId, false = open market
  // Fee configuration
  transferFeeBuyerPercent?: number // Buyer's share of transfer fee (0-100), default 50
  lateFee?: number // Late payment fee in ADA, default 10
  deferFee?: boolean // Defer seller fee until end of loan, default false
}

/**
 * Calculate transfer fee based on contract requirements
 * Contract requires: 1% of principal, minimum 5 ADA, maximum 25,000 ADA
 *
 * @param principalAda - Principal amount in ADA
 * @param buyerPercent - Buyer's share of the fee (0-100)
 * @returns Object with buyer and seller fees in lovelace
 */
function calculateTransferFees(
  principalAda: number,
  buyerPercent: number = 50
): { buyer: number; seller: number } {
  // Calculate 1% of principal
  const onePercent = principalAda * 0.01

  // Apply min (5 ADA) and max (25,000 ADA) constraints
  const totalFeeAda = Math.max(5, Math.min(25000, onePercent))

  // Convert to lovelace
  const totalFeeLovelace = totalFeeAda * 1_000_000

  // Split according to buyerPercent
  const buyerFee = Math.floor((totalFeeLovelace * buyerPercent) / 100)
  const sellerFee = totalFeeLovelace - buyerFee

  return { buyer: buyerFee, seller: sellerFee }
}

export interface LoanOptions {
  mode: 'emulator' | 'preview' | 'preprod'
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
 * Calls backend /api/loan/create which uses Lucid Evolution to build real transactions.
 * The backend creates the contract UTxO, mints the CollateralToken, and returns txHash.
 *
 * @param loan - Loan definition
 * @param options - Pipeline options
 * @param loanIndex - Index of this loan in the config (for step status matching)
 */
export async function createLoan(
  loan: LoanDefinition,
  options: LoanOptions,
  loanIndex?: number
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
  log(`  Creating ${marketType} Loan: ${loan.qty} ${loan.asset} @ ${loan.principal} ADA`, 'info')
  log(`    Originator: ${originator.name}`, 'info')
  log(`    Buyer: ${borrowerName}${loan.reservedBuyer ? ' (Reserved)' : ' (Open to anyone)'}`, 'info')

  // Find the asset in originator's wallet to get the real policyId
  const origAsset = originator.wallets[0].assets.find(a => a.assetName === loan.asset)
  if (!origAsset) {
    log(`  ✗ Asset ${loan.asset} not found in ${originator.name}'s wallet`, 'error')
    return { success: false, message: `Asset ${loan.asset} not found in wallet` }
  }

  try {
    // Calculate installments from term length
    const termMonths = parseInt(loan.termLength) || 12

    // Calculate transfer fees based on contract requirements (1% of principal, min 5 ADA, max 25k ADA)
    const buyerPercent = loan.transferFeeBuyerPercent ?? 50
    const transferFees = calculateTransferFees(loan.principal, buyerPercent)
    const lateFee = loan.lateFee ?? 10 // Default 10 ADA late fee
    const frequency = loan.frequency ?? 12 // Default monthly payments
    const deferFee = loan.deferFee ?? false

    log(`    Transfer fees: Buyer ${transferFees.buyer / 1_000_000} ADA, Seller ${transferFees.seller / 1_000_000} ADA (${buyerPercent}/${100 - buyerPercent} split)`, 'info')

    // Call backend API to create loan contract via Lucid Evolution
    const result = await apiCreateLoan({
      sellerWalletName: originator.name,
      asset: {
        policyId: origAsset.policyId,
        assetName: loan.asset,
        quantity: loan.qty,
      },
      terms: {
        principal: loan.principal, // in ADA
        apr: Math.round(loan.apr * 100), // convert to basis points
        frequency,
        installments: termMonths,
        lateFee, // in ADA
        transferFeeSeller: transferFees.seller, // in lovelace
        transferFeeBuyer: transferFees.buyer, // in lovelace
      },
      buyerAddress: borrower?.address,
      deferFee,
    })

    if (!result.success) {
      log(`  ✗ Failed to create loan: ${result.error || 'Unknown error'}`, 'error')
      // Update step status in phase 3 to failed
      const phase3 = phases.value.find(p => p.id === 3)
      if (phase3) {
        const step = phase3.steps.find((s: any) =>
          loanIndex !== undefined
            ? s.loanIndex === loanIndex
            : s.originatorId === loan.originatorId && s.asset === loan.asset
        )
        if (step) step.status = 'failed'
      }
      return { success: false, message: result.error || 'Failed to create loan' }
    }

    // Refresh originator wallet from emulator to get real ADA + token balances
    // The on-chain TX already:
    // 1. Transferred the base asset to the contract
    // 2. Minted the collateral token to the originator
    await refreshWalletState(originator, log)
    log(`  ✓ Originator wallet refreshed - base asset locked, collateral token received`, 'success')

    // Create loan contract record for UI
    // Use processId from backend - the backend already created the DB record with full datum
    const loanContract: LoanContract = {
      id: result.processId || result.contractAddress || `LOAN-${loan.asset}-${Date.now()}`,
      alias: loan.reservedBuyer
        ? `${borrowerName} - ${loan.asset} Loan`
        : `Open Market - ${loan.asset} Loan`,
      subtype: loan.reservedBuyer ? 'Reserved' : 'Open-Market',
      collateral: {
        quantity: loan.qty,
        assetName: loan.asset,
        policyId: result.policyId || origAsset.policyId,
      },
      principal: loan.principal * 1_000_000, // Convert to lovelace
      principalAda: loan.principal, // Store original ADA value for update actions
      apr: loan.apr,
      frequency, // Store frequency for update actions
      termLength: loan.termLength,
      installments: termMonths,
      lateFee, // Store late fee for update actions
      deferFee, // Store defer fee setting
      status: 'pending', // Waiting for Accept action
      borrower: borrower?.name || null,
      originator: originator.name,
      contractAddress: result.contractAddress,
      txHash: result.txHash,
      loanIndex, // Store for step matching in phase 4
      state: {
        balance: loan.principal * 1_000_000,
        isActive: false, // Not active until accepted
        isPaidOff: false,
      }
    }

    loanContracts.value.push(loanContract)

    log(`  ✓ Loan contract created`, 'success')
    log(`    TX: ${result.txHash}`, 'info')
    log(`    Contract: ${result.contractAddress}`, 'info')
    log(`    Policy: ${result.policyId}`, 'info')
    log(`    Process ID: ${result.processId}`, 'info')

    // Link to test run if applicable (backend already created the record with full datum)
    if (testRunId.value && result.processId) {
      try {
        // Update the existing contract record with testRunId and additional data
        await updateContractState(result.processId, {
          testRunId: testRunId.value,
          contractData: {
            borrower: loanContract.borrower,
            originator: loanContract.originator,
            reservedBuyer: loan.reservedBuyer,
          }
        })
      } catch (err) {
        log(`  Warning: Could not update test DB: ${(err as Error).message}`, 'warning')
      }
    }

    // Update step status in phase 3 (Initialize Loan Contracts)
    const phase3 = phases.value.find(p => p.id === 3)
    if (phase3) {
      // Match by loanIndex if provided, otherwise match by originatorId + asset
      const step = phase3.steps.find((s: any) =>
        loanIndex !== undefined
          ? s.loanIndex === loanIndex
          : s.originatorId === loan.originatorId && s.asset === loan.asset
      )
      if (step) step.status = 'passed'
    }

    return {
      success: true,
      message: `Loan created: ${result.contractAddress}`,
      data: {
        loanContract,
        txHash: result.txHash,
        contractAddress: result.contractAddress,
        policyId: result.policyId,
      }
    }
  } catch (err) {
    const error = err as Error
    log(`  ✗ Failed to create loan: ${error.message}`, 'error')
    // Update step status in phase 3 to failed
    const phase3 = phases.value.find(p => p.id === 3)
    if (phase3) {
      const step = phase3.steps.find((s: any) =>
        loanIndex !== undefined
          ? s.loanIndex === loanIndex
          : s.originatorId === loan.originatorId && s.asset === loan.asset
      )
      if (step) step.status = 'failed'
    }
    return { success: false, message: error.message, error }
  }
}

/**
 * Accept a loan contract (buyer makes first payment)
 *
 * Calls backend /api/loan/accept which uses Lucid Evolution to build the accept transaction.
 * The buyer's wallet signs the transaction and makes the initial payment.
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

  // Need contract address for backend call
  const contractAddress = loan.contractAddress || loan.id
  if (!contractAddress || contractAddress.startsWith('LOAN-')) {
    log(`  ✗ No contract address found for loan ${loanId}`, 'error')
    return { success: false, message: 'Contract address not available' }
  }

  // Calculate first payment (principal / installments + interest)
  const installments = parseInt(loan.termLength) || 12
  const monthlyPayment = Math.ceil(loan.principal / installments)
  const interestPayment = Math.ceil((loan.principal * (loan.apr / 100)) / 12)
  const firstPaymentLovelace = monthlyPayment + interestPayment
  const firstPaymentAda = firstPaymentLovelace / 1_000_000

  currentStepName.value = `${buyer.name}: Accepting loan for ${loan.collateral.assetName}`
  log(`  ${buyer.name}: Accepting loan for ${loan.collateral.assetName}...`, 'info')
  log(`    Initial payment: ${firstPaymentAda.toFixed(2)} ADA`, 'info')

  try {
    // Call backend API to accept loan via Lucid Evolution
    const result = await apiAcceptLoan(buyer.name, contractAddress, firstPaymentAda)

    if (!result.success) {
      log(`  ✗ Failed to accept loan: ${result.error || 'Unknown error'}`, 'error')
      // Update step status in phase 4 to failed
      const phase4 = options.phases.value.find(p => p.id === 4)
      if (phase4) {
        const step = phase4.steps.find((s: any) =>
          s.actionType === 'accept' && s.loanIndex === (loan.loanIndex ?? -1)
        )
        if (step) step.status = 'failed'
      }
      return { success: false, message: result.error || 'Failed to accept loan' }
    }

    // Update loan state (these are contract state values, not wallet values)
    loan.borrower = buyer.name
    loan.status = 'running'
    loan.txHash = result.txHash
    if (loan.state) {
      loan.state.isActive = true
      loan.state.balance -= firstPaymentLovelace
      loan.state.startTime = Date.now()
      loan.state.paymentCount = 1 // First payment made on accept
    }

    // Refresh wallet states from emulator to get real ADA + token balances
    // The on-chain TX already:
    // 1. Deducted the payment from buyer's ADA
    // 2. Minted the liability token to the buyer
    await refreshWalletState(buyer, log)
    log(`  ✓ Buyer wallet refreshed - payment deducted, liability token received`, 'success')
    const seller = identities.value.find(i => i.name === loan.originator)
    if (seller) {
      await refreshWalletState(seller, log)
      log(`  ✓ Seller wallet refreshed`, 'success')
    }

    log(`  ✓ Loan accepted by ${buyer.name}`, 'success')
    log(`    TX: ${result.txHash}`, 'info')
    log(`    First payment: ${firstPaymentAda.toFixed(2)} ADA`, 'info')
    log(`    Remaining balance: ${((loan.state?.balance || 0) / 1_000_000).toFixed(2)} ADA`, 'info')

    // Update step status in phase 4 (Run Contracts)
    const phase4 = options.phases.value.find(p => p.id === 4)
    if (phase4) {
      const step = phase4.steps.find((s: any) =>
        s.actionType === 'accept' && s.loanIndex === loan.loanIndex
      )
      if (step) step.status = 'passed'
    }

    // Persist state to test run database with status code 4 (Active)
    try {
      await updateContractState(loan.id, {
        statusCode: 4, // Active - contract is now being serviced
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
    } catch (err) {
      log(`  Warning: Could not persist state: ${(err as Error).message}`, 'warning')
    }

    return {
      success: true,
      message: `Loan accepted by ${buyer.name}`,
      data: { loan, txHash: result.txHash }
    }
  } catch (err) {
    const error = err as Error
    log(`  ✗ Failed to accept loan: ${error.message}`, 'error')
    return { success: false, message: error.message, error }
  }
}

/**
 * Make a payment on a loan
 *
 * Calls backend /api/loan/pay which uses Lucid Evolution to build the payment transaction.
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

  // Check if loan has been accepted - borrower is set during Accept
  if (!loan.borrower) {
    return { success: false, message: 'Loan has no borrower - accept loan first' }
  }

  // Check if loan is active (Accept must have run successfully)
  if (loan.state && !loan.state.isActive) {
    return { success: false, message: 'Loan is not active - cannot make payment' }
  }

  const borrower = identities.value.find(i => i.name === loan.borrower)
  if (!borrower) {
    return { success: false, message: `Borrower ${loan.borrower} not found` }
  }

  // Need contract address for backend call
  const contractAddress = loan.contractAddress || loan.id
  if (!contractAddress || contractAddress.startsWith('LOAN-')) {
    log(`  ✗ No contract address found for loan ${loanId}`, 'error')
    return { success: false, message: 'Contract address not available' }
  }

  currentStepName.value = `${borrower.name}: Making payment of ${amount} ADA`
  log(`  ${borrower.name}: Making payment of ${amount} ADA...`, 'info')

  // Round to avoid floating point issues when converting to BigInt
  const paymentLovelace = BigInt(Math.round(amount * 1_000_000))

  // Check balance locally first
  if (borrower.wallets[0] && borrower.wallets[0].balance < paymentLovelace) {
    log(`  ✗ Insufficient balance: has ${Number(borrower.wallets[0].balance) / 1_000_000} ADA`, 'error')
    return { success: false, message: 'Insufficient balance' }
  }

  try {
    // Call backend API to make payment via Lucid Evolution
    const result = await apiMakeLoanPayment(borrower.name, contractAddress, amount)

    if (!result.success) {
      log(`  ✗ Failed to make payment: ${result.error || 'Unknown error'}`, 'error')
      // Update step status in phase 4 to failed
      const paymentNumber = (loan.state?.paymentCount || 0) + 1
      const phase4 = options.phases.value.find(p => p.id === 4)
      if (phase4) {
        const step = phase4.steps.find((s: any) =>
          s.actionType === 'pay' &&
          s.loanIndex === loan.loanIndex &&
          s.id.endsWith(`-pay-${paymentNumber}`)
        )
        if (step) step.status = 'failed'
      }
      return { success: false, message: result.error || 'Failed to make payment' }
    }

    // Refresh borrower wallet from emulator to get real ADA balance
    await refreshWalletState(borrower, log)

    // Update loan state
    if (loan.state) {
      loan.state.balance -= amount * 1_000_000
      loan.state.paymentCount = (loan.state.paymentCount || 0) + 1

      if (loan.state.balance <= 0) {
        loan.state.isPaidOff = true
        loan.state.isActive = false
        loan.status = 'passed'
        log(`  ✓ Loan fully paid off!`, 'success')
      }
    }

    log(`  ✓ Payment of ${amount} ADA processed`, 'success')
    log(`    TX: ${result.txHash}`, 'info')
    log(`    Remaining balance: ${((loan.state?.balance || 0) / 1_000_000).toFixed(2)} ADA`, 'info')
    log(`    Payment #${loan.state?.paymentCount || 1} complete`, 'info')

    // Update step status in phase 4 (Run Contracts)
    // Payment steps have IDs like `{loanIndex}-pay-{paymentNumber}`
    const paymentNumber = loan.state?.paymentCount || 1
    const phase4 = options.phases.value.find(p => p.id === 4)
    if (phase4) {
      const step = phase4.steps.find((s: any) =>
        s.actionType === 'pay' &&
        s.loanIndex === loan.loanIndex &&
        s.id.endsWith(`-pay-${paymentNumber}`)
      )
      if (step) step.status = 'passed'
    }

    // Persist state to test run database after each payment
    try {
      await updateContractState(loan.id, {
        contractDatum: {
          balance: loan.state?.balance,
          isActive: loan.state?.isActive,
          isPaidOff: loan.state?.isPaidOff || false,
          isDefaulted: loan.state?.isDefaulted || false,
          startTime: loan.state?.startTime,
          paymentCount: loan.state?.paymentCount,
          lastPayment: {
            amount: amount * 1_000_000,
            time: Date.now()
          }
        }
      })
    } catch (err) {
      log(`  Warning: Could not persist payment state: ${(err as Error).message}`, 'warning')
    }

    return {
      success: true,
      message: `Payment of ${amount} ADA processed`,
      data: { txHash: result.txHash }
    }
  } catch (err) {
    const error = err as Error
    log(`  ✗ Failed to make payment: ${error.message}`, 'error')
    // Update step status in phase 4 to failed
    const paymentNumber = (loan.state?.paymentCount || 0) + 1
    const phase4 = options.phases.value.find(p => p.id === 4)
    if (phase4) {
      const step = phase4.steps.find((s: any) =>
        s.actionType === 'pay' &&
        s.loanIndex === loan.loanIndex &&
        s.id.endsWith(`-pay-${paymentNumber}`)
      )
      if (step) step.status = 'failed'
    }
    return { success: false, message: error.message, error }
  }
}

/**
 * Execute full loan creation phase
 *
 * Calls backend /api/loan/create for each loan definition.
 * Works in both emulator and testnet modes.
 */
export async function executeLoanPhase(
  options: LoanOptions,
  loanDefs: LoanDefinition[] = DEFAULT_LOAN_DEFINITIONS
): Promise<ActionResult> {
  const { mode, log } = options

  log('Phase 3: Initialize Loan Contracts', 'phase')
  log(`  Mode: ${mode}`, 'info')
  log(`  Creating ${loanDefs.length} loan contracts...`, 'info')

  let successCount = 0
  let failCount = 0

  for (let i = 0; i < loanDefs.length; i++) {
    const loan = loanDefs[i]
    const result = await createLoan(loan, options, i)
    if (result.success) {
      successCount++
    } else {
      failCount++
      log(`  Continuing with remaining loans...`, 'info')
    }
  }

  if (failCount > 0 && successCount === 0) {
    return { success: false, message: `All ${failCount} loan creations failed` }
  }

  log(`  Loan creation complete: ${successCount} succeeded, ${failCount} failed`, successCount > 0 ? 'success' : 'warning')
  return { success: true, message: `Loan contracts created (${successCount}/${successCount + failCount})` }
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

/**
 * Execute Phase 4: Run Contracts
 *
 * Iterates through Phase 4 steps (accept, pay, complete, collect) in order.
 * Steps are sorted by timing period, so we execute them in the correct order.
 * Supports emulator time advancement between timing periods.
 */
export async function executeRunContractsPhase(
  options: LoanOptions,
  advanceTime?: (period: number) => Promise<void>
): Promise<ActionResult> {
  const { identities, phases, loanContracts, log, currentStepName } = options

  log('Phase 4: Run Contracts', 'phase')

  const phase4 = phases.value.find(p => p.id === 4)
  if (!phase4) {
    return { success: false, message: 'Phase 4 not found' }
  }

  const steps = phase4.steps
  if (steps.length === 0) {
    log('  No contract actions to execute', 'info')
    return { success: true, message: 'No contract actions' }
  }

  let successCount = 0
  let failCount = 0
  let currentTimingPeriod = -999

  for (const step of steps) {
    // Skip disabled steps
    if (step.disabled || step.status === 'disabled') {
      continue
    }

    // Advance emulator time if timing period changed
    if (advanceTime && step.timingPeriod !== currentTimingPeriod) {
      if (currentTimingPeriod !== -999) {
        log(`  ⏱ Advancing time to period T+${step.timingPeriod}`, 'info')
        await advanceTime(step.timingPeriod)
      }
      currentTimingPeriod = step.timingPeriod
    }

    step.status = 'running'
    currentStepName.value = step.name

    const loan = loanContracts.value.find(l => l.loanIndex === step.loanIndex)
    if (!loan) {
      log(`  ⚠ Loan with index ${step.loanIndex} not found, skipping ${step.name}`, 'warning')
      step.status = 'failed'
      failCount++
      continue
    }

    let result: ActionResult

    switch (step.actionType) {
      case 'accept': {
        // Find the buyer - check step's borrowerId first (UI config), then fall back to loan's borrower
        const buyerId = step.borrowerId || loan.borrower
        const buyer = identities.value.find(i => i.id === buyerId || i.name === buyerId)
        if (!buyer) {
          // Only skip open market loans if no buyer was assigned in the step config
          if (loan.subtype === 'Open-Market' && !step.borrowerId) {
            log(`  ⏸ ${step.name}: Open market loan - waiting for buyer assignment`, 'info')
            step.status = 'disabled'
            continue
          }
          log(`  ⚠ Buyer not found for ${step.name} (buyerId: ${buyerId})`, 'warning')
          step.status = 'failed'
          failCount++
          continue
        }
        result = await acceptLoan(loan.id, buyer.id, options)
        break
      }

      case 'pay': {
        const amount = step.amount || 100
        result = await makePayment(loan.id, amount, options)
        break
      }

      case 'collect': {
        // Collect amount is the accumulated payments in the contract (principal - remaining balance)
        // NOT the remaining balance (which is what the buyer still owes)
        const principal = loan.principal || 0
        const remainingBalance = Math.max(0, loan.state?.balance || 0) // Don't allow negative
        const collectAmount = step.amount || Math.max(0, principal - remainingBalance)

        if (collectAmount <= 0) {
          log(`  ⚠ No funds to collect (principal: ${principal / 1_000_000} ADA, balance: ${remainingBalance / 1_000_000} ADA)`, 'warning')
          result = { success: true, message: 'No funds to collect' }
        } else {
          result = await collectPayment(loan.id, collectAmount, options)
        }
        break
      }

      case 'complete': {
        // Complete transfers the base asset to the buyer (burns liability token)
        // This should only happen AFTER all payments are made (balance = 0).
        log(`  ${step.name}: Completing loan - transferring asset to buyer...`, 'info')

        // Verify the loan is actually paid off before completing
        if (loan.state && loan.state.balance > 0) {
          log(`  ⚠ Warning: Completing loan with remaining balance: ${(loan.state.balance / 1_000_000).toFixed(2)} ADA`, 'warning')
        }

        // Get borrower (who holds the liability token and will receive the base asset)
        const borrower = identities.value.find(i => i.name === loan.borrower)
        if (!borrower) {
          result = { success: false, message: `Borrower ${loan.borrower} not found` }
          break
        }

        // Need contract address for backend call
        const completeContractAddress = loan.contractAddress || loan.id
        if (!completeContractAddress || completeContractAddress.startsWith('LOAN-')) {
          log(`  ✗ No contract address found for loan ${loan.id}`, 'error')
          result = { success: false, message: 'Contract address not available' }
          break
        }

        try {
          const completeResult = await apiCompleteLoan(borrower.name, completeContractAddress)
          if (!completeResult.success) {
            log(`  ✗ Failed to complete: ${completeResult.error || 'Unknown error'}`, 'error')
            result = { success: false, message: completeResult.error || 'Failed to complete' }
            break
          }

          // Refresh wallet states from emulator to get real ADA + token balances
          // The on-chain TX already burned the liability token and transferred the base asset
          await refreshWalletState(borrower, log)
          log(`  ✓ Borrower wallet refreshed - liability token burned, base asset received`, 'success')

          // Also refresh seller wallet
          const completeSeller = identities.value.find(i => i.name === loan.originator)
          if (completeSeller) {
            await refreshWalletState(completeSeller, log)
            log(`  ✓ Seller wallet refreshed`, 'success')
          }

          loan.status = 'passed'
          if (loan.state) loan.state.isActive = false
          result = { success: true, message: 'Asset transferred to buyer', data: { txHash: completeResult.txHash } }
        } catch (err) {
          log(`  ✗ Failed to complete: ${(err as Error).message}`, 'error')
          result = { success: false, message: (err as Error).message }
        }
        break
      }

      case 'default': {
        // Claim default - seller burns collateral token, gets base asset back
        log(`  ${step.name}: Claiming default...`, 'info')

        // Get seller (who holds the collateral token and will receive the base asset)
        const defaultSeller = identities.value.find(i => i.name === loan.originator)
        if (!defaultSeller) {
          result = { success: false, message: `Seller ${loan.originator} not found` }
          break
        }

        const defaultContractAddress = loan.contractAddress || loan.id
        if (!defaultContractAddress || defaultContractAddress.startsWith('LOAN-')) {
          log(`  ✗ No contract address found for loan ${loan.id}`, 'error')
          result = { success: false, message: 'Contract address not available' }
          break
        }

        try {
          const defaultResult = await apiClaimDefault(defaultSeller.name, defaultContractAddress)
          if (!defaultResult.success) {
            log(`  ✗ Failed to claim default: ${defaultResult.error || 'Unknown error'}`, 'error')
            result = { success: false, message: defaultResult.error || 'Failed to claim default' }
            break
          }

          // Refresh wallet states from emulator to get real ADA + token balances
          // The on-chain TX already burned the collateral token and returned the base asset
          await refreshWalletState(defaultSeller, log)
          log(`  ✓ Seller wallet refreshed - collateral token burned, base asset returned`, 'success')

          // Also refresh borrower wallet if applicable
          const defaultBorrower = identities.value.find(i => i.name === loan.borrower)
          if (defaultBorrower) {
            await refreshWalletState(defaultBorrower, log)
            log(`  ✓ Borrower wallet refreshed`, 'success')
          }

          if (loan.state) {
            loan.state.isDefaulted = true
            loan.state.isActive = false
          }
          loan.status = 'failed'
          result = { success: true, message: 'Default claimed', data: { txHash: defaultResult.txHash } }
        } catch (err) {
          log(`  ✗ Failed to claim default: ${(err as Error).message}`, 'error')
          result = { success: false, message: (err as Error).message }
        }
        break
      }

      case 'cancel': {
        // Cancel loan - seller burns collateral token, gets base asset back
        log(`  ${step.name}: Canceling loan...`, 'info')

        // Get seller (who holds the collateral token and will receive the base asset)
        const cancelSeller = identities.value.find(i => i.name === loan.originator)
        if (!cancelSeller) {
          result = { success: false, message: `Seller ${loan.originator} not found` }
          break
        }

        const cancelContractAddress = loan.contractAddress || loan.id
        if (!cancelContractAddress || cancelContractAddress.startsWith('LOAN-')) {
          log(`  ✗ No contract address found for loan ${loan.id}`, 'error')
          result = { success: false, message: 'Contract address not available' }
          break
        }

        try {
          const cancelResult = await apiCancelLoan(cancelSeller.name, cancelContractAddress)
          if (!cancelResult.success) {
            log(`  ✗ Failed to cancel: ${cancelResult.error || 'Unknown error'}`, 'error')
            result = { success: false, message: cancelResult.error || 'Failed to cancel' }
            break
          }

          // Refresh wallet states from emulator to get real ADA + token balances
          // The on-chain TX already burned the collateral token and returned the base asset
          await refreshWalletState(cancelSeller, log)
          log(`  ✓ Seller wallet refreshed - collateral token burned, base asset returned`, 'success')

          // Also refresh borrower wallet if applicable
          const cancelBorrower = identities.value.find(i => i.name === loan.borrower)
          if (cancelBorrower) {
            await refreshWalletState(cancelBorrower, log)
            log(`  ✓ Borrower wallet refreshed`, 'success')
          }

          if (loan.state) {
            loan.state.isActive = false
            loan.state.isCancelled = true
          }
          loan.status = 'failed'
          result = { success: true, message: 'Loan canceled', data: { txHash: cancelResult.txHash } }
        } catch (err) {
          log(`  ✗ Failed to cancel: ${(err as Error).message}`, 'error')
          result = { success: false, message: (err as Error).message }
        }
        break
      }

      case 'update': {
        // Update loan terms - seller updates contract before buyer acceptance
        log(`  ${step.name}: Updating contract terms...`, 'info')

        const updateSeller = identities.value.find(i => i.name === loan.originator)
        if (!updateSeller) {
          result = { success: false, message: `Seller ${loan.originator} not found` }
          break
        }

        const updateContractAddress = loan.contractAddress || loan.id
        if (!updateContractAddress || updateContractAddress.startsWith('LOAN-')) {
          log(`  ✗ No contract address found for loan ${loan.id}`, 'error')
          result = { success: false, message: 'Contract address not available' }
          break
        }

        try {
          // Get update terms from the step if available (from LoanScheduleCard expansion panel)
          const updateTerms = step.updateTerms || {}

          // Build new terms, using step values or keeping current values
          // IMPORTANT: Use principalAda (not principal which is in lovelace) for fallback
          // Also use installments (number) not termLength (string)
          const newTerms = {
            principal: updateTerms.principal ?? loan.principalAda ?? (loan.principal / 1_000_000), // Convert back to ADA if needed
            apr: updateTerms.apr ?? loan.apr,
            frequency: updateTerms.frequency ?? loan.frequency ?? 12, // Default to monthly
            installments: updateTerms.installments ?? loan.installments ?? (parseInt(loan.termLength) || 12),
            lateFee: updateTerms.lateFee ?? loan.lateFee ?? 10, // Default 10 ADA
            buyerAddress: updateTerms.buyerReservation ?? null,
            deferFee: updateTerms.feeDeferment ?? loan.deferFee ?? false,
          }

          log(`    New terms: Principal=${newTerms.principal} ADA, APR=${newTerms.apr}%, Freq=${newTerms.frequency}, Term=${newTerms.installments} periods`, 'info')

          const updateResult = await apiUpdateTerms(updateSeller.name, updateContractAddress, newTerms)
          if (!updateResult.success) {
            log(`  ✗ Failed to update terms: ${updateResult.error || 'Unknown error'}`, 'error')
            result = { success: false, message: updateResult.error || 'Failed to update terms' }
            break
          }

          // Refresh wallet state after update
          await refreshWalletState(updateSeller, log)
          log(`  ✓ Seller wallet refreshed`, 'success')

          // Update local loan state with new terms
          if (newTerms.principal !== undefined) {
            loan.principal = newTerms.principal * 1_000_000 // Store in lovelace
            loan.principalAda = newTerms.principal // Also store ADA value
          }
          if (newTerms.apr !== undefined) loan.apr = newTerms.apr
          if (newTerms.frequency !== undefined) loan.frequency = newTerms.frequency
          if (newTerms.installments !== undefined) {
            loan.installments = newTerms.installments
            loan.termLength = `${newTerms.installments} periods`
          }
          if (newTerms.lateFee !== undefined) loan.lateFee = newTerms.lateFee
          if (newTerms.deferFee !== undefined) loan.deferFee = newTerms.deferFee

          log(`  ✓ Contract terms updated`, 'success')
          log(`    TX: ${updateResult.txHash}`, 'info')

          result = { success: true, message: 'Terms updated', data: { txHash: updateResult.txHash } }
        } catch (err) {
          log(`  ✗ Failed to update terms: ${(err as Error).message}`, 'error')
          result = { success: false, message: (err as Error).message }
        }
        break
      }

      default:
        log(`  Unknown action type: ${step.actionType}`, 'warning')
        step.status = 'failed'
        failCount++
        continue
    }

    if (result.success) {
      step.status = 'passed'
      if (result.data?.txHash) {
        step.txHash = result.data.txHash
      }
      successCount++
    } else {
      step.status = 'failed'
      failCount++
      log(`  ✗ ${step.name}: ${result.message}`, 'error')
    }
  }

  // Update phase status
  const allPassed = steps.every((s: any) => s.status === 'passed' || s.status === 'disabled')
  const anyFailed = steps.some((s: any) => s.status === 'failed')
  phase4.status = allPassed ? 'passed' : anyFailed ? 'failed' : 'pending'

  log(`  Run Contracts complete: ${successCount} succeeded, ${failCount} failed`, successCount > 0 ? 'success' : 'warning')
  return {
    success: failCount === 0,
    message: `Run Contracts phase complete (${successCount}/${successCount + failCount})`
  }
}

/**
 * Collect payment from a loan contract (seller collects accumulated payments)
 *
 * Calls backend /api/loan/collect which uses Lucid Evolution to build the collect transaction.
 */
export async function collectPayment(
  loanId: string,
  amount: number, // in lovelace
  options: LoanOptions
): Promise<ActionResult> {
  const { identities, currentStepName, log, loanContracts } = options

  const loan = loanContracts.value.find(l => l.id === loanId)
  if (!loan) {
    return { success: false, message: `Loan ${loanId} not found` }
  }

  const seller = identities.value.find(i => i.name === loan.originator)
  if (!seller) {
    return { success: false, message: `Seller ${loan.originator} not found` }
  }

  // Need contract address for backend call
  const contractAddress = loan.contractAddress || loan.id
  if (!contractAddress || contractAddress.startsWith('LOAN-')) {
    log(`  ✗ No contract address found for loan ${loanId}`, 'error')
    return { success: false, message: 'Contract address not available' }
  }

  const amountAda = amount / 1_000_000
  currentStepName.value = `${seller.name}: Collecting ${amountAda.toFixed(2)} ADA`
  log(`  ${seller.name}: Collecting ${amountAda.toFixed(2)} ADA from contract...`, 'info')

  try {
    // Call backend API to collect payment via Lucid Evolution
    const result = await apiCollectPayment(seller.name, contractAddress, amount)

    if (!result.success) {
      log(`  ✗ Failed to collect: ${result.error || 'Unknown error'}`, 'error')
      return { success: false, message: result.error || 'Failed to collect payment' }
    }

    // Refresh seller wallet from emulator to get real ADA balance
    await refreshWalletState(seller, log)

    // Also refresh borrower wallet if applicable
    const borrower = identities.value.find(i => i.name === loan.borrower)
    if (borrower) await refreshWalletState(borrower, log)

    log(`  ✓ Collected ${amountAda.toFixed(2)} ADA`, 'success')
    log(`    TX: ${result.txHash}`, 'info')

    return {
      success: true,
      message: `Collected ${amountAda.toFixed(2)} ADA`,
      data: { txHash: result.txHash }
    }
  } catch (err) {
    const error = err as Error
    log(`  ✗ Failed to collect: ${error.message}`, 'error')
    return { success: false, message: error.message, error }
  }
}
