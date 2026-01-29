/**
 * Testnet API Routes
 * Handles Preview testnet operations via multiple providers (Blockfrost, Maestro, Koios)
 */

import { Hono } from 'hono'
import {
  isBlockfrostConfigured,
  getProviderStatus,
  getTestnetBalance,
  getTestnetUtxos,
  getTestnetBalances,
  checkFundingNeeds,
} from '../services/testnet.service'

const testnet = new Hono()

/**
 * GET /api/testnet/status - Check provider configuration status
 */
testnet.get('/status', (c) => {
  const status = getProviderStatus()
  return c.json({
    ...status,
    network: 'preview',
  })
})

/**
 * GET /api/testnet/balance/:address - Get balance for address on testnet
 */
testnet.get('/balance/:address', async (c) => {
  try {
    const address = c.req.param('address')
    const balance = await getTestnetBalance(address)
    return c.json({
      address,
      balance: balance.toString(),
      balanceAda: Number(balance) / 1_000_000,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('not configured')) {
      return c.json({ error: message }, 503)
    }
    return c.json({ error: message }, 500)
  }
})

/**
 * GET /api/testnet/utxos/:address - Get UTxOs for address on testnet
 */
testnet.get('/utxos/:address', async (c) => {
  try {
    const address = c.req.param('address')
    const utxos = await getTestnetUtxos(address)
    return c.json({ utxos })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('not configured')) {
      return c.json({ error: message }, 503)
    }
    return c.json({ error: message }, 500)
  }
})

/**
 * POST /api/testnet/balances - Get balances for multiple addresses
 */
testnet.post('/balances', async (c) => {
  try {
    const { addresses } = await c.req.json()

    if (!addresses || !Array.isArray(addresses)) {
      return c.json({ error: 'addresses array required' }, 400)
    }

    const balances = await getTestnetBalances(addresses)

    // Convert Map to object with string balances
    const result: Record<string, { balance: string; balanceAda: number }> = {}
    balances.forEach((balance, address) => {
      result[address] = {
        balance: balance.toString(),
        balanceAda: Number(balance) / 1_000_000,
      }
    })

    return c.json({ balances: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('not configured')) {
      return c.json({ error: message }, 503)
    }
    return c.json({ error: message }, 500)
  }
})

/**
 * POST /api/testnet/check-funding - Check which wallets need funding
 */
testnet.post('/check-funding', async (c) => {
  try {
    const { wallets } = await c.req.json()

    if (!wallets || !Array.isArray(wallets)) {
      return c.json({ error: 'wallets array required with { address, requiredAda }' }, 400)
    }

    const fundingNeeds = await checkFundingNeeds(wallets)

    const totalNeeded = fundingNeeds
      .filter(w => w.needsFunding)
      .reduce((sum, w) => sum + Math.max(0, w.requiredAda - w.currentAda), 0)

    const walletsNeedingFunding = fundingNeeds.filter(w => w.needsFunding).length

    return c.json({
      wallets: fundingNeeds,
      summary: {
        totalWallets: wallets.length,
        walletsNeedingFunding,
        totalAdaNeeded: totalNeeded,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('not configured')) {
      return c.json({ error: message }, 503)
    }
    return c.json({ error: message }, 500)
  }
})

export default testnet
