/**
 * Contract Service
 * Handles contract storage and retrieval from database
 *
 * Follows the process_smart_contract schema pattern:
 * - process_id: UUID primary key
 * - contract_datum: Current state (json)
 * - contract_data: Initial conditions (json)
 * - contract_type: 'Transfer', 'CLO', 'Fracture', etc.
 * - contract_subtype: 'Asset-Backed', 'Waterfall', etc.
 * - status_code: 1=Draft, 2=Pending, 3=Deployed, 4=Active, 5=Closed
 * - txs: Transaction history array
 */

import sql from '../db'

export type ContractType = 'Transfer' | 'CLO' | 'Fracture' | 'Lease' | 'Raise' | 'Revenue Split'
export type ContractSubtype = 'Asset-Backed' | 'Waterfall' | 'Instant Distribution' | string

// Status codes matching your existing schema
export const STATUS_CODES = {
  DRAFT: 1,
  PENDING: 2,
  DEPLOYED: 3,
  ACTIVE: 4,
  CLOSED: 5,
} as const

export type StatusCode = typeof STATUS_CODES[keyof typeof STATUS_CODES]

// Contract datum - current state (for loans)
export interface LoanContractDatum {
  buyer: string | null
  baseAsset: {
    policyId: string
    assetName: string
    quantity: number
  }
  terms: {
    principal: number
    apr: number
    frequency: number
    installments: number
    time: number | null
    fees: {
      lateFee: number
      transferFeeSeller: number
      transferFeeBuyer: number
      referralFee: number
      referralFeeAddr: string | null
    }
  }
  balance: number
  lastPayment: {
    amount: number
    time: number
  } | null
  isActive: boolean
  isPaidOff: boolean
  isDefaulted: boolean
}

// Contract datum - current state (for CLO)
export interface CLOContractDatum {
  manager: string
  tranches: Array<{
    name: string
    allocation: number
    yieldModifier: number
    tokensMinted: number
    tokensDistributed: number
  }>
  collateralTokens: string[] // Policy IDs of underlying loans
  totalValue: number
  distributedValue: number
  isActive: boolean
  isMatured: boolean
}

// Contract data - initial conditions
export interface ContractData {
  // Loan-specific
  collateral?: {
    policyId: string
    assetName: string
    quantity: number
  }
  principal?: number
  apr?: number
  termLength?: string
  installments?: number
  // CLO-specific
  tranches?: Array<{
    name: string
    allocation: number
    yieldModifier: number
  }>
  collateralCount?: number
  // Common
  originator?: string
  borrower?: string
  manager?: string
}

// Datum history entry with timestamp and action
export interface DatumHistoryEntry {
  datum: LoanContractDatum | CLOContractDatum | Record<string, unknown>
  timestamp: string // ISO date
  action: string // 'create', 'accept', 'pay', 'collect', 'complete', 'cancel', 'default'
  txHash?: string
}

export interface ProcessSmartContract {
  processId: string // UUID
  userId: number | null
  metadataForm: Record<string, unknown> | null
  contractDatum: LoanContractDatum | CLOContractDatum | null // Current state
  contractData: ContractData | null // Initial conditions
  contractAddress: string | null
  instantiated: Date
  modified: Date
  policyId: string | null
  contractType: ContractType
  deployment: Date | null
  contractVersion: string
  statusCode: StatusCode
  networkId: number
  contractSubtype: ContractSubtype | null
  alias: string | null
  txs: string[]
  datumHistory: DatumHistoryEntry[] | null // History of datum changes
  parameters: Record<string, unknown> | null
  raId: string | null // Reference to asset
  testRunId: number | null // Reference to test run
}

export interface CreateContractInput {
  userId?: number
  contractDatum?: LoanContractDatum | CLOContractDatum
  contractData?: ContractData
  contractAddress?: string
  policyId?: string
  contractType: ContractType
  contractSubtype?: ContractSubtype
  alias?: string
  networkId: number
  parameters?: Record<string, unknown>
  raId?: string
  testRunId?: number
  txHash?: string // TX hash for the create transaction
}

