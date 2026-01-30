/**
 * Loan Contract Routes
 *
 * API endpoints for loan contract operations via emulator.
 */

import { Hono } from 'hono'
import {
  mintTestToken,
  getWalletTokens,
  createLoanContract,
  acceptLoan,
  makePayment,
  collectPayment,
  clearContractStore,
  getAllContracts,
  getContractState,
  type CreateLoanParams,
  type AcceptLoanParams,
  type MakePaymentParams,
  type CollectPaymentParams,
} from '../services/loan.service'

const loan = new Hono()

/**
 * POST /mint - Mint test tokens for a wallet
 */
loan.post('/mint', async (c) => {
  try {
    const body = await c.req.json()
    const { walletName, policyId, assetName, quantity } = body

    if (!walletName || !assetName || !quantity) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    const result = await mintTestToken(
      walletName,
      policyId || 'test_policy',
      assetName,
      quantity
    )

    return c.json({ success: true, ...result })
  } catch (err) {
    console.error('Mint error:', err)
    return c.json({ error: String(err) }, 500)
  }
})

/**
 * GET /tokens/:walletName - Get tokens owned by a wallet
 */
loan.get('/tokens/:walletName', async (c) => {
  try {
    const walletName = c.req.param('walletName')
    const tokens = await getWalletTokens(walletName)

    return c.json({
      success: true,
      tokens: tokens.map((t) => ({
        policyId: t.policyId,
        assetName: t.assetName,
        quantity: t.quantity.toString(),
      })),
    })
  } catch (err) {
    console.error('Get tokens error:', err)
    return c.json({ error: String(err) }, 500)
  }
})

/**
 * POST /create - Create a new loan contract
 */
loan.post('/create', async (c) => {
  try {
    const body = (await c.req.json()) as CreateLoanParams

    if (!body.sellerWalletName || !body.asset || !body.terms) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    const result = await createLoanContract(body)

    return c.json({
      success: true,
      txHash: result.txHash,
      contractAddress: result.contractAddress,
      policyId: result.policyId,
    })
  } catch (err) {
    console.error('Create loan error:', err)
    return c.json({ error: String(err) }, 500)
  }
})

/**
 * POST /accept - Accept loan terms and make initial payment
 */
loan.post('/accept', async (c) => {
  try {
    const body = (await c.req.json()) as AcceptLoanParams

    if (!body.buyerWalletName || !body.contractAddress) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    const result = await acceptLoan(body)

    return c.json({
      success: true,
      txHash: result.txHash,
      contractAddress: result.contractAddress,
    })
  } catch (err) {
    console.error('Accept loan error:', err)
    return c.json({ error: String(err) }, 500)
  }
})

/**
 * POST /pay - Make a payment on a loan
 */
loan.post('/pay', async (c) => {
  try {
    const body = (await c.req.json()) as MakePaymentParams

    if (!body.buyerWalletName || !body.contractAddress || body.amount === undefined) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    const result = await makePayment(body)

    return c.json({
      success: true,
      txHash: result.txHash,
      contractAddress: result.contractAddress,
    })
  } catch (err) {
    console.error('Payment error:', err)
    return c.json({ error: String(err) }, 500)
  }
})

/**
 * POST /collect - Seller collects payments
 */
loan.post('/collect', async (c) => {
  try {
    const body = (await c.req.json()) as CollectPaymentParams

    if (!body.sellerWalletName || !body.contractAddress) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    const result = await collectPayment(body)

    return c.json({
      success: true,
      txHash: result.txHash,
      contractAddress: result.contractAddress,
    })
  } catch (err) {
    console.error('Collect error:', err)
    return c.json({ error: String(err) }, 500)
  }
})

/**
 * GET /contracts - Get all contracts
 */
loan.get('/contracts', async (c) => {
  try {
    const contracts = await getAllContracts()
    return c.json({
      success: true,
      contracts: contracts.map((contract) => ({
        address: contract.address,
        policyId: contract.dbRecord?.policyId || contract.script?.hash,
        state: contract.state,
        metadata: contract.metadata,
      })),
    })
  } catch (err) {
    console.error('Get contracts error:', err)
    return c.json({ error: String(err) }, 500)
  }
})

/**
 * GET /contracts/:address - Get a specific contract
 */
loan.get('/contracts/:address', async (c) => {
  try {
    const address = c.req.param('address')
    const contract = await getContractState(address)
    if (!contract) {
      return c.json({ error: 'Contract not found' }, 404)
    }
    return c.json({
      success: true,
      contract: {
        address,
        ...contract,
      },
    })
  } catch (err) {
    console.error('Get contract error:', err)
    return c.json({ error: String(err) }, 500)
  }
})

/**
 * POST /clear - Clear all contracts (for test reset)
 */
loan.post('/clear', async (c) => {
  try {
    await clearContractStore()
    return c.json({ success: true, message: 'Contracts cleared' })
  } catch (err) {
    console.error('Clear contracts error:', err)
    return c.json({ error: String(err) }, 500)
  }
})

/**
 * GET /debug/datum/:address - Debug: show raw datum from database
 */
loan.get('/debug/datum/:address', async (c) => {
  try {
    const address = c.req.param('address')
    const contract = await getContractState(address)
    if (!contract) {
      return c.json({ error: 'Contract not found' }, 404)
    }
    return c.json({
      success: true,
      address,
      dbRecord: contract.dbRecord,
      contractDatum: contract.dbRecord?.contractDatum,
      contractDatumType: typeof contract.dbRecord?.contractDatum,
      contractDatumKeys: contract.dbRecord?.contractDatum ? Object.keys(contract.dbRecord.contractDatum) : [],
    })
  } catch (err) {
    console.error('Debug datum error:', err)
    return c.json({ error: String(err) }, 500)
  }
})

export default loan
