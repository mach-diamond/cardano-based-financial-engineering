/**
 * Test Service
 * Handles test run state storage and retrieval
 *
 * This is a pipeline runner - tracks execution of test phases/steps,
 * breakpoints, contract references, and configuration used.
 */

import sql from '../db'

export type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped'

export interface PhaseStep {
  id: string
  name: string
  status: TestStatus
  executedAt?: string | null
  txHash?: string | null
  error?: string | null
  // Step-specific data
  action?: string
  originatorId?: string
  borrowerId?: string
  asset?: string
  qty?: number
  principal?: number
  amount?: number
  wallets?: Array<{ role: string; name: string }>
}

export interface Phase {
  id: number
  name: string
  description: string
  status: TestStatus
  expanded: boolean
  steps: PhaseStep[]
  startedAt?: string | null
  completedAt?: string | null
}

export interface Breakpoint {
  phaseId: number
  enabled: boolean
  pauseAfter: boolean  // true = pause after phase, false = pause before
}

export interface TestRunState {
  phases: Phase[]
  identities: Array<{
    id: string
    name: string
    role: string
    address: string
    wallets: Array<{
      id: string
      name: string
      address: string
      balance: string
      assets: Array<{
        policyId: string
        assetName: string
        quantity: string
      }>
    }>
  }>
  loanContracts: Array<{
    id: string
    alias?: string
    subtype?: string
    collateral?: {
      quantity: number
      assetName: string
      policyId: string
    }
    principal: number
    apr: number
    installments?: number
    termLength?: string
    status: TestStatus
    borrower?: string
    originator?: string
    contractAddress?: string
    policyId?: string
    state?: {
      isActive: boolean
      isPaidOff: boolean
      isDefaulted: boolean
      balance: number
    }
  }>
  cloContracts: Array<{
    id: string
    alias?: string
    subtype?: string
    tranches: Array<{
      name: string
      allocation: number
      yieldModifier: number
    }>
    totalValue: number
    collateralCount: number
    status: TestStatus
    manager?: string
  }>
  currentPhase: number
  completedSteps: number
  totalSteps: number
  breakpoints: Breakpoint[]
}

