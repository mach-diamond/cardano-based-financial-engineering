# Quick Start

This guide walks you through creating your first CDO bond using the MintMatrix SDK.

## Prerequisites

1. SDK installed (see [Installation](/guide/installation))
2. A Cardano wallet with test ADA
3. Blockfrost API key for Preview network

## Initialize the Client

```typescript
import { MintMatrix } from '@mintmatrix/sdk';
import { Lucid } from '@lucid-evolution/lucid';

const client = await MintMatrix.create({
  network: 'Preview',
  blockfrostKey: process.env.BLOCKFROST_PREVIEW!,
});

// Select a wallet (example using seed phrase)
client.selectWallet({
  type: 'seed',
  seedPhrase: 'your seed phrase here',
});
```

## Create a CDO Bond

```typescript
// Define bond configuration
const bondConfig = {
  // Total bond value in lovelace (100,000 ADA)
  principal: 100_000_000_000n,

  // Tranche configuration
  tranches: {
    senior: {
      percentage: 70,      // 70% of principal
      interestRate: 500,   // 5% annual (basis points)
    },
    mezzanine: {
      percentage: 20,      // 20% of principal
      interestRate: 1200,  // 12% annual
    },
    junior: {
      percentage: 10,      // 10% of principal
      interestRate: 2000,  // 20% annual
    },
  },

  // Bond terms
  termMonths: 12,
  paymentFrequency: 'monthly',

  // Collateral requirements
  collateralPolicyId: 'your_policy_id',
  collateralAssetName: 'your_asset_name',
  collateralCount: 5,
};

// Create the bond
const result = await client.cdo.create({
  manager: await client.address(),
  config: bondConfig,
  collateral: [
    { txHash: 'abc...', outputIndex: 0 },
    { txHash: 'def...', outputIndex: 1 },
    // ... more collateral UTxOs
  ],
});

console.log('Bond created!');
console.log('Transaction:', result.txHash);
console.log('Bond Address:', result.bondAddress);
```

## Collect a Payment

```typescript
// Simulate a payment on one collateral asset
const collectResult = await client.cdo.collect({
  bondAddress: result.bondAddress,
  collateralIndex: 0,  // First collateral asset
  amount: 500_000_000n, // 500 ADA payment
});

console.log('Payment collected:', collectResult.txHash);
```

## Distribute to Tranches

```typescript
// Distribute accumulated payments to token holders
const distributeResult = await client.cdo.distribute({
  bondAddress: result.bondAddress,
});

console.log('Distribution complete:', distributeResult.txHash);
```

## Query Bond State

```typescript
const state = await client.cdo.getBondState(result.bondAddress);

console.log('Bond State:', {
  principal: state.principal,
  collected: state.totalCollected,
  distributed: state.totalDistributed,
  collateralStatus: state.collateral.map(c => ({
    status: c.isDefaulted ? 'DEFAULTED' : 'ACTIVE',
    payments: c.totalPaid,
  })),
});
```

## Next Steps

- [CDO Overview](/guide/cdo/overview) - Understand CDO bond mechanics
- [Creating Bonds](/guide/cdo/creating) - Detailed bond creation guide
- [API Reference](/api/) - Complete API documentation
