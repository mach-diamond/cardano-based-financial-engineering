# CDOClient

Client for CDO bond operations.

Access via `client.cdo`.

---

## `create()`

Create a new CDO bond.

```typescript
async create(params: CreateBondParams): Promise<CreateBondResult>
```

### Parameters

```typescript
interface CreateBondParams {
  manager: string;           // Manager address (controls the bond)
  config: BondConfig;        // Bond configuration
  collateral: CollateralRef[]; // Collateral UTxO references
}

interface BondConfig {
  principal: bigint;         // Total bond value in lovelace
  tranches: {
    senior: TrancheConfig;
    mezzanine: TrancheConfig;
    junior: TrancheConfig;
  };
  termMonths: number;        // Bond duration
  collateralPolicyId: string;
  collateralAssetName: string;
}

interface TrancheConfig {
  percentage: number;        // Allocation (0-100)
  interestRate: number;      // Annual rate in basis points
}

interface CollateralRef {
  txHash: string;
  outputIndex: number;
}
```

### Returns

```typescript
interface CreateBondResult {
  txHash: string;            // Transaction hash
  bondAddress: string;       // Bond contract address
  trancheTokens: {
    senior: { policyId: string; assetName: string; quantity: bigint };
    mezzanine: { policyId: string; assetName: string; quantity: bigint };
    junior: { policyId: string; assetName: string; quantity: bigint };
  };
}
```

### Example

```typescript
const result = await client.cdo.create({
  manager: await client.address(),
  config: {
    principal: 100_000_000_000n,
    tranches: {
      senior: { percentage: 70, interestRate: 600 },
      mezzanine: { percentage: 20, interestRate: 1200 },
      junior: { percentage: 10, interestRate: 2000 },
    },
    termMonths: 12,
    collateralPolicyId: 'abc123...',
    collateralAssetName: 'CollateralNFT',
  },
  collateral: [
    { txHash: 'tx1...', outputIndex: 0 },
    { txHash: 'tx2...', outputIndex: 0 },
  ],
});
```

---

## `collect()`

Collect payment from collateral.

```typescript
async collect(params: CollectPaymentParams): Promise<TransactionResult>
```

### Parameters

```typescript
interface CollectPaymentParams {
  bondAddress: string;       // Bond contract address
  collateralIndex: number;   // Index of collateral (0-based)
  amount: bigint;            // Payment amount in lovelace
}
```

### Returns

```typescript
interface TransactionResult {
  txHash: string;
  success: boolean;
}
```

### Example

```typescript
const result = await client.cdo.collect({
  bondAddress: 'addr_test1...',
  collateralIndex: 0,
  amount: 500_000_000n,
});
```

---

## `distribute()`

Distribute accumulated payments to tranche holders.

```typescript
async distribute(params: DistributeParams): Promise<TransactionResult>
```

### Parameters

```typescript
interface DistributeParams {
  bondAddress: string;
}
```

### Example

```typescript
const result = await client.cdo.distribute({
  bondAddress: 'addr_test1...',
});
```

---

## `markDefault()`

Mark collateral as defaulted.

```typescript
async markDefault(params: MarkDefaultParams): Promise<TransactionResult>
```

### Parameters

```typescript
interface MarkDefaultParams {
  bondAddress: string;
  collateralIndex: number;
  reason?: string;
}
```

### Example

```typescript
const result = await client.cdo.markDefault({
  bondAddress: 'addr_test1...',
  collateralIndex: 2,
  reason: 'Missed 3 consecutive payments',
});
```

---

## `mature()`

Process bond maturity.

```typescript
async mature(params: MatureParams): Promise<TransactionResult>
```

### Parameters

```typescript
interface MatureParams {
  bondAddress: string;
}
```

### Example

```typescript
const result = await client.cdo.mature({
  bondAddress: 'addr_test1...',
});
```

---

## `liquidate()`

Liquidate the bond (emergency action).

```typescript
async liquidate(params: LiquidateParams): Promise<TransactionResult>
```

### Parameters

```typescript
interface LiquidateParams {
  bondAddress: string;
  reason?: string;
}
```

### Example

```typescript
const result = await client.cdo.liquidate({
  bondAddress: 'addr_test1...',
  reason: 'Default threshold exceeded',
});
```

---

## `redeem()`

Redeem tranche tokens for payout.

```typescript
async redeem(params: RedeemParams): Promise<TransactionResult>
```

### Parameters

```typescript
interface RedeemParams {
  bondAddress: string;
  tranche: 'senior' | 'mezzanine' | 'junior';
  amount: bigint;            // Token quantity to redeem
}
```

### Example

```typescript
const result = await client.cdo.redeem({
  bondAddress: 'addr_test1...',
  tranche: 'senior',
  amount: 1000n,
});
```

---

## `getBondState()`

Get current bond state from on-chain data.

```typescript
async getBondState(bondAddress: string): Promise<BondState>
```

### Returns

```typescript
interface BondState {
  config: BondConfig;
  principal: bigint;
  totalCollected: bigint;
  totalDistributed: bigint;
  collateral: CollateralState[];
  isMatured: boolean;
  isLiquidated: boolean;
  createdAt: Date;
}

interface CollateralState {
  index: number;
  isDefaulted: boolean;
  totalPaid: bigint;
  lastPaymentDate?: Date;
}
```

### Example

```typescript
const state = await client.cdo.getBondState('addr_test1...');

console.log(`Collected: ${state.totalCollected}`);
console.log(`Active collateral: ${state.collateral.filter(c => !c.isDefaulted).length}`);
```
