/**
 * Loan Contract Client
 *
 * Client for interacting with loan/mortgage contracts using the asset-transfer protocol.
 *
 * @example
 * ```typescript
 * const client = await MintMatrix.create({ network: 'Preview', blockfrostKey: '...' });
 *
 * // Create a loan
 * const loan = await client.loan.create({
 *   asset: { policy: '...', assetName: 'MyNFT', quantity: 1 },
 *   terms: {
 *     principal: 100_000_000_000n,
 *     apr: 800,
 *     frequency: 12,
 *     installments: 12,
 *   },
 *   fees: {
 *     lateFee: 5_000_000n,
 *     transferFee: 1_000_000n,
 *   },
 * });
 *
 * // Make a payment
 * await client.loan.makePayment({
 *   contractAddress: loan.contractAddress,
 *   amount: 2_000_000_000n,
 * });
 * ```
 *
 * @module loan
 */

import type { LucidEvolution, UTxO } from "@lucid-evolution/lucid";
import { Data, fromText, paymentCredentialOf } from "@lucid-evolution/lucid";
import type {
  Network,
  LoanConfig,
  LoanState,
  CreateLoanParams,
  CreateLoanResult,
  LoanPaymentParams,
  TransactionResult,
} from "../types";

// Import contract actions from the loan-contract package (asset-transfer submodule)
// These will be available when running in Node.js environment
let contractActions: typeof import("../../../packages/loan-contract/src/actions") | null = null;
let contractLib: typeof import("../../../packages/loan-contract/src/lib") | null = null;
let contractTypes: typeof import("../../../packages/loan-contract/src/types") | null = null;

// Lazy load contract modules (only available in Node.js)
async function loadContractModules() {
  if (contractActions === null) {
    try {
      contractActions = await import("../../../packages/loan-contract/src/actions");
      contractLib = await import("../../../packages/loan-contract/src/lib");
      contractTypes = await import("../../../packages/loan-contract/src/types");
    } catch (e) {
      console.warn("Contract actions not available. Some features may be limited.", e);
    }
  }
  return { actions: contractActions, lib: contractLib, types: contractTypes };
}

/**
 * Extended loan creation parameters
 */
export interface CreateLoanParamsExtended {
  /** Asset to lock as collateral */
  asset: {
    policy: string;
    assetName: string;
    quantity: number;
  };
  /** Loan terms */
  terms: {
    principal: bigint;
    apr: number; // basis points (800 = 8%)
    frequency: number; // payments per year (12 = monthly)
    installments: number; // total number of payments
  };
  /** Fee configuration */
  fees: {
    lateFee: bigint;
    transferFeeSeller: bigint;
    transferFeeBuyer: bigint;
    referralFee?: bigint;
    referralAddress?: string;
  };
  /** Specific buyer address (null for open market) */
  buyer?: string | null;
  /** Whether to defer the seller's transfer fee */
  deferFee?: boolean;
}

/**
 * Extended loan state with computed properties
 */
export interface LoanStateExtended extends LoanState {
  /** Whether the contract has been accepted by a buyer */
  isActive: boolean;
  /** Whether the loan is fully paid off */
  isPaidOff: boolean;
  /** Number of payments remaining */
  paymentsRemaining: number;
  /** Contract address */
  contractAddress: string;
  /** Policy ID for the contract tokens */
  policyId: string;
}

/**
 * Payment parameters
 */
export interface MakePaymentParams {
  /** Contract address */
  contractAddress: string;
  /** Payment amount in lovelace */
  amount: bigint;
  /** Current timestamp (defaults to now) */
  timestamp?: number;
}

/**
 * Accept contract parameters
 */
export interface AcceptContractParams {
  /** Contract address */
  contractAddress: string;
  /** Initial payment amount in lovelace */
  initialPayment: bigint;
  /** Current timestamp (defaults to now) */
  timestamp?: number;
}

/**
 * Collect payment parameters
 */
export interface CollectPaymentParams {
  /** Contract address */
  contractAddress: string;
  /** Amount to collect in lovelace */
  amount: bigint;
}

