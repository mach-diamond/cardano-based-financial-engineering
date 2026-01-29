/**
 * Testnet Service - handles Preview testnet operations
 * Supports multiple providers with automatic fallback: Blockfrost, Maestro, Koios
 */

export interface TestnetWalletBalance {
  address: string
  lovelace: bigint
  assets: { unit: string; quantity: bigint }[]
}

// Provider configurations from .env
const PROVIDERS = {
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
}

// Provider priority order
const PROVIDER_PRIORITY = ['blockfrost', 'maestro', 'koios'] as const
type ProviderName = typeof PROVIDER_PRIORITY[number]

// Track current working provider
let currentProvider: ProviderName | null = null

/**
 * Get first configured provider
 */
function getConfiguredProvider(): ProviderName | null {
  // If we already found a working provider, use it
  if (currentProvider && isProviderConfigured(currentProvider)) {
    return currentProvider
  }

  // Find first configured provider
  for (const name of PROVIDER_PRIORITY) {
    if (isProviderConfigured(name)) {
      currentProvider = name
      console.log(`[Testnet] Using provider: ${name}`)
      return name
    }
  }
  return null
}

/**
 * Check if a specific provider is configured
 */
function isProviderConfigured(name: ProviderName): boolean {
  const provider = PROVIDERS[name]
  // Koios doesn't need a key, others do
  if (name === 'koios') return true
  return provider.key.length > 0
}

/**
 * Check if any provider is configured
 */
export function isBlockfrostConfigured(): boolean {
  return getConfiguredProvider() !== null
}

/**
 * Get provider status for debugging
 */
export function getProviderStatus(): { configured: boolean; provider: string | null; available: string[] } {
  const available = PROVIDER_PRIORITY.filter(isProviderConfigured)
  const provider = getConfiguredProvider()
  return {
    configured: provider !== null,
    provider,
    available,
  }
}

/**
 * Fetch balance using Blockfrost API
 */
async function fetchBalanceBlockfrost(address: string): Promise<bigint> {
  const provider = PROVIDERS.blockfrost
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
async function fetchBalanceMaestro(address: string): Promise<bigint> {
  const provider = PROVIDERS.maestro
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
async function fetchBalanceKoios(address: string): Promise<bigint> {
  const provider = PROVIDERS.koios
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
export async function getTestnetBalance(address: string): Promise<bigint> {
  const errors: string[] = []

  for (const providerName of PROVIDER_PRIORITY) {
    if (!isProviderConfigured(providerName)) continue

    try {
      let balance: bigint

      switch (providerName) {
        case 'blockfrost':
          balance = await fetchBalanceBlockfrost(address)
          break
        case 'maestro':
          balance = await fetchBalanceMaestro(address)
          break
        case 'koios':
          balance = await fetchBalanceKoios(address)
          break
        default:
          continue
      }

      // Success - remember this provider for next time
      currentProvider = providerName
      return balance
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${providerName}: ${msg}`)
      console.warn(`[Testnet] ${providerName} failed:`, msg)
      // Try next provider
    }
  }

  throw new Error(`All providers failed. Errors: ${errors.join('; ')}`)
}

/**
 * Fetch UTxOs using Blockfrost API
 */
async function fetchUtxosBlockfrost(address: string): Promise<unknown[]> {
  const provider = PROVIDERS.blockfrost
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
export async function getTestnetUtxos(address: string): Promise<unknown[]> {
  const errors: string[] = []

  for (const providerName of PROVIDER_PRIORITY) {
    if (!isProviderConfigured(providerName)) continue

    try {
      // Currently only Blockfrost UTxO endpoint is implemented
      if (providerName === 'blockfrost') {
        const utxos = await fetchUtxosBlockfrost(address)
        currentProvider = providerName
        return utxos
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${providerName}: ${msg}`)
      console.warn(`[Testnet] ${providerName} UTxO fetch failed:`, msg)
    }
  }

  // If no UTxO providers worked, return empty (address may not have UTxOs)
  return []
}

/**
 * Get multiple wallet balances in parallel
 */
export async function getTestnetBalances(addresses: string[]): Promise<Map<string, bigint>> {
  const results = new Map<string, bigint>()

  const promises = addresses.map(async (address) => {
    try {
      const balance = await getTestnetBalance(address)
      results.set(address, balance)
    } catch (err) {
      console.error(`Failed to get balance for ${address}:`, err)
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
  wallets: { address: string; requiredAda: number }[]
): Promise<{ address: string; currentAda: number; requiredAda: number; needsFunding: boolean }[]> {
  const results = []

  for (const wallet of wallets) {
    try {
      const balance = await getTestnetBalance(wallet.address)
      const currentAda = Number(balance) / 1_000_000
      results.push({
        address: wallet.address,
        currentAda,
        requiredAda: wallet.requiredAda,
        needsFunding: currentAda < wallet.requiredAda,
      })
    } catch (err) {
      console.error(`Failed to check funding for ${wallet.address}:`, err)
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
  isBlockfrostConfigured,
  getProviderStatus,
  getTestnetBalance,
  getTestnetUtxos,
  getTestnetBalances,
  checkFundingNeeds,
}
