/**
 * Contract State Composable (Stub)
 *
 * Contract queries should go through backend API.
 */

import { ref, type Ref } from 'vue'

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
 * Stub composable - to be implemented with backend API
 */
export function useContractState(
  _apiReady: Ref<boolean>,
  _contractAddress: Ref<string | null>
) {
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const contractState = ref<any | null>(null)

  async function fetchState() {
    throw new Error('Not implemented - use backend API')
  }

  return {
    isLoading,
    error,
    contractState,
    fetchState,
  }
}
