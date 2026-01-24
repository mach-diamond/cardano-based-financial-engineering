# Introduction

MintMatrix SDK provides a TypeScript interface for interacting with MintMatrix financial instrument smart contracts on Cardano.

## What is MintMatrix?

MintMatrix is a suite of smart contracts for creating sophisticated financial instruments on the Cardano blockchain:

- **CDO Bonds** - Collateralized Debt Obligations with multi-tranche support
- **Loan Contracts** - Asset-backed loans with payment tracking
- **Digital Gold** *(Coming Soon)* - 1:1 backed tokenized gold
- **Options** *(Coming Soon)* - Derivatives contracts
- **Auctions** *(Coming Soon)* - On-chain auction mechanisms

## Key Features

### Multi-Tranche CDO Structure

CDO bonds support three tranches with different risk/reward profiles:

| Tranche | Risk Level | Priority | Typical Yield |
|---------|------------|----------|---------------|
| Senior | Low | First | 5-8% |
| Mezzanine | Medium | Second | 10-15% |
| Junior | High | Last | 15-25%+ |

### On-Chain Validation

All business logic is validated on-chain using PlutusV3 validators:

- Payment collection verification
- Distribution waterfall enforcement
- Default and liquidation rules
- Maturity processing

### TypeScript SDK

The SDK provides:

- Full TypeScript type definitions
- Transaction building helpers
- State querying utilities
- Event handling

## Architecture

```
┌─────────────────────────────────────────────────┐
│                 Your Application                │
├─────────────────────────────────────────────────┤
│              @mintmatrix/sdk                    │
│  ┌─────────────┐  ┌─────────────┐              │
│  │  CDOClient  │  │ LoanClient  │  ...         │
│  └─────────────┘  └─────────────┘              │
├─────────────────────────────────────────────────┤
│              Lucid Evolution                    │
├─────────────────────────────────────────────────┤
│         Cardano Network (via Blockfrost)        │
├─────────────────────────────────────────────────┤
│            PlutusV3 Smart Contracts             │
│  ┌─────────────┐  ┌─────────────────┐          │
│  │  CDO Bond   │  │ Asset Transfer  │  ...     │
│  └─────────────┘  └─────────────────┘          │
└─────────────────────────────────────────────────┘
```

## Next Steps

- [Installation](/guide/installation) - Install the SDK
- [Quick Start](/guide/quickstart) - Create your first bond
- [CDO Overview](/guide/cdo/overview) - Learn about CDO bonds
