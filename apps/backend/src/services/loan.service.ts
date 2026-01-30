/**
 * Loan Contract Service
 *
 * Uses the real asset-transfer contract from packages/loan-contract
 * for loan operations via the emulator.
 */

import { getLucid, getEmulatorState, selectWallet } from './emulator.service'
import type { LucidEvolution, UTxO } from '@lucid-evolution/lucid'
import {
  fromText,
  paymentCredentialOf,
  toText,
  Constr,
  Data,
  applyParamsToScript,
  validatorToScriptHash,
  validatorToAddress,
  scriptFromNative,
  mintingPolicyToId,
  type Network,
} from '@lucid-evolution/lucid'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import * as contractDb from './contract.service'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Path to the loan-contract submodule
const LOAN_CONTRACT_PATH = path.resolve(
  __dirname,
  '../../../../packages/loan-contract'
)

// In-memory cache for validator scripts (not persisted to DB)
// Maps contract address to validator script for transaction building
const scriptCache = new Map<string, any>()

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
 * Load the plutus.json blueprint from the loan-contract submodule
 */
function loadBlueprint(): any {
  const blueprintPath = path.join(LOAN_CONTRACT_PATH, 'plutus.json')
  if (!fs.existsSync(blueprintPath)) {
    throw new Error(`Blueprint not found at: ${blueprintPath}`)
  }
  return JSON.parse(fs.readFileSync(blueprintPath, 'utf-8'))
}

/**
 * Get validator CBOR from blueprint
 * @param validatorTitle - e.g., "transfer_test.transfer_test.mint" for test validator
 */
function getValidatorFromBlueprint(
  blueprint: any,
  validatorTitle: string
): string {
  const validator = blueprint.validators.find(
    (v: any) => v.title === validatorTitle
  )
  if (!validator) {
    throw new Error(`Validator "${validatorTitle}" not found in blueprint`)
  }
  return validator.compiledCode
}

/**
 * Datum structure for the contract (matches Aiken types)
 */
const scriptDatumStructure = Data.Object({
  buyer: Data.Nullable(Data.Bytes()),
  base_asset: Data.Object({
    policy: Data.Bytes(),
    asset_name: Data.Bytes(),
    quantity: Data.Integer(),
  }),
  terms: Data.Object({
    principal: Data.Integer(),
    apr: Data.Integer(),
    frequency: Data.Integer(),
    installments: Data.Integer(),
    time: Data.Nullable(Data.Integer()),
    fees: Data.Object({
      late_fee: Data.Integer(),
      transfer_fee_seller: Data.Integer(),
      transfer_fee_buyer: Data.Integer(),
      referral_fee: Data.Integer(),
      referral_fee_addr: Data.Nullable(Data.Bytes()),
    }),
  }),
  balance: Data.Integer(),
  last_payment: Data.Nullable(
    Data.Object({
      amount: Data.Integer(),
      time: Data.Integer(),
    })
  ),
})

/**
 * Mint redeemer for contract initialization
 *
 * MintActions structure from plutus.json:
 *   AssetCollateral (index 0) { action: MintActionType }
 *   LiabilityCollateral (index 1) { action: MintActionType }
 *
 * MintActionType:
 *   MintToken (index 0) - no fields
 *   BurnToken (index 1) - no fields
 */
function mintCollateralRedeemer(): string {
  // AssetCollateral { action: MintToken }
  // = Constr(0, [Constr(0, [])])
  const mintToken = new Constr(0, []) // MintToken
  const assetCollateral = new Constr(0, [mintToken]) // AssetCollateral
  return Data.to(assetCollateral)
}

/**
 * Spend redeemer for buyer accepting the loan
 *
 * SpendActions structure from plutus.json:
 *   Buyer (index 0) { action: BuyerActionTypes }
 *   Seller (index 1) { action: SellerActionTypes }
 *
 * BuyerActionTypes:
 *   Pay (index 0) - no fields
 *   Accept (index 1) - no fields
 *   Transfer (index 2) - no fields
 */
