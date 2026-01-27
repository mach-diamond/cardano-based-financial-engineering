# Distributions

This guide covers distributing accumulated payments to tranche token holders.

## Distribution Overview

Distributions follow a strict "waterfall" priority:

```
Accumulated Payments
        │
        ▼
┌───────────────────┐
│   Senior Tranche  │ ← Paid first (up to entitlement)
└─────────┬─────────┘
          │ Remaining
          ▼
┌───────────────────┐
│ Mezzanine Tranche │ ← Paid second
└─────────┬─────────┘
          │ Remaining
          ▼
┌───────────────────┐
│   Junior Tranche  │ ← Receives residual
└───────────────────┘
```

## Triggering Distribution

```typescript
const result = await client.cdo.distribute({
  bondAddress: bondAddress,
});

console.log('Distribution complete:', result.txHash);
```

## Distribution Calculation

The contract calculates each tranche's entitlement:

```typescript
// Simplified distribution logic
function calculateDistribution(state: BondState) {
  const available = state.totalCollected - state.totalDistributed;

  // Senior gets paid first
  const seniorEntitlement = calculateEntitlement(
    state.principal,
    state.config.tranches.senior,
    state.createdAt
  );
  const seniorPayout = min(available, seniorEntitlement);

  // Mezzanine gets remainder
  const afterSenior = available - seniorPayout;
  const mezzEntitlement = calculateEntitlement(
    state.principal,
    state.config.tranches.mezzanine,
    state.createdAt
  );
  const mezzPayout = min(afterSenior, mezzEntitlement);

  // Junior gets residual
  const juniorPayout = afterSenior - mezzPayout;

  return { seniorPayout, mezzPayout, juniorPayout };
}
```

## Distribution Timing

### Periodic Distributions

Schedule regular distributions:

```typescript
// Monthly distribution schedule
async function scheduleDistribution(bondAddress: string) {
  const state = await client.cdo.getBondState(bondAddress);
  const undistributed = state.totalCollected - state.totalDistributed;

  // Minimum threshold to trigger distribution (saves tx fees)
  const MINIMUM_DISTRIBUTION = 10_000_000n; // 10 ADA

  if (undistributed >= MINIMUM_DISTRIBUTION) {
    await client.cdo.distribute({ bondAddress });
    console.log(`Distributed ${formatADA(undistributed)}`);
  } else {
    console.log('Below minimum threshold, skipping distribution');
  }
}
```

### Event-Driven Distributions

Distribute after significant collections:

```typescript
// Distribute after collecting threshold amount
const COLLECTION_THRESHOLD = 1_000_000_000n; // 1000 ADA

async function collectAndMaybeDistribute(
  bondAddress: string,
  collateralIndex: number,
  amount: bigint
) {
  // Collect the payment
  await client.cdo.collect({
    bondAddress,
    collateralIndex,
    amount,
  });

  // Check if threshold reached
  const state = await client.cdo.getBondState(bondAddress);
  const undistributed = state.totalCollected - state.totalDistributed;

  if (undistributed >= COLLECTION_THRESHOLD) {
    await waitForSync();
    await client.cdo.distribute({ bondAddress });
  }
}
```

## Claiming Distributions

Token holders receive distributions proportionally:

```typescript
// Distribution flows to token holders based on ownership
// If you hold 10% of senior tokens, you receive 10% of senior distributions
```

The distribution mechanism depends on your token holder management approach:

### Direct Distribution

Funds go directly to token holder wallets (more complex but direct):

```typescript
// Manager maintains registry of token holders
const tokenHolders = await getTokenHolderRegistry(bondAddress);

// Distribute proportionally
for (const holder of tokenHolders.senior) {
  const share = holder.tokens * seniorPayout / totalSeniorTokens;
  await sendADA(holder.address, share);
}
```

### Pool-Based Distribution

Funds accumulate in pool, holders claim their share:

```typescript
// Holder claims their accumulated share
const result = await client.cdo.claim({
  bondAddress: bondAddress,
  tranche: 'senior',
  tokenAmount: myTokens,
});
```

## Distribution Tracking

Query distribution history:

```typescript
const state = await client.cdo.getBondState(bondAddress);

console.log('Distribution Summary:');
console.log(`  Total Collected: ${formatADA(state.totalCollected)}`);
console.log(`  Total Distributed: ${formatADA(state.totalDistributed)}`);
console.log(`  Pending: ${formatADA(state.totalCollected - state.totalDistributed)}`);
```

## Loss Absorption

When defaults occur, losses are absorbed in reverse order:

```typescript
// If total loss = 15% of principal:
// - Junior (10%) is wiped out completely
// - Mezzanine absorbs remaining 5%
// - Senior is unaffected

function calculateTrancheValue(state: BondState, tranche: 'senior' | 'mezzanine' | 'junior') {
  const totalLoss = calculateLossFromDefaults(state);
  const allocation = state.principal * BigInt(state.config.tranches[tranche].percentage) / 100n;

  // Junior absorbs first
  const juniorAlloc = state.principal * BigInt(state.config.tranches.junior.percentage) / 100n;
  let remainingLoss = totalLoss;

  if (tranche === 'junior') {
    return max(0n, allocation - remainingLoss);
  }

  remainingLoss = max(0n, remainingLoss - juniorAlloc);

  // Mezzanine absorbs second
  const mezzAlloc = state.principal * BigInt(state.config.tranches.mezzanine.percentage) / 100n;

  if (tranche === 'mezzanine') {
    return max(0n, allocation - remainingLoss);
  }

  remainingLoss = max(0n, remainingLoss - mezzAlloc);

  // Senior absorbs last
  return max(0n, allocation - remainingLoss);
}
```

## Next Steps

- [Lifecycle](/guide/cdo/lifecycle) - Maturity, liquidation, and redemption
- [API Reference](/api/cdo) - Complete CDOClient documentation
