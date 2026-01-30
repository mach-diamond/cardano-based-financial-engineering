/**
 * Loan Contract Service
 *
 * Uses the loan-contract SDK for all transaction building.
 * This service only handles:
 * - Emulator wallet selection
 * - Converting API types to SDK types
 * - DB state persistence
 */

import { getLucid, getEmulatorState, selectWallet } from './emulator.service'
import { fromText, toText, paymentCredentialOf } from '@lucid-evolution/lucid'
import * as contractDb from './contract.service'

// Import SDK actions and types from loan-contract package
import {
  send_to_market,
  accept,
  pay,
  collect,
} from '../../../../packages/loan-contract/src/actions/index'
import type {
  ContractStateInput,
  LoadedContract,
  InitUIData,
  AcceptUIData,
  PayUIData,
  CollectUIData,
} from '../../../../packages/loan-contract/src/types/index'
import {
  calculateNominalTermPayment,
  calculateInterest,
} from '../../../../packages/loan-contract/src/lib/index'

// =============================================================================
// API Types (for REST endpoints)
// =============================================================================

export interface LoanTerms {
  principal: number // in ADA
  apr: number // basis points (e.g., 500 = 5%)
  frequency: number // payments per year (12 = monthly)
  installments: number // total number of payments
  lateFee: number // in ADA
  transferFeeSeller: number // in lovelace
  transferFeeBuyer: number // in lovelace
}

export interface CreateLoanParams {
  sellerWalletName: string
  asset: {
    policyId: string
    assetName: string
    quantity: number
  }
  terms: LoanTerms
  buyerAddress?: string // null = open to market
  deferFee?: boolean
}

export interface AcceptLoanParams {
  buyerWalletName: string
  contractAddress: string
  initialPayment: number // in ADA
}

export interface MakePaymentParams {
  buyerWalletName: string
  contractAddress: string
  amount: number // in ADA
}

export interface CollectPaymentParams {
  sellerWalletName: string
  contractAddress: string
  amount: number // in lovelace
}

export interface LoanContractResult {
  txHash: string
  contractAddress?: string
  policyId?: string
}

export interface LoanContractState {
  address: string
  policyId: string
  buyer: string | null
  baseAsset: {
    policyId: string
    assetName: string
    quantity: number
  }
  terms: {
    principal: bigint
    apr: bigint
    frequency: bigint
    installments: bigint
    time: bigint | null
  }
  balance: bigint
  lastPayment: {
    amount: bigint
    time: bigint
  } | null
}

// =============================================================================
// Type Converters
// =============================================================================

/**
 * Convert API CreateLoanParams to SDK ContractStateInput
 */
function toContractStateInput(params: CreateLoanParams): ContractStateInput {
  return {
    buyer: params.buyerAddress
      ? paymentCredentialOf(params.buyerAddress).hash
      : null,
    base_asset: {
      policy: params.asset.policyId,
      asset_name: params.asset.assetName, // SDK handles fromText internally
      quantity: params.asset.quantity,
    },
    terms: {
      principal: params.terms.principal * 1_000_000, // ADA to lovelace
      apr: params.terms.apr,
      frequency: params.terms.frequency,
      installments: params.terms.installments,
      time: null, // Set on accept
      fees: {
        late_fee: params.terms.lateFee * 1_000_000,
        transfer_fee_seller: params.terms.transferFeeSeller,
        transfer_fee_buyer: params.terms.transferFeeBuyer,
        referral_fee: 0,
        referral_fee_addr: null,
      },
    },
    balance: params.terms.principal * 1_000_000,
    last_payment: null,
  }
}

/**
 * Convert SDK state to DB datum format
 */
function toDbDatum(
  state: ContractStateInput,
  extras: { isActive?: boolean; isPaidOff?: boolean; isDefaulted?: boolean } = {}
): contractDb.LoanContractDatum {
  return {
    buyer: state.buyer,
    baseAsset: {
      policyId: state.base_asset.policy,
      assetName:
        typeof state.base_asset.asset_name === 'string' &&
        state.base_asset.asset_name.match(/^[0-9a-fA-F]+$/)
          ? toText(state.base_asset.asset_name)
          : String(state.base_asset.asset_name),
      quantity: Number(state.base_asset.quantity),
    },
    terms: {
      principal: Number(state.terms.principal),
      apr: Number(state.terms.apr),
      frequency: Number(state.terms.frequency),
      installments: Number(state.terms.installments),
      time: state.terms.time ? Number(state.terms.time) : null,
      fees: {
        lateFee: Number(state.terms.fees.late_fee),
        transferFeeSeller: Number(state.terms.fees.transfer_fee_seller),
        transferFeeBuyer: Number(state.terms.fees.transfer_fee_buyer),
        referralFee: Number(state.terms.fees.referral_fee),
        referralFeeAddr: state.terms.fees.referral_fee_addr,
      },
    },
    balance: Number(state.balance),
    lastPayment: state.last_payment
      ? {
          amount: Number(state.last_payment.amount),
          time: Number(state.last_payment.time),
        }
      : null,
    isActive: extras.isActive ?? false,
    isPaidOff: extras.isPaidOff ?? false,
    isDefaulted: extras.isDefaulted ?? false,
  }
}

