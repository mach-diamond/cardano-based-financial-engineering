/**
 * Wallet Composable
 *
 * Provides wallet connection state using CIP-30 wallet API directly.
 * Transaction building should be done via backend API.
 */

import { ref, computed, watch } from 'vue'
import { useWalletStore } from '@/stores/wallet'

/**
 * Use wallet composable
 *
 * Provides reactive wallet state.
 * Lucid/transaction operations should go through backend API.
 */
export function useWallet() {
  const store = useWalletStore()

  const isApiReady = ref(false)
  const apiError = ref<string | null>(null)

  // Watch for wallet connection
  watch(
    () => store.isConnected,
    async (connected) => {
      if (connected && store.walletName) {
        try {
          apiError.value = null
          isApiReady.value = true
        } catch (e) {
          apiError.value = e instanceof Error ? e.message : 'Failed to initialize wallet'
          console.error('Wallet initialization error:', e)
        }
      } else {
        isApiReady.value = false
      }
    },
    { immediate: true }
  )

  // Computed properties from store
  const isConnected = computed(() => store.isConnected)
  const address = computed(() => store.address)
  const networkId = computed(() => store.networkId)
  const networkName = computed(() => store.networkName)
  const balance = computed(() => store.balance)
  const balanceADA = computed(() => store.balanceADA)
  const assets = computed(() => store.assets)
  const shortAddress = computed(() => store.shortAddress)
  const isConnecting = computed(() => store.isConnecting)
  const error = computed(() => store.error || apiError.value)

  /**
   * Connect to a wallet
   */
  async function connect(walletName: string) {
    await store.connect(walletName)
  }

  /**
   * Disconnect wallet
   */
  function disconnect() {
    store.disconnect()
    isApiReady.value = false
  }

  /**
   * Refresh balance and assets
   */
  async function refreshBalance() {
    await store.refreshBalance()
  }

  return {
    // State
    isApiReady,
    isConnected,
    address,
    networkId,
    networkName,
    balance,
    balanceADA,
    assets,
    shortAddress,
    isConnecting,
    error,

    // Actions
    connect,
    disconnect,
    refreshBalance,
  }
}