/**
 * Create a new contract in the database
 */
export async function createContract(input: CreateContractInput): Promise<ProcessSmartContract> {
  // Initialize datum history with the creation entry if datum is provided
  const initialHistory: DatumHistoryEntry[] = input.contractDatum ? [{
    datum: input.contractDatum,
    timestamp: new Date().toISOString(),
    action: 'create',
    txHash: input.txHash // Include TX hash if provided
  }] : []

  const [contract] = await sql<ProcessSmartContract[]>`
    INSERT INTO process_smart_contract (
      user_id, contract_datum, contract_data, contract_address, policy_id,
      contract_type, contract_subtype, alias, network_id, parameters, ra_id, test_run_id, status_code, datum_history
    )
    VALUES (
      ${input.userId || null},
      ${input.contractDatum ? sql.json(input.contractDatum) : null},
      ${input.contractData ? sql.json(input.contractData) : null},
      ${input.contractAddress || null},
      ${input.policyId || null},
      ${input.contractType},
      ${input.contractSubtype || null},
      ${input.alias || null},
      ${input.networkId},
      ${input.parameters ? sql.json(input.parameters) : null},
      ${input.raId || null},
      ${input.testRunId || null},
      ${STATUS_CODES.DEPLOYED},
      ${sql.json(initialHistory)}
    )
    RETURNING
      process_id as "processId",
      user_id as "userId",
      metadata_form as "metadataForm",
      contract_datum as "contractDatum",
      contract_data as "contractData",
      contract_address as "contractAddress",
      instantiated,
      modified,
      policy_id as "policyId",
      contract_type as "contractType",
      deployment,
      contract_version as "contractVersion",
      status_code as "statusCode",
      network_id as "networkId",
      contract_subtype as "contractSubtype",
      alias,
      txs,
      datum_history as "datumHistory",
      parameters,
      ra_id as "raId",
      test_run_id as "testRunId"
  `
  return contract
}

/**
 * Get all contracts
 */
export async function getAllContracts(networkId?: number): Promise<ProcessSmartContract[]> {
  if (networkId !== undefined) {
    return sql<ProcessSmartContract[]>`
      SELECT
        process_id as "processId",
        user_id as "userId",
        metadata_form as "metadataForm",
        contract_datum as "contractDatum",
        contract_data as "contractData",
        contract_address as "contractAddress",
        instantiated,
        modified,
        policy_id as "policyId",
        contract_type as "contractType",
        deployment,
        contract_version as "contractVersion",
        status_code as "statusCode",
        network_id as "networkId",
        contract_subtype as "contractSubtype",
        alias,
        txs,
        parameters,
        ra_id as "raId",
        test_run_id as "testRunId"
      FROM process_smart_contract
      WHERE network_id = ${networkId}
      ORDER BY instantiated DESC
    `
  }
  return sql<ProcessSmartContract[]>`
    SELECT
      process_id as "processId",
      user_id as "userId",
      metadata_form as "metadataForm",
      contract_datum as "contractDatum",
      contract_data as "contractData",
      contract_address as "contractAddress",
      instantiated,
      modified,
      policy_id as "policyId",
      contract_type as "contractType",
      deployment,
      contract_version as "contractVersion",
      status_code as "statusCode",
      network_id as "networkId",
      contract_subtype as "contractSubtype",
      alias,
      txs,
      datum_history as "datumHistory",
      parameters,
      ra_id as "raId",
      test_run_id as "testRunId"
    FROM process_smart_contract
    ORDER BY instantiated DESC
  `
}

/**
 * Get contracts by test run ID
 */
export async function getContractsByTestRunId(testRunId: number): Promise<ProcessSmartContract[]> {
  return sql<ProcessSmartContract[]>`
    SELECT
      process_id as "processId",
      user_id as "userId",
      metadata_form as "metadataForm",
      contract_datum as "contractDatum",
      contract_data as "contractData",
      contract_address as "contractAddress",
      instantiated,
      modified,
      policy_id as "policyId",
      contract_type as "contractType",
      deployment,
      contract_version as "contractVersion",
      status_code as "statusCode",
      network_id as "networkId",
      contract_subtype as "contractSubtype",
      alias,
      txs,
      datum_history as "datumHistory",
      parameters,
      ra_id as "raId",
      test_run_id as "testRunId"
    FROM process_smart_contract
    WHERE test_run_id = ${testRunId}
    ORDER BY instantiated DESC
  `
}

