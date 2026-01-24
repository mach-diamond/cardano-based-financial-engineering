# CDO Bonds Overview

## What is a CDO?

A Collateralized Debt Obligation (CDO) is a structured financial product backed by a pool of assets (collateral). The cash flows from these assets are distributed to investors according to a priority structure called a "waterfall."

## MintMatrix CDO Structure

```
                    ┌──────────────────────┐
                    │   Collateral Pool    │
                    │  (Loan NFTs, etc.)   │
                    └──────────┬───────────┘
                               │
                        Cash Flows
                               │
                               ▼
┌─────────────────────────────────────────────────────┐
│                   CDO Bond Contract                 │
│                                                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │
│  │   Senior    │ │  Mezzanine  │ │   Junior    │  │
│  │   Tranche   │ │   Tranche   │ │   Tranche   │  │
│  │             │ │             │ │             │  │
│  │  Paid 1st   │ │  Paid 2nd   │ │  Paid 3rd   │  │
│  │  Low Risk   │ │  Med Risk   │ │  High Risk  │  │
│  │  Low Yield  │ │  Med Yield  │ │ High Yield  │  │
│  └─────────────┘ └─────────────┘ └─────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Tranches

### Senior Tranche (70% typical allocation)

- **First priority** for payments
- **Lowest risk** - losses only occur after junior and mezzanine are wiped out
- **Lowest yield** - typically 5-8% APY
- Suitable for conservative investors

### Mezzanine Tranche (20% typical allocation)

- **Second priority** for payments
- **Medium risk** - absorbs losses after junior tranche
- **Medium yield** - typically 10-15% APY
- Suitable for balanced investors

### Junior Tranche (10% typical allocation)

- **Last priority** for payments (equity position)
- **Highest risk** - first to absorb any losses
- **Highest yield** - typically 15-25%+ APY
- Suitable for risk-tolerant investors seeking high returns

## Bond Lifecycle

```
CREATE → COLLECT → DISTRIBUTE → (repeat) → MATURE/LIQUIDATE → REDEEM
```

### 1. Creation

A manager creates a bond by:
- Depositing collateral assets into the contract
- Configuring tranche percentages and interest rates
- Setting the term length

The contract mints tranche tokens (Senior, Mezzanine, Junior) representing investor positions.

### 2. Collection

When underlying collateral generates cash flows (e.g., loan payments):
- Manager calls `collect()` to record the payment
- Funds accumulate in the bond contract
- Collateral status is tracked on-chain

### 3. Distribution

Periodically, the manager distributes accumulated funds:
- Senior tranche receives payment first (up to their entitled amount)
- Remaining funds go to Mezzanine
- Any excess goes to Junior
- Distribution follows the "waterfall" strictly

### 4. Default Handling

If collateral defaults (e.g., a borrower stops paying):
- Manager marks the collateral as defaulted
- Loss is recorded against the bond
- Junior tranche absorbs losses first
- If losses exceed junior, mezzanine absorbs next
- Senior only takes losses if both junior and mezzanine are wiped out

### 5. Maturity

At the end of the term:
- Bond enters maturity state
- Final distribution occurs
- Tranche tokens become redeemable
- Investors can redeem for their share

### 6. Liquidation

If conditions warrant (excessive defaults):
- Manager can trigger liquidation
- Remaining collateral is sold
- Proceeds distributed per waterfall
- Bond is terminated

## On-Chain Validation

All operations are validated by PlutusV3 smart contracts:

| Operation | Validation |
|-----------|------------|
| Create | Valid tranche configuration, sufficient collateral |
| Collect | Payment from registered collateral, amount verification |
| Distribute | Waterfall order enforced, correct amounts |
| Default | Only registered collateral, manager signature |
| Mature | Term completion verified |
| Liquidate | Default threshold exceeded |
| Redeem | Token ownership verified, correct payout |

## Tranche Tokens

Each tranche is represented by fungible tokens:

- **Senior Tokens** - Represent senior tranche position
- **Mezzanine Tokens** - Represent mezzanine position
- **Junior Tokens** - Represent junior position

Token quantities correspond to investment amounts, enabling:
- Secondary market trading
- Fractional ownership
- Portfolio diversification

## Example Configuration

```typescript
const bondConfig = {
  principal: 1_000_000_000_000n, // 1,000,000 ADA

  tranches: {
    senior: {
      percentage: 70,       // 700,000 ADA allocation
      interestRate: 600,    // 6% APY
    },
    mezzanine: {
      percentage: 20,       // 200,000 ADA allocation
      interestRate: 1200,   // 12% APY
    },
    junior: {
      percentage: 10,       // 100,000 ADA allocation
      interestRate: 2000,   // 20% APY
    },
  },

  termMonths: 24,
  collateralCount: 10,
};
```

## Next Steps

- [Creating Bonds](/guide/cdo/creating) - Step-by-step bond creation
- [Managing Collateral](/guide/cdo/collateral) - Collateral operations
- [Distributions](/guide/cdo/distributions) - Payment waterfall
