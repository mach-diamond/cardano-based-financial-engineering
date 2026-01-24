# Asset Transfer Contract

The Asset Transfer contract manages collateralized loans/mortgages on Cardano.

## Contract Details

| Property | Value |
|----------|-------|
| Language | Aiken (PlutusV3) |
| Type | Spending Validator |
| Status | Production Ready |

## Use Cases

- **Real Estate Mortgages** - Property-backed loans
- **Vehicle Loans** - Car/boat financing
- **Equipment Financing** - Business asset loans
- **CDO Collateral** - Loans bundled into CDO bonds

## Datum Schema

```typescript
// TypeScript representation
interface LoanDatum {
  borrower: string;          // Borrower's verification key hash
  lender: string;            // Lender's verification key hash
  config: {
    principal: bigint;       // Original loan amount
    interestRate: number;    // Annual rate in basis points
    termMonths: number;      // Loan duration
    collateral: {
      policyId: string;
      assetName: string;
    };
  };
  state: {
    balance: bigint;         // Outstanding balance
    totalPaid: bigint;       // Total payments made
    paymentsMade: number;    // Payment count
    lastPaymentSlot: number; // Slot of last payment
    isDefaulted: boolean;
    defaultReason?: string;
  };
}
```

## Redeemer Actions

### MakePayment

Process a loan payment.

```typescript
{ MakePayment: { amount: bigint } }
```

**Validation:**
- Borrower signature required
- Amount matches ADA attached
- Loan not defaulted
- Balance updated correctly
- Payment count incremented

### MarkDefault

Mark the loan as defaulted.

```typescript
{ MarkDefault: { reason?: string } }
```

**Validation:**
- Lender signature required
- Loan not already defaulted
- Reason recorded in datum

### CloseLoan

Close a fully paid loan, returning collateral.

```typescript
{ CloseLoan: {} }
```

**Validation:**
- Balance must be zero
- Borrower signature required
- Collateral returned to borrower
- Contract UTxO consumed

### ClaimCollateral

Claim collateral on a defaulted loan.

```typescript
{ ClaimCollateral: {} }
```

**Validation:**
- Loan must be defaulted
- Lender signature required
- Collateral transferred to lender

## Loan Lifecycle

```
          ┌───────────┐
          │  CREATE   │
          │  (mint)   │
          └─────┬─────┘
                │
                ▼
         ┌────────────┐
         │   ACTIVE   │◄─────┐
         │            │      │
         │ • Payment  │──────┤
         └──────┬─────┘      │
                │            │
     ┌──────────┼──────────┐ │
     │          │          │ │
     ▼          ▼          │ │
┌─────────┐ ┌─────────┐    │ │
│ DEFAULT │ │PAID OFF │    │ │
└────┬────┘ └────┬────┘    │ │
     │           │         │ │
     ▼           ▼         │ │
┌─────────┐ ┌─────────┐    │ │
│ CLAIM   │ │  CLOSE  │    │ │
│COLLAT.  │ │         │    │ │
└─────────┘ └─────────┘    │ │
                           │ │
                           └─┘
```

## Payment Calculation

The contract uses a standard amortization formula:

```
Monthly Payment = P × [r(1+r)^n] / [(1+r)^n - 1]

Where:
  P = Principal
  r = Monthly interest rate (annual rate / 12 / 10000)
  n = Total number of payments
```

On-chain validation ensures:
- Payment reduces balance correctly
- Interest is calculated properly
- Extra payments reduce principal

## Collateral Management

### Collateral Requirements

- Must be a unique NFT (quantity = 1)
- Locked in contract at loan creation
- Released only on full payment or default claim

### Collateral Types

| Type | Policy ID | Use Case |
|------|-----------|----------|
| Property NFT | Custom | Real estate |
| Vehicle NFT | Custom | Auto loans |
| Equipment NFT | Custom | Business assets |

## Security Features

### Borrower Protections

- ✅ Only borrower can make payments
- ✅ Only borrower can close paid loan
- ✅ Collateral returned on full payment
- ✅ Payment amounts verified on-chain

### Lender Protections

- ✅ Only lender can mark default
- ✅ Only lender can claim defaulted collateral
- ✅ Interest calculations enforced
- ✅ Balance tracking is immutable

### Fraud Prevention

- ❌ Cannot inflate balance
- ❌ Cannot skip interest
- ❌ Cannot steal collateral without default
- ❌ Cannot modify loan terms

## Integration with CDO

Loans created with this contract can serve as CDO collateral:

```typescript
// Create loans
const loan1 = await client.loan.create({...});
const loan2 = await client.loan.create({...});

// Bundle into CDO
const cdo = await client.cdo.create({
  manager: managerAddress,
  config: cdoConfig,
  collateral: [
    { txHash: loan1.txHash, outputIndex: 0 },
    { txHash: loan2.txHash, outputIndex: 0 },
  ],
});
```

The CDO contract's `Collect` action corresponds to loan payments flowing through.

## Integration Example

```typescript
import { MintMatrix } from '@mintmatrix/sdk';

const client = await MintMatrix.create({
  network: 'Preview',
  blockfrostKey: process.env.BLOCKFROST_PREVIEW!,
});

// Create a loan
const loan = await client.loan.create({
  borrower: borrowerAddress,
  config: {
    principal: 50_000_000_000n, // 50,000 ADA
    interestRate: 800,          // 8% APY
    termMonths: 60,             // 5 years
    collateralPolicyId: propertyPolicyId,
    collateralAssetName: 'Property001',
  },
});

// Make monthly payment
const payment = await client.loan.getNextPaymentAmount(loan.loanAddress);
await client.loan.makePayment({
  loanAddress: loan.loanAddress,
  amount: payment,
});

// Check balance
const balance = await client.loan.getRemainingBalance(loan.loanAddress);
console.log(`Remaining: ${balance / 1_000_000n} ADA`);

// Close when paid off
if (balance === 0n) {
  await client.loan.closeLoan(loan.loanAddress);
}
```
