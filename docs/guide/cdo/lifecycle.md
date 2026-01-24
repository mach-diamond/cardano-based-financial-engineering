# Bond Lifecycle

This guide covers the complete lifecycle of a CDO bond from creation to redemption.

## Lifecycle Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CDO BOND LIFECYCLE                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   CREATE ──► ACTIVE ──► [COLLECT/DISTRIBUTE cycles] ──► TERMINAL    │
│                │                                           │         │
│                │                                      ┌────┴────┐    │
│                ▼                                      ▼         ▼    │
│           MarkDefault                             MATURED  LIQUIDATED│
│           (if needed)                                │         │     │
│                                                      └────┬────┘     │
│                                                           ▼         │
│                                                        REDEEM        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## Phase 1: Creation

The bond is created with collateral and configuration:

```typescript
const bond = await client.cdo.create({
  manager: managerAddress,
  config: bondConfig,
  collateral: collateralRefs,
});
```

**What happens:**
- Collateral locked in contract
- Tranche tokens minted
- Bond enters ACTIVE state
- Creation slot recorded for maturity calculation

## Phase 2: Active Management

During the active phase, the manager:

### Collects Payments

```typescript
// Regular payment collection
await client.cdo.collect({
  bondAddress: bond.bondAddress,
  collateralIndex: 0,
  amount: paymentAmount,
});
```

### Distributes to Tranches

```typescript
// Periodic distribution
await client.cdo.distribute({
  bondAddress: bond.bondAddress,
});
```

### Handles Defaults

```typescript
// When collateral stops performing
await client.cdo.markDefault({
  bondAddress: bond.bondAddress,
  collateralIndex: 2,
  reason: 'Non-payment',
});
```

## Phase 3: Terminal State

A bond enters terminal state through either:

### Option A: Maturity

When the term ends naturally:

```typescript
// Process maturity (requires term to have elapsed)
const result = await client.cdo.mature({
  bondAddress: bond.bondAddress,
});

// Final distribution is triggered automatically
```

**Maturity Requirements:**
- Current slot >= creation slot + term slots
- Bond not already matured or liquidated

### Option B: Liquidation

For emergency termination:

```typescript
// Trigger liquidation (manager action)
const result = await client.cdo.liquidate({
  bondAddress: bond.bondAddress,
  reason: 'Default threshold exceeded',
});
```

**Liquidation Conditions:**
- Excessive defaults (configurable threshold)
- Manager emergency decision
- Market conditions warrant early termination

## Phase 4: Redemption

After maturity or liquidation, token holders redeem:

```typescript
// Redeem senior tokens
const result = await client.cdo.redeem({
  bondAddress: bond.bondAddress,
  tranche: 'senior',
  amount: myTokenBalance,
});

console.log('Redeemed for:', result.payout);
```

**Redemption Process:**
1. Holder submits tokens for redemption
2. Contract calculates payout based on:
   - Tranche's total collections
   - Minus losses absorbed
   - Holder's proportional share
3. Tokens are burned
4. ADA paid to holder

## State Queries

Monitor bond state throughout lifecycle:

```typescript
const state = await client.cdo.getBondState(bond.bondAddress);

console.log('Bond Status:');
console.log(`  Phase: ${
  state.isLiquidated ? 'LIQUIDATED' :
  state.isMatured ? 'MATURED' : 'ACTIVE'
}`);
console.log(`  Collected: ${formatADA(state.totalCollected)}`);
console.log(`  Distributed: ${formatADA(state.totalDistributed)}`);
console.log(`  Active Collateral: ${state.collateral.filter(c => !c.isDefaulted).length}`);
console.log(`  Defaulted: ${state.collateral.filter(c => c.isDefaulted).length}`);
```

## Timeline Example

```
Month 0:  CREATE bond with 10 collateral assets
Month 1:  COLLECT from 10 assets, DISTRIBUTE
Month 2:  COLLECT from 10 assets, DISTRIBUTE
Month 3:  Collateral #3 defaults, MARK_DEFAULT
Month 4:  COLLECT from 9 assets, DISTRIBUTE (junior absorbs loss)
...
Month 12: Term ends, MATURE triggered
Month 12: Final DISTRIBUTE
Month 12+: Token holders REDEEM
```

## Best Practices

### Regular State Checks

```typescript
// Weekly health check
async function weeklyHealthCheck(bondAddress: string) {
  const state = await client.cdo.getBondState(bondAddress);

  // Check default rate
  const defaultRate = state.collateral.filter(c => c.isDefaulted).length
    / state.collateral.length;

  if (defaultRate > 0.3) {
    console.warn('High default rate - consider liquidation');
  }

  // Check undistributed funds
  const pending = state.totalCollected - state.totalDistributed;
  if (pending > 10_000_000_000n) { // 10k ADA
    console.log('Large pending balance - schedule distribution');
  }

  return { defaultRate, pending };
}
```

### Pre-Maturity Preparation

```typescript
// 1 month before maturity
async function prepareForMaturity(bondAddress: string) {
  // Final collection sweep
  const state = await client.cdo.getBondState(bondAddress);

  for (let i = 0; i < state.collateral.length; i++) {
    if (!state.collateral[i].isDefaulted) {
      // Attempt final collection
      try {
        await client.cdo.collect({
          bondAddress,
          collateralIndex: i,
          amount: expectedFinalPayment,
        });
      } catch (e) {
        console.log(`Collateral ${i} may need default marking`);
      }
    }
  }

  // Final distribution before maturity
  await client.cdo.distribute({ bondAddress });
}
```

### Redemption Notifications

```typescript
// Notify token holders when redemption available
async function notifyRedemptionAvailable(bondAddress: string) {
  const state = await client.cdo.getBondState(bondAddress);

  if (state.isMatured || state.isLiquidated) {
    // Calculate expected redemption values
    const seniorValue = calculateTrancheValue(state, 'senior');
    const mezzValue = calculateTrancheValue(state, 'mezzanine');
    const juniorValue = calculateTrancheValue(state, 'junior');

    return {
      seniorPerToken: seniorValue / totalSeniorTokens,
      mezzPerToken: mezzValue / totalMezzTokens,
      juniorPerToken: juniorValue / totalJuniorTokens,
    };
  }
}
```

## Error Recovery

### Failed Distribution

```typescript
try {
  await client.cdo.distribute({ bondAddress });
} catch (e) {
  if (e.message.includes('Insufficient funds')) {
    console.log('No funds to distribute');
  } else {
    // Retry with fresh state
    await waitForSync();
    await client.cdo.distribute({ bondAddress });
  }
}
```

### Failed Redemption

```typescript
try {
  await client.cdo.redeem({ bondAddress, tranche, amount });
} catch (e) {
  if (e.message.includes('Not matured')) {
    console.log('Bond not yet in terminal state');
  } else if (e.message.includes('Insufficient tokens')) {
    console.log('You do not have enough tokens to redeem');
  }
}
```

## Next Steps

- [API Reference](/api/cdo) - Complete CDOClient API
- [Contracts](/contracts/cdo-bond) - On-chain validation details