/**
 * Get contracts by type
 */
export async function getContractsByType(
  contractType: ContractType,
  testRunId?: number
): Promise<ProcessSmartContract[]> {
  if (testRunId !== undefined) {
    return sql<ProcessSmartContract[]>`
      SELECT
        process_id as "processId",
        user_id as "userId",
        metadata_form as "metadataForm",
        contract_datum as "contractDatum",
        contract_data as "contractData",
        contract_address as "contractAddress",
        instantiated,
        modified,
        policy_id as "policyId",
        contract_type as "contractType",
        deployment,
        contract_version as "contractVersion",
        status_code as "statusCode",
        network_id as "networkId",
        contract_subtype as "contractSubtype",
        alias,
        txs,
        parameters,
        ra_id as "raId",
        test_run_id as "testRunId"
      FROM process_smart_contract
      WHERE contract_type = ${contractType} AND test_run_id = ${testRunId}
      ORDER BY instantiated DESC
    `
  }
  return sql<ProcessSmartContract[]>`
    SELECT
      process_id as "processId",
      user_id as "userId",
      metadata_form as "metadataForm",
      contract_datum as "contractDatum",
      contract_data as "contractData",
      contract_address as "contractAddress",
      instantiated,
      modified,
      policy_id as "policyId",
      contract_type as "contractType",
      deployment,
      contract_version as "contractVersion",
      status_code as "statusCode",
      network_id as "networkId",
      contract_subtype as "contractSubtype",
      alias,
      txs,
      datum_history as "datumHistory",
      parameters,
      ra_id as "raId",
      test_run_id as "testRunId"
    FROM process_smart_contract
    WHERE contract_type = ${contractType}
    ORDER BY instantiated DESC
  `
}

/**
 * Get contract by process ID
 */
export async function getContractByProcessId(processId: string): Promise<ProcessSmartContract | null> {
  const [contract] = await sql<ProcessSmartContract[]>`
    SELECT
      process_id as "processId",
      user_id as "userId",
      metadata_form as "metadataForm",
      contract_datum as "contractDatum",
      contract_data as "contractData",
      contract_address as "contractAddress",
      instantiated,
      modified,
      policy_id as "policyId",
      contract_type as "contractType",
      deployment,
      contract_version as "contractVersion",
      status_code as "statusCode",
      network_id as "networkId",
      contract_subtype as "contractSubtype",
      alias,
      txs,
      datum_history as "datumHistory",
      parameters,
      ra_id as "raId",
      test_run_id as "testRunId"
    FROM process_smart_contract
    WHERE process_id = ${processId}::uuid
  `
  return contract || null
}

/**
 * Get contract by address
 */
export async function getContractByAddress(address: string): Promise<ProcessSmartContract | null> {
  // Order by modified DESC to get the most recently updated record
  // This handles edge cases where duplicate records might exist
  const [contract] = await sql<ProcessSmartContract[]>`
    SELECT
      process_id as "processId",
      user_id as "userId",
      metadata_form as "metadataForm",
      contract_datum as "contractDatum",
      contract_data as "contractData",
      contract_address as "contractAddress",
      instantiated,
      modified,
      policy_id as "policyId",
      contract_type as "contractType",
      deployment,
      contract_version as "contractVersion",
      status_code as "statusCode",
      network_id as "networkId",
      contract_subtype as "contractSubtype",
      alias,
      txs,
      datum_history as "datumHistory",
      parameters,
      ra_id as "raId",
      test_run_id as "testRunId"
    FROM process_smart_contract
    WHERE contract_address = ${address}
    ORDER BY modified DESC
    LIMIT 1
  `
  return contract || null
}