function acceptLoanRedeemer(): string {
  // SpendActions::Buyer { action: BuyerActionTypes::Accept }
  // = Constr(0, [Constr(1, [])])
  const acceptAction = new Constr(1, []) // Accept
  const buyerAction = new Constr(0, [acceptAction]) // Buyer
  return Data.to(buyerAction)
}

/**
 * Spend redeemer for buyer making a payment
 */
function payLoanRedeemer(): string {
  // SpendActions::Buyer { action: BuyerActionTypes::Pay }
  // = Constr(0, [Constr(0, [])])
  const payAction = new Constr(0, []) // Pay
  const buyerAction = new Constr(0, [payAction]) // Buyer
  return Data.to(buyerAction)
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
): Promise<{ txHash: string; policyId: string; assetId: string }> {
  const state = getEmulatorState()
  if (!state) throw new Error('Emulator not initialized')

  // Select the wallet
  await selectWallet(walletName)
  const lucid = getLucid()
  if (!lucid) throw new Error('Lucid not available')

  // For emulator testing, we'll create a simple sig-based minting policy
  const userAddress = await lucid.wallet().address()

  // Create a native script minting policy (requires user signature)
  const mintingPolicy = scriptFromNative({
    type: 'sig',
    keyHash: paymentCredentialOf(userAddress).hash,
  })

  const actualPolicyId = mintingPolicyToId(mintingPolicy)
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

  console.log(`[LoanService] Minted ${quantity} ${assetName} for ${walletName}`)
  console.log(`  Policy ID: ${actualPolicyId}`)
  console.log(`  Asset ID: ${assetId}`)

  return { txHash, policyId: actualPolicyId, assetId }
}

/**
 * Get all test tokens owned by a wallet
 */
