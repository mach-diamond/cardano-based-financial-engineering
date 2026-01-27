/**
 * Test Setup and Utilities
 *
 * Provides test infrastructure for both emulator and testnet testing.
 *
 * @module tests/setup
 */

import "dotenv/config";
import {
  Lucid,
  Emulator,
  generateSeedPhrase,
  type LucidEvolution,
  type UTxO,
} from "@lucid-evolution/lucid";

export type TestNetwork = "emulator" | "preview" | "preprod";

/**
 * Test wallet configuration
 */
export interface TestWallet {
  seedPhrase: string;
  address: string;
}

/**
 * Test context containing Lucid instance and wallets
 */
export interface TestContext {
  lucid: LucidEvolution;
  network: TestNetwork;
  seller: TestWallet;
  buyer: TestWallet;
  manager: TestWallet;
  emulator?: Emulator;
}

/**
 * Get the current test network from environment
 */
export function getTestNetwork(): TestNetwork {
  const network = process.env.NETWORK?.toLowerCase();
  if (network === "preview" || network === "preprod") {
    return network;
  }
  return "emulator";
}

/**
 * Get Blockfrost key for network
 */
export function getBlockfrostKey(network: TestNetwork): string | undefined {
  switch (network) {
    case "preview":
      return process.env.BLOCKFROST_PREVIEW;
    case "preprod":
      return process.env.BLOCKFROST_PREPROD;
    default:
      return undefined;
  }
}

/**
 * Generate initial UTxOs for emulator testing
 */
function generateEmulatorUtxos(addresses: string[]): UTxO[] {
  const utxos: UTxO[] = [];

  addresses.forEach((address, walletIndex) => {
    // Give each wallet 10,000 ADA
    utxos.push({
      txHash: `${"0".repeat(62)}${walletIndex.toString().padStart(2, "0")}`,
      outputIndex: 0,
      address,
      assets: { lovelace: 10_000_000_000n },
      datum: null,
      datumHash: null,
      scriptRef: null,
    });

    // Give seller wallet test NFTs for collateral
    if (walletIndex === 0) {
      for (let i = 1; i <= 5; i++) {
        utxos.push({
          txHash: `${"1".repeat(62)}0${i}`,
          outputIndex: 0,
          address,
          assets: {
            lovelace: 2_000_000n,
            [`${"a".repeat(56)}${Buffer.from(`TestNFT00${i}`).toString("hex")}`]: 1n,
          },
          datum: null,
          datumHash: null,
          scriptRef: null,
        });
      }
    }
  });

  return utxos;
}

/**
 * Initialize test context with Lucid and wallets
 */
export async function setupTestContext(): Promise<TestContext> {
  const network = getTestNetwork();

  if (network === "emulator") {
    return setupEmulatorContext();
  } else {
    return setupTestnetContext(network);
  }
}

/**
 * Set up emulator-based test context
 */
async function setupEmulatorContext(): Promise<TestContext> {
  // Create temporary Lucid instance to generate addresses
  const tempLucid = await Lucid(new Emulator([]), "Preview");

  // Generate wallets
  const sellerSeed = generateSeedPhrase();
  const buyerSeed = generateSeedPhrase();
  const managerSeed = generateSeedPhrase();

  tempLucid.selectWallet.fromSeed(sellerSeed);
  const sellerAddress = await tempLucid.wallet().address();

  tempLucid.selectWallet.fromSeed(buyerSeed);
  const buyerAddress = await tempLucid.wallet().address();

  tempLucid.selectWallet.fromSeed(managerSeed);
  const managerAddress = await tempLucid.wallet().address();

  // Create emulator with funded wallets
  const emulator = new Emulator(
    generateEmulatorUtxos([sellerAddress, buyerAddress, managerAddress])
  );

  // Create Lucid with emulator
  const lucid = await Lucid(emulator, "Preview");

  return {
    lucid,
    network: "emulator",
    seller: { seedPhrase: sellerSeed, address: sellerAddress },
    buyer: { seedPhrase: buyerSeed, address: buyerAddress },
    manager: { seedPhrase: managerSeed, address: managerAddress },
    emulator,
  };
}

/**
 * Set up testnet-based test context
 */
