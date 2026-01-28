/**
 * Loan Contract Composable (Stub)
 *
 * Transaction building happens on the backend.
 * This composable will be connected to backend APIs.
 */

import { ref, computed } from 'vue'

export interface LoanContract {
  id: string
  state: string
}

export interface LoanTerms {
  principal: bigint
  apr: bigint
  frequency: bigint
  installments: bigint
}

export interface LoanState {
  currentPayment: number
  totalPayments: number
  balance: bigint
}

/**
 * Stub composable - to be implemented with backend API
 */
export function useLoanContract() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  return {
    isLoading,
    error,
    // Placeholder methods - implement with backend API calls
    initializeContract: async () => {
      throw new Error('Not implemented - use backend API')
    },
    acceptContract: async () => {
      throw new Error('Not implemented - use backend API')
    },
    makePayment: async () => {
      throw new Error('Not implemented - use backend API')
    },
  }
}
