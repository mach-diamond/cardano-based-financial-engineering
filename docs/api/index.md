# MintMatrix Client

The main entry point for the MintMatrix SDK.

## `MintMatrix.create()`

Creates a new MintMatrix client instance.

```typescript
static async create(config: MintMatrixConfig): Promise<MintMatrix>
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `config` | `MintMatrixConfig` | Yes | Client configuration |

### MintMatrixConfig

```typescript
interface MintMatrixConfig {
  network: 'Preview' | 'Preprod' | 'Mainnet';
  blockfrostKey?: string;
  kupoEndpoint?: string;
  ogmiosEndpoint?: string;
}
```

### Returns

`Promise<MintMatrix>` - A configured MintMatrix client.

### Example

```typescript
const client = await MintMatrix.create({
  network: 'Preview',
  blockfrostKey: 'preview_xxxxx',
});
```

---

## `client.cdo`

Access the CDO client for bond operations.

```typescript
get cdo(): CDOClient
```

### Returns

`CDOClient` - The CDO operations client.

### Example

```typescript
const result = await client.cdo.create({
  manager: 'addr_test1...',
  config: bondConfig,
  collateral: [],
});
```

See [CDOClient](/api/cdo) for available methods.

---

## `client.loan`

Access the Loan client for loan operations.

```typescript
get loan(): LoanClient
```

### Returns

`LoanClient` - The loan operations client.

### Example

```typescript
const result = await client.loan.create({
  borrower: 'addr_test1...',
  config: loanConfig,
});
```

See [LoanClient](/api/loan) for available methods.

---

## `client.selectWallet()`

Select a wallet for signing transactions.

```typescript
selectWallet(wallet: WalletConfig): void
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `wallet` | `WalletConfig` | Yes | Wallet configuration |

### WalletConfig

```typescript
type WalletConfig =
  | { type: 'seed'; seedPhrase: string }
  | { type: 'privateKey'; privateKey: string }
  | { type: 'external'; api: WalletApi };
```

### Example

```typescript
// Using seed phrase
client.selectWallet({
  type: 'seed',
  seedPhrase: 'word1 word2 ... word24',
});

// Using private key
client.selectWallet({
  type: 'privateKey',
  privateKey: 'ed25519_sk1...',
});
```

---

## `client.address()`

Get the current wallet address.

```typescript
async address(): Promise<string>
```

### Returns

`Promise<string>` - The wallet's Bech32 address.

### Example

```typescript
const address = await client.address();
console.log(address); // addr_test1qp...
```

---

## `client.network`

Get the current network.

```typescript
get network(): Network
```

### Returns

`'Preview' | 'Preprod' | 'Mainnet'`

---

## Error Handling

The SDK throws typed errors for common failure cases:

```typescript
import { MintMatrixError, NetworkError, ValidationError } from '@mintmatrix/sdk';

try {
  await client.cdo.create(params);
} catch (e) {
  if (e instanceof ValidationError) {
    console.error('Invalid parameters:', e.message);
  } else if (e instanceof NetworkError) {
    console.error('Network issue:', e.message);
  } else if (e instanceof MintMatrixError) {
    console.error('SDK error:', e.message);
  }
}
```