export interface TestRun {
  id: number
  name: string
  description: string | null
  networkMode: 'emulator' | 'preview' | 'preprod'
  status: TestStatus
  configHash: string | null        // Hash of config used for this run
  state: TestRunState
  contractIds: number[]            // References to contracts table
  startedAt: Date
  completedAt: Date | null
  pausedAt: Date | null            // When hit a breakpoint
  error: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateTestRunInput {
  name: string
  description?: string
  networkMode: 'emulator' | 'preview' | 'preprod'
  configHash?: string
  state: TestRunState
}

/**
 * Create a new test run
 */
export async function createTestRun(input: CreateTestRunInput): Promise<TestRun> {
  const [testRun] = await sql<TestRun[]>`
    INSERT INTO test_runs (name, description, network_mode, status, config_hash, state, started_at)
    VALUES (
      ${input.name},
      ${input.description || null},
      ${input.networkMode},
      'running',
      ${input.configHash || null},
      ${JSON.stringify(input.state)},
      NOW()
    )
    RETURNING
      id,
      name,
      description,
      network_mode as "networkMode",
      status,
      config_hash as "configHash",
      state,
      contract_ids as "contractIds",
      started_at as "startedAt",
      completed_at as "completedAt",
      paused_at as "pausedAt",
      error,
      created_at as "createdAt",
      updated_at as "updatedAt"
  `
  return testRun
}

/**
 * Get all test runs
 */
export async function getAllTestRuns(limit = 20): Promise<TestRun[]> {
  return sql<TestRun[]>`
    SELECT
      id,
      name,
      description,
      network_mode as "networkMode",
      status,
      config_hash as "configHash",
      state,
      contract_ids as "contractIds",
      started_at as "startedAt",
      completed_at as "completedAt",
      paused_at as "pausedAt",
      error,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM test_runs
    ORDER BY created_at DESC
    LIMIT ${limit}
  `
}

/**
 * Get test run by ID
 */
export async function getTestRun(id: number): Promise<TestRun | null> {
  const [testRun] = await sql<TestRun[]>`
    SELECT
      id,
      name,
      description,
      network_mode as "networkMode",
      status,
      config_hash as "configHash",
      state,
      contract_ids as "contractIds",
      started_at as "startedAt",
      completed_at as "completedAt",
      paused_at as "pausedAt",
      error,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM test_runs
    WHERE id = ${id}
  `
  return testRun || null
}

/**
 * Get the latest test run
 */
export async function getLatestTestRun(): Promise<TestRun | null> {
  const [testRun] = await sql<TestRun[]>`
    SELECT
      id,
      name,
      description,
      network_mode as "networkMode",
      status,
      config_hash as "configHash",
      state,
      contract_ids as "contractIds",
      started_at as "startedAt",
      completed_at as "completedAt",
      paused_at as "pausedAt",
      error,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM test_runs
    ORDER BY created_at DESC
    LIMIT 1
  `
  return testRun || null
}

/**
 * Update test run state
 */
export async function updateTestRunState(
  id: number,
  state: TestRunState,
  contractIds?: number[]
): Promise<TestRun | null> {
  const [testRun] = await sql<TestRun[]>`
    UPDATE test_runs
    SET
      state = ${JSON.stringify(state)},
      contract_ids = COALESCE(${contractIds || null}, contract_ids),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING
      id,
      name,
      description,
      network_mode as "networkMode",
      status,
      config_hash as "configHash",
      state,
      contract_ids as "contractIds",
      started_at as "startedAt",
      completed_at as "completedAt",
      paused_at as "pausedAt",
      error,
      created_at as "createdAt",
      updated_at as "updatedAt"
  `
  return testRun || null
}

/**
 * Pause test run at a breakpoint
 */
export async function pauseTestRun(
  id: number,
  state: TestRunState
): Promise<TestRun | null> {
  const [testRun] = await sql<TestRun[]>`
    UPDATE test_runs
    SET
      state = ${JSON.stringify(state)},
      status = 'pending',
      paused_at = NOW(),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING
      id,
      name,
      description,
      network_mode as "networkMode",
      status,
      config_hash as "configHash",
      state,
      contract_ids as "contractIds",
      started_at as "startedAt",
      completed_at as "completedAt",
      paused_at as "pausedAt",
      error,
      created_at as "createdAt",
      updated_at as "updatedAt"
  `
  return testRun || null
}

/**
 * Resume a paused test run
 */
export async function resumeTestRun(id: number): Promise<TestRun | null> {
  const [testRun] = await sql<TestRun[]>`
    UPDATE test_runs
    SET
      status = 'running',
      paused_at = NULL,
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING
      id,
      name,
      description,
      network_mode as "networkMode",
      status,
      config_hash as "configHash",
      state,
      contract_ids as "contractIds",
      started_at as "startedAt",
      completed_at as "completedAt",
      paused_at as "pausedAt",
      error,
      created_at as "createdAt",
      updated_at as "updatedAt"
  `
  return testRun || null
}

/**
 * Complete test run (mark as passed or failed)
 */
export async function completeTestRun(
  id: number,
  status: 'passed' | 'failed',
  error?: string
): Promise<TestRun | null> {
  const [testRun] = await sql<TestRun[]>`
    UPDATE test_runs
    SET
      status = ${status},
      completed_at = NOW(),
      paused_at = NULL,
      error = ${error || null},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING
      id,
      name,
      description,
      network_mode as "networkMode",
      status,
      config_hash as "configHash",
      state,
      contract_ids as "contractIds",
      started_at as "startedAt",
      completed_at as "completedAt",
      paused_at as "pausedAt",
      error,
      created_at as "createdAt",
      updated_at as "updatedAt"
  `
  return testRun || null
}

/**
 * Delete test run
 */
export async function deleteTestRun(id: number): Promise<boolean> {
  const result = await sql`
    DELETE FROM test_runs
    WHERE id = ${id}
  `
  return result.count > 0
}

/**
 * Delete all test runs
 */
export async function deleteAllTestRuns(): Promise<void> {
  await sql`DELETE FROM test_runs`
}

/**
 * Initialize test_runs table if not exists
 * Also handles migration from old schema (mode -> network_mode)
 */
export async function initTestRunsTable(): Promise<void> {
  // Check if table exists with old schema (has 'mode' column instead of 'network_mode')
  const [oldSchemaCheck] = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'test_runs' AND column_name = 'mode'
    ) as exists
  `

  if (oldSchemaCheck?.exists) {
    console.log('Migrating test_runs table from old schema (mode -> network_mode)...')
    // Drop the old table and recreate with correct schema
    await sql`DROP TABLE IF EXISTS test_runs CASCADE`
  }

  await sql`
    CREATE TABLE IF NOT EXISTS test_runs (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      network_mode VARCHAR(20) NOT NULL DEFAULT 'emulator',
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      config_hash VARCHAR(64),
      state JSONB NOT NULL DEFAULT '{}',
      contract_ids INTEGER[] DEFAULT '{}',
      started_at TIMESTAMP WITH TIME ZONE,
      completed_at TIMESTAMP WITH TIME ZONE,
      paused_at TIMESTAMP WITH TIME ZONE,
      error TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `

  // Create indexes
  await sql`
    CREATE INDEX IF NOT EXISTS idx_test_runs_status ON test_runs(status)
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_test_runs_network_mode ON test_runs(network_mode)
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_test_runs_config_hash ON test_runs(config_hash)
  `

  console.log('test_runs table initialized')
}
