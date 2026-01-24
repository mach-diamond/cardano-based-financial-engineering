# Creating CDO Bonds

This guide walks through the detailed process of creating a CDO bond.

## Prerequisites

Before creating a bond, ensure you have:

1. **Manager wallet** - With sufficient ADA for transaction fees
2. **Collateral assets** - NFTs representing the underlying loans
3. **SDK initialized** - Connected to the appropriate network

## Step 1: Prepare Collateral

Collateral assets must be NFTs that represent real-world or on-chain assets (typically loans):

```typescript
// Query your wallet for collateral NFTs
const utxos = await client.getUtxos();
const collateralUtxos = utxos.filter(utxo =>
  utxo.assets[collateralPolicyId + collateralAssetName]
);

// Create collateral references
const collateral = collateralUtxos.map(utxo => ({
  txHash: utxo.txHash,
  outputIndex: utxo.outputIndex,
}));
```

## Step 2: Configure the Bond

Define the bond parameters:

```typescript
const bondConfig = {
  // Total bond value - this determines tranche token quantities
  principal: 100_000_000_000n, // 100,000 ADA

  // Tranche configuration
  tranches: {
    // Senior: First priority, lowest risk/return
    senior: {
      percentage: 70,      // 70,000 ADA allocation
      interestRate: 600,   // 6% APY
    },
    // Mezzanine: Second priority, medium risk/return
    mezzanine: {
      percentage: 20,      // 20,000 ADA allocation
      interestRate: 1200,  // 12% APY
    },
    // Junior: Last priority (equity), highest risk/return
    junior: {
      percentage: 10,      // 10,000 ADA allocation
      interestRate: 2000,  // 20% APY
    },
  },

  // Bond duration
  termMonths: 12,

  // Collateral token identification
  collateralPolicyId: 'abc123...',
  collateralAssetName: 'LoanNFT',
};
```

### Choosing Tranche Percentages

| Configuration | Use Case |
|---------------|----------|
| 70/20/10 | Standard structure, balanced risk |
| 80/15/5 | Conservative, most capital protected |
| 60/25/15 | Aggressive, higher yields available |

### Setting Interest Rates

Interest rates are in basis points (1/100 of a percent):

| Basis Points | Percentage | Typical Use |
|--------------|------------|-------------|
| 500 | 5% | Ultra-conservative senior |
| 800 | 8% | Standard senior |
| 1200 | 12% | Standard mezzanine |
| 2000 | 20% | Standard junior |
| 3000+ | 30%+ | High-yield junior |

## Step 3: Create the Bond

```typescript
const result = await client.cdo.create({
  manager: await client.address(),
  config: bondConfig,
  collateral: collateral,
});

console.log('Bond created successfully!');
console.log('Transaction hash:', result.txHash);
console.log('Bond address:', result.bondAddress);
console.log('Tranche tokens minted:');
console.log('  Senior:', result.trancheTokens.senior.quantity);
console.log('  Mezzanine:', result.trancheTokens.mezzanine.quantity);
console.log('  Junior:', result.trancheTokens.junior.quantity);
```

## Step 4: Distribute Tranche Tokens

After creation, distribute tranche tokens to investors:

```typescript
// Send senior tokens to conservative investors
await client.sendTokens({
  to: seniorInvestorAddress,
  tokens: [{
    policyId: result.trancheTokens.senior.policyId,
    assetName: result.trancheTokens.senior.assetName,
    quantity: seniorQuantity,
  }],
});

// Send mezzanine tokens
await client.sendTokens({
  to: mezzInvestorAddress,
  tokens: [{
    policyId: result.trancheTokens.mezzanine.policyId,
    assetName: result.trancheTokens.mezzanine.assetName,
    quantity: mezzQuantity,
  }],
});

// Keep or distribute junior tokens (often kept by issuer)
```

## Error Handling

```typescript
try {
  const result = await client.cdo.create({...});
} catch (e) {
  if (e.message.includes('Insufficient collateral')) {
    console.error('Not enough collateral assets provided');
  } else if (e.message.includes('Invalid tranche')) {
    console.error('Tranche percentages must sum to 100');
  } else if (e.message.includes('Insufficient funds')) {
    console.error('Wallet needs more ADA for fees');
  }
}
```

## Verification

After creation, verify the bond state:

```typescript
const state = await client.cdo.getBondState(result.bondAddress);

console.log('Bond verified:');
console.log('  Principal:', formatADA(state.principal));
console.log('  Collateral count:', state.collateral.length);
console.log('  Status:', state.isMatured ? 'Matured' : 'Active');
```

## Next Steps

- [Managing Collateral](/guide/cdo/collateral) - Handle payments and defaults
- [Distributions](/guide/cdo/distributions) - Distribute yields to tranches
- [Lifecycle](/guide/cdo/lifecycle) - Full bond lifecycle management