/**
 * Client for loan/mortgage operations
 */
export class LoanClient {
  private api: LucidEvolution;
  private network: Network;

  constructor(api: LucidEvolution, network: Network) {
    this.api = api;
    this.network = network;
  }

  /**
   * Create a new loan contract with collateral
   *
   * @param params - Loan creation parameters
   * @returns Transaction result with contract address and policy ID
   *
   * @example
   * ```typescript
   * const result = await loan.create({
   *   asset: { policy: 'abc...', assetName: 'MyNFT', quantity: 1 },
   *   terms: { principal: 100_000_000n, apr: 800, frequency: 12, installments: 12 },
   *   fees: { lateFee: 5_000_000n, transferFeeSeller: 1_000_000n, transferFeeBuyer: 1_000_000n },
   * });
   * ```
   */
  async create(params: CreateLoanParamsExtended): Promise<CreateLoanResult> {
    const { actions } = await loadContractModules();

    if (!actions) {
      throw new Error(
        "Loan contract actions not available. " +
          "Ensure the loan-contract package is properly linked."
      );
    }

    // Convert params to contract state input format
    const initState = {
      buyer: params.buyer ?? null,
      base_asset: {
        policy: params.asset.policy,
        asset_name: params.asset.assetName,
        quantity: params.asset.quantity,
      },
      terms: {
        principal: Number(params.terms.principal),
        apr: params.terms.apr,
        frequency: params.terms.frequency,
        installments: params.terms.installments,
        time: null,
        fees: {
          late_fee: Number(params.fees.lateFee),
          transfer_fee_seller: Number(params.fees.transferFeeSeller),
          transfer_fee_buyer: Number(params.fees.transferFeeBuyer),
          referral_fee: Number(params.fees.referralFee ?? 0),
          referral_fee_addr: params.fees.referralAddress ?? null,
        },
      },
      balance: Number(params.terms.principal),
      last_payment: null,
    };

    const uiData = {
      deferFee: params.deferFee ?? false,
    };

    const result = await actions.send_to_market(this.api, initState, uiData);

    return {
      txHash: result.tx_id,
      success: true,
      loanAddress: result.address,
      policyId: result.policy_id,
    };
  }

  /**
   * Accept a loan contract (buyer action)
   *
   * @param params - Accept parameters
   * @returns Transaction result
   */
  async accept(params: AcceptContractParams): Promise<TransactionResult> {
    const { actions, lib } = await loadContractModules();

    if (!actions || !lib) {
      throw new Error("Loan contract actions not available.");
    }

    // Load contract from address
    const contract = await lib.loadContract(params.contractAddress);

    const uiData = {
      payment: Number(params.initialPayment),
      timestamp: params.timestamp ?? Date.now(),
    };

    const result = await actions.accept(this.api, contract, uiData);

    return {
      txHash: result.tx_id,
      success: true,
    };
  }

  /**
   * Make a payment on an active loan
   *
   * @param params - Payment parameters
   * @returns Transaction result
   */
  async makePayment(params: MakePaymentParams): Promise<TransactionResult> {
    const { actions, lib } = await loadContractModules();

    if (!actions || !lib) {
      throw new Error("Loan contract actions not available.");
    }

    // Load contract from address
    const contract = await lib.loadContract(params.contractAddress);

    const uiData = {
      payment: Number(params.amount),
      timestamp: params.timestamp ?? Date.now(),
    };

    const result = await actions.pay(this.api, contract, uiData);

    return {
      txHash: result.tx_id,
      success: true,
    };
  }

  /**
   * Collect payments from the contract (seller action)
   *
   * @param params - Collect parameters
   * @returns Transaction result
   */
  async collect(params: CollectPaymentParams): Promise<TransactionResult> {
    const { actions, lib } = await loadContractModules();

    if (!actions || !lib) {
      throw new Error("Loan contract actions not available.");
    }

    // Load contract from address
    const contract = await lib.loadContract(params.contractAddress);

    const uiData = {
      payment: Number(params.amount),
    };

    const result = await actions.collect(this.api, contract, uiData);

    return {
      txHash: result.tx_id,
      success: true,
    };
  }

