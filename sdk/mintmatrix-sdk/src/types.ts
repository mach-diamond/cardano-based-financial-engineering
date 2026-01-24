/**
 * MintMatrix SDK Type Definitions
 * @module types
 */

import type { LucidEvolution } from "@lucid-evolution/lucid";

// =============================================================================
// Common Types
// =============================================================================

/**
 * Supported Cardano networks
 */
export type Network = "Preview" | "Preprod" | "Mainnet";

/**
 * Result of a transaction submission
 */
export interface TransactionResult {
  /** Transaction hash */
  txHash: string;
  /** Whether the transaction was successful */
  success: boolean;
  /** Optional error message */
  error?: string;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  /** Blockfrost API key */
  blockfrostKey?: string;
  /** Custom Kupo endpoint */
  kupoEndpoint?: string;
  /** Custom Ogmios endpoint */
  ogmiosEndpoint?: string;
}

// =============================================================================
// CDO Bond Types
// =============================================================================

/**
 * Payment frequency for bond yields
 */
export type PaymentFrequency = "monthly" | "quarterly" | "annual";

/**
 * Tranche type identifier
 */
export type TrancheType = "senior" | "mezzanine" | "junior";

/**
 * Bond configuration parameters
 */
export interface BondConfig {
  /** Total number of tranche tokens to mint */
  totalTokens: number;
  /** Term length in years */
  termYears: number;
  /** Payment frequency */
  paymentFrequency: PaymentFrequency;
  /** Management fee in basis points (100 = 1%) */
  managementFee: number;
  /** Redemption fee in basis points */
  redemptionFee: number;
  /** Whether bond uses multi-tranche structure */
  isMultiTranche: boolean;
}

/**
 * Tranche allocation configuration
 */
export interface TrancheAllocation {
  /** Percentage allocation (must sum to 100 across all tranches) */
  allocation: number;
  /** Yield modifier in percentage (70 = 70% of base yield) */
  yieldModifier: number;
}

/**
 * Full tranche configuration
 */
export interface TrancheConfig {
  senior: TrancheAllocation;
  mezzanine: TrancheAllocation;
  junior: TrancheAllocation;
}

/**
 * Collateral asset definition
 */
export interface Collateral {
  /** Policy ID of the collateral token */
  policyId: string;
  /** Asset name (hex-encoded) */
  assetName: string;
  /** Principal amount in lovelace */
  principal: bigint;
  /** Annual percentage rate in basis points */
  apr: number;
  /** Timestamp of last payment (null if none) */
  lastPayment: bigint | null;
  /** Whether this collateral has defaulted */
  isDefaulted: boolean;
  /** Number of payments made */
  paymentsMade: number;
  /** Total payments required */
  totalPayments: number;
}

/**
 * Complete bond state
 */
export interface BondState {
  /** Array of collateral assets */
  collateral: Collateral[];
  /** Bond configuration */
  bond: BondConfig;
  /** Tranche configuration */
  trancheConfig: TrancheConfig;
  /** Timestamp of last distribution (null if none) */
  lastDistribution: bigint | null;
  /** Bond creation timestamp */
  creationTime: bigint | null;
  /** Liquidation timestamp (null if not liquidated) */
  liquidation: bigint | null;
  /** Maturity timestamp (null if not matured) */
  maturity: bigint | null;
}

/**
 * Parameters for creating a new CDO bond
 */
export interface CreateBondParams {
  /** Collateral assets to back the bond */
  collateral: Collateral[];
  /** Bond configuration */
  bondConfig?: Partial<BondConfig>;
  /** Tranche allocation (must sum to 100) */
  trancheConfig?: Partial<TrancheConfig>;
}

/**
 * Parameters for collecting a payment
 */
export interface CollectParams {
  /** Bond contract address */
  bondAddress: string;
  /** Index of collateral to collect from */
  collateralIndex?: number;
  /** Payment amount in lovelace (optional) */
  paymentAmount?: bigint;
}

/**
 * Parameters for distributing yields
 */
export interface DistributeParams {
  /** Bond contract address */
  bondAddress: string;
  /** Total amount to distribute in lovelace */
  amount: bigint;
  /** Recipient addresses for each tranche */
  recipients: {
    senior: string;
    mezzanine: string;
    junior: string;
  };
}

/**
 * Parameters for redeeming tranche tokens
 */
export interface RedeemParams {
  /** Bond contract address */
  bondAddress: string;
  /** Tranche type to redeem */
  tranche: TrancheType;
  /** Number of tokens to redeem */
  amount: number;
}

/**
 * Result of bond creation
 */
export interface CreateBondResult extends TransactionResult {
  /** Bond contract address */
  bondAddress: string;
  /** Policy ID for bond/tranche tokens */
  policyId: string;
  /** Token distribution */
  tokens: {
    bond: number;
    senior: number;
    mezzanine: number;
    junior: number;
  };
}

// =============================================================================
// Loan Contract Types
// =============================================================================

/**
 * Loan configuration parameters
 */
export interface LoanConfig {
  /** Loan principal in lovelace */
  principal: bigint;
  /** Interest rate in basis points */
  interestRate: number;
  /** Loan term in months */
  termMonths: number;
  /** Collateral policy ID */
  collateralPolicyId: string;
  /** Collateral asset name */
  collateralAssetName: string;
}

/**
 * Current state of a loan
 */
export interface LoanState {
  /** Loan configuration */
  config: LoanConfig;
  /** Outstanding balance */
  balance: bigint;
  /** Number of payments made */
  paymentsMade: number;
  /** Last payment timestamp */
  lastPayment: bigint | null;
  /** Whether loan is in default */
  isDefaulted: boolean;
  /** Creation timestamp */
  createdAt: bigint;
}

/**
 * Parameters for creating a new loan
 */
export interface CreateLoanParams {
  /** Borrower address */
  borrower: string;
  /** Loan configuration */
  config: LoanConfig;
}

/**
 * Parameters for making a loan payment
 */
export interface LoanPaymentParams {
  /** Loan contract address */
  loanAddress: string;
  /** Payment amount in lovelace */
  amount: bigint;
}

/**
 * Result of loan creation
 */
export interface CreateLoanResult extends TransactionResult {
  /** Loan contract address */
  loanAddress: string;
  /** Loan token policy ID */
  policyId: string;
}
