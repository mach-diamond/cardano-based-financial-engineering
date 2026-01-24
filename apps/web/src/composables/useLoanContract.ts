/**
 * Loan Contract Composable
 *
 * Browser-compatible composable for interacting with loan/mortgage contracts.
 * Provides reactive contract state and transaction building utilities.
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type { LucidEvolution, UTxO } from '@lucid-evolution/lucid'
import type { Asset, LoanTerms, LoanState, LoanContract } from '@/types'

// Re-export types for convenience
export type { LoanContract, LoanTerms, LoanState }

/**
 * Contract initialization parameters
 */
export interface InitLoanParams {
  buyer: string | null
  baseAsset: {
    policyId: string
    assetName: string
    quantity: bigint
  }
  terms: {
    principal: bigint        // lovelace
    apr: bigint              // basis points
    frequency: bigint        // payments per year
    installments: bigint     // total payments
    fees: {
      lateFee: bigint
      transferFeeSeller: bigint
      transferFeeBuyer: bigint
      referralFee: bigint
      referralFeeAddr: string | null
    }
  }
}

/**
 * Accept contract parameters
 */
export interface AcceptParams {
  contractAddress: string
  paymentAmount: bigint
  timestamp: number
}

/**
 * Payment parameters
 */
export interface PaymentParams {
  contractAddress: string
  amount: bigint
  timestamp: number
}

/**
 * Transaction result
 */
export interface TxResult {
  txHash: string
  contractAddress: string
  success: boolean
  error?: string
}

/**
 * Contract datum structure (matches on-chain format)
 */
export interface ContractDatum {
  buyer: string | null
  base_asset: {
    policy: string
    asset_name: string
    quantity: bigint
  }
  terms: {
    principal: bigint
    apr: bigint
    frequency: bigint
    installments: bigint
    time: bigint | null
    fees: {
      late_fee: bigint
      transfer_fee_seller: bigint
      transfer_fee_buyer: bigint
      referral_fee: bigint
      referral_fee_addr: string | null
    }
  }
  balance: bigint
  last_payment: {
    amount: bigint
    time: bigint
  } | null
}

/**
 * Create loan contract composable
 *
 * @param api - Reactive ref to Lucid Evolution API
 */
