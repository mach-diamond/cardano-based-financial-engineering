/**
 * Contract Service
 * Handles contract storage and retrieval from database
 */

import sql from '../db'

export interface ContractState {
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
  // Loan state flags
  isActive: boolean
  isPaidOff: boolean
  isDefaulted: boolean
}

export interface Contract {
  id: number
  address: string
  policyId: string
  alias: string | null
  seller: string
  scriptHash: string
  scriptCbor: string | null
  state: ContractState
  metadata: Record<string, unknown> | null
  networkId: number
  createdAt: Date
  updatedAt: Date
}

export interface CreateContractInput {
  address: string
  policyId: string
  alias?: string
  seller: string
  scriptHash: string
  scriptCbor?: string
  state: ContractState
  metadata?: Record<string, unknown>
  networkId: number
}

/**
 * Create a new contract in the database
 */
export async function createContract(input: CreateContractInput): Promise<Contract> {
  const [contract] = await sql<Contract[]>`
    INSERT INTO contracts (
      address, policy_id, alias, seller, script_hash, script_cbor,
      state, metadata, network_id
    )
    VALUES (
      ${input.address},
      ${input.policyId},
      ${input.alias || null},
      ${input.seller},
      ${input.scriptHash},
      ${input.scriptCbor || null},
      ${JSON.stringify(input.state)},
      ${input.metadata ? JSON.stringify(input.metadata) : null},
      ${input.networkId}
    )
    RETURNING
      id,
      address,
      policy_id as "policyId",
      alias,
      seller,
      script_hash as "scriptHash",
      script_cbor as "scriptCbor",
      state,
      metadata,
      network_id as "networkId",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `
  return contract
}

/**
 * Get all contracts
 */
export async function getAllContracts(networkId?: number): Promise<Contract[]> {
  if (networkId !== undefined) {
    return sql<Contract[]>`
      SELECT
        id,
        address,
        policy_id as "policyId",
        alias,
        seller,
        script_hash as "scriptHash",
        script_cbor as "scriptCbor",
        state,
        metadata,
        network_id as "networkId",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM contracts
      WHERE network_id = ${networkId}
      ORDER BY created_at DESC
    `
  }
  return sql<Contract[]>`
    SELECT
      id,
      address,
      policy_id as "policyId",
      alias,
      seller,
      script_hash as "scriptHash",
      script_cbor as "scriptCbor",
      state,
      metadata,
      network_id as "networkId",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM contracts
    ORDER BY created_at DESC
  `
}

/**
 * Get contract by address
 */
export async function getContractByAddress(address: string): Promise<Contract | null> {
  const [contract] = await sql<Contract[]>`
    SELECT
      id,
      address,
      policy_id as "policyId",
      alias,
      seller,
      script_hash as "scriptHash",
      script_cbor as "scriptCbor",
      state,
      metadata,
      network_id as "networkId",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM contracts
    WHERE address = ${address}
  `
  return contract || null
}

/**
 * Get contract by policy ID
 */
export async function getContractByPolicyId(policyId: string): Promise<Contract | null> {
  const [contract] = await sql<Contract[]>`
    SELECT
      id,
      address,
      policy_id as "policyId",
      alias,
      seller,
      script_hash as "scriptHash",
      script_cbor as "scriptCbor",
      state,
      metadata,
      network_id as "networkId",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM contracts
    WHERE policy_id = ${policyId}
  `
  return contract || null
}

/**
 * Get contracts by seller
 */
export async function getContractsBySeller(seller: string): Promise<Contract[]> {
  return sql<Contract[]>`
    SELECT
      id,
      address,
      policy_id as "policyId",
      alias,
      seller,
      script_hash as "scriptHash",
      script_cbor as "scriptCbor",
      state,
      metadata,
      network_id as "networkId",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM contracts
    WHERE seller = ${seller}
    ORDER BY created_at DESC
  `
}

/**
 * Update contract state
 */
export async function updateContractState(
  address: string,
  state: ContractState
): Promise<Contract | null> {
  const [contract] = await sql<Contract[]>`
    UPDATE contracts
    SET state = ${JSON.stringify(state)}, updated_at = NOW()
    WHERE address = ${address}
    RETURNING
      id,
      address,
      policy_id as "policyId",
      alias,
      seller,
      script_hash as "scriptHash",
      script_cbor as "scriptCbor",
      state,
      metadata,
      network_id as "networkId",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `
  return contract || null
}

/**
 * Delete contract by address
 */
export async function deleteContract(address: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM contracts
    WHERE address = ${address}
  `
  return result.count > 0
}

/**
 * Delete all contracts (for test reset)
 */
export async function deleteAllContracts(): Promise<void> {
  await sql`DELETE FROM contracts`
}

/**
 * Initialize contracts table if not exists
 */
export async function initContractsTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS contracts (
      id SERIAL PRIMARY KEY,
      address VARCHAR(255) UNIQUE NOT NULL,
      policy_id VARCHAR(64) NOT NULL,
      alias VARCHAR(255),
      seller VARCHAR(255) NOT NULL,
      script_hash VARCHAR(64) NOT NULL,
      script_cbor TEXT,
      state JSONB NOT NULL,
      metadata JSONB,
      network_id INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `

  // Create indexes
  await sql`
    CREATE INDEX IF NOT EXISTS idx_contracts_policy_id ON contracts(policy_id)
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_contracts_seller ON contracts(seller)
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_contracts_network_id ON contracts(network_id)
  `
}
