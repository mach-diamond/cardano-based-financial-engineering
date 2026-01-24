/**
 * Wallet Composable
 *
 * Provides wallet connection state and Lucid Evolution API access
 * for browser-based Cardano interactions.
 */

import { ref, computed, watch } from 'vue'
import { useWalletStore } from '@/stores/wallet'
import type { LucidEvolution } from '@lucid-evolution/lucid'

// Lucid Evolution API instance (browser-side singleton)
let lucidApi: LucidEvolution | null = null

/**
 * Initialize Lucid Evolution API for the browser
 */
async function initLucid(networkId: 0 | 1): Promise<LucidEvolution> {
  const { Lucid, Blockfrost } = await import('@lucid-evolution/lucid')

  // Determine network based on networkId
  const network = networkId === 0 ? 'Preview' : 'Mainnet'

  // Use environment variable or fallback for Blockfrost key
  // In production, this should come from a backend or be user-provided
  const blockfrostUrl = networkId === 0
    ? 'https://cardano-preview.blockfrost.io/api/v0'
    : 'https://cardano-mainnet.blockfrost.io/api/v0'

  // Note: In production, you should use an actual API key
  // For testnet development, Blockfrost offers free tier
  const blockfrostKey = import.meta.env.VITE_BLOCKFROST_KEY || 'preview_placeholder'

  const api = await Lucid(
    new Blockfrost(blockfrostUrl, blockfrostKey),
    network
  )

  return api
}

/**
 * Use wallet composable
 *
 * Provides reactive wallet state and Lucid API access.
 * Automatically initializes Lucid when wallet is connected.
 */
export function useWallet() {
  const store = useWalletStore()

  const api = ref<LucidEvolution | null>(null)
  const isApiReady = ref(false)
  const apiError = ref<string | null>(null)

  // Watch for wallet connection and initialize Lucid
  watch(
    () => store.isConnected,
    async (connected) => {
      if (connected && store.walletName) {
        try {
          apiError.value = null

          // Initialize Lucid if not already done
          if (!lucidApi) {
            lucidApi = await initLucid(store.networkId)
          }

          // Connect the wallet to Lucid
          const cardano = (window as any).cardano
          if (cardano && cardano[store.walletName]) {
            const walletApi = await cardano[store.walletName].enable()
            lucidApi.selectWallet.fromAPI(walletApi)
          }

          api.value = lucidApi
          isApiReady.value = true

        } catch (e) {
          apiError.value = e instanceof Error ? e.message : 'Failed to initialize Lucid API'
          console.error('Lucid API initialization error:', e)
        }
      } else {
        api.value = null
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
    api.value = null
    isApiReady.value = false
    lucidApi = null
  }

  /**
   * Refresh balance and assets
   */
  async function refreshBalance() {
    await store.refreshBalance()
  }

  /**
   * Get wallet UTxOs via Lucid
   */
  async function getUtxos() {
    if (!api.value) return []
    return await api.value.wallet().getUtxos()
  }

  /**
   * Query UTxOs at a specific address
   */
  async function queryUtxos(addr: string) {
    if (!api.value) return []
    return await api.value.utxosAt(addr)
  }

  return {
    // API
    api,
    isApiReady,

    // State
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
    getUtxos,
    queryUtxos,
  }
}
