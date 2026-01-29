/**
 * Testnet Service - handles Preview and Preprod testnet operations
 * Supports multiple providers with automatic fallback: Kupo, Blockfrost, Maestro, Koios
 */

export type TestnetNetwork = 'preview' | 'preprod'

export interface TestnetWalletBalance {
  address: string
  lovelace: bigint
  assets: { unit: string; quantity: bigint }[]
}

interface ProviderConfig {
  url: string
  key: string
  headerName: string
}

// Provider configurations from .env - organized by network
const PROVIDERS: Record<TestnetNetwork, Record<string, ProviderConfig>> = {
  preview: {
    kupo: {
      url: process.env.KUPO_ENDPOINT_PREVIEW || '',
      key: '', // Kupo typically doesn't require auth
      headerName: '',
    },
    blockfrost: {
      url: 'https://cardano-preview.blockfrost.io/api/v0',
      key: process.env.BLOCKFROST_PREVIEW || '',
      headerName: 'project_id',
    },
    maestro: {
      url: 'https://preview.gomaestro-api.org/v1',
      key: process.env.MAESTRO_PREVIEW || '',
      headerName: 'api-key',
    },
    koios: {
      url: 'https://preview.koios.rest/api/v1',
      key: '', // Koios doesn't require API key for basic queries
      headerName: '',
    },
  },
  preprod: {
    kupo: {
      url: process.env.KUPO_ENDPOINT_PREPROD || '',
      key: '', // Kupo typically doesn't require auth
      headerName: '',
    },
    blockfrost: {
      url: 'https://cardano-preprod.blockfrost.io/api/v0',
      key: process.env.BLOCKFROST_PREPROD || '',
      headerName: 'project_id',
    },
    maestro: {
      url: 'https://preprod.gomaestro-api.org/v1',
      key: process.env.MAESTRO_PREPROD || '',
      headerName: 'api-key',
    },
    koios: {
      url: 'https://preprod.koios.rest/api/v1',
      key: '', // Koios doesn't require API key for basic queries
      headerName: '',
    },
  },
}

// Provider priority order - Kupo first if configured (local/fast), then cloud providers
const PROVIDER_PRIORITY = ['kupo', 'blockfrost', 'maestro', 'koios'] as const
type ProviderName = typeof PROVIDER_PRIORITY[number]

// Track current working provider per network
const currentProvider: Record<TestnetNetwork, ProviderName | null> = {
  preview: null,
  preprod: null,
}

// Default network
let defaultNetwork: TestnetNetwork = 'preview'

/**
 * Set the default network
 */
export function setDefaultNetwork(network: TestnetNetwork): void {
  defaultNetwork = network
  console.log(`[Testnet] Default network set to: ${network}`)
}

/**
 * Get current default network
 */
export function getDefaultNetwork(): TestnetNetwork {
  return defaultNetwork
}

/**
 * Check if a specific provider is configured for a network
 */
function isProviderConfigured(name: ProviderName, network: TestnetNetwork = defaultNetwork): boolean {
  const provider = PROVIDERS[network][name]
  // Koios doesn't need a key
  if (name === 'koios') return true
  // Kupo uses URL from env var - check if URL is set
  if (name === 'kupo') return provider.url.length > 0
  // Other providers need API keys
  return provider.key.length > 0
}

/**
 * Get first configured provider for a network
 */
function getConfiguredProvider(network: TestnetNetwork = defaultNetwork): ProviderName | null {
  // If we already found a working provider for this network, use it
  if (currentProvider[network] && isProviderConfigured(currentProvider[network]!, network)) {
    return currentProvider[network]
  }

  // Find first configured provider
  for (const name of PROVIDER_PRIORITY) {
    if (isProviderConfigured(name, network)) {
      currentProvider[network] = name
      console.log(`[Testnet] Using provider for ${network}: ${name}`)
      return name
    }
  }
  return null
}

/**
 * Check if any provider is configured
 */