/**
 * Get contract by policy ID
 */
export async function getContractByPolicyId(policyId: string): Promise<ProcessSmartContract | null> {
  const [contract] = await sql<ProcessSmartContract[]>`
    SELECT
      process_id as "processId",
      user_id as "userId",
      metadata_form as "metadataForm",
      contract_datum as "contractDatum",
      contract_data as "contractData",
      contract_address as "contractAddress",
      instantiated,
      modified,
      policy_id as "policyId",
      contract_type as "contractType",
      deployment,
      contract_version as "contractVersion",
      status_code as "statusCode",
      network_id as "networkId",
      contract_subtype as "contractSubtype",
      alias,
      txs,
      datum_history as "datumHistory",
      parameters,
      ra_id as "raId",
      test_run_id as "testRunId"
    FROM process_smart_contract
    WHERE policy_id = ${policyId}
  `
  return contract || null
}

/**
 * Update contract datum (current state)
 */
export async function updateContractDatum(
  processId: string,
  datum: LoanContractDatum | CLOContractDatum,
  tx?: string,
  action?: string // 'accept', 'pay', 'collect', 'complete', 'cancel', 'default'
): Promise<ProcessSmartContract | null> {
  // Create history entry
  const historyEntry: DatumHistoryEntry = {
    datum,
    timestamp: new Date().toISOString(),
    action: action || 'update',
    txHash: tx
  }

  const [contract] = await sql<ProcessSmartContract[]>`
    UPDATE process_smart_contract
    SET
      contract_datum = ${sql.json(datum)},
      datum_history = COALESCE(datum_history, '[]'::jsonb) || ${sql.json([historyEntry])}::jsonb,
      modified = NOW()
      ${tx ? sql`, txs = array_append(txs, ${tx})` : sql``}
    WHERE process_id = ${processId}::uuid
    RETURNING
      process_id as "processId",
      user_id as "userId",
      metadata_form as "metadataForm",
      contract_datum as "contractDatum",
      contract_data as "contractData",
      contract_address as "contractAddress",
      instantiated,
      modified,
      policy_id as "policyId",
      contract_type as "contractType",
      deployment,
      contract_version as "contractVersion",
      status_code as "statusCode",
      network_id as "networkId",
      contract_subtype as "contractSubtype",
      alias,
      txs,
      datum_history as "datumHistory",
      parameters,
      ra_id as "raId",
      test_run_id as "testRunId"
  `
  return contract || null
}

/**
 * Update contract data and datum together (MERGES with existing data)
 * NOTE: This function MERGES updates with existing data, not replaces!
 * To fully replace, use updateContractDatum instead.
 */
