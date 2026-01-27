# MintMatrix Financial Lifecycle Workflow

This document outlines the end-to-end process of creating and managing sophisticated financial products on the MintMatrix platform.

## 1. Role Definitions

| Role | Responsibility |
| :--- | :--- |
| **Originator** | Owns real-world assets (RWAs) and initiates the lending process by tokenizing them. |
| **Borrower** | Takes out loans using tokenized assets as collateral. |
| **Analyst** | Manages the securitization process, bundling multiple loans into structured CDOs. |
| **Investor** | Subscribes to different tranches of CDOs based on their risk/reward profile. |

## 2. The Lifecycle Path

### Phase A: Asset Tokenization (RWA)
High-value assets are minted as non-fungible tokens (NFTs) on the Cardano blockchain. 
*   **Examples**: Airplanes, Luxury Homes, Commercial Boats.
*   **Outcome**: The Originator holds a unique token representing the legal title/value of the asset.

### Phase B: Loan Initialization
The Originator creates an **Amortized Loan Contract**.
1.  The tokenized asset (e.g., Home NFT) is locked in a secure validator (Escrow).
2.  The loan terms (Principal, APR, Installments) are defined.
3.  The contract generates a **Loan Collateral Token (LCT)** representing the right to the underlying collateral.

### Phase C: CDO Securitization
The Analyst identifies a pool of active loans and bundles their LCTs into a **Collateralized Debt Obligation (CDO)**.
*   **Senior Tranche**: Lowest risk, first priority on payments, lower interest.
*   **Mezzanine Tranche**: Moderate risk/reward.
*   **Junior (Equity) Tranche**: Highest risk, absorbs first losses, highest potential yield.

### Phase D: Payment & Waterfall Distribution
As Borrowers make repayments on their individual loans:
1.  Funds are collected by the CDO contract.
2.  Payments are distributed to Tranche holders following the **Waterfall Principle** (Senior → Mezz → Junior).
3.  Losses (Defaults) flow in the opposite direction (Junior → Mezz → Senior).

## 3. Maturity
Once the underlying loans reach maturity or are paid off, the CDO matures, and investors can redeem their tranche tokens for the final principal and interest.