export function useLoanContract(api: Ref<LucidEvolution | null>) {
  // Transaction state
  const isSubmitting = ref(false)
  const lastTxHash = ref<string | null>(null)
  const error = ref<string | null>(null)

  // Contract state cache
  const contractState = ref<ContractDatum | null>(null)
  const contractAddress = ref<string | null>(null)

  /**
   * Check if API is ready
   */
  const isReady = computed(() => api.value !== null)

  /**
   * Parse datum from UTxO
   * Note: This is a simplified parser - in production, use proper CBOR/Plutus Data parsing
   */
  async function parseDatumFromUtxo(utxo: UTxO): Promise<ContractDatum | null> {
    if (!utxo.datum) return null

    try {
      // In production, this would use Data.from() to parse the Plutus datum
      // For now, return a placeholder structure
      // The actual implementation requires the datum schema from the contract
      console.log('UTxO datum:', utxo.datum)
      return null
    } catch (e) {
      console.error('Failed to parse datum:', e)
      return null
    }
  }

  /**
   * Load contract state from on-chain UTxO
   */
  async function loadContract(address: string): Promise<ContractDatum | null> {
    if (!api.value) {
      error.value = 'Lucid API not initialized'
      return null
    }

    try {
      error.value = null
      const utxos = await api.value.utxosAt(address)

      if (utxos.length === 0) {
        error.value = 'No UTxOs found at contract address'
        return null
      }

      // Find UTxO with datum (the contract state)
      const contractUtxo = utxos.find(u => u.datum)
      if (!contractUtxo) {
        error.value = 'No datum found at contract address'
        return null
      }

      const state = await parseDatumFromUtxo(contractUtxo)
      if (state) {
        contractState.value = state
        contractAddress.value = address
      }

      return state
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load contract'
      console.error('Load contract error:', e)
      return null
    }
  }

  /**
   * Initialize a new loan contract
   *
   * Creates the contract on-chain:
   * 1. Locks the base asset at the script address
   * 2. Mints a CollateralToken to the seller
   * 3. Sets the initial contract state
   */
  async function initialize(params: InitLoanParams, deferFee = false): Promise<TxResult> {
    if (!api.value) {
      return { txHash: '', contractAddress: '', success: false, error: 'API not ready' }
    }

    isSubmitting.value = true
    error.value = null

    try {
      // This would use the actual action from packages/loan-contract/src/actions/init.ts
      // For browser, we need to build the transaction here or call a backend

      // Placeholder implementation - actual implementation requires:
      // 1. Parameterizing the script with the base asset
      // 2. Building the datum
      // 3. Minting the CollateralToken
      // 4. Paying to the script address

      throw new Error('Initialize not yet implemented for browser. Use CLI or implement backend.')

    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Transaction failed'
      error.value = errorMsg
      return { txHash: '', contractAddress: '', success: false, error: errorMsg }
    } finally {
      isSubmitting.value = false
    }
  }

  /**
   * Accept contract terms as buyer
   *
   * 1. Makes initial payment
   * 2. Mints LiabilityToken to buyer
   * 3. Activates the contract (sets start time)
   */
  async function accept(params: AcceptParams): Promise<TxResult> {
    if (!api.value) {
      return { txHash: '', contractAddress: params.contractAddress, success: false, error: 'API not ready' }
    }

    isSubmitting.value = true
    error.value = null

    try {
      // Load current contract state
      const state = await loadContract(params.contractAddress)
      if (!state) {
        throw new Error('Could not load contract state')
      }

      // This would build the accept transaction
      // For browser implementation, needs:
      // 1. Load the parameterized script (needs to be stored/retrieved)
      // 2. Build updated datum with buyer credential and start time
      // 3. Mint LiabilityToken
      // 4. Pay to script with payment amount

      throw new Error('Accept not yet implemented for browser. Use CLI or implement backend.')

    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Transaction failed'
      error.value = errorMsg
      return { txHash: '', contractAddress: params.contractAddress, success: false, error: errorMsg }
    } finally {
      isSubmitting.value = false
    }
  }

  /**
   * Make a payment on an active contract
   */
  async function makePayment(params: PaymentParams): Promise<TxResult> {
    if (!api.value) {
      return { txHash: '', contractAddress: params.contractAddress, success: false, error: 'API not ready' }
    }

    isSubmitting.value = true
    error.value = null

    try {
      // Similar to accept - needs parameterized script and proper datum building
      throw new Error('Payment not yet implemented for browser. Use CLI or implement backend.')

    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Transaction failed'
      error.value = errorMsg
      return { txHash: '', contractAddress: params.contractAddress, success: false, error: errorMsg }
    } finally {
      isSubmitting.value = false
    }
  }

  /**
   * Collect payments (seller action)
   */
  async function collect(contractAddr: string): Promise<TxResult> {
    if (!api.value) {
      return { txHash: '', contractAddress: contractAddr, success: false, error: 'API not ready' }
    }

    isSubmitting.value = true
    error.value = null

    try {
      throw new Error('Collect not yet implemented for browser. Use CLI or implement backend.')
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Transaction failed'
      error.value = errorMsg
      return { txHash: '', contractAddress: contractAddr, success: false, error: errorMsg }
    } finally {
      isSubmitting.value = false
    }
  }

  /**
   * Cancel contract (seller action, pre-acceptance only)
   */
  async function cancel(contractAddr: string): Promise<TxResult> {
    if (!api.value) {
      return { txHash: '', contractAddress: contractAddr, success: false, error: 'API not ready' }
    }

    isSubmitting.value = true
    error.value = null

    try {
      throw new Error('Cancel not yet implemented for browser. Use CLI or implement backend.')
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Transaction failed'
      error.value = errorMsg
      return { txHash: '', contractAddress: contractAddr, success: false, error: errorMsg }
    } finally {
      isSubmitting.value = false
    }
  }

  /**
   * Complete transfer (buyer action, after full payment)
   */
  async function complete(contractAddr: string): Promise<TxResult> {
    if (!api.value) {
      return { txHash: '', contractAddress: contractAddr, success: false, error: 'API not ready' }
    }

    isSubmitting.value = true
    error.value = null

    try {
      throw new Error('Complete not yet implemented for browser. Use CLI or implement backend.')
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Transaction failed'
      error.value = errorMsg
      return { txHash: '', contractAddress: contractAddr, success: false, error: errorMsg }
    } finally {
      isSubmitting.value = false
    }
  }

  /**
   * Claim default (seller action)
   */
  async function claimDefault(contractAddr: string): Promise<TxResult> {
    if (!api.value) {
      return { txHash: '', contractAddress: contractAddr, success: false, error: 'API not ready' }
    }

    isSubmitting.value = true
    error.value = null

    try {
      throw new Error('Claim default not yet implemented for browser. Use CLI or implement backend.')
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Transaction failed'
      error.value = errorMsg
      return { txHash: '', contractAddress: contractAddr, success: false, error: errorMsg }
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    // State
    isReady,
    isSubmitting,
    lastTxHash,
    error,
    contractState,
    contractAddress,

    // Query
    loadContract,

    // Actions
    initialize,
    accept,
    makePayment,
    collect,
    cancel,
    complete,
    claimDefault,
  }
}
