/**
 * Loan Contract Routes
 *
 * API endpoints for loan contract operations via emulator.
 */

import { Hono } from 'hono'
import {
  mintTestToken,
  getWalletTokens,
  getWalletState,
  createLoanContract,
  acceptLoan,
  makePayment,
  collectPayment,
  completeLoan,
  cancelLoan,
  claimDefault,
  updateLoanTerms,
  clearContractStore,
  getAllContracts,
  getContractState,
  getOnChainContractState,
  type CreateLoanParams,
  type AcceptLoanParams,
  type MakePaymentParams,
  type CollectPaymentParams,
  type CompleteLoanParams,
  type CancelLoanParams,
  type ClaimDefaultParams,
  type UpdateTermsParams,
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
 * GET /wallet/:walletName - Get full wallet state (ADA + all tokens)
 */
loan.get('/wallet/:walletName', async (c) => {
  try {
    const walletName = c.req.param('walletName')
    const state = await getWalletState(walletName)

    return c.json({
      success: true,
      wallet: {
        name: state.walletName,
        address: state.address,
        lovelace: state.lovelace.toString(),
        ada: state.ada,
        assets: state.assets.map((a) => ({
          policyId: a.policyId,
          assetName: a.assetName,
          quantity: a.quantity.toString(),
        })),
      },
    })
  } catch (err) {
    console.error('Get wallet state error:', err)
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
      processId: result.processId,
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
 * POST /complete - Complete loan transfer (buyer receives base asset)
 */
loan.post('/complete', async (c) => {
  try {
    const body = (await c.req.json()) as CompleteLoanParams

    if (!body.buyerWalletName || !body.contractAddress) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    const result = await completeLoan(body)

    return c.json({
      success: true,
      txHash: result.txHash,
      contractAddress: result.contractAddress,
    })
  } catch (err) {
    console.error('Complete error:', err)
    return c.json({ error: String(err) }, 500)
  }
})

/**
 * POST /cancel - Cancel loan (seller retrieves base asset)
 */
loan.post('/cancel', async (c) => {
  try {
    const body = (await c.req.json()) as CancelLoanParams

    if (!body.sellerWalletName || !body.contractAddress) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    const result = await cancelLoan(body)

    return c.json({
      success: true,
      txHash: result.txHash,
      contractAddress: result.contractAddress,
    })
  } catch (err) {
    console.error('Cancel error:', err)
    return c.json({ error: String(err) }, 500)
  }
})

/**
 * POST /default - Claim default (seller retrieves base asset after default)
 */
loan.post('/default', async (c) => {
  try {
    const body = (await c.req.json()) as ClaimDefaultParams

    if (!body.sellerWalletName || !body.contractAddress) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    const result = await claimDefault(body)

    return c.json({
      success: true,
      txHash: result.txHash,
      contractAddress: result.contractAddress,
    })
  } catch (err) {
    console.error('Default error:', err)
    return c.json({ error: String(err) }, 500)
  }
})

/**
 * POST /update - Update loan terms (seller updates before buyer acceptance)
 */
loan.post('/update', async (c) => {
  try {
    const body = (await c.req.json()) as UpdateTermsParams

    if (!body.sellerWalletName || !body.contractAddress) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    const result = await updateLoanTerms(body)

    return c.json({
      success: true,
      txHash: result.txHash,
      contractAddress: result.contractAddress,
    })
  } catch (err) {
    console.error('Update terms error:', err)
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

// Helper to serialize objects with BigInt values
function serializeWithBigInt(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'bigint') return obj.toString()
  if (Array.isArray(obj)) return obj.map(serializeWithBigInt)
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeWithBigInt(value)
    }
    return result
  }
  return obj
}

// Helper to deeply parse stringified JSON
function deepParseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value
  let parsed = value
  let attempts = 0
  while (typeof parsed === 'string' && attempts < 3) {
    try {
      parsed = JSON.parse(parsed)
      attempts++
    } catch {
      break
    }
  }
  return parsed
}

/**
 * GET /debug/datum/:address - Debug: show raw datum from database AND on-chain
 */
loan.get('/debug/datum/:address', async (c) => {
  try {
    const address = c.req.param('address')
    const contract = await getContractState(address)
    if (!contract) {
      return c.json({ error: 'Contract not found in DB' }, 404)
    }

    // Parse datum if it's stored as a string (handles multiple levels of stringification)
    const contractDatum = deepParseJson(contract.dbRecord?.contractDatum)

    // Also get the true on-chain state (with BigInt serialization)
    const onChainState = await getOnChainContractState(address)
    const serializedOnChain = serializeWithBigInt(onChainState)

    return c.json({
      success: true,
      address,
      // DB cached state (with parsed datum)
      dbRecord: serializeWithBigInt(contract.dbRecord),
      contractDatum: contractDatum,
      contractDatumType: typeof contractDatum,
      contractDatumKeys: contractDatum && typeof contractDatum === 'object' ? Object.keys(contractDatum) : [],
      // True on-chain state
      onChain: serializedOnChain,
    })
  } catch (err) {
    console.error('Debug datum error:', err)
    return c.json({ error: String(err) }, 500)
  }
})

/**
 * GET /onchain/:address - Get the TRUE on-chain state (not DB cache)
 * Returns the actual UTXO data from the emulator/blockchain
 */
loan.get('/onchain/:address', async (c) => {
  try {
    const address = c.req.param('address')
    const onChainState = await getOnChainContractState(address)

    if (!onChainState) {
      return c.json({ error: 'Could not query on-chain state' }, 500)
    }

    return c.json({
      success: true,
      address,
      ...onChainState,
    })
  } catch (err) {
    console.error('On-chain state error:', err)
    return c.json({ error: String(err) }, 500)
  }
})

export default loan