export async function getWalletTokens(
  walletName: string
): Promise<Array<{ policyId: string; assetName: string; quantity: bigint }>> {
  const state = getEmulatorState()
  if (!state) throw new Error('Emulator not initialized')

  const wallet = state.wallets.find((w) => w.name === walletName)
  if (!wallet) throw new Error(`Wallet ${walletName} not found`)

  const utxos = await state.lucid.utxosAt(wallet.address)
  const tokens: Array<{
    policyId: string
    assetName: string
    quantity: bigint
  }> = []

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
 * Uses the real asset-transfer contract validator from the submodule.
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

  // Load the test validator from blueprint
  const blueprint = loadBlueprint()
  // Use test validator for emulator (has trace statements)
  const validatorCbor = getValidatorFromBlueprint(
    blueprint,
    'transfer_test.transfer_test.mint'
  )

  // Find the asset in seller's wallet
  const baseTokenName = params.asset.assetName
  const baseTokenPolicy = params.asset.policyId
  const baseTokenQuantity = params.asset.quantity
  const baseAssetId = baseTokenPolicy + fromText(baseTokenName)

  const utxos = await lucid.utxosAt(sellerAddress)
  const assetUtxo = utxos.find((u) => u.assets[baseAssetId])

  if (!assetUtxo) {
    throw new Error(`Asset ${baseTokenName} not found in wallet ${params.sellerWalletName}`)
  }

  // Create output reference for parameterization
  const consumingUTxO = new Constr(0, [
    assetUtxo.txHash,
    BigInt(assetUtxo.outputIndex),
  ])

  // Parameterize the validator
  const parameterizedScript = {
    type: 'PlutusV3' as const,
    script: applyParamsToScript(validatorCbor, [
      baseTokenPolicy,
      fromText(baseTokenName),
      BigInt(baseTokenQuantity),
      consumingUTxO,
    ]),
  }

  const network: Network = lucid.config().network ?? 'Custom'
  const scriptPolicyId = validatorToScriptHash(parameterizedScript)
  const scriptAddress = validatorToAddress(network, parameterizedScript)

  // Build contract state (datum)
  const contractState = {
    buyer: params.buyerAddress
      ? paymentCredentialOf(params.buyerAddress).hash
      : null,
    base_asset: {
      policy: baseTokenPolicy,
      asset_name: fromText(baseTokenName),
      quantity: BigInt(baseTokenQuantity),
    },
    terms: {
      principal: BigInt(params.terms.principal * 1_000_000),
      apr: BigInt(params.terms.apr),
      frequency: BigInt(params.terms.frequency),
      installments: BigInt(params.terms.installments),
      time: null,
      fees: {
        late_fee: BigInt(params.terms.lateFee * 1_000_000),
        transfer_fee_seller: BigInt(
          params.deferFee ? params.terms.transferFeeSeller : 0
        ),
        transfer_fee_buyer: BigInt(params.terms.transferFeeBuyer),
        referral_fee: 0n,
        referral_fee_addr: null,
      },
    },
    balance: BigInt(params.terms.principal * 1_000_000),
    last_payment: null,
  }

  // Cast to any to bypass strict type checking - datum structure is validated on-chain
  const scriptDatum = Data.to(contractState as any, scriptDatumStructure as any)

  // Define collateral token
  const collateralTokenName = 'CollateralToken'
  const collateralAssetId = scriptPolicyId + fromText(collateralTokenName)

  // Collateral token metadata
  const collateralMetadata = {
    name: collateralTokenName,
    description: 'Collateral token representing ownership of locked asset',
    base_asset: {
      asset_name: baseTokenName,
      policy_id: baseTokenPolicy,
      quantity: baseTokenQuantity,
    },
  }

  console.log(`[LoanService] Creating loan contract:`)
  console.log(`  Seller: ${params.sellerWalletName}`)
  console.log(`  Asset: ${baseTokenName} (qty: ${baseTokenQuantity})`)
  console.log(`  Principal: ${params.terms.principal} ADA`)
  console.log(`  APR: ${params.terms.apr / 100}%`)
  console.log(`  Installments: ${params.terms.installments}`)
  console.log(`  Contract Address: ${scriptAddress}`)

  // Build transaction
  const tx = lucid
    .newTx()
    .pay.ToContract(
      scriptAddress,
      { kind: 'inline', value: scriptDatum },
      { [baseAssetId]: BigInt(baseTokenQuantity) }
    )
    .collectFrom([assetUtxo])
    .attach.MintingPolicy(parameterizedScript)
    .mintAssets({ [collateralAssetId]: 1n }, mintCollateralRedeemer())
    .attachMetadata(721, {
      [scriptPolicyId]: {
        [collateralTokenName]: collateralMetadata,
      },
    })
    .pay.ToAddress(sellerAddress, { [collateralAssetId]: 1n })
    .addSigner(sellerAddress)

  // Add transfer fee payment if not deferred
  if (!params.deferFee && params.terms.transferFeeSeller > 0) {
    // In production, this goes to the protocol fee address
    // For emulator, we skip this or send to a test address
  }

  const completedTx = await tx.complete()
  const signedTx = await completedTx.sign.withWallet().complete()
  const txHash = await signedTx.submit()

  // Advance emulator to confirm tx
  state.emulator.awaitBlock(1)

  // Cache the script for transaction building (not persisted)
  scriptCache.set(scriptAddress, {
    Validator: parameterizedScript,
    hash: scriptPolicyId,
    address: scriptAddress,
  })

  // Build state for database storage
  const dbState: ContractState = {
    buyer: contractState.buyer,
    baseAsset: {
      policyId: contractState.base_asset.policy,
      assetName: toText(contractState.base_asset.asset_name),
      quantity: Number(contractState.base_asset.quantity),
    },
    terms: {
      principal: Number(contractState.terms.principal),
      apr: Number(contractState.terms.apr),
      frequency: Number(contractState.terms.frequency),
      installments: Number(contractState.terms.installments),
      time: contractState.terms.time ? Number(contractState.terms.time) : null,
      fees: {
        lateFee: Number(contractState.terms.fees.late_fee),
        transferFeeSeller: Number(contractState.terms.fees.transfer_fee_seller),
        transferFeeBuyer: Number(contractState.terms.fees.transfer_fee_buyer),
        referralFee: Number(contractState.terms.fees.referral_fee),
        referralFeeAddr: contractState.terms.fees.referral_fee_addr,
      },
    },
    balance: Number(contractState.balance),
    lastPayment: contractState.last_payment
      ? {
          amount: Number(contractState.last_payment.amount),
          time: Number(contractState.last_payment.time),
        }
      : null,
    isActive: false,
    isPaidOff: false,
    isDefaulted: false,
  }

  // Store contract in database
  await contractDb.createContract({
    contractAddress: scriptAddress,
    policyId: scriptPolicyId,
    alias: params.asset.assetName,
    contractType: 'Transfer',
    contractSubtype: 'Asset-Backed',
    contractDatum: dbState,
    contractData: {
      seller: sellerAddress,
      scriptHash: scriptPolicyId,
      scriptCbor: parameterizedScript.script,
      metadata: collateralMetadata,
    },
    networkId: 0, // emulator
  })

  console.log(`[LoanService] Contract created: ${txHash}`)

  return {
    txHash,
    contractAddress: scriptAddress,
    policyId: scriptPolicyId,
  }
}