  /**
   * Cancel a contract before it's accepted (seller action)
   *
   * @param contractAddress - Contract address
   * @returns Transaction result
   */
  async cancel(contractAddress: string): Promise<TransactionResult> {
    const { actions, lib } = await loadContractModules();

    if (!actions || !lib) {
      throw new Error("Loan contract actions not available.");
    }

    // Load contract from address
    const contract = await lib.loadContract(contractAddress);

    const result = await actions.cancel(this.api, contract);

    return {
      txHash: result.tx_id,
      success: true,
    };
  }

  /**
   * Complete the transfer after all payments are made
   *
   * @param contractAddress - Contract address
   * @returns Transaction result
   */
  async complete(contractAddress: string): Promise<TransactionResult> {
    const { actions, lib } = await loadContractModules();

    if (!actions || !lib) {
      throw new Error("Loan contract actions not available.");
    }

    // Load contract from address
    const contract = await lib.loadContract(contractAddress);

    const result = await actions.complete_transfer(this.api, contract);

    return {
      txHash: result.tx_id,
      success: true,
    };
  }

  /**
   * Claim default on a loan (seller action)
   *
   * @param contractAddress - Contract address
   * @param timestamp - Current timestamp (defaults to now)
   * @returns Transaction result
   */
  async claimDefault(
    contractAddress: string,
    timestamp?: number
  ): Promise<TransactionResult> {
    const { actions, lib } = await loadContractModules();

    if (!actions || !lib) {
      throw new Error("Loan contract actions not available.");
    }

    // Load contract from address
    const contract = await lib.loadContract(contractAddress);

    const result = await actions.claim_default(
      this.api,
      contract,
      timestamp ?? Date.now()
    );

    return {
      txHash: result.tx_id,
      success: true,
    };
  }

  /**
   * Update contract terms before acceptance (seller action)
   *
   * @param contractAddress - Contract address
   * @param newTerms - Updated terms
   * @returns Transaction result
   */
  async updateTerms(
    contractAddress: string,
    newTerms: Partial<CreateLoanParamsExtended["terms"]> &
      Partial<CreateLoanParamsExtended["fees"]>,
    deferFee = false
  ): Promise<TransactionResult> {
    const { actions, lib } = await loadContractModules();

    if (!actions || !lib) {
      throw new Error("Loan contract actions not available.");
    }

    // Load contract from address
    const contract = await lib.loadContract(contractAddress);

    // Merge with existing state
    const updatedState = {
      ...contract.state,
      terms: {
        principal: newTerms.principal
          ? Number(newTerms.principal)
          : Number(contract.state.terms.principal),
        apr: newTerms.apr ?? Number(contract.state.terms.apr),
        frequency: newTerms.frequency ?? Number(contract.state.terms.frequency),
        installments:
          newTerms.installments ?? Number(contract.state.terms.installments),
        time: contract.state.terms.time
          ? Number(contract.state.terms.time)
          : null,
        fees: {
          late_fee: newTerms.lateFee
            ? Number(newTerms.lateFee)
            : Number(contract.state.terms.fees.late_fee),
          transfer_fee_seller: newTerms.transferFeeSeller
            ? Number(newTerms.transferFeeSeller)
            : Number(contract.state.terms.fees.transfer_fee_seller),
          transfer_fee_buyer: newTerms.transferFeeBuyer
            ? Number(newTerms.transferFeeBuyer)
            : Number(contract.state.terms.fees.transfer_fee_buyer),
          referral_fee: newTerms.referralFee
            ? Number(newTerms.referralFee)
            : Number(contract.state.terms.fees.referral_fee),
          referral_fee_addr:
            newTerms.referralAddress ??
            contract.state.terms.fees.referral_fee_addr,
        },
      },
      balance: newTerms.principal
        ? Number(newTerms.principal)
        : Number(contract.state.balance),
      buyer: contract.state.buyer,
      base_asset: {
        policy: contract.state.base_asset.policy,
        asset_name: contract.state.base_asset.asset_name,
        quantity: Number(contract.state.base_asset.quantity),
      },
      last_payment: contract.state.last_payment
        ? {
            amount: Number(contract.state.last_payment.amount),
            time: Number(contract.state.last_payment.time),
          }
        : null,
    };

    const uiData = {
      state: updatedState,
      deferFee,
    };

    const result = await actions.update_terms(this.api, contract, uiData);

    return {
      txHash: result.tx_id,
      success: true,
    };
  }

