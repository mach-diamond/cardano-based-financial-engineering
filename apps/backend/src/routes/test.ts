/**
 * Test Run API Routes
 */

import { Hono } from 'hono'
import * as testService from '../services/test.service'
import * as contractService from '../services/contract.service'

const test = new Hono()

// Helper function to transform contracts to frontend format
// Status codes: 1=Draft, 2=Pending, 3=Deployed, 4=Active, 5=Closed
function getContractStatus(statusCode: number, datum: any): string {
  if (datum?.isPaidOff) return 'passed'
  if (datum?.isDefaulted) return 'failed'
  if (datum?.isCancelled) return 'failed'
  // Map status codes to frontend status
  switch (statusCode) {
    case 5: return 'passed'  // Closed
    case 4: return 'running' // Active - being paid
    case 3: return 'running' // Deployed - awaiting acceptance
    default: return 'pending' // Draft or Pending
  }
}

function transformLoanContracts(contracts: contractService.ProcessSmartContract[]) {
  return contracts.map(c => {
    const datum = c.contractDatum as any || {}
    const principal = c.contractData?.principal || 0
    return {
      id: c.processId,
      alias: c.alias,
      subtype: c.contractSubtype,
      collateral: c.contractData?.collateral,
      principal,
      apr: c.contractData?.apr || 0,
      termLength: c.contractData?.termLength,
      installments: c.contractData?.installments,
      status: getContractStatus(c.statusCode, datum),
      borrower: c.contractData?.borrower,
      originator: c.contractData?.originator,
      contractAddress: c.contractAddress,
      policyId: c.policyId,
      datumHistory: c.datumHistory || [],
      state: {
        balance: datum.balance ?? principal,
        isActive: datum.isActive ?? false,
        isPaidOff: datum.isPaidOff ?? false,
        isDefaulted: datum.isDefaulted ?? false,
        isCancelled: datum.isCancelled ?? false,
        startTime: datum.startTime || null,
        paymentCount: datum.paymentCount ?? 0,
        lastPayment: datum.lastPayment || datum.last_payment || null
      }
    }
  })
}

function transformCLOContracts(contracts: contractService.ProcessSmartContract[]) {
  return contracts.map(c => ({
    id: c.processId,
    alias: c.alias,
    subtype: c.contractSubtype,
    tranches: c.contractData?.tranches || [],
    totalValue: (c.contractDatum as any)?.totalValue || 0,
    collateralCount: c.contractData?.collateralCount || 0,
    status: c.statusCode >= 3 ? 'passed' : 'pending',
    manager: c.contractData?.manager
  }))
}

/**
 * GET /api/test/runs - Get all test runs
 */
test.get('/runs', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '20')
    const runs = await testService.getAllTestRuns(limit)
    return c.json({ runs })
  } catch (err) {
    console.error('Get test runs error:', err)
    return c.json({ error: String(err) }, 500)
  }
})

/**
 * GET /api/test/runs/latest - Get the latest test run
 * Also loads contracts from process_smart_contract table
 */
test.get('/runs/latest', async (c) => {
  try {
    const run = await testService.getLatestTestRun()
    if (!run) {
      console.log('Get latest test run: No run found')
      return c.json({ run: null })
    }

    // Load contracts from process_smart_contract table
    const contracts = await contractService.getContractsByTestRunId(run.id)
    const loanContracts = contracts.filter(c => c.contractType === 'Transfer')
    const cloContracts = contracts.filter(c => c.contractType === 'CLO')

    console.log('Get latest test run:', {
      id: run.id,
      status: run.status,
      loanContractsFromDB: loanContracts.length,
      cloContractsFromDB: cloContracts.length,
      loanContractsFromState: run.state?.loanContracts?.length || 0,
      cloContractsFromState: run.state?.cloContracts?.length || 0
    })

    // Transform contracts to frontend format
    const loanContractsForFrontend = transformLoanContracts(loanContracts)
    const cloContractsForFrontend = transformCLOContracts(cloContracts)

    // ALWAYS prefer saved state contracts over DB contracts
    // Saved state has the complete frontend representation with all computed fields
    // DB contracts are mainly for persistence and may lose data during transformation
    const finalLoanContracts = (run.state?.loanContracts?.length > 0)
      ? run.state.loanContracts
      : loanContractsForFrontend
    const finalCloContracts = (run.state?.cloContracts?.length > 0)
      ? run.state.cloContracts
      : cloContractsForFrontend

    // Augment run.state with contracts from DB (or fallback to saved state)
    const augmentedRun = {
      ...run,
      state: {
        ...run.state,
        loanContracts: finalLoanContracts,
        cloContracts: finalCloContracts
      }
    }

    return c.json({ run: augmentedRun })
  } catch (err) {
    console.error('Get latest test run error:', err)
    return c.json({ error: String(err) }, 500)
  }
})

/**
 * GET /api/test/runs/:id - Get test run by ID
 * Also loads contracts from process_smart_contract table
 */