/**
 * Get stored contract state from database
 */
export async function getContractState(contractAddress: string) {
  const contract = await contractDb.getContractByAddress(contractAddress)
  if (!contract) return null

  // Combine DB data with cached script if available
  const script = scriptCache.get(contractAddress)
  return {
    script,
    state: contract.state,
    metadata: contract.metadata,
    dbRecord: contract,
  }
}

/**
 * Get all stored contracts from database
 */
export async function getAllContracts(networkId?: number) {
  const contracts = await contractDb.getAllContracts(networkId)
  return contracts.map((contract) => ({
    address: contract.address,
    script: scriptCache.get(contract.address),
    state: contract.state,
    metadata: contract.metadata,
    dbRecord: contract,
  }))
}

/**
 * Get loan contracts created by a wallet
 */
export async function getLoanContractsForWallet(
  walletName: string
): Promise<LoanContractState[]> {
  // Return contracts from the database
  const contracts = await getAllContracts()
  return contracts.map((c) => ({
    address: c.address,
    policyId: c.dbRecord?.policyId || c.script?.hash || '',
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
  const contract = await contractDb.getContractByAddress(params.contractAddress)

  if (!contract) {
    throw new Error(`Contract not found: ${params.contractAddress}`)
  }

  console.log(`[LoanService] Accepting loan:`)
  console.log(`  Buyer: ${params.buyerWalletName}`)
  console.log(`  Contract: ${params.contractAddress}`)
  console.log(`  Initial Payment: ${params.initialPayment} ADA`)

  // Get current contract datum from database
  const currentDatum = contract.contractDatum as contractDb.LoanContractDatum | null
  if (!currentDatum) {
    throw new Error('Contract has no datum')
  }

  // Get the script from cache or reconstruct from DB
  let cachedScript = scriptCache.get(params.contractAddress)
  if (!cachedScript) {
    // Reconstruct from contractData
    const contractData = contract.contractData as { scriptCbor?: string; scriptHash?: string } | null
    if (!contractData?.scriptCbor) {
      throw new Error('Contract script not found')
    }
    cachedScript = {
      Validator: { type: 'PlutusV3' as const, script: contractData.scriptCbor },
      hash: contract.policyId,
      address: params.contractAddress,
    }
    scriptCache.set(params.contractAddress, cachedScript)
  }

  // Get the contract UTxO
  const utxos = await lucid.utxosAt(params.contractAddress)
  if (utxos.length === 0) {
    throw new Error('No UTxO found at contract address')
  }
  const contractUtxo = utxos[0] // There should be exactly one UTxO at the contract

  // Calculate payment and new balance
  const paymentLovelace = params.initialPayment * 1_000_000
  const newBalance = currentDatum.balance - paymentLovelace
  const currentTime = Date.now()

  // Build on-chain datum with buyer set and balance reduced
  const onChainDatum: Data = {
    buyer: paymentCredentialOf(buyerAddress).hash,
    base_asset: {
      policy: currentDatum.baseAsset.policyId,
      asset_name: fromText(currentDatum.baseAsset.assetName),
      quantity: BigInt(currentDatum.baseAsset.quantity),
    },
    terms: {
      principal: BigInt(currentDatum.terms.principal),
      apr: BigInt(currentDatum.terms.apr),
      frequency: BigInt(currentDatum.terms.frequency),
      installments: BigInt(currentDatum.terms.installments),
      time: BigInt(currentTime),
      fees: {
        late_fee: BigInt(currentDatum.terms.fees?.lateFee || 0),
        transfer_fee_seller: BigInt(currentDatum.terms.fees?.transferFeeSeller || 0),
        transfer_fee_buyer: BigInt(currentDatum.terms.fees?.transferFeeBuyer || 0),
        referral_fee: BigInt(currentDatum.terms.fees?.referralFee || 0),
        referral_fee_addr: currentDatum.terms.fees?.referralFeeAddr || null,
      },
    },
    balance: BigInt(newBalance),
    last_payment: {
      amount: BigInt(paymentLovelace),
      time: BigInt(currentTime),
    },
  }

  const newDatumCbor = Data.to(onChainDatum, StateSchema)

  // Build the accept transaction
  const tx = lucid
    .newTx()
    .collectFrom([contractUtxo], acceptLoanRedeemer())
    .attach.SpendingValidator(cachedScript.Validator)
    .pay.ToContract(
      params.contractAddress,
      { kind: 'inline', value: newDatumCbor },
      {
        lovelace: (contractUtxo.assets.lovelace || 0n) + BigInt(paymentLovelace),
        ...Object.fromEntries(
          Object.entries(contractUtxo.assets).filter(([k]) => k !== 'lovelace')
        ),
      }
    )
    .addSigner(buyerAddress)

  const completedTx = await tx.complete()
  const signedTx = await completedTx.sign.withWallet().complete()
  const txHash = await signedTx.submit()

  // Advance emulator to confirm tx
  emulatorState.emulator.awaitBlock(1)

  // Update database with new state
  const updatedDatum: contractDb.LoanContractDatum = {
    ...currentDatum,
    buyer: paymentCredentialOf(buyerAddress).hash,
    terms: {
      ...currentDatum.terms,
      time: currentTime,
    },
    lastPayment: {
      amount: paymentLovelace,
      time: currentTime,
    },
    balance: newBalance,
    isActive: true,
  }
  await contractDb.updateContractDatum(contract.processId, updatedDatum)

  console.log(`[LoanService] Loan accepted: ${txHash}`)

  return { txHash, contractAddress: params.contractAddress }
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
  const contract = await contractDb.getContractByAddress(params.contractAddress)

  if (!contract) {
    throw new Error(`Contract not found: ${params.contractAddress}`)
  }

  console.log(`[LoanService] Making payment:`)
  console.log(`  Buyer: ${params.buyerWalletName}`)
  console.log(`  Contract: ${params.contractAddress}`)
  console.log(`  Amount: ${params.amount} ADA`)

  // Get current contract datum from database
  const currentDatum = contract.contractDatum as contractDb.LoanContractDatum | null
  if (!currentDatum) {
    throw new Error('Contract has no datum')
  }

  // Get the script from cache or reconstruct from DB
  let cachedScript = scriptCache.get(params.contractAddress)
  if (!cachedScript) {
    const contractData = contract.contractData as { scriptCbor?: string } | null
    if (!contractData?.scriptCbor) {
      throw new Error('Contract script not found')
    }
    cachedScript = {
      Validator: { type: 'PlutusV3' as const, script: contractData.scriptCbor },
      hash: contract.policyId,
      address: params.contractAddress,
    }
    scriptCache.set(params.contractAddress, cachedScript)
  }

  // Get the contract UTxO
  const utxos = await lucid.utxosAt(params.contractAddress)
  if (utxos.length === 0) {
    throw new Error('No UTxO found at contract address')
  }
  const contractUtxo = utxos[0]

  // Calculate new balance
  const paymentLovelace = params.amount * 1_000_000
  const newBalance = currentDatum.balance - paymentLovelace
  const isPaidOff = newBalance <= 0
  const currentTime = Date.now()

  // Build on-chain datum with updated balance
  const onChainDatum: Data = {
    buyer: currentDatum.buyer,
    base_asset: {
      policy: currentDatum.baseAsset.policyId,
      asset_name: fromText(currentDatum.baseAsset.assetName),
      quantity: BigInt(currentDatum.baseAsset.quantity),
    },
    terms: {
      principal: BigInt(currentDatum.terms.principal),
      apr: BigInt(currentDatum.terms.apr),
      frequency: BigInt(currentDatum.terms.frequency),
      installments: BigInt(currentDatum.terms.installments),
      time: BigInt(currentDatum.terms.time || currentTime),
      fees: {
        late_fee: BigInt(currentDatum.terms.fees?.lateFee || 0),
        transfer_fee_seller: BigInt(currentDatum.terms.fees?.transferFeeSeller || 0),
        transfer_fee_buyer: BigInt(currentDatum.terms.fees?.transferFeeBuyer || 0),
        referral_fee: BigInt(currentDatum.terms.fees?.referralFee || 0),
        referral_fee_addr: currentDatum.terms.fees?.referralFeeAddr || null,
      },
    },
    balance: BigInt(newBalance > 0 ? newBalance : 0),
    last_payment: {
      amount: BigInt(paymentLovelace),
      time: BigInt(currentTime),
    },
  }

  const newDatumCbor = Data.to(onChainDatum, StateSchema)

  // Build the payment transaction
  const tx = lucid
    .newTx()
    .collectFrom([contractUtxo], payLoanRedeemer())
    .attach.SpendingValidator(cachedScript.Validator)
    .pay.ToContract(
      params.contractAddress,
      { kind: 'inline', value: newDatumCbor },
      {
        lovelace: (contractUtxo.assets.lovelace || 0n) + BigInt(paymentLovelace),
        ...Object.fromEntries(
          Object.entries(contractUtxo.assets).filter(([k]) => k !== 'lovelace')
        ),
      }
    )
    .addSigner(buyerAddress)

  const completedTx = await tx.complete()
  const signedTx = await completedTx.sign.withWallet().complete()
  const txHash = await signedTx.submit()

  // Advance emulator to confirm tx
  emulatorState.emulator.awaitBlock(1)

  // Update database with new state
  const updatedDatum: contractDb.LoanContractDatum = {
    ...currentDatum,
    balance: newBalance > 0 ? newBalance : 0,
    lastPayment: {
      amount: paymentLovelace,
      time: currentTime,
    },
    isPaidOff,
    isActive: !isPaidOff,
  }
  await contractDb.updateContractDatum(contract.processId, updatedDatum)

  console.log(`[LoanService] Payment made: ${txHash}`)
  console.log(`  Remaining Balance: ${newBalance / 1_000_000} ADA`)

  return { txHash, contractAddress: params.contractAddress }
}

/**
 * Collect payment (seller collects accumulated payments)
 */
export async function collectPayment(
  params: CollectPaymentParams
): Promise<LoanContractResult> {
  const emulatorState = getEmulatorState()
  if (!emulatorState) throw new Error('Emulator not initialized')

  await selectWallet(params.sellerWalletName)
  const lucid = getLucid()
  if (!lucid) throw new Error('Lucid not available')

  const contract = await contractDb.getContractByAddress(params.contractAddress)

  if (!contract) {
    throw new Error(`Contract not found: ${params.contractAddress}`)
  }

  console.log(`[LoanService] Collecting payment:`)
  console.log(`  Seller: ${params.sellerWalletName}`)
  console.log(`  Contract: ${params.contractAddress}`)
  console.log(`  Amount: ${params.amount} lovelace`)

  // TODO: Build actual collect transaction using the contract validator
  const txHash = `collect_${Date.now().toString(16)}_${Math.random().toString(16).slice(2, 10)}`

  emulatorState.emulator.awaitBlock(1)

  console.log(`[LoanService] Payment collected: ${txHash}`)

  return { txHash, contractAddress: params.contractAddress }
}

/**
 * Clear all stored contracts (useful for resetting emulator state)
 */
export async function clearContractStore() {
  // Clear the in-memory script cache
  scriptCache.clear()
  // Clear contracts from database
  await contractDb.deleteAllContracts()
}
