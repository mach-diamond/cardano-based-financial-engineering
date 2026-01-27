# Agent Guidelines & Project Context

Welcome, Agent. This document provides the necessary context and guidelines for contributing to the **MintMatrix** smart contracts repository. Our goal is to build a decentralized, blockchain-based competitor to **Intex Solutions**, providing transparent, battle-tested financial instruments on Cardano.

## 🚀 Project Overview

MintMatrix is a suite of Cardano smart contracts (built with Aiken) and a TypeScript SDK designed for sophisticated financial products. We are currently focusing on:
- **Loan Contracts**: Highly flexible contracts for issuing and managing loans with collateral tracking and payment schedules. (Status: *Feature Complete*)
- **CDO/CLO Bonds**: Multi-tranche (Senior, Mezzanine, Junior) Collateralized Debt Obligations. (Status: *In Development / Testing*)
- **Midnight Integration**: Leveraging the Midnight blockchain for data protection and selective disclosure of sensitive financial data. (Status: *Proposed*)

### Repository Structure
- `packages/loan-contract`: Aiken source for loan logic.
- `packages/cdo-bond`: Aiken source for CDO/CLO logic.
- `sdk/`: TypeScript SDK for interacting with the contracts using Lucid Evolution.
- `docs/`: Documentation and API references.

---

## 🤖 Agent Guidelines

### 1. Coding Standards
- **Aiken**: Use PlutusV3 features where possible. Prioritize script size and execution budget optimization.
- **TypeScript**: Ensure full type safety. All new SDK features must include comprehensive JSDoc and unit tests.
- **Tests**: We use `aiken check` for contract validation and `vitest` for the SDK. Integration tests should simulate real-world scenarios.

### 2. Strategic Focus: The "Intex" Standard
We are not just building smart contracts; we are building a decentralized financial infrastructure.
- **Transparency**: Every cash flow must be verifiable on-chain.
- **Analytic Ready**: Data structures should be optimized for off-chain indexing and analytical tools (like Intexcalc).
- **Interoperability**: Contracts should work together (e.g., Loans acting as collateral for CDOs).

---

## 🔍 Research: Intex Solutions

Intex is the industry standard for structured finance. To compete, we must understand and replicate their core value propositions:

### Core Offerings
- **INTEXcalc™**: Analytical software for cash flow modeling and stress testing.
- **Deals Library**: Coverage of 50,000+ global deals (ABS, MBS, CLO, CDO).
- **DealMaker™**: Tools for lead managers to structure and "stress test" new issues.
- **Scenario Analysis**: Tools to model future principal/interest flows under various default/prepayment assumptions.

### Key Features to Match/Exceed
- **Multi-Tranche Waterfalls**: Precise distribution logic for P&I.
- **Stress Testing**: On-chain or SDK-based modeling for "what-if" scenarios.
- **Secondary Market Support**: Standardized metadata for tranche tokens to enable instant liquidity.

---

## 🗺️ Strategic Roadmap

### Phase 1: Foundation (Current)
- [x] Complete Loan Contract logic.
- [x] Implement basic 3-tranche CDO bond.
- [/] **Integrated Testing**: Verify Loan UTxOs correctly serve as collateral for CDO tranches.
- [ ] Comprehensive SDK coverage for all on-chain actions.

### Phase 2: Analytic Parity
- [ ] **Waterfall Engine**: Enhance distribution logic to support more complex waterfall structures (Sequential vs. Pro-Rata).
- [ ] **Stress Test SDK**: Create a "simulate" module in the SDK to model bond performance under different default scenarios.
- [ ] **Metadata Standard**: Define a CIP-compliant metadata standard for tranches.

### Phase 3: Privacy & Scaling
- [ ] **Midnight Integration**: Implement zero-knowledge proofs for private loan data while allowing regulator/auditor access via selective disclosure.
- [ ] **Structuring GUI**: A frontend/UI for managers to design bond tranches and simulate yields before deployment.
- [ ] **Automated Reporting**: On-chain events processed into real-time dashboards for investors.

### Phase 4: Market Dominance
- [ ] **Cross-Chain Collateral**: Support for wrapped assets as collateral.
- [ ] **Decentralized Rating Agency**: Governance-based risk assessment for collateral pools.

---

> [!IMPORTANT]
> Always verify the `cdo-bond` logic against the `loan-contract` payment schedules. The integrity of the CDO depends on the reliable cash flow of the underlying loans.