test.get('/runs/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) {
      return c.json({ error: 'Invalid ID' }, 400)
    }

    const run = await testService.getTestRun(id)
    if (!run) {
      return c.json({ error: 'Test run not found' }, 404)
    }

    // Load contracts from process_smart_contract table
    const contracts = await contractService.getContractsByTestRunId(id)
    const loanContracts = contracts.filter(c => c.contractType === 'Transfer')
    const cloContracts = contracts.filter(c => c.contractType === 'CLO')

    // Detailed logging to debug state restoration
    const firstIdentity = run.state?.identities?.[0]
    const firstWallet = firstIdentity?.wallets?.[0]
    console.log('Get test run by ID:', {
      id: run.id,
      loanContractsFromDB: loanContracts.length,
      cloContractsFromDB: cloContracts.length,
      loanContractsFromState: run.state?.loanContracts?.length || 0,
      cloContractsFromState: run.state?.cloContracts?.length || 0,
      identitiesCount: run.state?.identities?.length || 0,
      phasesCount: run.state?.phases?.length || 0,
      firstIdentityId: firstIdentity?.id,
      firstWalletName: firstWallet?.name,
      firstWalletBalance: firstWallet?.balance
    })

    // Transform contracts to frontend format
    const loanContractsForFrontend = transformLoanContracts(loanContracts)
    const cloContractsForFrontend = transformCLOContracts(cloContracts)

    // ALWAYS prefer saved state contracts over DB contracts
    // Saved state has the complete frontend representation with all computed fields
    // DB contracts are mainly for persistence and may lose data during transformation
    const finalLoanContracts = (run.state?.loanContracts?.length > 0)
      ? run.state.loanContracts
      : loanContractsForFrontend
    const finalCloContracts = (run.state?.cloContracts?.length > 0)
      ? run.state.cloContracts
      : cloContractsForFrontend

    // Augment run.state with contracts from DB (or fallback to saved state)
    const augmentedRun = {
      ...run,
      state: {
        ...run.state,
        loanContracts: finalLoanContracts,
        cloContracts: finalCloContracts
      }
    }

    return c.json({ run: augmentedRun })
  } catch (err) {
    console.error('Get test run error:', err)
    return c.json({ error: String(err) }, 500)
  }
})

/**
 * POST /api/test/runs - Create a new test run
 */
test.post('/runs', async (c) => {
  try {
    const body = await c.req.json()
    const { name, description, networkMode, state } = body

    if (!name || !networkMode || !state) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    const run = await testService.createTestRun({
      name,
      description,
      networkMode,
      state,
    })

    return c.json({ run }, 201)
  } catch (err) {
    console.error('Create test run error:', err)
    return c.json({ error: String(err) }, 500)
  }
})

/**
 * PUT /api/test/runs/:id/state - Update test run state
 */
test.put('/runs/:id/state', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) {
      return c.json({ error: 'Invalid ID' }, 400)
    }

    const { state } = await c.req.json()
    if (!state) {
      return c.json({ error: 'State is required' }, 400)
    }

    // Debug logging
    console.log('Update test run state:', {
      id,
      loanContractsCount: state.loanContracts?.length || 0,
      cloContractsCount: state.cloContracts?.length || 0,
      identitiesCount: state.identities?.length || 0,
      phasesCount: state.phases?.length || 0
    })

    const run = await testService.updateTestRunState(id, state)
    if (!run) {
      return c.json({ error: 'Test run not found' }, 404)
    }

    console.log('State updated successfully, returning run with:', {
      loanContractsInResult: run.state?.loanContracts?.length || 0,
      cloContractsInResult: run.state?.cloContracts?.length || 0
    })

    return c.json({ run })
  } catch (err) {
    console.error('Update test run state error:', err)
    return c.json({ error: String(err) }, 500)
  }
})

/**
 * PUT /api/test/runs/:id/complete - Complete a test run
 */
test.put('/runs/:id/complete', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) {
      return c.json({ error: 'Invalid ID' }, 400)
    }

    const { status, error } = await c.req.json()
    if (!status || !['passed', 'failed'].includes(status)) {
      return c.json({ error: 'Invalid status' }, 400)
    }

    const run = await testService.completeTestRun(id, status, error)
    if (!run) {
      return c.json({ error: 'Test run not found' }, 404)
    }

    return c.json({ run })
  } catch (err) {
    console.error('Complete test run error:', err)
    return c.json({ error: String(err) }, 500)
  }
})

/**
 * DELETE /api/test/runs/:id - Delete a test run
 */
test.delete('/runs/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) {
      return c.json({ error: 'Invalid ID' }, 400)
    }

    const deleted = await testService.deleteTestRun(id)
    if (!deleted) {
      return c.json({ error: 'Test run not found' }, 404)
    }

    return c.json({ success: true })
  } catch (err) {
    console.error('Delete test run error:', err)
    return c.json({ error: String(err) }, 500)
  }
})

/**
 * DELETE /api/test/runs - Delete all test runs
 */
test.delete('/runs', async (c) => {
  try {
    await testService.deleteAllTestRuns()
    return c.json({ success: true })
  } catch (err) {
    console.error('Delete all test runs error:', err)
    return c.json({ error: String(err) }, 500)
  }
})