export async function updateContractState(
  processId: string,
  updates: {
    contractData?: ContractData
    contractDatum?: LoanContractDatum | CLOContractDatum | Record<string, unknown>
    statusCode?: StatusCode
    action?: string // 'accept', 'pay', 'collect', 'complete', 'cancel', 'default'
  },
  tx?: string
): Promise<ProcessSmartContract | null> {
  // First, fetch the existing contract to merge data
  const existing = await getContractByProcessId(processId)
  if (!existing) {
    return null
  }

  const setClauses: string[] = ['modified = NOW()']
  const values: unknown[] = []
  let paramIndex = 1

  // Merge contractData with existing
  if (updates.contractData) {
    const mergedData = {
      ...(existing.contractData || {}),
      ...updates.contractData
    }
    setClauses.push(`contract_data = $${paramIndex}::json`)
    values.push(JSON.stringify(mergedData))
    paramIndex++
  }

  // MERGE contractDatum with existing (critical fix!)
  // This preserves baseAsset, terms, etc. when only updating balance/state
  if (updates.contractDatum) {
    // Handle case where existing datum is stored as a string (possibly multiple times stringified)
    let existingDatum: Record<string, unknown> = {}
    let rawDatum = existing.contractDatum

    // Keep parsing while we have a string (handles double/triple stringification)
    let parseAttempts = 0
    while (typeof rawDatum === 'string' && parseAttempts < 3) {
      try {
        rawDatum = JSON.parse(rawDatum)
        parseAttempts++
      } catch {
        console.warn(`[updateContractState] Could not parse datum at level ${parseAttempts + 1}`)
        break
      }
    }

    if (rawDatum && typeof rawDatum === 'object' && !Array.isArray(rawDatum)) {
      existingDatum = rawDatum as Record<string, unknown>
    }

    // Log what we're merging for debugging
    const existingKeys = Object.keys(existingDatum)
    const updateKeys = Object.keys(updates.contractDatum)
    console.log(`[updateContractState] Merging datum for ${processId}:`)
    console.log(`  Existing keys: ${existingKeys.join(', ') || '(none)'}`)
    console.log(`  Update keys: ${updateKeys.join(', ')}`)
    console.log(`  Has baseAsset: ${!!existingDatum.baseAsset}, has terms: ${!!existingDatum.terms}`)

    const mergedDatum = {
      ...existingDatum,
      ...updates.contractDatum
    }

    console.log(`  Merged keys: ${Object.keys(mergedDatum).join(', ')}`)

    setClauses.push(`contract_datum = $${paramIndex}::json`)
    values.push(JSON.stringify(mergedDatum))
    paramIndex++

    // Append to datum history
    const historyEntry: DatumHistoryEntry = {
      datum: mergedDatum,
      timestamp: new Date().toISOString(),
      action: updates.action || 'update',
      txHash: tx
    }
    setClauses.push(`datum_history = COALESCE(datum_history, '[]'::jsonb) || $${paramIndex}::jsonb`)
    values.push(JSON.stringify([historyEntry]))
    paramIndex++
  }

  if (updates.statusCode) {
    setClauses.push(`status_code = $${paramIndex}`)
    values.push(updates.statusCode)
    paramIndex++
  }

  if (tx) {
    setClauses.push(`txs = array_append(txs, $${paramIndex})`)
    values.push(tx)
    paramIndex++
  }

  values.push(processId)

  const query = `
    UPDATE process_smart_contract
    SET ${setClauses.join(', ')}
    WHERE process_id = $${paramIndex}::uuid
    RETURNING
      process_id as "processId",
      user_id as "userId",
      metadata_form as "metadataForm",
      contract_datum as "contractDatum",
      contract_data as "contractData",
      contract_address as "contractAddress",
      instantiated,
      modified,
      policy_id as "policyId",
      contract_type as "contractType",
      deployment,
      contract_version as "contractVersion",
      status_code as "statusCode",
      network_id as "networkId",
      contract_subtype as "contractSubtype",
      alias,
      txs,
      datum_history as "datumHistory",
      parameters,
      ra_id as "raId",
      test_run_id as "testRunId"
  `

  const result = await sql.unsafe<ProcessSmartContract[]>(query, values)
  return result[0] || null
}

/**
 * Update contract status
 */
export async function updateContractStatus(
  processId: string,
  statusCode: StatusCode,
  tx?: string
): Promise<ProcessSmartContract | null> {
  const [contract] = await sql<ProcessSmartContract[]>`
    UPDATE process_smart_contract
    SET
      status_code = ${statusCode},
      modified = NOW()
      ${tx ? sql`, txs = array_append(txs, ${tx})` : sql``}
    WHERE process_id = ${processId}::uuid
    RETURNING
      process_id as "processId",
      user_id as "userId",
      metadata_form as "metadataForm",
      contract_datum as "contractDatum",
      contract_data as "contractData",
      contract_address as "contractAddress",
      instantiated,
      modified,
      policy_id as "policyId",
      contract_type as "contractType",
      deployment,
      contract_version as "contractVersion",
      status_code as "statusCode",
      network_id as "networkId",
      contract_subtype as "contractSubtype",
      alias,
      txs,
      datum_history as "datumHistory",
      parameters,
      ra_id as "raId",
      test_run_id as "testRunId"
  `
  return contract || null
}

/**
 * Deploy contract (set address, policy_id, deployment time)
 */