/**
 * Build LoadedContract from DB record for SDK actions
 */
function buildLoadedContract(contract: any): LoadedContract {
  const contractData = contract.contractData as {
    scriptCbor?: string
    scriptHash?: string
  } | null
  if (!contractData?.scriptCbor) {
    throw new Error('Contract script not found in database')
  }

  const datum = contract.contractDatum
  const baseAsset = datum.baseAsset || datum.base_asset
  const terms = datum.terms
  const lastPayment = datum.lastPayment || datum.last_payment

  return {
    script: {
      Validator: { type: 'PlutusV3', script: contractData.scriptCbor },
      hash: contract.policyId,
      address: contract.contractAddress,
    },
    state: {
      buyer: datum.buyer,
      base_asset: {
        policy: baseAsset.policyId || baseAsset.policy,
        asset_name: fromText(baseAsset.assetName || baseAsset.asset_name),
        quantity: BigInt(baseAsset.quantity),
      },
      terms: {
        principal: BigInt(terms.principal),
        apr: BigInt(terms.apr),
        frequency: BigInt(terms.frequency),
        installments: BigInt(terms.installments),
        time: terms.time ? BigInt(terms.time) : null,
        fees: {
          late_fee: BigInt(terms.fees?.lateFee || terms.fees?.late_fee || 0),
          transfer_fee_seller: BigInt(
            terms.fees?.transferFeeSeller || terms.fees?.transfer_fee_seller || 0
          ),
          transfer_fee_buyer: BigInt(
            terms.fees?.transferFeeBuyer || terms.fees?.transfer_fee_buyer || 0
          ),
          referral_fee: BigInt(
            terms.fees?.referralFee || terms.fees?.referral_fee || 0
          ),
          referral_fee_addr:
            terms.fees?.referralFeeAddr || terms.fees?.referral_fee_addr || null,
        },
      },
      balance: BigInt(datum.balance),
      last_payment: lastPayment
        ? {
            amount: BigInt(lastPayment.amount),
            time: BigInt(lastPayment.time),
          }
        : null,
    },
  }
}

// =============================================================================
// SDK Actions
// =============================================================================

/**
 * Create a new loan contract (seller lists asset)
 */
export async function createLoan(
  params: CreateLoanParams
): Promise<LoanContractResult> {
  const state = getEmulatorState()
  if (!state) throw new Error('Emulator not initialized')

  // Select seller wallet
  await selectWallet(params.sellerWalletName)
  const lucid = getLucid()
  if (!lucid) throw new Error('Lucid not available')

  const sellerAddress = await lucid.wallet().address()
  console.log(`[LoanService] Creating loan:`)
  console.log(`  Seller: ${params.sellerWalletName} (${sellerAddress})`)
  console.log(`  Asset: ${params.asset.assetName}`)
  console.log(`  Principal: ${params.terms.principal} ADA`)

  // Convert to SDK types
  const initState = toContractStateInput(params)
  const uiData: InitUIData = { deferFee: params.deferFee ?? false }

  // Call SDK action (isEmulator=true skips validity window)
  const result = await send_to_market(lucid, initState, uiData, true, {
    isEmulator: true,
  })

  // Advance emulator
  state.emulator.awaitBlock(1)

  // Persist to database with the parameterized script from SDK
  const dbDatum = toDbDatum(initState)
  const processId = await contractDb.createContract({
    sellerId: params.sellerWalletName,
    buyerId: params.buyerAddress ? 'reserved' : null,
    contractType: 'loan',
    policyId: result.policy_id,
    contractAddress: result.address,
    contractDatum: dbDatum,
    contractData: {
      scriptCbor: result.script?.script || '', // Use parameterized script from SDK
      scriptHash: result.policy_id,
    },
  })

  console.log(`[LoanService] Loan created: ${result.tx_id}`)
  console.log(`  Contract Address: ${result.address}`)
  console.log(`  Policy ID: ${result.policy_id}`)

  return {
    txHash: result.tx_id,
    contractAddress: result.address,
    policyId: result.policy_id,
  }
}

