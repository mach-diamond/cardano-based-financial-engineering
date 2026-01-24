/**
 * CDO Bond Client
 *
 * Client for interacting with Collateralized Debt Obligation (CDO) bonds.
 *
 * @example
 * ```typescript
 * const client = await MintMatrix.create({ network: 'Preview', blockfrostKey: '...' });
 *
 * // Create a CDO bond
 * const result = await client.cdo.create({
 *   collateral: [
 *     { policyId: '...', assetName: '...', principal: 100_000_000_000n, apr: 800, ... },
 *     { policyId: '...', assetName: '...', principal: 75_000_000_000n, apr: 750, ... },
 *     { policyId: '...', assetName: '...', principal: 150_000_000_000n, apr: 900, ... },
 *   ],
 *   trancheConfig: {
 *     senior: { allocation: 60, yieldModifier: 70 },
 *     mezzanine: { allocation: 30, yieldModifier: 100 },
 *     junior: { allocation: 10, yieldModifier: 170 },
 *   },
 * });
 *
 * // Collect payment from collateral
 * await client.cdo.collect({
 *   bondAddress: result.bondAddress,
 *   collateralIndex: 0,
 * });
 *
 * // Distribute yields to tranche holders
 * await client.cdo.distribute({
 *   bondAddress: result.bondAddress,
 *   amount: 10_000_000_000n,
 *   recipients: {
 *     senior: 'addr_test1...',
 *     mezzanine: 'addr_test1...',
 *     junior: 'addr_test1...',
 *   },
 * });
 * ```
 *
 * @module cdo
 */

import type { LucidEvolution, UTxO } from "@lucid-evolution/lucid";
import type {
  Network,
  BondConfig,
  TrancheConfig,
  BondState,
  Collateral,
  CreateBondParams,
  CreateBondResult,
  CollectParams,
  DistributeParams,
  RedeemParams,
  TransactionResult,
  TrancheType,
} from "../types";

// Import CDO contract actions from the cdo-bond package (CDO submodule)
// These will be available when running in Node.js environment
let cdoActions: typeof import("../../../packages/cdo-bond/src/actions") | null = null;
let cdoLib: typeof import("../../../packages/cdo-bond/src/lib") | null = null;
let cdoTypes: typeof import("../../../packages/cdo-bond/src/types") | null = null;

// Lazy load contract modules (only available in Node.js)
async function loadCDOModules() {
  if (cdoActions === null) {
    try {
      cdoActions = await import("../../../packages/cdo-bond/src/actions");
      cdoLib = await import("../../../packages/cdo-bond/src/lib");
      cdoTypes = await import("../../../packages/cdo-bond/src/types");
    } catch (e) {
      console.warn("CDO contract actions not available. Some features may be limited.", e);
    }
  }
  return { actions: cdoActions, lib: cdoLib, types: cdoTypes };
}

/**
 * Default bond configuration
 */
const DEFAULT_BOND_CONFIG: BondConfig = {
  totalTokens: 1000,
  termYears: 1,
  paymentFrequency: "monthly",
  managementFee: 100, // 1%
  redemptionFee: 200, // 2%
  isMultiTranche: true,
};

/**
 * Default tranche configuration
 */
const DEFAULT_TRANCHE_CONFIG: TrancheConfig = {
  senior: { allocation: 60, yieldModifier: 70 },
  mezzanine: { allocation: 30, yieldModifier: 100 },
  junior: { allocation: 10, yieldModifier: 170 },
};

/**
 * Extended bond state with additional computed properties
 */
export interface BondStateExtended extends BondState {
  /** Bond contract address */
  bondAddress: string;
  /** Policy ID for bond/tranche tokens */
  policyId: string;
  /** Whether the bond is active */
  isActive: boolean;
  /** Whether the bond has been liquidated */
  isLiquidated: boolean;
  /** Whether the bond has matured */
  isMatured: boolean;
  /** Current default rate percentage */
  defaultRate: number;
  /** Total principal value */
  totalPrincipal: bigint;
  /** Total collected value */
  totalCollected: bigint;
}

/**
 * Client for CDO bond operations
 */
export class CDOClient {
  private api: LucidEvolution;
  private network: Network;

