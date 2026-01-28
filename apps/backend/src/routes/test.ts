/**
 * Test Run API Routes
 */

import { Hono } from 'hono'
import * as testService from '../services/test.service'
import * as contractService from '../services/contract.service'

const test = new Hono()

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
      cloContractsFromDB: cloContracts.length
    })

    // Transform contracts to frontend format
    const loanContractsForFrontend = loanContracts.map(c => ({
      id: c.processId,
      alias: c.alias,
      subtype: c.contractSubtype,
      collateral: c.contractData?.collateral,
      principal: c.contractData?.principal || 0,
      apr: c.contractData?.apr || 0,
      termLength: c.contractData?.termLength,
      installments: c.contractData?.installments,
      status: c.statusCode >= 3 ? 'passed' : 'pending',
      borrower: c.contractData?.borrower,
      originator: c.contractData?.originator,
      contractAddress: c.contractAddress,
      policyId: c.policyId,
      state: c.contractDatum
    }))

    const cloContractsForFrontend = cloContracts.map(c => ({
      id: c.processId,
      alias: c.alias,
      subtype: c.contractSubtype,
      tranches: c.contractData?.tranches || [],
      totalValue: (c.contractDatum as any)?.totalValue || 0,
      collateralCount: c.contractData?.collateralCount || 0,
      status: c.statusCode >= 3 ? 'passed' : 'pending',
      manager: c.contractData?.manager
    }))

    // Augment run.state with contracts from DB
    const augmentedRun = {
      ...run,
      state: {
        ...run.state,
        loanContracts: loanContractsForFrontend,
        cloContracts: cloContractsForFrontend
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

    console.log('Get test run by ID:', {
      id: run.id,
      loanContractsFromDB: loanContracts.length,
      cloContractsFromDB: cloContracts.length
    })

    // Transform contracts to frontend format
    const loanContractsForFrontend = loanContracts.map(c => ({
      id: c.processId,
      alias: c.alias,
      subtype: c.contractSubtype,
      collateral: c.contractData?.collateral,
      principal: c.contractData?.principal || 0,
      apr: c.contractData?.apr || 0,
      termLength: c.contractData?.termLength,
      installments: c.contractData?.installments,
      status: c.statusCode >= 3 ? 'passed' : 'pending',
      borrower: c.contractData?.borrower,
      originator: c.contractData?.originator,
      contractAddress: c.contractAddress,
      policyId: c.policyId,
      state: c.contractDatum
    }))

    const cloContractsForFrontend = cloContracts.map(c => ({
      id: c.processId,
      alias: c.alias,
      subtype: c.contractSubtype,
      tranches: c.contractData?.tranches || [],
      totalValue: (c.contractDatum as any)?.totalValue || 0,
      collateralCount: c.contractData?.collateralCount || 0,
      status: c.statusCode >= 3 ? 'passed' : 'pending',
      manager: c.contractData?.manager
    }))

    // Augment run.state with contracts from DB
    const augmentedRun = {
      ...run,
      state: {
        ...run.state,
        loanContracts: loanContractsForFrontend,
        cloContracts: cloContractsForFrontend
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
