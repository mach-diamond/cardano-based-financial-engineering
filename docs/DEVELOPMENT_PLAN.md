# MintMatrix Development Plan

This document outlines the fine-grained development path for the MintMatrix ecosystem, focusing on the integration of Loan and CDO/CLO contracts, privacy via Midnight, and achieving parity with industry-standard tools like Intex.

## 🎯 Strategic Milestones

### 1. Integrated Testing & Contract Interoperability
The core value proposition of MintMatrix is the seamless flow of value from individual loans to structured financial products.

- [ ] **Milestone 1.1: Collateral Interface Standardization**
    - Define a standardized "Collateral Token" metadata and datum structure that all loan contracts must adhere to.
    - Implement a validation library in Aiken to verify collateral authenticity on-chain.
- [ ] **Milestone 1.2: Integrated Test Suite (The "Matrix Run")**
    - Create a suite of E2E tests that perform the following in a single orchestration:
        1. Initialize multiple Loan contracts.
        2. Mint Loan UTxOs (Collateral Tokens).
        3. Initialize a CDO Bond using those Loan UTxOs.
        4. Trigger Loan payments and verify CDO `collect` success.
        5. Verify CDO `distribute` correctly applies waterfall logic based on collected payments.
- [ ] **Milestone 1.3: Cross-Validator Verification**
    - Implement logic in the CDO contract to directly query the status of underlying Loan contracts (via Reference Scripts or specific UTxO patterns) to detect defaults automatically.

### 2. Midnight Privacy Layer Integration
To compete with Intex in institutional markets, borrower privacy is non-negotiable.

- [ ] **Milestone 2.1: Privacy Architecture Design**
    - Map out which data stays on Cardano (public/provable) and which data moves to Midnight (private/shielded).
    - Design the "Selective Disclosure" mechanism for auditors and large tranche holders.
- [ ] **Milestone 2.2: Mock-Midnight Simulation**
    - Create a simulation layer in the TypeScript SDK to model the behavior of Midnight's ZK-proofs until the Midnight-Cardano bridge is fully operational for our use case.
- [ ] **Milestone 2.3: Hybrid Transaction Orchestration**
    - Develop SDK patterns for multi-chain transactions where a private state update on Midnight triggers an on-chain event on Cardano.

### 3. Intex Parity: Analytical Excellence
We must provide the same level of analytical depth as INTEXcalc.

- [ ] **Milestone 3.1: Sequential vs. Pro-Rata Waterfall Engine**
    - Refactor the `distribute` action to support configurable payout structures.
    - Implement "Triggers" (e.g., OC/IC tests) that shift distributions from Pro-Rata to Sequential based on collateral performance.
- [ ] **Milestone 3.2: The "Stress-Test" SDK Module**
    - Build a `SimulationEngine` in the TypeScript SDK that can intake a bond's state and simulate:
        - Constant Default Rate (CDR) scenarios.
        - Constant Prepayment Rate (CPR) scenarios.
        - Loss Severity assumptions.
- [ ] **Milestone 3.3: Real-Time Performance Dashboards**
    - Develop an indexing service (using Kupo/Ogmios) optimized for bond performance metrics (Current Yield, Cumulative Loss, Weighted Average Life).

---

## 🛠️ Immediate Roadmap (Next 30 Days)

### Week 1-2: Integration Foundation
- [ ] Finalize `cdo-bond` integrated testing with `loan-contract`.
- [ ] Standardize error codes across all Aiken contracts.
- [ ] Update SDK to support multi-contract transaction building natively.

### Week 3-4: The Privacy Prototype
- [ ] Draft the Midnight integration spec (ZKP circuits for loan validation).
- [ ] Implement the first set of "Stress Test" SDK utilities.
- [ ] Create a CLI tool for managers to "Dry Run" a bond distribution.

---

## 🏗️ Technical Debt & Refactoring
- **Library Standardization**: Move shared math and validation logic into a common `packages/mintmatrix-lib` Aiken package.
- **Documentation**: Ensure every validator has a corresponding `.md` in `docs/contracts/` describing its State Machine transitions.
- **SDK Clean-up**: Align the `loan-contract` SDK patterns with the more recent `cdo-bond` CLI architecture.