export async function deployContract(
  processId: string,
  contractAddress: string,
  policyId: string,
  tx: string
): Promise<ProcessSmartContract | null> {
  const [contract] = await sql<ProcessSmartContract[]>`
    UPDATE process_smart_contract
    SET
      contract_address = ${contractAddress},
      policy_id = ${policyId},
      status_code = ${STATUS_CODES.DEPLOYED},
      deployment = NOW(),
      modified = NOW(),
      txs = array_append(txs, ${tx})
    WHERE process_id = ${processId}::uuid
    RETURNING
      process_id as "processId",
      user_id as "userId",
      metadata_form as "metadataForm",
      contract_datum as "contractDatum",
      contract_data as "contractData",
      contract_address as "contractAddress",
      instantiated,
      modified,
      policy_id as "policyId",
      contract_type as "contractType",
      deployment,
      contract_version as "contractVersion",
      status_code as "statusCode",
      network_id as "networkId",
      contract_subtype as "contractSubtype",
      alias,
      txs,
      datum_history as "datumHistory",
      parameters,
      ra_id as "raId",
      test_run_id as "testRunId"
  `
  return contract || null
}

/**
 * Get datum history for a contract
 */
export async function getDatumHistory(contractAddressOrProcessId: string): Promise<DatumHistoryEntry[]> {
  // Try to find by process ID first, then by address
  let contract: ProcessSmartContract | null = null

  // Check if it looks like a UUID
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(contractAddressOrProcessId)

  if (isUuid) {
    contract = await getContractByProcessId(contractAddressOrProcessId)
  }

  if (!contract) {
    contract = await getContractByAddress(contractAddressOrProcessId)
  }

  if (!contract || !contract.datumHistory) {
    return []
  }

  // Return history in reverse chronological order (newest first)
  return [...contract.datumHistory].reverse()
}

/**
 * Delete contract by process ID
 */
export async function deleteContract(processId: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM process_smart_contract
    WHERE process_id = ${processId}::uuid
  `
  return result.count > 0
}

/**
 * Delete contracts by test run ID
 */
export async function deleteContractsByTestRunId(testRunId: number): Promise<number> {
  const result = await sql`
    DELETE FROM process_smart_contract
    WHERE test_run_id = ${testRunId}
  `
  return result.count
}

/**
 * Delete all contracts (for test reset)
 */
export async function deleteAllContracts(): Promise<void> {
  await sql`DELETE FROM process_smart_contract`
}

/**
 * Initialize process_smart_contract table if not exists
 * Following your existing schema pattern
 */
export async function initContractsTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS process_smart_contract (
      process_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id INTEGER,
      metadata_form JSON,
      contract_datum JSON,
      contract_data JSON,
      contract_address VARCHAR(255),
      instantiated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      modified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      policy_id VARCHAR(64),
      contract_type VARCHAR(50) NOT NULL,
      deployment TIMESTAMP WITH TIME ZONE,
      contract_version VARCHAR(10) DEFAULT '0',
      status_code SMALLINT DEFAULT 1,
      network_id SMALLINT DEFAULT 0,
      contract_subtype VARCHAR(50),
      alias VARCHAR(255),
      txs TEXT[] DEFAULT '{}',
      datum_history JSONB DEFAULT '[]',
      parameters JSONB,
      ra_id UUID,
      test_run_id INTEGER REFERENCES test_runs(id) ON DELETE SET NULL
    )
  `

  // Add datum_history column if it doesn't exist (for existing tables)
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'process_smart_contract' AND column_name = 'datum_history'
      ) THEN
        ALTER TABLE process_smart_contract ADD COLUMN datum_history JSONB DEFAULT '[]';
      END IF;
    END $$;
  `

  // Create indexes
  await sql`
    CREATE INDEX IF NOT EXISTS idx_psc_contract_type ON process_smart_contract(contract_type)
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_psc_status_code ON process_smart_contract(status_code)
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_psc_network_id ON process_smart_contract(network_id)
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_psc_policy_id ON process_smart_contract(policy_id)
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_psc_test_run_id ON process_smart_contract(test_run_id)
  `
}
