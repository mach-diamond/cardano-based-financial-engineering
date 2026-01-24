# CDO Bond Contract

The CDO Bond contract manages the lifecycle of Collateralized Debt Obligation bonds on Cardano.

## Contract Details

| Property | Value |
|----------|-------|
| Language | Aiken (PlutusV3) |
| Type | Spending Validator + Minting Policy |
| Status | Production Ready |

## Datum Schema

```typescript
// TypeScript representation
interface BondDatum {
  manager: string;           // Manager's verification key hash
  config: {
    principal: bigint;
    tranches: {
      senior: { percentage: number; interestRate: number };
      mezzanine: { percentage: number; interestRate: number };
      junior: { percentage: number; interestRate: number };
    };
    termMonths: number;
    collateralPolicyId: string;
    collateralAssetName: string;
  };
  collateral: Array<{
    policyId: string;
    assetName: string;
    isDefaulted: boolean;
    totalPaid: bigint;
  }>;
  state: {
    totalCollected: bigint;
    totalDistributed: bigint;
    isMatured: boolean;
    isLiquidated: boolean;
    createdSlot: number;
  };
}
```

## Redeemer Actions

### Collect

Records a payment from collateral.

```typescript
{ Collect: { collateralIndex: number; amount: bigint } }
```

**Validation:**
- Collateral at index exists and is not defaulted
- Payment amount matches the ADA difference
- Updated datum is correct

### Distribute

Distributes accumulated payments to tranche holders.

```typescript
{ Distribute: {} }
```

**Validation:**
- Sufficient funds accumulated
- Waterfall order enforced (Senior → Mezzanine → Junior)
- Correct amounts distributed to each tranche

### MarkDefault

Marks a collateral asset as defaulted.

```typescript
{ MarkDefault: { collateralIndex: number } }
```

**Validation:**
- Manager signature required
- Collateral at index exists
- Collateral not already defaulted

### Mature

Processes bond maturity at end of term.

```typescript
{ Mature: {} }
```

**Validation:**
- Term period has elapsed (slot-based)
- Bond not already matured
- Final distribution triggered

### Liquidate

Emergency liquidation of the bond.

```typescript
{ Liquidate: {} }
```

**Validation:**
- Manager signature required
- Default threshold exceeded OR manager emergency action
- Remaining assets distributed per waterfall

### Redeem

Allows tranche token holders to claim their share.

```typescript
{ Redeem: { tranche: 'senior' | 'mezzanine' | 'junior'; amount: bigint } }
```

**Validation:**
- Bond is matured or liquidated
- Caller holds sufficient tranche tokens
- Tokens are burned
- Correct payout amount

## Tranche Token Minting

The contract includes a minting policy for tranche tokens:

| Token | Purpose |
|-------|---------|
| `SENIOR` | Represents senior tranche position |
| `MEZZANINE` | Represents mezzanine tranche position |
| `JUNIOR` | Represents junior tranche position |

**Minting Rules:**
- Only minted during bond creation
- Quantities match tranche allocations
- Cannot be minted after creation

**Burning Rules:**
- Only during redemption
- Must match redemption amount

## State Transitions

```
                    ┌──────────┐
                    │  CREATE  │
                    └────┬─────┘
                         │
                         ▼
              ┌──────────────────┐
              │      ACTIVE      │◄──────┐
              │                  │       │
              │  • Collect       │───────┤
              │  • Distribute    │       │
              │  • MarkDefault   │───────┘
              └────────┬─────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
         ▼             ▼             ▼
    ┌─────────┐   ┌─────────┐   ┌─────────┐
    │ MATURED │   │LIQUIDATE│   │(continue│
    │         │   │         │   │ ACTIVE) │
    └────┬────┘   └────┬────┘   └─────────┘
         │             │
         └──────┬──────┘
                │
                ▼
         ┌────────────┐
         │   REDEEM   │
         └────────────┘
```

## Security Considerations

### Waterfall Enforcement

The distribution waterfall is enforced on-chain:

```
Total Available = totalCollected - totalDistributed

1. Senior gets: min(available, seniorEntitlement)
2. Mezzanine gets: min(remaining, mezzEntitlement)
3. Junior gets: remaining (residual)
```

### Manager Limitations

The manager can:
- ✅ Mark collateral as defaulted
- ✅ Trigger maturity (when term ends)
- ✅ Trigger liquidation (when thresholds met)

The manager cannot:
- ❌ Withdraw funds arbitrarily
- ❌ Modify tranche percentages
- ❌ Change interest rates
- ❌ Skip tranche priority

### Time Validation

Maturity is validated using slot-based timing:
- Creation slot is recorded in datum
- Maturity requires: `current_slot >= creation_slot + term_slots`
- Prevents early maturity claims

## Integration Example

```typescript
import { MintMatrix } from '@mintmatrix/sdk';

const client = await MintMatrix.create({
  network: 'Preview',
  blockfrostKey: process.env.BLOCKFROST_PREVIEW!,
});

// Create bond
const bond = await client.cdo.create({
  manager: await client.address(),
  config: {
    principal: 100_000_000_000n,
    tranches: {
      senior: { percentage: 70, interestRate: 600 },
      mezzanine: { percentage: 20, interestRate: 1200 },
      junior: { percentage: 10, interestRate: 2000 },
    },
    termMonths: 12,
    collateralPolicyId: '...',
    collateralAssetName: '...',
  },
  collateral: [...],
});

// Collect payment
await client.cdo.collect({
  bondAddress: bond.bondAddress,
  collateralIndex: 0,
  amount: 500_000_000n,
});

// Distribute to tranches
await client.cdo.distribute({
  bondAddress: bond.bondAddress,
});
```
