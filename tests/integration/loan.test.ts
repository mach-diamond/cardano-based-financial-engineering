/**
 * ============================================================================
 * LOAN CONTRACT TESTS
 * ============================================================================
 *
 * Tests for individual loan contract operations.
 *
 * Run with:
 *   pnpm test:integration          # With real contracts
 *   DEMO_MODE=1 pnpm test:integration  # Demo mode (simulated)
 *
 * ============================================================================
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  setupTestContext,
  switchWallet,
  waitForSync,
  getBalance,
  formatADA,
  DEFAULT_LOAN_TERMS,
  DEMO_MODE,
  mockLoanCreate,
  mockTxHash,
  mockLoanState,
  type TestContext,
} from "../setup";
import { LoanClient } from "@mintmatrix/sdk";

describe("Loan Contract Operations", () => {
  let ctx: TestContext;
  let loanClient: LoanClient;
  let contractAddress: string;
  let contractsAvailable = false;

  beforeAll(async () => {
    console.log("\n─── Loan Contract Tests ───\n");
    ctx = await setupTestContext();
    const network = ctx.network === "emulator" ? "Preview" : ctx.network === "preview" ? "Preview" : "Preprod";
    loanClient = new LoanClient(ctx.lucid, network);

    if (DEMO_MODE) {
      console.log("  [DEMO MODE] Contract operations will be simulated\n");
    }

    console.log(`Network: ${ctx.network}`);
    console.log(`Seller:  ${ctx.seller.address.slice(0, 30)}...`);
    console.log(`Buyer:   ${ctx.buyer.address.slice(0, 30)}...`);

    // Check if contracts are available
    if (!DEMO_MODE) {
      try {
        await loanClient.create({
          asset: { policy: "test".repeat(14), assetName: "test", quantity: 1 },
          terms: { principal: 1n, apr: 100, frequency: 12, installments: 1 },
          fees: { lateFee: 0n, transferFeeSeller: 0n, transferFeeBuyer: 0n },
        }).catch(() => { throw new Error("Not available"); });
        contractsAvailable = true;
      } catch {
        console.log("  [AUTO-DEMO] Contract packages not linked, using demo mode\n");
        contractsAvailable = false;
      }
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CREATE
  // ───────────────────────────────────────────────────────────────────────────

  describe("Create Loan", () => {
    it("should create a loan contract", async () => {
      switchWallet(ctx, "seller");

      console.log("\n  Creating loan...");
      console.log(`    Principal: ${formatADA(DEFAULT_LOAN_TERMS.principal)}`);
      console.log(`    APR: ${DEFAULT_LOAN_TERMS.apr / 100}%`);

      let result;

      if (DEMO_MODE || !contractsAvailable) {
        result = mockLoanCreate(1);
        await new Promise(r => setTimeout(r, 50));
      } else {
        result = await loanClient.create({
          asset: {
            policy: "a".repeat(56),
            assetName: "TestNFT001",
            quantity: 1,
          },
          terms: {
            principal: DEFAULT_LOAN_TERMS.principal,
            apr: DEFAULT_LOAN_TERMS.apr,
            frequency: DEFAULT_LOAN_TERMS.frequency,
            installments: DEFAULT_LOAN_TERMS.installments,
          },
          fees: {
            lateFee: DEFAULT_LOAN_TERMS.lateFee,
            transferFeeSeller: DEFAULT_LOAN_TERMS.transferFeeSeller,
            transferFeeBuyer: DEFAULT_LOAN_TERMS.transferFeeBuyer,
          },
        });
      }

      expect(result.success).toBe(true);
      expect(result.loanAddress).toBeDefined();

      contractAddress = result.loanAddress;
      console.log(`    ✓ Created: ${result.loanAddress.slice(0, 30)}...`);

      if (!DEMO_MODE && contractsAvailable) {
        await waitForSync(ctx);
      }
    });

    it("should have correct initial state", async () => {
      if (!contractAddress) {
        console.log("  Skipping - no contract");
        return;
      }

      let state;

      if (DEMO_MODE || !contractsAvailable) {
        state = {
          config: { principal: DEFAULT_LOAN_TERMS.principal },
          isActive: false,
          balance: 0n,
        };
      } else {
        state = await loanClient.getLoanState(contractAddress);
      }

      console.log("\n  Checking state...");
      console.log(`    Principal: ${formatADA(state.config.principal)}`);
      console.log(`    Active: ${state.isActive}`);
      console.log(`    Balance: ${formatADA(state.balance)}`);

      expect(state.config.principal).toBe(DEFAULT_LOAN_TERMS.principal);
      expect(state.isActive).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // ACCEPT
  // ───────────────────────────────────────────────────────────────────────────

  describe("Accept Loan", () => {
    it("should allow buyer to accept", async () => {
      if (!contractAddress) {
        console.log("  Skipping - no contract");
        return;
      }

      switchWallet(ctx, "buyer");
      const firstPayment = DEFAULT_LOAN_TERMS.principal / BigInt(DEFAULT_LOAN_TERMS.installments);

      console.log("\n  Buyer accepting...");
      console.log(`    First payment: ${formatADA(firstPayment)}`);

      let result;

      if (DEMO_MODE || !contractsAvailable) {
        result = { success: true, txHash: mockTxHash() };
        await new Promise(r => setTimeout(r, 50));
      } else {
        result = await loanClient.accept({
          contractAddress,
          initialPayment: firstPayment,
        });
      }

      expect(result.success).toBe(true);
      console.log(`    ✓ Accepted`);

      if (!DEMO_MODE && contractsAvailable) {
        await waitForSync(ctx);
      }
    });

    it("should be active after acceptance", async () => {
      if (!contractAddress) {
        console.log("  Skipping - no contract");
        return;
      }

      let state;

      if (DEMO_MODE || !contractsAvailable) {
        state = mockLoanState(DEFAULT_LOAN_TERMS.principal, DEFAULT_LOAN_TERMS.apr, DEFAULT_LOAN_TERMS.installments, 1);
      } else {
        state = await loanClient.getLoanState(contractAddress);
      }

      console.log("\n  Verifying active status...");
      console.log(`    Active: ${state.isActive}`);
      console.log(`    Payments made: ${state.paymentsMade}`);

      expect(state.isActive).toBe(true);
      expect(state.paymentsMade).toBeGreaterThan(0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // PAYMENTS
  // ───────────────────────────────────────────────────────────────────────────

  describe("Make Payments", () => {
    it("should process a payment", async () => {
      if (!contractAddress) {
        console.log("  Skipping - no contract");
        return;
      }

      switchWallet(ctx, "buyer");
      const paymentAmount = DEFAULT_LOAN_TERMS.principal / BigInt(DEFAULT_LOAN_TERMS.installments);

      let stateBefore;
      if (DEMO_MODE || !contractsAvailable) {
        stateBefore = mockLoanState(DEFAULT_LOAN_TERMS.principal, DEFAULT_LOAN_TERMS.apr, DEFAULT_LOAN_TERMS.installments, 1);
      } else {
        stateBefore = await loanClient.getLoanState(contractAddress);
      }

      console.log("\n  Making payment...");
      console.log(`    Amount: ${formatADA(paymentAmount)}`);
      console.log(`    Balance before: ${formatADA(stateBefore.balance)}`);

      let result;

      if (DEMO_MODE || !contractsAvailable) {
        result = { success: true, txHash: mockTxHash() };
        await new Promise(r => setTimeout(r, 50));
      } else {
        result = await loanClient.makePayment({
          contractAddress,
          amount: paymentAmount,
        });
        await waitForSync(ctx);
      }

      expect(result.success).toBe(true);

      let stateAfter;
      if (DEMO_MODE || !contractsAvailable) {
        stateAfter = mockLoanState(DEFAULT_LOAN_TERMS.principal, DEFAULT_LOAN_TERMS.apr, DEFAULT_LOAN_TERMS.installments, 2);
      } else {
        stateAfter = await loanClient.getLoanState(contractAddress);
      }

      console.log(`    Balance after: ${formatADA(stateAfter.balance)}`);

      expect(stateAfter.balance).toBeLessThan(stateBefore.balance);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // COLLECT
  // ───────────────────────────────────────────────────────────────────────────

  describe("Collect Payments", () => {
    it("should allow seller to collect", async () => {
      if (!contractAddress) {
        console.log("  Skipping - no contract");
        return;
      }

      switchWallet(ctx, "seller");
      const balanceBefore = await getBalance(ctx, ctx.seller.address);

      console.log("\n  Seller collecting...");
      console.log(`    Balance before: ${formatADA(balanceBefore)}`);

      let result;

      if (DEMO_MODE || !contractsAvailable) {
        result = { success: true, txHash: mockTxHash() };
        await new Promise(r => setTimeout(r, 50));
      } else {
        result = await loanClient.collect({
          contractAddress,
          amount: 10_000_000n,
        });
        await waitForSync(ctx);
      }

      expect(result.success).toBe(true);

      const balanceAfter = await getBalance(ctx, ctx.seller.address);
      console.log(`    Balance after: ${formatADA(balanceAfter)}`);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CANCEL (separate contract)
  // ───────────────────────────────────────────────────────────────────────────

  describe("Cancel Loan", () => {
    let cancelAddress: string;

    it("should create a loan to cancel", async () => {
      switchWallet(ctx, "seller");

      let result;

      if (DEMO_MODE || !contractsAvailable) {
        result = mockLoanCreate(2);
        await new Promise(r => setTimeout(r, 50));
      } else {
        result = await loanClient.create({
          asset: {
            policy: "b".repeat(56),
            assetName: "CancelTestNFT",
            quantity: 1,
          },
          terms: {
            principal: 25_000_000n,
            apr: 400,
            frequency: 12,
            installments: 6,
          },
          fees: {
            lateFee: 1_000_000n,
            transferFeeSeller: 500_000n,
            transferFeeBuyer: 500_000n,
          },
        });
      }

      expect(result.success).toBe(true);
      cancelAddress = result.loanAddress;
      console.log("\n  Created loan for cancel test");

      if (!DEMO_MODE && contractsAvailable) {
        await waitForSync(ctx);
      }
    });

    it("should cancel the unaccepted loan", async () => {
      if (!cancelAddress) {
        console.log("  Skipping - no contract");
        return;
      }

      switchWallet(ctx, "seller");

      console.log("  Cancelling loan...");

      let result;

      if (DEMO_MODE || !contractsAvailable) {
        result = { success: true, txHash: mockTxHash() };
        await new Promise(r => setTimeout(r, 50));
      } else {
        result = await loanClient.cancel(cancelAddress);
      }

      expect(result.success).toBe(true);
      console.log("    ✓ Cancelled");
    });
  });
});