async function setupTestnetContext(
  network: "preview" | "preprod"
): Promise<TestContext> {
  const blockfrostKey = getBlockfrostKey(network);

  if (!blockfrostKey) {
    throw new Error(
      `Blockfrost key not found for ${network}. ` +
        `Set BLOCKFROST_${network.toUpperCase()} environment variable.`
    );
  }

  const lucid = await Lucid(
    `https://cardano-${network}.blockfrost.io/api/v0`,
    network === "preview" ? "Preview" : "Preprod"
  );

  // Load test wallets from environment
  const sellerSeed = process.env.TEST_SELLER_SEED;
  const buyerSeed = process.env.TEST_BUYER_SEED;
  const managerSeed = process.env.TEST_MANAGER_SEED;

  if (!sellerSeed || !buyerSeed || !managerSeed) {
    throw new Error(
      "Test wallet seeds not found. Set TEST_SELLER_SEED, TEST_BUYER_SEED, and TEST_MANAGER_SEED."
    );
  }

  lucid.selectWallet.fromSeed(sellerSeed);
  const sellerAddress = await lucid.wallet().address();

  lucid.selectWallet.fromSeed(buyerSeed);
  const buyerAddress = await lucid.wallet().address();

  lucid.selectWallet.fromSeed(managerSeed);
  const managerAddress = await lucid.wallet().address();

  return {
    lucid,
    network,
    seller: { seedPhrase: sellerSeed, address: sellerAddress },
    buyer: { seedPhrase: buyerSeed, address: buyerAddress },
    manager: { seedPhrase: managerSeed, address: managerAddress },
  };
}

/**
 * Switch the active wallet in test context
 */
export function switchWallet(ctx: TestContext, wallet: "seller" | "buyer" | "manager"): void {
  const w = wallet === "seller" ? ctx.seller : wallet === "buyer" ? ctx.buyer : ctx.manager;
  ctx.lucid.selectWallet.fromSeed(w.seedPhrase);
}

/**
 * Wait for UTxO to be indexed on testnet
 */
