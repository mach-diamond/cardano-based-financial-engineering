# Configuration

## Client Configuration

The `MintMatrix.create()` method accepts a configuration object:

```typescript
interface MintMatrixConfig {
  // Required: Network to connect to
  network: 'Preview' | 'Preprod' | 'Mainnet';

  // Option 1: Blockfrost (recommended for most users)
  blockfrostKey?: string;

  // Option 2: Kupmios (self-hosted infrastructure)
  kupoEndpoint?: string;
  ogmiosEndpoint?: string;
}
```

## Using Blockfrost

The easiest way to get started is with Blockfrost:

```typescript
const client = await MintMatrix.create({
  network: 'Preview',
  blockfrostKey: 'your_blockfrost_key',
});
```

Get your API key at [blockfrost.io](https://blockfrost.io).

## Using Kupmios (Self-Hosted)

For production deployments or privacy-sensitive applications, use self-hosted Kupmios:

```typescript
const client = await MintMatrix.create({
  network: 'Preview',
  kupoEndpoint: 'http://your-kupo:1442',
  ogmiosEndpoint: 'ws://your-ogmios:1337',
});
```

### Setting Up Kupmios

1. Run a Cardano node
2. Run Ogmios connected to the node
3. Run Kupo connected to the node

See the [Kupmios documentation](https://github.com/CardanoSolutions/kupo) for setup instructions.

## Wallet Selection

After creating the client, select a wallet:

### Seed Phrase

```typescript
client.selectWallet({
  type: 'seed',
  seedPhrase: 'word1 word2 ... word24',
});
```

### Private Key

```typescript
client.selectWallet({
  type: 'privateKey',
  privateKey: 'ed25519_sk1...',
});
```

### External Wallet (Browser)

```typescript
// For use with browser wallet extensions
client.selectWallet({
  type: 'external',
  api: window.cardano.nami, // or eternl, flint, etc.
});
```

## Network-Specific Configuration

Use environment variables for different networks:

```typescript
const network = process.env.CARDANO_NETWORK as 'Preview' | 'Preprod' | 'Mainnet';

const blockfrostKey = {
  Preview: process.env.BLOCKFROST_PREVIEW,
  Preprod: process.env.BLOCKFROST_PREPROD,
  Mainnet: process.env.BLOCKFROST_MAINNET,
}[network];

const client = await MintMatrix.create({
  network,
  blockfrostKey,
});
```

## Contract Configuration

Contract addresses are pre-configured for each network. You can override them if needed:

```typescript
const client = await MintMatrix.create({
  network: 'Preview',
  blockfrostKey: '...',
  contracts: {
    cdoBond: {
      scriptHash: 'custom_script_hash',
      address: 'addr_test1...',
    },
    assetTransfer: {
      scriptHash: 'custom_script_hash',
      address: 'addr_test1...',
    },
  },
});
```

## Logging

Enable verbose logging for debugging:

```typescript
const client = await MintMatrix.create({
  network: 'Preview',
  blockfrostKey: '...',
  logging: {
    level: 'debug', // 'error' | 'warn' | 'info' | 'debug'
    transactions: true, // Log transaction details
  },
});
```
