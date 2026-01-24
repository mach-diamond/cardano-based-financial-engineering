/**
 * MintMatrix Financial Instruments SDK
 *
 * A TypeScript SDK for interacting with MintMatrix smart contracts on Cardano.
 *
 * @packageDocumentation
 */

export { MintMatrix, type MintMatrixConfig } from "./client";
export { CDOClient } from "./cdo";
export { LoanClient } from "./loan";

// Re-export types
export type {
  // CDO Types
  BondConfig,
  TrancheConfig,
  Collateral,
  BondState,
  CreateBondParams,
  CollectParams,
  DistributeParams,
  RedeemParams,
  // Loan Types
  LoanConfig,
  LoanState,
  CreateLoanParams,
  // Common Types
  Network,
  TransactionResult,
} from "./types";

// Export version
export const VERSION = "0.1.0";