  constructor(api: LucidEvolution, network: Network) {
    this.api = api;
    this.network = network;
  }

  /**
   * Create a new CDO bond with collateral and mint tranche tokens
   *
   * @param params - Bond creation parameters
   * @returns Transaction result with bond address and token info
   */
  async create(params: CreateBondParams): Promise<CreateBondResult> {
    const { actions } = await loadCDOModules();

    // Validate collateral
    if (params.collateral.length < 3) {
      throw new Error("CDO bonds require at least 3 collateral assets");
    }

    // Merge with defaults
    const bondConfig = { ...DEFAULT_BOND_CONFIG, ...params.bondConfig };
    const trancheConfig = this.mergeTrancheConfig(params.trancheConfig);

    // Validate tranche allocations sum to 100
    const totalAllocation =
      trancheConfig.senior.allocation +
      trancheConfig.mezzanine.allocation +
      trancheConfig.junior.allocation;

    if (totalAllocation !== 100) {
      throw new Error(`Tranche allocations must sum to 100, got ${totalAllocation}`);
    }

    if (!actions) {
      throw new Error(
        "CDO contract actions not available. " +
          "Ensure the cdo-bond package is properly linked."
      );
    }

    // Convert params to CDO contract format
    const managerAddress = await this.api.wallet().address();

    const uiData = {
      collateralTokens: params.collateral.map((c) => ({
        policy: c.policyId,
        asset_name: c.assetName,
        quantity: 1n,
      })),
      bondConfig: {
        total_tokens: bondConfig.totalTokens,
        term_years: bondConfig.termYears,
        payment_frequency: bondConfig.paymentFrequency,
        management_fee: bondConfig.managementFee,
        redemption_fee: bondConfig.redemptionFee,
        isMultiTranche: bondConfig.isMultiTranche,
      },
      trancheConfig: {
        senior: {
          allocation: trancheConfig.senior.allocation,
          yield_modifier: trancheConfig.senior.yieldModifier,
        },
        mezzanine: {
          allocation: trancheConfig.mezzanine.allocation,
          yield_modifier: trancheConfig.mezzanine.yieldModifier,
        },
        junior: {
          allocation: trancheConfig.junior.allocation,
          yield_modifier: trancheConfig.junior.yieldModifier,
        },
      },
      managerAddress,
    };

    const result = await actions.create(this.api, uiData);

    return {
      txHash: result.txHash,
      success: true,
      bondAddress: result.bondAddress,
      policyId: result.bondToken.policyId,
      tokens: {
        bond: bondConfig.totalTokens,
        senior: Math.floor(bondConfig.totalTokens * trancheConfig.senior.allocation / 100),
        mezzanine: Math.floor(bondConfig.totalTokens * trancheConfig.mezzanine.allocation / 100),
        junior: Math.floor(bondConfig.totalTokens * trancheConfig.junior.allocation / 100),
      },
    };
  }

  /**
   * Collect a payment from underlying collateral
   *
   * @param params - Collection parameters
   * @returns Transaction result
   */
  async collect(params: CollectParams): Promise<TransactionResult> {
    const { actions, lib } = await loadCDOModules();

    if (!actions || !lib) {
      throw new Error("CDO contract actions not available.");
    }

    const bond = await lib.loadBond(params.bondAddress);

    const uiData = {
      bondAddress: params.bondAddress,
      collateralIndex: params.collateralIndex ?? 0,
      paymentAmount: params.paymentAmount ?? 0n,
    };

    const result = await actions.collect(this.api, bond, uiData);

    return {
      txHash: result.txHash,
      success: true,
    };
  }

