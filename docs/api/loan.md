# LoanClient

Client for loan/mortgage operations.

Access via `client.loan`.

---

## `create()`

Create a new collateralized loan.

```typescript
async create(params: CreateLoanParams): Promise<CreateLoanResult>
```

### Parameters

```typescript
interface CreateLoanParams {
  borrower: string;          // Borrower address
  config: LoanConfig;        // Loan configuration
}

interface LoanConfig {
  principal: bigint;         // Loan amount in lovelace
  interestRate: number;      // Annual rate in basis points (e.g., 800 = 8%)
  termMonths: number;        // Loan duration
  collateralPolicyId: string;
  collateralAssetName: string;
}
```

### Returns

```typescript
interface CreateLoanResult {
  txHash: string;
  loanAddress: string;       // Loan contract address
  loanId: string;            // Unique loan identifier
}
```

### Example

```typescript
const result = await client.loan.create({
  borrower: 'addr_test1...',
  config: {
    principal: 50_000_000_000n, // 50,000 ADA
    interestRate: 800,          // 8% APY
    termMonths: 60,             // 5 years
    collateralPolicyId: 'abc123...',
    collateralAssetName: 'PropertyNFT001',
  },
});
```

---

## `makePayment()`

Make a payment on an active loan.

```typescript
async makePayment(params: LoanPaymentParams): Promise<TransactionResult>
```

### Parameters

```typescript
interface LoanPaymentParams {
  loanAddress: string;
  amount: bigint;            // Payment amount in lovelace
}
```

### Example

```typescript
const result = await client.loan.makePayment({
  loanAddress: 'addr_test1...',
  amount: 1_000_000_000n,    // 1,000 ADA payment
});
```

---

## `getLoanState()`

Get current loan state.

```typescript
async getLoanState(loanAddress: string): Promise<LoanState>
```

### Returns

```typescript
interface LoanState {
  config: LoanConfig;
  balance: bigint;           // Outstanding balance
  totalPaid: bigint;         // Total payments made
  paymentsMade: number;      // Number of payments
  nextPaymentDue: Date;
  isDefaulted: boolean;
  defaultReason?: string;
}
```

### Example

```typescript
const state = await client.loan.getLoanState('addr_test1...');

console.log(`Balance: ${state.balance}`);
console.log(`Payments made: ${state.paymentsMade}`);
console.log(`Next due: ${state.nextPaymentDue}`);
```

---

## `getRemainingBalance()`

Get the outstanding loan balance.

```typescript
async getRemainingBalance(loanAddress: string): Promise<bigint>
```

### Returns

`Promise<bigint>` - Outstanding balance in lovelace.

### Example

```typescript
const balance = await client.loan.getRemainingBalance('addr_test1...');
console.log(`Remaining: ${balance / 1_000_000n} ADA`);
```

---

## `getNextPaymentAmount()`

Calculate the next payment amount.

```typescript
async getNextPaymentAmount(loanAddress: string): Promise<bigint>
```

### Returns

`Promise<bigint>` - Next payment amount in lovelace.

### Example

```typescript
const nextPayment = await client.loan.getNextPaymentAmount('addr_test1...');
console.log(`Next payment: ${nextPayment / 1_000_000n} ADA`);
```

---

## `isDefaulted()`

Check if a loan is in default.

```typescript
async isDefaulted(loanAddress: string): Promise<boolean>
```

### Example

```typescript
if (await client.loan.isDefaulted('addr_test1...')) {
  console.log('Loan is in default');
}
```

---

## `markDefault()`

Mark a loan as defaulted (manager action).

```typescript
async markDefault(loanAddress: string, reason?: string): Promise<TransactionResult>
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `loanAddress` | `string` | Yes | Loan contract address |
| `reason` | `string` | No | Reason for default |

### Example

```typescript
const result = await client.loan.markDefault(
  'addr_test1...',
  'Missed 3 consecutive payments'
);
```

---

## `closeLoan()`

Close a fully paid loan.

```typescript
async closeLoan(loanAddress: string): Promise<TransactionResult>
```

### Example

```typescript
const balance = await client.loan.getRemainingBalance('addr_test1...');

if (balance === 0n) {
  const result = await client.loan.closeLoan('addr_test1...');
  console.log('Loan closed:', result.txHash);
}
```