/**
 * Accept loan terms (buyer accepts and makes first payment)
 */
export async function acceptLoan(
  params: AcceptLoanParams
): Promise<LoanContractResult> {
  const emulatorState = getEmulatorState()
  if (!emulatorState) throw new Error('Emulator not initialized')

  await selectWallet(params.buyerWalletName)
  const lucid = getLucid()
  if (!lucid) throw new Error('Lucid not available')

  const buyerAddress = await lucid.wallet().address()
  const dbContract = await contractDb.getContractByAddress(params.contractAddress)

  if (!dbContract) {
    throw new Error(`Contract not found: ${params.contractAddress}`)
  }

  console.log(`[LoanService] Accepting loan:`)
  console.log(`  Buyer: ${params.buyerWalletName}`)
  console.log(`  Contract: ${params.contractAddress}`)
  console.log(`  Initial Payment: ${params.initialPayment} ADA`)

  // Build LoadedContract for SDK
  const loadedContract = buildLoadedContract(dbContract)

  // Calculate payment using SDK functions
  const timestamp = Date.now() - 60_000
  const nominalPayment = calculateNominalTermPayment(loadedContract.state)
  const interest = calculateInterest(loadedContract.state, null)

  console.log(`  Nominal Payment: ${nominalPayment / 1_000_000} ADA`)
  console.log(`  Interest: ${interest / 1_000_000} ADA`)

  // Update state for SDK (balance reduction)
  loadedContract.state.balance =
    BigInt(loadedContract.state.balance) - BigInt(nominalPayment)
  loadedContract.state.last_payment = {
    amount: BigInt(interest) + BigInt(nominalPayment),
    time: BigInt(timestamp),
  }

  // Prepare UI data
  const uiData: AcceptUIData = {
    payment: nominalPayment,
    timestamp,
  }

  // Call SDK action
  const result = await accept(lucid, loadedContract, uiData, true, {
    isEmulator: true,
  })

  // Advance emulator
  emulatorState.emulator.awaitBlock(1)

  // Update database
  const updatedDatum = toDbDatum(
    {
      buyer: paymentCredentialOf(buyerAddress).hash,
      base_asset: {
        policy: loadedContract.state.base_asset.policy,
        asset_name: toText(String(loadedContract.state.base_asset.asset_name)),
        quantity: Number(loadedContract.state.base_asset.quantity),
      },
      terms: {
        principal: Number(loadedContract.state.terms.principal),
        apr: Number(loadedContract.state.terms.apr),
        frequency: Number(loadedContract.state.terms.frequency),
        installments: Number(loadedContract.state.terms.installments),
        time: timestamp,
        fees: {
          late_fee: Number(loadedContract.state.terms.fees.late_fee),
          transfer_fee_seller: Number(
            loadedContract.state.terms.fees.transfer_fee_seller
          ),
          transfer_fee_buyer: 0, // Paid on accept
          referral_fee: Number(loadedContract.state.terms.fees.referral_fee),
          referral_fee_addr: loadedContract.state.terms.fees.referral_fee_addr,
        },
      },
      balance: Number(loadedContract.state.balance),
      last_payment: {
        amount: Number(loadedContract.state.last_payment!.amount),
        time: Number(loadedContract.state.last_payment!.time),
      },
    },
    { isActive: true }
  )

  await contractDb.updateContractDatum(dbContract.processId, updatedDatum)

  console.log(`[LoanService] Loan accepted: ${result.tx_id}`)

  return { txHash: result.tx_id, contractAddress: params.contractAddress }
}

/**
 * Make a payment on a loan
 */
