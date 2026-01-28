/**
 * Test Run API Routes
 */

import { Hono } from 'hono'
import * as testService from '../services/test.service'

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
 */
test.get('/runs/latest', async (c) => {
  try {
    const run = await testService.getLatestTestRun()
    if (!run) {
      return c.json({ run: null })
    }
    return c.json({ run })
  } catch (err) {
    console.error('Get latest test run error:', err)
    return c.json({ error: String(err) }, 500)
  }
})

/**
 * GET /api/test/runs/:id - Get test run by ID
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

    return c.json({ run })
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

    const run = await testService.updateTestRunState(id, state)
    if (!run) {
      return c.json({ error: 'Test run not found' }, 404)
    }

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

export default test
