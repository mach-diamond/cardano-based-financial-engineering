/**
 * Wallet API Routes
 */

import { Hono } from 'hono'
import * as walletService from '../services/wallet.service'
import {
  Lucid,
  Emulator,
  generateSeedPhrase,
  paymentCredentialOf,
} from '@lucid-evolution/lucid'

const wallets = new Hono()

/**
 * POST /wallets/generate - Generate a real Cardano wallet address
 * Uses Lucid to create a proper address that works on Preview testnet
 */
wallets.post('/generate', async (c) => {
  try {
    // Create temporary Lucid instance to generate address
    const tempEmulator = new Emulator([])
    const lucid = await Lucid(tempEmulator, 'Preview')

    const seedPhrase = generateSeedPhrase()
    lucid.selectWallet.fromSeed(seedPhrase)
    const address = await lucid.wallet().address()
    const paymentKeyHash = paymentCredentialOf(address).hash

    return c.json({
      seedPhrase,
      address,
      paymentKeyHash,
    })
  } catch (err) {
    return c.json({ error: String(err) }, 500)
  }
})

/**
 * GET /wallets - Get all wallets
 */
wallets.get('/', async (c) => {
    try {
        const allWallets = await walletService.getAllWallets()
        // Don't expose private keys in list response
        const safeWallets = allWallets.map(({ privateKey, ...w }) => w)
        return c.json({ wallets: safeWallets })
    } catch (err) {
        return c.json({ error: String(err) }, 500)
    }
})

/**
 * GET /wallets/config - Get test setup configuration
 */
wallets.get('/config', (c) => {
    return c.json(walletService.getTestConfig())
})

/**
 * GET /wallets/role/:role - Get wallets by role
 */
wallets.get('/role/:role', async (c) => {
    const role = c.req.param('role') as 'Originator' | 'Borrower' | 'Analyst' | 'Investor'

    if (!['Originator', 'Borrower', 'Analyst', 'Investor'].includes(role)) {
        return c.json({ error: 'Invalid role' }, 400)
    }

    try {
        const roleWallets = await walletService.getWalletsByRole(role)
        const safeWallets = roleWallets.map(({ privateKey, ...w }) => w)
        return c.json({ wallets: safeWallets })
    } catch (err) {
        return c.json({ error: String(err) }, 500)
    }
})

/**
 * GET /wallets/address/:address - Get wallet by address
 */
wallets.get('/address/:address', async (c) => {
    const address = c.req.param('address')

    try {
        const wallet = await walletService.getWalletByAddress(address)
        if (!wallet) {
            return c.json({ error: 'Wallet not found' }, 404)
        }
        const { privateKey, ...safeWallet } = wallet
        return c.json(safeWallet)
    } catch (err) {
        return c.json({ error: String(err) }, 500)
    }
})

/**
 * GET /wallets/:id/assets - Get assets for wallet
 */
wallets.get('/:id/assets', async (c) => {
    const id = parseInt(c.req.param('id'))

    if (isNaN(id)) {
        return c.json({ error: 'Invalid wallet ID' }, 400)
    }

    try {
        const assets = await walletService.getWalletAssets(id)
        return c.json({ assets })
    } catch (err) {
        return c.json({ error: String(err) }, 500)
    }
})

/**
 * POST /wallets - Create a new wallet
 */
wallets.post('/', async (c) => {
    try {
        const body = await c.req.json()

        const { name, role, address, paymentKeyHash, stakingKeyHash, privateKey } = body

        if (!name || !role || !address || !paymentKeyHash || !privateKey) {
            return c.json({ error: 'Missing required fields' }, 400)
        }

        if (!['Originator', 'Borrower', 'Analyst', 'Investor'].includes(role)) {
            return c.json({ error: 'Invalid role' }, 400)
        }

        const wallet = await walletService.createWallet({
            name,
            role,
            address,
            paymentKeyHash,
            stakingKeyHash,
            privateKey
        })

        // Don't return private key
        const { privateKey: _, ...safeWallet } = wallet
        return c.json(safeWallet, 201)
    } catch (err) {
        const errorMsg = String(err)
        if (errorMsg.includes('unique constraint')) {
            return c.json({ error: 'Wallet with this address already exists' }, 409)
        }
        return c.json({ error: errorMsg }, 500)
    }
})

/**
 * POST /wallets/:id/assets - Add asset to wallet
 */
wallets.post('/:id/assets', async (c) => {
    const id = parseInt(c.req.param('id'))

    if (isNaN(id)) {
        return c.json({ error: 'Invalid wallet ID' }, 400)
    }

    try {
        const { policyId, assetName, quantity } = await c.req.json()

        if (!policyId || !assetName || quantity === undefined) {
            return c.json({ error: 'Missing required fields' }, 400)
        }

        const asset = await walletService.addWalletAsset(id, policyId, assetName, quantity)
        return c.json(asset, 201)
    } catch (err) {
        return c.json({ error: String(err) }, 500)
    }
})

/**
 * DELETE /wallets - Delete all wallets (test reset)
 */
wallets.delete('/', async (c) => {
    try {
        await walletService.deleteAllWallets()
        return c.json({ message: 'All wallets deleted' })
    } catch (err) {
        return c.json({ error: String(err) }, 500)
    }
})

export default wallets
