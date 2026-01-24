import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { WalletState, Asset, NetworkId } from '@/types'

export const useWalletStore = defineStore('wallet', () => {
  // State
  const isConnected = ref(false)
  const address = ref<string | null>(null)
  const networkId = ref<NetworkId>(0)
  const balance = ref<bigint>(0n)
  const walletName = ref<string | null>(null)
  const assets = ref<Asset[]>([])
  const isConnecting = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const networkName = computed(() => {
    return networkId.value === 0 ? 'Preview' : 'Mainnet'
  })

  const balanceADA = computed(() => {
    return Number(balance.value) / 1_000_000
  })

  const shortAddress = computed(() => {
    if (!address.value) return null
    return `${address.value.slice(0, 12)}...${address.value.slice(-8)}`
  })

  const state = computed<WalletState>(() => ({
    isConnected: isConnected.value,
    address: address.value,
    networkId: networkId.value,
    balance: balance.value,
    walletName: walletName.value,
  }))

  // Actions
  async function connect(wallet: string) {
    isConnecting.value = true
    error.value = null

    try {
      // Get the wallet API from window.cardano
      const cardano = (window as any).cardano
      if (!cardano || !cardano[wallet]) {
        throw new Error(`Wallet ${wallet} not found`)
      }

      const api = await cardano[wallet].enable()

      // Get network ID
      const netId = await api.getNetworkId()
      networkId.value = netId as NetworkId

      // Get address
      const addresses = await api.getUsedAddresses()
      if (addresses.length === 0) {
        const unusedAddresses = await api.getUnusedAddresses()
        address.value = unusedAddresses[0] || null
      } else {
        address.value = addresses[0]
      }

      // Get balance
      const balanceHex = await api.getBalance()
      // Parse CBOR balance - simplified for ADA only
      balance.value = parseBalance(balanceHex)

      // Get assets
      assets.value = await parseUtxosForAssets(api)

      isConnected.value = true
      walletName.value = wallet

    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to connect wallet'
      console.error('Wallet connection error:', e)
    } finally {
      isConnecting.value = false
    }
  }

  function disconnect() {
    isConnected.value = false
    address.value = null
    balance.value = 0n
    walletName.value = null
    assets.value = []
    error.value = null
  }

  async function refreshBalance() {
    if (!isConnected.value || !walletName.value) return

    try {
      const cardano = (window as any).cardano
      const api = await cardano[walletName.value].enable()
      const balanceHex = await api.getBalance()
      balance.value = parseBalance(balanceHex)
      assets.value = await parseUtxosForAssets(api)
    } catch (e) {
      console.error('Failed to refresh balance:', e)
    }
  }

  return {
    // State
    isConnected,
    address,
    networkId,
    balance,
    walletName,
    assets,
    isConnecting,
    error,
    // Getters
    networkName,
    balanceADA,
    shortAddress,
    state,
    // Actions
    connect,
    disconnect,
    refreshBalance,
  }
})

// Helper functions
function parseBalance(balanceHex: string): bigint {
  // Simplified CBOR parsing - in real implementation use proper CBOR library
  // This assumes the balance is a simple integer
  try {
    // For now, return a placeholder - actual implementation would parse CBOR
    return BigInt(parseInt(balanceHex.slice(0, 16), 16) || 0)
  } catch {
    return 0n
  }
}

async function parseUtxosForAssets(api: any): Promise<Asset[]> {
  // Placeholder - actual implementation would parse UTxOs
  try {
    const utxos = await api.getUtxos()
    // Parse UTxOs and extract assets
    // This is simplified - real implementation needs CBOR parsing
    return []
  } catch {
    return []
  }
}
