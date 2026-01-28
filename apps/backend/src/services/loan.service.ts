/**
 * Loan Contract Service
 *
 * Wraps the asset-transfer contract actions for use with the emulator.
 * All contract operations happen here on the backend where CommonJS deps work.
 */

import { getLucid, getEmulatorState, selectWallet } from './emulator.service'
import type { LucidEvolution } from '@lucid-evolution/lucid'
import { fromText, paymentCredentialOf, toText } from '@lucid-evolution/lucid'

// Contract types (simplified for API use)
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

/**
 * Mint a test token for an originator
 * This simulates asset tokenization in the emulator
 */
export async function mintTestToken(
  walletName: string,
  policyId: string,
  assetName: string,
  quantity: number
): Promise<{ txHash: string }> {
  const state = getEmulatorState()
  if (!state) throw new Error('Emulator not initialized')

  // Select the wallet
  await selectWallet(walletName)
  const lucid = getLucid()
  if (!lucid) throw new Error('Lucid not available')

  // For emulator testing, we'll create a simple always-true minting policy
  // In production, this would be a proper minting policy
  const userAddress = await lucid.wallet().address()

  // Create a simple native script minting policy (always succeeds in emulator)
  const mintingPolicy = lucid.newScript({
    type: 'Native',
    script: {
      type: 'sig',
      keyHash: paymentCredentialOf(userAddress).hash,
    },
  })

  const actualPolicyId = lucid.policyId(mintingPolicy)
  const assetId = actualPolicyId + fromText(assetName)

  const tx = await lucid
    .newTx()
    .mintAssets({ [assetId]: BigInt(quantity) })
    .attach.MintingPolicy(mintingPolicy)
    .complete()

  const signedTx = await tx.sign.withWallet().complete()
  const txHash = await signedTx.submit()

  // Advance emulator to confirm tx
  state.emulator.awaitBlock(1)

  return { txHash, policyId: actualPolicyId, assetId }
}

/**
 * Get all test tokens owned by a wallet
 */
export async function getWalletTokens(
  walletName: string
): Promise<
  Array<{ policyId: string; assetName: string; quantity: bigint }>
> {
  const state = getEmulatorState()
  if (!state) throw new Error('Emulator not initialized')

  const wallet = state.wallets.find((w) => w.name === walletName)
  if (!wallet) throw new Error(`Wallet ${walletName} not found`)

  const utxos = await state.lucid.utxosAt(wallet.address)
  const tokens: Array<{ policyId: string; assetName: string; quantity: bigint }> = []

  for (const utxo of utxos) {
    for (const [assetId, quantity] of Object.entries(utxo.assets)) {
      if (assetId === 'lovelace') continue
      // Asset ID is policyId (56 chars) + assetName (hex)
      const policyId = assetId.slice(0, 56)
      const assetNameHex = assetId.slice(56)
      const assetName = toText(assetNameHex)
      tokens.push({ policyId, assetName, quantity: BigInt(quantity) })
    }
  }

  return tokens
}

/**
 * Create a loan contract (initialize/send to market)
 *
 * NOTE: This is a simplified version for emulator testing.
 * The full implementation would use the asset-transfer send_to_market action.
 */