export async function makePayment(
  params: MakePaymentParams
): Promise<LoanContractResult> {
  const emulatorState = getEmulatorState()
  if (!emulatorState) throw new Error('Emulator not initialized')

  await selectWallet(params.buyerWalletName)
  const lucid = getLucid()
  if (!lucid) throw new Error('Lucid not available')

  const buyerAddress = await lucid.wallet().address()
  const dbContract = await contractDb.getContractByAddress(params.contractAddress)

  if (!dbContract) {
    throw new Error(`Contract not found: ${params.contractAddress}`)
  }

  console.log(`[LoanService] Making payment:`)
  console.log(`  Buyer: ${params.buyerWalletName}`)
  console.log(`  Contract: ${params.contractAddress}`)
  console.log(`  Amount: ${params.amount} ADA`)

  // Build LoadedContract for SDK
  const loadedContract = buildLoadedContract(dbContract)

  // Calculate payment
  const timestamp = Date.now() - 60_000
  const nominalPayment = calculateNominalTermPayment(loadedContract.state)
  const interest = calculateInterest(loadedContract.state, timestamp)

  // Update state for SDK
  loadedContract.state.balance =
    BigInt(loadedContract.state.balance) - BigInt(nominalPayment)
  loadedContract.state.last_payment = {
    amount: BigInt(interest) + BigInt(nominalPayment),
    time: BigInt(timestamp),
  }

  // Prepare UI data
  const uiData: PayUIData = {
    payment: params.amount * 1_000_000,
    timestamp,
  }

  // Call SDK action
  const result = await pay(lucid, loadedContract, uiData, true, {
    isEmulator: true,
  })

  // Advance emulator
  emulatorState.emulator.awaitBlock(1)

  // Update database
  const newBalance = Number(loadedContract.state.balance)
  const isPaidOff = newBalance <= 0

  const updatedDatum = toDbDatum(
    {
      buyer: loadedContract.state.buyer,
      base_asset: {
        policy: loadedContract.state.base_asset.policy,
        asset_name: toText(String(loadedContract.state.base_asset.asset_name)),
        quantity: Number(loadedContract.state.base_asset.quantity),
      },
      terms: {
        principal: Number(loadedContract.state.terms.principal),
        apr: Number(loadedContract.state.terms.apr),
        frequency: Number(loadedContract.state.terms.frequency),
        installments: Number(loadedContract.state.terms.installments),
        time: Number(loadedContract.state.terms.time),
        fees: {
          late_fee: Number(loadedContract.state.terms.fees.late_fee),
          transfer_fee_seller: Number(
            loadedContract.state.terms.fees.transfer_fee_seller
          ),
          transfer_fee_buyer: Number(
            loadedContract.state.terms.fees.transfer_fee_buyer
          ),
          referral_fee: Number(loadedContract.state.terms.fees.referral_fee),
          referral_fee_addr: loadedContract.state.terms.fees.referral_fee_addr,
        },
      },
      balance: newBalance > 0 ? newBalance : 0,
      last_payment: {
        amount: Number(loadedContract.state.last_payment!.amount),
        time: Number(loadedContract.state.last_payment!.time),
      },
    },
    { isActive: !isPaidOff, isPaidOff }
  )

  await contractDb.updateContractDatum(dbContract.processId, updatedDatum)

  console.log(`[LoanService] Payment made: ${result.tx_id}`)
  if (isPaidOff) {
    console.log(`  Loan paid off!`)
  }

  return { txHash: result.tx_id, contractAddress: params.contractAddress }
}

/**
 * Collect payment from contract (seller withdraws)
 */
export async function collectPayment(
  params: CollectPaymentParams
): Promise<LoanContractResult> {
  const emulatorState = getEmulatorState()
  if (!emulatorState) throw new Error('Emulator not initialized')

  await selectWallet(params.sellerWalletName)
  const lucid = getLucid()
  if (!lucid) throw new Error('Lucid not available')

  const dbContract = await contractDb.getContractByAddress(params.contractAddress)

  if (!dbContract) {
    throw new Error(`Contract not found: ${params.contractAddress}`)
  }

  console.log(`[LoanService] Collecting payment:`)
  console.log(`  Seller: ${params.sellerWalletName}`)
  console.log(`  Contract: ${params.contractAddress}`)
  console.log(`  Amount: ${params.amount} lovelace`)

  // Build LoadedContract for SDK
  const loadedContract = buildLoadedContract(dbContract)

  // Prepare UI data
  const uiData: CollectUIData = {
    payment: params.amount,
  }

  // Call SDK action
  const result = await collect(lucid, loadedContract, uiData, true, {
    isEmulator: true,
  })

  // Advance emulator
  emulatorState.emulator.awaitBlock(1)

  console.log(`[LoanService] Payment collected: ${result.tx_id}`)

  return { txHash: result.tx_id, contractAddress: params.contractAddress }
}

// =============================================================================
// Query Functions
// =============================================================================

/**
 * Get all active loan contracts
 */
