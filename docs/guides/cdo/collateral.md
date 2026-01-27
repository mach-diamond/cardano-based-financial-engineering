# Managing Collateral

This guide covers managing collateral assets within a CDO bond.

## Collateral Overview

Collateral in a CDO bond represents the underlying assets generating cash flows. Each collateral item:

- Is tracked by index (0-based)
- Has payment history recorded on-chain
- Can be marked as defaulted when payments stop

## Collecting Payments

When underlying collateral generates payments (e.g., loan payments), record them:

```typescript
// Collect payment from first collateral asset
const result = await client.cdo.collect({
  bondAddress: bondAddress,
  collateralIndex: 0,
  amount: 500_000_000n, // 500 ADA payment
});

console.log('Payment collected:', result.txHash);
```

### Payment Tracking

The bond tracks cumulative payments per collateral:

```typescript
const state = await client.cdo.getBondState(bondAddress);

state.collateral.forEach((c, i) => {
  console.log(`Collateral ${i}:`);
  console.log(`  Status: ${c.isDefaulted ? 'DEFAULTED' : 'ACTIVE'}`);
  console.log(`  Total paid: ${formatADA(c.totalPaid)}`);
  if (c.lastPaymentDate) {
    console.log(`  Last payment: ${c.lastPaymentDate.toISOString()}`);
  }
});
```

## Handling Defaults

When a collateral asset stops generating payments:

```typescript
// Mark collateral as defaulted
const result = await client.cdo.markDefault({
  bondAddress: bondAddress,
  collateralIndex: 2,
  reason: 'Borrower missed 3 consecutive payments',
});

console.log('Default recorded:', result.txHash);
```

### Default Impact

Defaults affect tranche payouts:

1. **Junior absorbs first** - Junior tranche takes losses before others
2. **Mezzanine absorbs second** - Only takes losses after junior is wiped out
3. **Senior absorbs last** - Protected by junior and mezzanine cushion

```typescript
// Calculate default impact
const state = await client.cdo.getBondState(bondAddress);
const totalDefaults = state.collateral
  .filter(c => c.isDefaulted)
  .length;

const defaultRate = totalDefaults / state.collateral.length;
console.log(`Default rate: ${(defaultRate * 100).toFixed(1)}%`);

// Check if junior is wiped out
const juniorAllocation = state.principal * BigInt(state.config.tranches.junior.percentage) / 100n;
const totalLoss = calculateLossFromDefaults(state);

if (totalLoss >= juniorAllocation) {
  console.log('Warning: Junior tranche fully absorbed');
}
```

## Collateral Status Report

Generate a comprehensive collateral report:

```typescript
async function generateCollateralReport(bondAddress: string) {
  const state = await client.cdo.getBondState(bondAddress);

  const report = {
    totalCollateral: state.collateral.length,
    activeCollateral: state.collateral.filter(c => !c.isDefaulted).length,
    defaultedCollateral: state.collateral.filter(c => c.isDefaulted).length,
    totalCollected: state.totalCollected,
    averagePaymentPerAsset: state.totalCollected / BigInt(state.collateral.length),
    collateralDetails: state.collateral.map((c, i) => ({
      index: i,
      status: c.isDefaulted ? 'DEFAULTED' : 'ACTIVE',
      totalPaid: c.totalPaid,
      lastPayment: c.lastPaymentDate,
    })),
  };

  return report;
}

const report = await generateCollateralReport(bondAddress);
console.log(JSON.stringify(report, null, 2));
```

## Best Practices

### Regular Monitoring

```typescript
// Set up monitoring for late payments
async function checkForLatePayments(bondAddress: string, thresholdDays: number) {
  const state = await client.cdo.getBondState(bondAddress);
  const now = new Date();

  const lateCollateral = state.collateral
    .filter(c => !c.isDefaulted && c.lastPaymentDate)
    .filter(c => {
      const daysSincePayment = (now.getTime() - c.lastPaymentDate!.getTime()) / (1000 * 60 * 60 * 24);
      return daysSincePayment > thresholdDays;
    });

  if (lateCollateral.length > 0) {
    console.warn(`${lateCollateral.length} collateral items have late payments`);
  }

  return lateCollateral;
}
```

### Batch Operations

For efficiency, batch multiple collections:

```typescript
// Collect multiple payments in sequence
for (const payment of payments) {
  await client.cdo.collect({
    bondAddress: bondAddress,
    collateralIndex: payment.index,
    amount: payment.amount,
  });

  // Wait for UTxO sync between transactions
  await waitForSync(30000);
}
```

### Default Threshold Alerts

```typescript
const DEFAULT_THRESHOLD = 0.20; // 20% default rate triggers alert

async function checkDefaultThreshold(bondAddress: string) {
  const state = await client.cdo.getBondState(bondAddress);
  const defaultRate = state.collateral.filter(c => c.isDefaulted).length
    / state.collateral.length;

  if (defaultRate >= DEFAULT_THRESHOLD) {
    console.warn('Default threshold exceeded - consider liquidation');
    return true;
  }
  return false;
}
```

## Next Steps

- [Distributions](/guide/cdo/distributions) - Distribute collected payments
- [Lifecycle](/guide/cdo/lifecycle) - Maturity and liquidation