export async function createLoanContract(
  params: CreateLoanParams
): Promise<LoanContractResult> {
  const state = getEmulatorState()
  if (!state) throw new Error('Emulator not initialized')

  // Select seller wallet
  await selectWallet(params.sellerWalletName)
  const lucid = getLucid()
  if (!lucid) throw new Error('Lucid not available')

  const sellerAddress = await lucid.wallet().address()

  // For now, we simulate the contract creation
  // In production, this would call the actual send_to_market action

  // Find the asset in seller's wallet
  const assetId = params.asset.policyId + fromText(params.asset.assetName)
  const utxos = await lucid.utxosAt(sellerAddress)
  const assetUtxo = utxos.find((u) => u.assets[assetId])

  if (!assetUtxo) {
    throw new Error(`Asset ${params.asset.assetName} not found in wallet`)
  }

  // Create a simple "contract" by sending to a script address
  // In production, this uses the parameterized validator
  const contractDatum = {
    seller: paymentCredentialOf(sellerAddress).hash,
    buyer: params.buyerAddress
      ? paymentCredentialOf(params.buyerAddress).hash
      : null,
    asset: {
      policyId: params.asset.policyId,
      assetName: params.asset.assetName,
      quantity: params.asset.quantity,
    },
    terms: {
      principal: BigInt(params.terms.principal * 1_000_000),
      apr: BigInt(params.terms.apr),
      frequency: BigInt(params.terms.frequency),
      installments: BigInt(params.terms.installments),
    },
    balance: BigInt(params.terms.principal * 1_000_000),
  }

  // For emulator demo, we'll just log what would happen
  // Real implementation would build and submit the actual transaction

  console.log('[LoanService] Creating loan contract:', {
    seller: sellerAddress,
    asset: params.asset,
    terms: params.terms,
  })

  // Simulate tx hash
  const txHash = `loan_${Date.now().toString(16)}_${Math.random().toString(16).slice(2, 10)}`

  // Simulate contract address (in reality, this is derived from the parameterized script)
  const contractAddress = `addr_test1_contract_${txHash.slice(0, 20)}`

  // Simulate policy ID for collateral token
  const policyId = `policy_${txHash.slice(5, 61)}`

  return {
    txHash,
    contractAddress,
    policyId,
  }
}

/**
 * Get loan contracts created by a wallet
 */
export async function getLoanContractsForWallet(
  walletName: string
): Promise<LoanContractState[]> {
  // In production, this would query UTxOs at known contract addresses
  // For now, return empty array
  return []
}

/**
 * Accept loan terms (buyer accepts and makes first payment)
 */
export async function acceptLoan(
  params: AcceptLoanParams
): Promise<LoanContractResult> {
  const state = getEmulatorState()
  if (!state) throw new Error('Emulator not initialized')

  await selectWallet(params.buyerWalletName)
  const lucid = getLucid()
  if (!lucid) throw new Error('Lucid not available')

  console.log('[LoanService] Accepting loan:', {
    buyer: params.buyerWalletName,
    contract: params.contractAddress,
    payment: params.initialPayment,
  })

  const txHash = `accept_${Date.now().toString(16)}_${Math.random().toString(16).slice(2, 10)}`

  return { txHash, contractAddress: params.contractAddress }
}

/**
 * Make a payment on a loan
 */
export async function makePayment(
  params: MakePaymentParams
): Promise<LoanContractResult> {
  const state = getEmulatorState()
  if (!state) throw new Error('Emulator not initialized')

  await selectWallet(params.buyerWalletName)
  const lucid = getLucid()
  if (!lucid) throw new Error('Lucid not available')

  console.log('[LoanService] Making payment:', {
    buyer: params.buyerWalletName,
    contract: params.contractAddress,
    amount: params.amount,
  })

  const txHash = `pay_${Date.now().toString(16)}_${Math.random().toString(16).slice(2, 10)}`

  return { txHash, contractAddress: params.contractAddress }
}

/**
 * Collect payment (seller collects accumulated payments)
 */
export async function collectPayment(
  params: CollectPaymentParams
): Promise<LoanContractResult> {
  const state = getEmulatorState()
  if (!state) throw new Error('Emulator not initialized')

  await selectWallet(params.sellerWalletName)
  const lucid = getLucid()
  if (!lucid) throw new Error('Lucid not available')

  console.log('[LoanService] Collecting payment:', {
    seller: params.sellerWalletName,
    contract: params.contractAddress,
    amount: params.amount,
  })

  const txHash = `collect_${Date.now().toString(16)}_${Math.random().toString(16).slice(2, 10)}`

  return { txHash, contractAddress: params.contractAddress }
}
