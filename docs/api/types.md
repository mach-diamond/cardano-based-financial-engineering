# Types

Complete TypeScript type definitions for the MintMatrix SDK.

## Network Types

```typescript
type Network = 'Preview' | 'Preprod' | 'Mainnet';
```

## Configuration Types

### MintMatrixConfig

```typescript
interface MintMatrixConfig {
  network: Network;
  blockfrostKey?: string;
  kupoEndpoint?: string;
  ogmiosEndpoint?: string;
}
```

## CDO Types

### BondConfig

```typescript
interface BondConfig {
  principal: bigint;
  tranches: {
    senior: TrancheConfig;
    mezzanine: TrancheConfig;
    junior: TrancheConfig;
  };
  termMonths: number;
  collateralPolicyId: string;
  collateralAssetName: string;
}
```

### TrancheConfig

```typescript
interface TrancheConfig {
  percentage: number;        // 0-100
  interestRate: number;      // Basis points (e.g., 500 = 5%)
}
```

### CreateBondParams

```typescript
interface CreateBondParams {
  manager: string;
  config: BondConfig;
  collateral: CollateralRef[];
}
```

### CreateBondResult

```typescript
interface CreateBondResult {
  txHash: string;
  bondAddress: string;
  trancheTokens: {
    senior: TokenInfo;
    mezzanine: TokenInfo;
    junior: TokenInfo;
  };
}
```

### BondState

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
```

### CollateralState

```typescript
interface CollateralState {
  index: number;
  isDefaulted: boolean;
  totalPaid: bigint;
  lastPaymentDate?: Date;
}
```

### CollateralRef

```typescript
interface CollateralRef {
  txHash: string;
  outputIndex: number;
}
```

### Collateral

```typescript
interface Collateral {
  policyId: string;
  assetName: string;
  txHash: string;
  outputIndex: number;
}
```

## Loan Types

### LoanConfig

```typescript
interface LoanConfig {
  principal: bigint;
  interestRate: number;      // Basis points
  termMonths: number;
  collateralPolicyId: string;
  collateralAssetName: string;
}
```

### CreateLoanParams

```typescript
interface CreateLoanParams {
  borrower: string;
  config: LoanConfig;
}
```

### CreateLoanResult

```typescript
interface CreateLoanResult {
  txHash: string;
  loanAddress: string;
  loanId: string;
}
```

### LoanState

```typescript
interface LoanState {
  config: LoanConfig;
  balance: bigint;
  totalPaid: bigint;
  paymentsMade: number;
  nextPaymentDue: Date;
  isDefaulted: boolean;
  defaultReason?: string;
}
```

### LoanPaymentParams

```typescript
interface LoanPaymentParams {
  loanAddress: string;
  amount: bigint;
}
```

## Transaction Types

### TransactionResult

```typescript
interface TransactionResult {
  txHash: string;
  success: boolean;
}
```

### TokenInfo

```typescript
interface TokenInfo {
  policyId: string;
  assetName: string;
  quantity: bigint;
}
```

## Operation Parameter Types

### CollectPaymentParams

```typescript
interface CollectPaymentParams {
  bondAddress: string;
  collateralIndex: number;
  amount: bigint;
}
```

### DistributeParams

```typescript
interface DistributeParams {
  bondAddress: string;
}
```

### MarkDefaultParams

```typescript
interface MarkDefaultParams {
  bondAddress: string;
  collateralIndex: number;
  reason?: string;
}
```

### MatureParams

```typescript
interface MatureParams {
  bondAddress: string;
}
```

### LiquidateParams

```typescript
interface LiquidateParams {
  bondAddress: string;
  reason?: string;
}
```

### RedeemParams

```typescript
interface RedeemParams {
  bondAddress: string;
  tranche: 'senior' | 'mezzanine' | 'junior';
  amount: bigint;
}
```

## Error Types

```typescript
class MintMatrixError extends Error {
  code: string;
  details?: unknown;
}

class ValidationError extends MintMatrixError {
  field?: string;
}

class NetworkError extends MintMatrixError {
  statusCode?: number;
}

class ContractError extends MintMatrixError {
  redeemer?: string;
}
```

## Utility Types

### PartialDeep

```typescript
type PartialDeep<T> = {
  [P in keyof T]?: T[P] extends object ? PartialDeep<T[P]> : T[P];
};
```

### Awaited (for Promise unwrapping)

```typescript
type Awaited<T> = T extends Promise<infer U> ? U : T;
```