export function isBlockfrostConfigured(network: TestnetNetwork = defaultNetwork): boolean {
  return getConfiguredProvider(network) !== null
}

/**
 * Get provider status for debugging
 */
export function getProviderStatus(network: TestnetNetwork = defaultNetwork): {
  configured: boolean
  provider: string | null
  available: string[]
  network: TestnetNetwork
} {
  const available = PROVIDER_PRIORITY.filter(p => isProviderConfigured(p, network))
  const provider = getConfiguredProvider(network)
  return {
    configured: provider !== null,
    provider,
    available,
    network,
  }
}

/**
 * Fetch balance using Kupo API (self-hosted chain indexer)
 * Kupo returns UTxOs - we sum up all lovelace values
 */
async function fetchBalanceKupo(address: string, network: TestnetNetwork): Promise<bigint> {
  const provider = PROVIDERS[network].kupo
  // Kupo uses /matches/{pattern}?unspent for UTxO queries
  const response = await fetch(`${provider.url}/matches/${address}?unspent`, {
    headers: provider.key ? { 'Authorization': `Bearer ${provider.key}` } : {},
  })

  if (response.status === 404) return 0n
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Kupo error: ${response.status} - ${errorText}`)
  }

  const utxos = await response.json() as Array<{ value: { coins: number } }>
  // Sum up all lovelace (coins) from unspent UTxOs
  const totalLovelace = utxos.reduce((sum, utxo) => sum + BigInt(utxo.value?.coins || 0), 0n)
  return totalLovelace
}

/**
 * Fetch balance using Blockfrost API
 */
async function fetchBalanceBlockfrost(address: string, network: TestnetNetwork): Promise<bigint> {
  const provider = PROVIDERS[network].blockfrost
  const response = await fetch(`${provider.url}/addresses/${address}`, {
    headers: { [provider.headerName]: provider.key },
  })

  if (response.status === 404) return 0n
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Blockfrost error: ${response.status} - ${errorText}`)
  }

  const data = await response.json() as { amount?: { unit: string; quantity: string }[] }
  const lovelace = data.amount?.find((a) => a.unit === 'lovelace')
  return lovelace ? BigInt(lovelace.quantity) : 0n
}

/**
 * Fetch balance using Maestro API
 */
async function fetchBalanceMaestro(address: string, network: TestnetNetwork): Promise<bigint> {
  const provider = PROVIDERS[network].maestro
  const response = await fetch(`${provider.url}/addresses/${address}`, {
    headers: { [provider.headerName]: provider.key },
  })

  if (response.status === 404) return 0n
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Maestro error: ${response.status} - ${errorText}`)
  }

  const data = await response.json() as { data?: { balance?: string } }
  return data.data?.balance ? BigInt(data.data.balance) : 0n
}

/**
 * Fetch balance using Koios API
 */
async function fetchBalanceKoios(address: string, network: TestnetNetwork): Promise<bigint> {
  const provider = PROVIDERS[network].koios
  const response = await fetch(`${provider.url}/address_info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ _addresses: [address] }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Koios error: ${response.status} - ${errorText}`)
  }

  const data = await response.json() as { balance?: string }[]
  if (!data || data.length === 0) return 0n
  return data[0].balance ? BigInt(data[0].balance) : 0n
}

/**
 * Get wallet balance from testnet with provider fallback
 */
export async function getTestnetBalance(address: string, network: TestnetNetwork = defaultNetwork): Promise<bigint> {
  const errors: string[] = []

  for (const providerName of PROVIDER_PRIORITY) {
    if (!isProviderConfigured(providerName, network)) continue

    try {
      let balance: bigint

      switch (providerName) {
        case 'kupo':
          balance = await fetchBalanceKupo(address, network)
          break
        case 'blockfrost':
          balance = await fetchBalanceBlockfrost(address, network)
          break
        case 'maestro':
          balance = await fetchBalanceMaestro(address, network)
          break
        case 'koios':
          balance = await fetchBalanceKoios(address, network)
          break
        default:
          continue
      }

      // Success - remember this provider for next time
      currentProvider[network] = providerName
      return balance
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${providerName}: ${msg}`)
      console.warn(`[Testnet] ${providerName} failed on ${network}:`, msg)
      // Try next provider
    }
  }

  throw new Error(`All providers failed for ${network}. Errors: ${errors.join('; ')}`)
}