// ============================================================================
// Contract Routes - stored in process_smart_contract table
// ============================================================================

/**
 * POST /api/test/contracts - Create a new contract
 */
test.post('/contracts', async (c) => {
  try {
    const body = await c.req.json()
    const {
      testRunId,
      contractType,
      contractSubtype,
      alias,
      contractData,
      contractDatum,
      contractAddress,
      policyId,
      networkId = 0
    } = body

    if (!contractType) {
      return c.json({ error: 'contractType is required' }, 400)
    }

    const contract = await contractService.createContract({
      testRunId,
      contractType,
      contractSubtype,
      alias,
      contractData,
      contractDatum,
      contractAddress,
      policyId,
      networkId
    })

    console.log('Created contract:', {
      processId: contract.processId,
      type: contract.contractType,
      testRunId: contract.testRunId
    })

    return c.json({ contract }, 201)
  } catch (err) {
    console.error('Create contract error:', err)
    return c.json({ error: String(err) }, 500)
  }
})

/**
 * GET /api/test/contracts - Get all contracts for a test run
 */
test.get('/contracts', async (c) => {
  try {
    const testRunId = c.req.query('testRunId')
    const contractType = c.req.query('type')

    let contracts: contractService.ProcessSmartContract[]

    if (testRunId) {
      if (contractType) {
        contracts = await contractService.getContractsByType(
          contractType as contractService.ContractType,
          parseInt(testRunId)
        )
      } else {
        contracts = await contractService.getContractsByTestRunId(parseInt(testRunId))
      }
    } else {
      contracts = await contractService.getAllContracts()
    }

    return c.json({ contracts })
  } catch (err) {
    console.error('Get contracts error:', err)
    return c.json({ error: String(err) }, 500)
  }
})

/**
 * GET /api/test/contracts/:id - Get contract by process ID
 */
test.get('/contracts/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const contract = await contractService.getContractByProcessId(id)

    if (!contract) {
      return c.json({ error: 'Contract not found' }, 404)
    }

    return c.json({ contract })
  } catch (err) {
    console.error('Get contract error:', err)
    return c.json({ error: String(err) }, 500)
  }
})

/**
 * PUT /api/test/contracts/:id/datum - Update contract datum
 */
test.put('/contracts/:id/datum', async (c) => {
  try {
    const id = c.req.param('id')
    const { datum, tx } = await c.req.json()

    if (!datum) {
      return c.json({ error: 'datum is required' }, 400)
    }

    const contract = await contractService.updateContractDatum(id, datum, tx)

    if (!contract) {
      return c.json({ error: 'Contract not found' }, 404)
    }

    return c.json({ contract })
  } catch (err) {
    console.error('Update contract datum error:', err)
    return c.json({ error: String(err) }, 500)
  }
})

/**
 * PATCH /api/test/contracts/:id - Update contract data and/or datum
 */
test.patch('/contracts/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { contractData, contractDatum, statusCode, testRunId, tx } = await c.req.json()

    if (!contractData && !contractDatum && statusCode === undefined && testRunId === undefined) {
      return c.json({ error: 'At least one of contractData, contractDatum, statusCode, or testRunId is required' }, 400)
    }

    const contract = await contractService.updateContractState(id, {
      contractData,
      contractDatum,
      statusCode,
      testRunId
    }, tx)

    if (!contract) {
      return c.json({ error: 'Contract not found' }, 404)
    }

    console.log('Updated contract state:', {
      processId: contract.processId,
      isActive: (contract.contractDatum as any)?.isActive,
      borrower: (contract.contractData as any)?.borrower
    })

    return c.json({ contract })
  } catch (err) {
    console.error('Update contract state error:', err)
    return c.json({ error: String(err) }, 500)
  }
})

/**
 * DELETE /api/test/contracts/:id - Delete a contract
 */
test.delete('/contracts/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const deleted = await contractService.deleteContract(id)

    if (!deleted) {
      return c.json({ error: 'Contract not found' }, 404)
    }

    return c.json({ success: true })
  } catch (err) {
    console.error('Delete contract error:', err)
    return c.json({ error: String(err) }, 500)
  }
})

/**
 * GET /api/test/contracts/:id/history - Get datum history for a contract
 */
test.get('/contracts/:id/history', async (c) => {
  try {
    const id = c.req.param('id')
    const history = await contractService.getDatumHistory(id)

    return c.json({
      success: true,
      history,
      count: history.length
    })
  } catch (err) {
    console.error('Get datum history error:', err)
    return c.json({ error: String(err) }, 500)
  }
})

/**
 * DELETE /api/test/contracts - Delete all contracts (for test reset)
 */
test.delete('/contracts', async (c) => {
  try {
    const testRunId = c.req.query('testRunId')

    if (testRunId) {
      const count = await contractService.deleteContractsByTestRunId(parseInt(testRunId))
      return c.json({ success: true, deleted: count })
    }

    await contractService.deleteAllContracts()
    return c.json({ success: true })
  } catch (err) {
    console.error('Delete contracts error:', err)
    return c.json({ error: String(err) }, 500)
  }
})

export default test
