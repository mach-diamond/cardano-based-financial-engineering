import { ref, computed, watch, type Ref } from 'vue'
import type { LucidEvolution, UTxO } from '@lucid-evolution/lucid'
import type { ContractState, Asset } from '@/types'

/**
 * Contract status enum matching on-chain datum
 */
export enum ContractStatus {
  New = 0,
  Active = 1,
  Complete = 2,
  Cancelled = 3,
  Default = 4,
}

/**
 * Composable for querying and parsing contract state from UTxOs
 */
export function useContractState(
  api: Ref<LucidEvolution | null>,
  contractAddress: Ref<string | null>
) {
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const utxo = ref<UTxO | null>(null)
  const contractState = ref<ContractState | null>(null)

  /**
   * Parse datum from UTxO to contract state
   */
  function parseDatum(datumCbor: string): ContractState | null {
    try {
      // TODO: Implement actual datum parsing using Lucid Evolution
      // This will decode the CBOR datum into the contract state structure
      // For now, return a placeholder
      console.log('Parsing datum:', datumCbor.slice(0, 50) + '...')
      return null
    } catch (e) {
      console.error('Failed to parse datum:', e)
      return null
    }
  }

  /**
   * Query UTxO at contract address
   */
  async function queryContract(): Promise<void> {
    if (!api.value || !contractAddress.value) {
      error.value = 'API or contract address not available'
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const utxos = await api.value.utxosAt(contractAddress.value)

      if (utxos.length === 0) {
        error.value = 'No UTxO found at contract address'
        utxo.value = null
        contractState.value = null
        return
      }

      // Get the UTxO with the contract datum
      const contractUtxo = utxos.find(u => u.datum)

      if (!contractUtxo) {
        error.value = 'No datum found in contract UTxO'
        utxo.value = null
        contractState.value = null
        return
      }

      utxo.value = contractUtxo

      if (contractUtxo.datum) {
        contractState.value = parseDatum(contractUtxo.datum)
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to query contract'
      utxo.value = null
      contractState.value = null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Contract status as enum
   */
  const status = computed<ContractStatus | null>(() => {
    if (!contractState.value) return null
    return contractState.value.status as ContractStatus
  })

  /**
   * Status label for display
   */
  const statusLabel = computed(() => {
    if (status.value === null) return 'Unknown'
    switch (status.value) {
      case ContractStatus.New: return 'New'
      case ContractStatus.Active: return 'Active'
      case ContractStatus.Complete: return 'Complete'
      case ContractStatus.Cancelled: return 'Cancelled'
      case ContractStatus.Default: return 'Default'
      default: return 'Unknown'
    }
  })

  /**
   * Status badge variant for Bootstrap
   */
  const statusBadge = computed(() => {
    if (status.value === null) return 'secondary'
    switch (status.value) {
      case ContractStatus.New: return 'info'
      case ContractStatus.Active: return 'success'
      case ContractStatus.Complete: return 'primary'
      case ContractStatus.Cancelled: return 'warning'
      case ContractStatus.Default: return 'danger'
      default: return 'secondary'
    }
  })

  /**
   * Check if user is seller (has CollateralToken)
   */
  const isSeller = computed(() => {
    if (!contractState.value) return false
    // TODO: Check if user's address has the CollateralToken
    return false
  })

  /**
   * Check if user is buyer (has LiabilityToken)
   */
  const isBuyer = computed(() => {
    if (!contractState.value) return false
    // TODO: Check if user's address has the LiabilityToken
    return false
  })

  /**
   * Check if contract can accept payments
   */
  const canPay = computed(() => {
    return status.value === ContractStatus.Active
  })

  /**
   * Check if contract can be cancelled
   */
  const canCancel = computed(() => {
    return status.value === ContractStatus.New
  })

  /**
   * Check if contract can be completed
   */
  const canComplete = computed(() => {
    if (!contractState.value || status.value !== ContractStatus.Active) return false
    // Check if all payments made
    return contractState.value.paymentsMade >= contractState.value.installments
  })

  /**
   * Payment progress (payments made / total installments)
   */
  const paymentProgress = computed(() => {
    if (!contractState.value) return 0
    return contractState.value.paymentsMade / contractState.value.installments
  })

  /**
   * Payment progress percentage
   */
  const paymentProgressPercent = computed(() => {
    return Math.round(paymentProgress.value * 100)
  })

  /**
   * Remaining balance
   */
  const remainingBalance = computed(() => {
    if (!contractState.value) return 0n
    return contractState.value.balance
  })

  /**
   * Next payment due date
   */
  const nextPaymentDue = computed<number | null>(() => {
    if (!contractState.value || status.value !== ContractStatus.Active) return null
    // TODO: Calculate based on last payment time and term length
    return null
  })

  /**
   * Is payment currently late
   */
  const isPaymentLate = computed(() => {
    if (!nextPaymentDue.value) return false
    return Date.now() > nextPaymentDue.value
  })

  // Auto-refresh when contract address changes
  watch(contractAddress, () => {
    if (contractAddress.value) {
      queryContract()
    }
  })

  return {
    // State
    isLoading,
    error,
    utxo,
    contractState,

    // Status
    status,
    statusLabel,
    statusBadge,

    // Role detection
    isSeller,
    isBuyer,

    // Action availability
    canPay,
    canCancel,
    canComplete,

    // Progress
    paymentProgress,
    paymentProgressPercent,
    remainingBalance,

    // Payment timing
    nextPaymentDue,
    isPaymentLate,

    // Methods
    queryContract,
    parseDatum,
  }
}