export async function waitForSync(ctx: TestContext, ms: number = 30000): Promise<void> {
  if (ctx.network !== "emulator") {
    console.log(`Waiting ${ms / 1000}s for network sync...`);
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Advance emulator time (creates blocks)
 */
export function advanceTime(ctx: TestContext, ms: number): void {
  if (ctx.emulator) {
    const blocks = Math.ceil(ms / 20000); // ~20 seconds per block
    for (let i = 0; i < blocks; i++) {
      ctx.emulator.awaitBlock(1);
    }
  }
}

/**
 * Get UTxOs for an address
 */
export async function getUtxos(ctx: TestContext, address: string): Promise<UTxO[]> {
  return ctx.lucid.utxosAt(address);
}

/**
 * Get wallet balance
 */
export async function getBalance(ctx: TestContext, address: string): Promise<bigint> {
  const utxos = await getUtxos(ctx, address);
  return utxos.reduce((sum, u) => sum + (u.assets.lovelace || 0n), 0n);
}

/**
 * Format lovelace to ADA string
 */
export function formatADA(lovelace: bigint): string {
  return (Number(lovelace) / 1_000_000).toFixed(6) + " ADA";
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; delay?: number; backoffFactor?: number } = {}
): Promise<T> {
  const { maxAttempts = 3, delay = 1000, backoffFactor = 2 } = options;

  let lastError: Error | undefined;
  let currentDelay = delay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < maxAttempts) {
        console.log(`Attempt ${attempt} failed, retrying in ${currentDelay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, currentDelay));
        currentDelay *= backoffFactor;
      }
    }
  }
  throw lastError;
}

/** Test asset policy ID (for emulator) */
export const TEST_POLICY_ID = "a".repeat(56);

/** Generate test collateral asset info */
export function getTestAsset(index: number = 1) {
  const assetName = `TestNFT00${index}`;
  return {
    policy: TEST_POLICY_ID,
    assetName,
    unit: `${TEST_POLICY_ID}${Buffer.from(assetName).toString("hex")}`,
  };
}

/** Default loan terms for testing */
export const DEFAULT_LOAN_TERMS = {
  principal: 100_000_000n, // 100 ADA
  apr: 800, // 8%
  frequency: 12, // Monthly
  installments: 12, // 12 payments
  lateFee: 5_000_000n, // 5 ADA
  transferFeeSeller: 1_000_000n, // 1 ADA
  transferFeeBuyer: 1_000_000n, // 1 ADA
};

/** Default CDO tranche configuration for testing */
export const DEFAULT_TRANCHE_CONFIG = {
  senior: { allocation: 70, yieldModifier: 70 },
  mezzanine: { allocation: 20, yieldModifier: 100 },
  junior: { allocation: 10, yieldModifier: 170 },
};

// ============================================================================
// DEMO MODE - For running tests without actual contract packages linked
// ============================================================================

/**
 * Check if real contract packages are available
 */
export async function checkContractsAvailable(): Promise<{ loan: boolean; cdo: boolean }> {
  const result = { loan: false, cdo: false };

  try {
    const { LoanClient } = await import("@mintmatrix/sdk");
    // Try to see if it can actually create without throwing "not available"
    result.loan = typeof LoanClient === 'function';
  } catch {
    result.loan = false;
  }

  try {
    const { CDOClient } = await import("@mintmatrix/sdk");
    result.cdo = typeof CDOClient === 'function';
  } catch {
    result.cdo = false;
  }

  return result;
}

/**
 * Demo mode flag - set to true to simulate contract operations
 */
export const DEMO_MODE = process.env.DEMO_MODE === 'true' || process.env.DEMO_MODE === '1';

/**
 * Generate a mock transaction hash
 */
export function mockTxHash(): string {
  return Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
}

/**
 * Generate a mock contract address
 */
export function mockAddress(prefix: string = 'addr_test1'): string {
  const suffix = Array(50).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${prefix}q${suffix}`;
}

/**
 * Mock loan result for demo mode
 */
export interface MockLoanResult {
  success: boolean;
  loanAddress: string;
  txHash: string;
  policyId: string;
}

/**
 * Generate mock loan creation result
 */
export function mockLoanCreate(index: number): MockLoanResult {
  return {
    success: true,
    loanAddress: mockAddress(),
    txHash: mockTxHash(),
    policyId: `${'f'.repeat(54)}${index.toString().padStart(2, '0')}`,
  };
}

/**
 * Mock CDO result for demo mode
 */
export interface MockCDOResult {
  success: boolean;
  bondAddress: string;
  txHash: string;
  policyId: string;
  tokens: { senior: number; mezzanine: number; junior: number };
}

/**
 * Generate mock CDO creation result
 */
export function mockCDOCreate(collateralCount: number, totalTokens: number = 1000): MockCDOResult {
  const trancheConfig = DEFAULT_TRANCHE_CONFIG;
  return {
    success: true,
    bondAddress: mockAddress(),
    txHash: mockTxHash(),
    policyId: mockTxHash().slice(0, 56),
    tokens: {
      senior: Math.floor(totalTokens * trancheConfig.senior.allocation / 100),
      mezzanine: Math.floor(totalTokens * trancheConfig.mezzanine.allocation / 100),
      junior: Math.floor(totalTokens * trancheConfig.junior.allocation / 100),
    },
  };
}

/**
 * Mock loan state for demo mode
 */
export interface MockLoanState {
  isActive: boolean;
  principal: bigint;
  balance: bigint;
  paymentsMade: number;
  totalPayments: number;
  apr: number;
  nextPaymentDue: Date | null;
}

/**
 * Generate mock loan state
 */
export function mockLoanState(principal: bigint, apr: number, installments: number, paymentsMade: number = 0): MockLoanState {
  const balance = principal - (principal * BigInt(paymentsMade) / BigInt(installments));
  return {
    isActive: paymentsMade > 0 && paymentsMade < installments,
    principal,
    balance,
    paymentsMade,
    totalPayments: installments,
    apr,
    nextPaymentDue: paymentsMade < installments ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
  };
}

/**
 * Mock CDO state for demo mode
 */
export interface MockCDOState {
  isActive: boolean;
  collateral: Array<{ policyId: string; principal: bigint; isDefaulted: boolean }>;
  totalPrincipal: bigint;
  defaultRate: number;
  isMatured: boolean;
  isLiquidated: boolean;
}

/**
 * Generate mock CDO state
 */
export function mockCDOState(collateral: Array<{ policyId: string; principal: bigint; isDefaulted?: boolean }>): MockCDOState {
  const totalPrincipal = collateral.reduce((sum, c) => sum + c.principal, 0n);
  const defaulted = collateral.filter(c => c.isDefaulted).length;
  return {
    isActive: true,
    collateral: collateral.map(c => ({ ...c, isDefaulted: c.isDefaulted ?? false })),
    totalPrincipal,
    defaultRate: collateral.length > 0 ? Math.round(defaulted / collateral.length * 100) : 0,
    isMatured: false,
    isLiquidated: false,
  };
}