  /**
   * Distribute yields to tranche token holders
   *
   * @param params - Distribution parameters
   * @returns Transaction result
   */
  async distribute(params: DistributeParams): Promise<TransactionResult> {
    const { actions, lib } = await loadCDOModules();

    if (!actions || !lib) {
      throw new Error("CDO contract actions not available.");
    }

    const bond = await lib.loadBond(params.bondAddress);

    // Calculate tranche distribution using waterfall
    const trancheConfig = bond.state.trancheConfig;
    const total = params.amount;

    const seniorAlloc = BigInt(trancheConfig.senior.allocation);
    const mezzAlloc = BigInt(trancheConfig.mezzanine.allocation);
    const juniorAlloc = BigInt(trancheConfig.junior.allocation);

    const seniorYield = (total * seniorAlloc * BigInt(trancheConfig.senior.yield_modifier)) / 10000n;
    const mezzYield = (total * mezzAlloc * BigInt(trancheConfig.mezzanine.yield_modifier)) / 10000n;
    const juniorYield = total - seniorYield - mezzYield;

    const uiData = {
      bondAddress: params.bondAddress,
      totalYield: total,
      trancheDistribution: {
        senior: seniorYield,
        mezzanine: mezzYield,
        junior: juniorYield > 0n ? juniorYield : 0n,
      },
    };

    const result = await actions.distribute(this.api, bond, uiData);

    return {
      txHash: result.txHash,
      success: true,
    };
  }

  /**
   * Mark a collateral asset as defaulted
   *
   * @param bondAddress - Bond contract address
   * @param collateralIndex - Index of collateral to mark as defaulted
   * @param timestamp - Current timestamp (defaults to now)
   * @returns Transaction result with default rate info
   */
  async markDefault(
    bondAddress: string,
    collateralIndex: number,
    timestamp?: number
  ): Promise<TransactionResult & { defaultRate: number }> {
    const { actions, lib } = await loadCDOModules();

    if (!actions || !lib) {
      throw new Error("CDO contract actions not available.");
    }

    const bond = await lib.loadBond(bondAddress);

    const result = await actions.markDefault(
      this.api,
      bond,
      collateralIndex,
      timestamp ?? Date.now()
    );

    // Calculate updated default rate
    const state = bond.state;
    state.collateral[collateralIndex].isDefaulted = true;
    const defaulted = state.collateral.filter((c) => c.isDefaulted);
    const totalPrincipal = state.collateral.reduce((sum, c) => sum + c.principal, 0n);
    const defaultedPrincipal = defaulted.reduce((sum, c) => sum + c.principal, 0n);
    const defaultRate = totalPrincipal > 0n
      ? Number((defaultedPrincipal * 100n) / totalPrincipal)
      : 0;

    return {
      txHash: result.txHash,
      success: true,
      defaultRate,
    };
  }

  /**
   * Process bond maturity
   *
   * @param bondAddress - Bond contract address
   * @returns Transaction result
   */
  async mature(bondAddress: string): Promise<TransactionResult> {
    const { actions, lib } = await loadCDOModules();

    if (!actions || !lib) {
      throw new Error("CDO contract actions not available.");
    }

    const bond = await lib.loadBond(bondAddress);

    const result = await actions.mature(this.api, bond);

    return {
      txHash: result.txHash,
      success: true,
    };
  }

  /**
   * Liquidate a bond due to excessive defaults
   *
   * @param bondAddress - Bond contract address
   * @returns Transaction result with liquidation details
   */
  async liquidate(
    bondAddress: string
  ): Promise<TransactionResult & { recoveredValue: bigint; lossAmount: bigint }> {
    const { actions, lib } = await loadCDOModules();

    if (!actions || !lib) {
      throw new Error("CDO contract actions not available.");
    }

    const bond = await lib.loadBond(bondAddress);

    // Calculate recovery
    const totalPrincipal = bond.state.collateral.reduce((sum, c) => sum + c.principal, 0n);
    const defaultedPrincipal = bond.state.collateral
      .filter((c) => c.isDefaulted)
      .reduce((sum, c) => sum + c.principal, 0n);
    const recoveredValue = totalPrincipal - defaultedPrincipal;
    const lossAmount = defaultedPrincipal;

    const result = await actions.liquidate(this.api, bond);

    return {
      txHash: result.txHash,
      success: true,
      recoveredValue,
      lossAmount,
    };
  }