/**
 * Fetch UTxOs using Kupo API
 */
async function fetchUtxosKupo(address: string, network: TestnetNetwork): Promise<unknown[]> {
  const provider = PROVIDERS[network].kupo
  const response = await fetch(`${provider.url}/matches/${address}?unspent`, {
    headers: provider.key ? { 'Authorization': `Bearer ${provider.key}` } : {},
  })

  if (response.status === 404) return []
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Kupo error: ${response.status} - ${errorText}`)
  }

  return await response.json() as unknown[]
}

/**
 * Fetch UTxOs using Blockfrost API
 */
async function fetchUtxosBlockfrost(address: string, network: TestnetNetwork): Promise<unknown[]> {
  const provider = PROVIDERS[network].blockfrost
  const response = await fetch(`${provider.url}/addresses/${address}/utxos`, {
    headers: { [provider.headerName]: provider.key },
  })

  if (response.status === 404) return []
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Blockfrost error: ${response.status} - ${errorText}`)
  }

  return await response.json() as unknown[]
}

/**
 * Get wallet UTxOs from testnet with provider fallback
 */
export async function getTestnetUtxos(address: string, network: TestnetNetwork = defaultNetwork): Promise<unknown[]> {
  const errors: string[] = []

  for (const providerName of PROVIDER_PRIORITY) {
    if (!isProviderConfigured(providerName, network)) continue

    try {
      let utxos: unknown[]

      if (providerName === 'kupo') {
        utxos = await fetchUtxosKupo(address, network)
        currentProvider[network] = providerName
        return utxos
      }

      if (providerName === 'blockfrost') {
        utxos = await fetchUtxosBlockfrost(address, network)
        currentProvider[network] = providerName
        return utxos
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${providerName}: ${msg}`)
      console.warn(`[Testnet] ${providerName} UTxO fetch failed on ${network}:`, msg)
    }
  }

  // If no UTxO providers worked, return empty (address may not have UTxOs)
  return []
}

/**
 * Get multiple wallet balances in parallel
 */
export async function getTestnetBalances(addresses: string[], network: TestnetNetwork = defaultNetwork): Promise<Map<string, bigint>> {
  const results = new Map<string, bigint>()

  const promises = addresses.map(async (address) => {
    try {
      const balance = await getTestnetBalance(address, network)
      results.set(address, balance)
    } catch (err) {
      console.error(`Failed to get balance for ${address} on ${network}:`, err)
      results.set(address, 0n)
    }
  })

  await Promise.all(promises)
  return results
}

/**
 * Check which wallets need funding based on required amounts
 */
export async function checkFundingNeeds(
  wallets: { address: string; requiredAda: number }[],
  network: TestnetNetwork = defaultNetwork
): Promise<{ address: string; currentAda: number; requiredAda: number; needsFunding: boolean }[]> {
  const results = []

  for (const wallet of wallets) {
    try {
      const balance = await getTestnetBalance(wallet.address, network)
      const currentAda = Number(balance) / 1_000_000
      results.push({
        address: wallet.address,
        currentAda,
        requiredAda: wallet.requiredAda,
        needsFunding: currentAda < wallet.requiredAda,
      })
    } catch (err) {
      console.error(`Failed to check funding for ${wallet.address} on ${network}:`, err)
      results.push({
        address: wallet.address,
        currentAda: 0,
        requiredAda: wallet.requiredAda,
        needsFunding: true,
      })
    }
  }

  return results
}

export default {
  setDefaultNetwork,
  getDefaultNetwork,
  isBlockfrostConfigured,
  getProviderStatus,
  getTestnetBalance,
  getTestnetUtxos,
  getTestnetBalances,
  checkFundingNeeds,
}