export async function getActiveLoans(): Promise<LoanContractState[]> {
  const contracts = await contractDb.getActiveContracts()

  return contracts.map((c) => ({
    address: c.contractAddress,
    policyId: c.policyId,
    buyer: c.state?.buyer || null,
    baseAsset: {
      policyId: c.state?.baseAsset?.policyId || '',
      assetName: c.state?.baseAsset?.assetName || '',
      quantity: c.state?.baseAsset?.quantity || 0,
    },
    terms: {
      principal: BigInt(c.state?.terms?.principal || 0),
      apr: BigInt(c.state?.terms?.apr || 0),
      frequency: BigInt(c.state?.terms?.frequency || 0),
      installments: BigInt(c.state?.terms?.installments || 0),
      time: c.state?.terms?.time ? BigInt(c.state.terms.time) : null,
    },
    balance: BigInt(c.state?.balance || 0),
    lastPayment: c.state?.lastPayment
      ? {
          amount: BigInt(c.state.lastPayment.amount),
          time: BigInt(c.state.lastPayment.time),
        }
      : null,
  }))
}

// =============================================================================
// Emulator Utility Functions (for API routes)
// =============================================================================

/**
 * Mint test token in emulator
 */
export async function mintTestToken(
  walletName: string,
  policyId: string,
  assetName: string,
  quantity: number
): Promise<{ txHash: string; policyId: string; assetId: string }> {
  const emulatorState = getEmulatorState()
  if (!emulatorState) throw new Error('Emulator not initialized')

  await selectWallet(walletName)
  const lucid = getLucid()
  if (!lucid) throw new Error('Lucid not available')

  const {
    scriptFromNative,
    mintingPolicyToId,
    unixTimeToSlot,
  } = await import('@lucid-evolution/lucid')

  const userAddress = await lucid.wallet().address()
  const network = lucid.config().network

  // Create a simple minting policy
  const mintingPolicy = scriptFromNative({
    type: 'all',
    scripts: [
      { type: 'sig', keyHash: paymentCredentialOf(userAddress).hash },
      {
        type: 'before',
        slot: unixTimeToSlot(network, Date.now() + 1_000_000),
      },
    ],
  })

  const mintPolicyId = mintingPolicyToId(mintingPolicy)
  const assetId = mintPolicyId + fromText(assetName)

  const tx = await lucid
    .newTx()
    .mintAssets({ [assetId]: BigInt(quantity) })
    .pay.ToAddress(userAddress, { [assetId]: BigInt(quantity) })
    .validTo(Date.now() + 900_000)
    .attach.MintingPolicy(mintingPolicy)
    .complete()

  const signedTx = await tx.sign.withWallet().complete()
  const txHash = await signedTx.submit()

  emulatorState.emulator.awaitBlock(1)

  return { txHash, policyId: mintPolicyId, assetId }
}

/**
 * Get tokens in a wallet
 */
export async function getWalletTokens(
  walletName: string
): Promise<Array<{ policyId: string; assetName: string; quantity: bigint }>> {
  const emulatorState = getEmulatorState()
  if (!emulatorState) throw new Error('Emulator not initialized')

  await selectWallet(walletName)
  const lucid = getLucid()
  if (!lucid) throw new Error('Lucid not available')

  const address = await lucid.wallet().address()
  const utxos = await lucid.utxosAt(address)

  const tokens: Array<{ policyId: string; assetName: string; quantity: bigint }> = []

  for (const utxo of utxos) {
    for (const [assetId, quantity] of Object.entries(utxo.assets)) {
      if (assetId === 'lovelace') continue
      const policyId = assetId.slice(0, 56)
      const assetNameHex = assetId.slice(56)
      const assetName = assetNameHex ? toText(assetNameHex) : ''
      tokens.push({ policyId, assetName, quantity: BigInt(quantity) })
    }
  }

  return tokens
}

/**
 * Alias for createLoan (for API compatibility)
 */
export const createLoanContract = createLoan

/**
 * Clear all contracts from DB
 */
export async function clearContractStore(): Promise<void> {
  await contractDb.deleteAllContracts()
}

/**
 * Get all contracts (for API)
 */
export async function getAllContracts(): Promise<
  Array<{
    address: string
    script?: { hash: string }
    state: any
    metadata?: any
    dbRecord?: any
  }>
> {
  const contracts = await contractDb.getAllContracts()

  return contracts.map((c) => ({
    address: c.contractAddress,
    script: { hash: c.policyId },
    state: c.contractDatum,
    metadata: c.contractData,
    dbRecord: c,
  }))
}

/**
 * Get a specific contract state
 */
export async function getContractState(
  address: string
): Promise<{
  state: any
  script?: { hash: string }
  metadata?: any
  dbRecord?: any
} | null> {
  const contract = await contractDb.getContractByAddress(address)
  if (!contract) return null

  return {
    state: contract.contractDatum,
    script: { hash: contract.policyId },
    metadata: contract.contractData,
    dbRecord: contract,
  }
}