  /**
   * Redeem tranche tokens for underlying value
   *
   * @param params - Redemption parameters
   * @returns Transaction result with redemption amount
   */
  async redeem(params: RedeemParams): Promise<TransactionResult & { amount: bigint }> {
    const { actions, lib } = await loadCDOModules();

    if (!actions || !lib) {
      throw new Error("CDO contract actions not available.");
    }

    const bond = await lib.loadBond(params.bondAddress);

    // Calculate redemption value
    const trancheConfig = bond.state.trancheConfig[params.tranche];
    const totalPrincipal = bond.state.collateral.reduce((sum, c) => sum + c.principal, 0n);
    const trancheValue = (totalPrincipal * BigInt(trancheConfig.allocation)) / 100n;
    const redemptionFee = (trancheValue * BigInt(bond.state.bond.redemption_fee)) / 10000n;
    const redemptionValue = trancheValue - redemptionFee;

    const uiData = {
      bondAddress: params.bondAddress,
      trancheType: params.tranche,
      tokenAmount: BigInt(params.amount),
      redemptionValue,
    };

    const result = await actions.redeem(this.api, bond, uiData);

    return {
      txHash: result.txHash,
      success: true,
      amount: redemptionValue,
    };
  }

  /**
   * Get current bond state from on-chain UTxO
   *
   * @param bondAddress - Bond contract address
   * @returns Current bond state with computed properties
   */
  async getBondState(bondAddress: string): Promise<BondStateExtended> {
    const { lib } = await loadCDOModules();

    if (!lib) {
      throw new Error("CDO contract library not available.");
    }

    const bond = await lib.loadBond(bondAddress);
    const state = bond.state;

    // Calculate derived properties
    const totalPrincipal = state.collateral.reduce((sum, c) => sum + c.principal, 0n);
    const defaultedPrincipal = state.collateral
      .filter((c) => c.isDefaulted)
      .reduce((sum, c) => sum + c.principal, 0n);
    const defaultRate = totalPrincipal > 0n
      ? Number((defaultedPrincipal * 100n) / totalPrincipal)
      : 0;

    return {
      ...state,
      bondAddress,
      policyId: bond.script.scriptHash,
      isActive: state.creation_time !== null && state.maturity === null && state.liquidation === null,
      isLiquidated: state.liquidation !== null,
      isMatured: state.maturity !== null,
      defaultRate,
      totalPrincipal,
      totalCollected: 0n, // Would need to track from distributions
    };
  }

  /**
   * Query UTxOs at bond address
   *
   * @param bondAddress - Bond contract address
   * @returns Array of UTxOs
   */
  async getBondUtxos(bondAddress: string): Promise<UTxO[]> {
    return this.api.utxosAt(bondAddress);
  }

  /**
   * Calculate current default rate for a bond
   *
   * @param bondAddress - Bond contract address
   * @returns Default rate as percentage (0-100)
   */
  async getDefaultRate(bondAddress: string): Promise<number> {
    const state = await this.getBondState(bondAddress);
    return state.defaultRate;
  }

  /**
   * Check if a bond is ready for maturity
   *
   * @param bondAddress - Bond contract address
   * @returns Whether the bond can be matured
   */
  async canMature(bondAddress: string): Promise<boolean> {
    const state = await this.getBondState(bondAddress);
    if (state.isMatured) return false;
    if (state.isLiquidated) return false;

    // Check if term has elapsed
    const now = BigInt(Date.now());
    const termMs = BigInt(state.bond.termYears) * 365n * 24n * 60n * 60n * 1000n;
    const maturityTime = (state.creationTime ?? 0n) + termMs;

    return now >= maturityTime;
  }

  /**
   * Check if a bond should be liquidated
   *
   * @param bondAddress - Bond contract address
   * @param threshold - Default rate threshold (default 50%)
   * @returns Whether the bond should be liquidated
   */
  async shouldLiquidate(bondAddress: string, threshold = 50): Promise<boolean> {
    const defaultRate = await this.getDefaultRate(bondAddress);
    return defaultRate >= threshold;
  }

  // Private helper to merge tranche config with defaults
  private mergeTrancheConfig(
    partial?: Partial<TrancheConfig>
  ): TrancheConfig {
    if (!partial) return DEFAULT_TRANCHE_CONFIG;

    return {
      senior: { ...DEFAULT_TRANCHE_CONFIG.senior, ...partial.senior },
      mezzanine: { ...DEFAULT_TRANCHE_CONFIG.mezzanine, ...partial.mezzanine },
      junior: { ...DEFAULT_TRANCHE_CONFIG.junior, ...partial.junior },
    };
  }
}