  /**
   * Get current loan state from on-chain UTxO
   *
   * @param contractAddress - Contract address
   * @returns Current loan state
   */
  async getLoanState(contractAddress: string): Promise<LoanStateExtended> {
    const { lib } = await loadContractModules();

    if (!lib) {
      throw new Error("Loan contract library not available.");
    }

    // Load contract from address
    const contract = await lib.loadContract(contractAddress);
    const state = contract.state;

    // Calculate derived properties
    const isActive = state.terms.time !== null;
    const isPaidOff = state.balance === 0n;
    const paymentsRemaining = isActive
      ? Number(state.terms.installments) -
        Math.floor(
          (Number(state.terms.principal) - Number(state.balance)) /
            (Number(state.terms.principal) / Number(state.terms.installments))
        )
      : Number(state.terms.installments);

    return {
      config: {
        principal: state.terms.principal,
        interestRate: Number(state.terms.apr),
        termMonths: Number(state.terms.installments),
        collateralPolicyId: state.base_asset.policy,
        collateralAssetName: state.base_asset.asset_name,
      },
      balance: state.balance,
      paymentsMade: Number(state.terms.installments) - paymentsRemaining,
      lastPayment: state.last_payment?.time ?? null,
      isDefaulted: false, // Would need to check timing
      createdAt: 0n, // Not stored in datum
      isActive,
      isPaidOff,
      paymentsRemaining,
      contractAddress,
      policyId: contract.script.hash,
    };
  }

  /**
   * Query UTxOs at contract address
   *
   * @param contractAddress - Contract address
   * @returns Array of UTxOs
   */
  async getContractUtxos(contractAddress: string): Promise<UTxO[]> {
    return this.api.utxosAt(contractAddress);
  }

  /**
   * Calculate remaining balance on a loan
   *
   * @param contractAddress - Contract address
   * @returns Outstanding balance in lovelace
   */
  async getRemainingBalance(contractAddress: string): Promise<bigint> {
    const state = await this.getLoanState(contractAddress);
    return state.balance;
  }

  /**
   * Calculate next payment amount including any late fees
   *
   * @param contractAddress - Contract address
   * @param currentTime - Current timestamp (defaults to now)
   * @returns Next payment amount in lovelace
   */
  async getNextPaymentAmount(
    contractAddress: string,
    currentTime?: number
  ): Promise<bigint> {
    const { lib } = await loadContractModules();

    if (!lib) {
      throw new Error("Loan contract library not available.");
    }

    const contract = await lib.loadContract(contractAddress);
    const state = contract.state;

    // Use calculation utilities from the contract library
    const calc = lib.calculateTermPayment(state);

    return BigInt(Math.ceil(calc.totalDue * 1_000_000));
  }

  /**
   * Check if a loan is in default
   *
   * @param contractAddress - Contract address
   * @param currentTime - Current timestamp (defaults to now)
   * @returns Whether the loan is defaulted
   */
  async isDefaulted(
    contractAddress: string,
    currentTime?: number
  ): Promise<boolean> {
    const { lib } = await loadContractModules();

    if (!lib) {
      throw new Error("Loan contract library not available.");
    }

    const contract = await lib.loadContract(contractAddress);
    const now = currentTime ?? Date.now();

    // Check if payment is late beyond the grace period
    return lib.isPaymentDefaulted(contract.state, now);
  }
}
