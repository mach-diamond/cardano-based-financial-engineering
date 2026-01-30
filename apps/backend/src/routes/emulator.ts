/**
 * Emulator API Routes
 */

import { Hono } from 'hono'
import {
  initializeEmulator,
  getEmulatorState,
  resetEmulator,
  selectWallet,
  getWalletUtxos,
  getWalletBalance,
  advanceTime,
  getCurrentSlot,
} from '../services/emulator.service'

const emulator = new Hono()

/**
 * POST /api/emulator/init - Initialize emulator with wallets
 */
emulator.post('/init', async (c) => {
  try {
    const body = await c.req.json()
    const { wallets: walletConfigs } = body

    if (!walletConfigs || !Array.isArray(walletConfigs)) {
      return c.json({ error: 'wallets array required' }, 400)
    }

    const result = await initializeEmulator(walletConfigs)

    // Don't expose seed phrases to frontend - just addresses
    const safeWallets = result.wallets.map((w) => ({
      name: w.name,
      role: w.role,
      address: w.address,
      paymentKeyHash: w.paymentKeyHash,
      balance: w.balance.toString(),
    }))

    return c.json({
      success: true,
      wallets: safeWallets,
    })
  } catch (err) {
    console.error('Emulator init error:', err)
    return c.json({ error: String(err) }, 500)
  }
})

/**
 * GET /api/emulator/status - Get emulator status
 */
emulator.get('/status', (c) => {
  const state = getEmulatorState()
  if (!state) {
    return c.json({ initialized: false })
  }

  return c.json({
    initialized: true,
    walletCount: state.wallets.length,
    wallets: state.wallets.map((w) => ({
      name: w.name,
      role: w.role,
      address: w.address,
      balance: w.balance.toString(),
    })),
  })
})

/**
 * POST /api/emulator/reset - Reset emulator and clear contracts
 */
emulator.post('/reset', async (c) => {
  resetEmulator()
  // Also clear contracts from database - import at top if needed
  try {
    const { clearContractStore } = await import('../services/loan.service')
    await clearContractStore()
  } catch (err) {
    console.warn('Could not clear contract store:', err)
  }
  return c.json({ success: true })
})

/**
 * POST /api/emulator/select-wallet - Select active wallet
 */
emulator.post('/select-wallet', async (c) => {
  try {
    const { walletName } = await c.req.json()
    const success = await selectWallet(walletName)
    return c.json({ success })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

/**
 * GET /api/emulator/utxos/:address - Get UTxOs for address
 */
emulator.get('/utxos/:address', async (c) => {
  try {
    const address = c.req.param('address')
    const utxos = await getWalletUtxos(address)

    // Serialize BigInt values
    const serializedUtxos = utxos.map((u) => ({
      ...u,
      assets: Object.fromEntries(
        Object.entries(u.assets).map(([k, v]) => [k, v.toString()])
      ),
    }))

    return c.json({ utxos: serializedUtxos })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

/**
 * GET /api/emulator/balance/:address - Get balance for address
 */
emulator.get('/balance/:address', async (c) => {
  try {
    const address = c.req.param('address')
    const balance = await getWalletBalance(address)
    return c.json({ balance: balance.toString() })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

/**
 * POST /api/emulator/advance-time - Advance emulator time
 */
emulator.post('/advance-time', async (c) => {
  try {
    const { slots } = await c.req.json()
    const result = advanceTime(slots || 1)
    return c.json({
      success: true,
      slot: result.newSlot,
      timestamp: result.timestamp,
    })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

/**
 * GET /api/emulator/current-slot - Get current emulator slot
 */
emulator.get('/current-slot', async (c) => {
  try {
    const slot = getCurrentSlot()
    return c.json({ slot, timestamp: Date.now() + (slot * 1000) })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

export default emulator
