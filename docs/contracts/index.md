# Smart Contracts Overview

MintMatrix uses PlutusV3 smart contracts written in Aiken for on-chain validation.

## Contract Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        MintMatrix Contracts                    │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────────────┐      ┌─────────────────────┐        │
│  │   CDO Bond Contract │      │ Asset Transfer      │        │
│  │   ─────────────────│      │ Contract            │        │
│  │   • Bond lifecycle  │      │ ─────────────────   │        │
│  │   • Tranche mgmt    │      │ • Loan creation     │        │
│  │   • Distributions   │      │ • Payment tracking  │        │
│  │   • Defaults        │      │ • Collateral        │        │
│  └─────────────────────┘      └─────────────────────┘        │
│                                                                │
│  ┌─────────────────────┐      ┌─────────────────────┐        │
│  │   Digital Gold      │      │   Options Contract  │        │
│  │   (Coming Soon)     │      │   (Coming Soon)     │        │
│  └─────────────────────┘      └─────────────────────┘        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## Available Contracts

| Contract | Status | Description |
|----------|--------|-------------|
| CDO Bond | ✅ Ready | Multi-tranche collateralized debt obligations |
| Asset Transfer | ✅ Ready | Loan/mortgage with collateral |
| Digital Gold | 🔄 Planned | 1:1 backed tokenized gold |
| Options | 🔄 Planned | Derivatives contracts |
| Auction | 🔄 Planned | On-chain auction mechanism |

## Contract Distribution

MintMatrix contracts are distributed as compiled CBOR (Cardano Binary Object Representation). This allows:

- **Closed-source protection** - Aiken source code remains private
- **Easy integration** - Just load the compiled script
- **Verified deployment** - Script hashes are deterministic

### Using Compiled Contracts

```typescript
import cdoBondScript from '@mintmatrix/contracts/cdo-bond.json';
import assetTransferScript from '@mintmatrix/contracts/asset-transfer.json';

// The SDK handles script loading automatically
const client = await MintMatrix.create({
  network: 'Preview',
  blockfrostKey: '...',
});

// Scripts are loaded when you use the clients
const bondResult = await client.cdo.create({ ... });
```

## Validator Types

MintMatrix contracts use different validator types:

### Spending Validators

Control when UTxOs can be spent:
- **CDO Bond** - Validates bond state transitions
- **Asset Transfer** - Validates loan payments and closures

### Minting Policies

Control token minting:
- **Tranche Tokens** - Senior, Mezzanine, Junior bond tokens
- **Loan NFTs** - Unique loan identifiers

### Staking Validators

*(Future feature)*
- Yield distribution mechanisms
- Reward claiming

## On-Chain Data Model

Contracts store state in UTxO datums:

### CDO Bond Datum

```aiken
type BondDatum {
  manager: VerificationKeyHash,
  config: BondConfig,
  collateral: List<Collateral>,
  state: BondState,
}

type BondState {
  total_collected: Int,
  total_distributed: Int,
  is_matured: Bool,
  is_liquidated: Bool,
}
```

### Loan Datum

```aiken
type LoanDatum {
  borrower: VerificationKeyHash,
  lender: VerificationKeyHash,
  config: LoanConfig,
  state: LoanState,
}

type LoanState {
  balance: Int,
  payments_made: Int,
  is_defaulted: Bool,
}
```

## Redeemers

Actions are specified via redeemers:

### CDO Bond Redeemers

```aiken
type BondRedeemer {
  Collect { collateral_index: Int, amount: Int }
  Distribute
  MarkDefault { collateral_index: Int }
  Mature
  Liquidate
  Redeem { tranche: Tranche, amount: Int }
}
```

### Loan Redeemers

```aiken
type LoanRedeemer {
  MakePayment { amount: Int }
  MarkDefault
  CloseLoan
}
```

## Security Model

### Manager Authority

CDO bonds have a designated manager who can:
- Mark collateral as defaulted
- Trigger maturity processing
- Initiate liquidation

The manager cannot:
- Steal funds
- Modify tranche allocations
- Change interest rates

### Validation Rules

All operations are validated on-chain:

1. **Payment Verification** - Amounts match claimed values
2. **Waterfall Enforcement** - Senior paid before mezzanine, etc.
3. **State Transitions** - Only valid state changes allowed
4. **Authorization** - Correct signatures required

## Next Steps

- [CDO Bond Contract](/contracts/cdo-bond) - Detailed CDO contract docs
- [Asset Transfer Contract](/contracts/asset-transfer) - Loan contract docs
- [Deployment Guide](/contracts/deployment) - How to deploy contracts
