# Installation

## Requirements

- Node.js 18+
- pnpm, npm, or yarn
- A Blockfrost API key (get one at [blockfrost.io](https://blockfrost.io))

## Install the SDK

::: code-group

```bash [pnpm]
pnpm add @mintmatrix/sdk
```

```bash [npm]
npm install @mintmatrix/sdk
```

```bash [yarn]
yarn add @mintmatrix/sdk
```

:::

## Peer Dependencies

The SDK requires Lucid Evolution as a peer dependency:

```bash
pnpm add @lucid-evolution/lucid
```

## Environment Setup

Create a `.env` file with your configuration:

```env
# Blockfrost API Keys (get from blockfrost.io)
BLOCKFROST_PREVIEW=preview_xxx
BLOCKFROST_PREPROD=preprod_xxx
BLOCKFROST_MAINNET=mainnet_xxx

# Optional: Kupmios endpoints for self-hosted infrastructure
KUPO_ENDPOINT_PREVIEW=http://localhost:1442
OGMIOS_ENDPOINT_PREVIEW=ws://localhost:1337
```

## Verify Installation

```typescript
import { MintMatrix } from '@mintmatrix/sdk';

async function test() {
  const client = await MintMatrix.create({
    network: 'Preview',
    blockfrostKey: process.env.BLOCKFROST_PREVIEW!,
  });

  console.log('SDK initialized successfully');
}

test();
```

## TypeScript Configuration

The SDK is written in TypeScript and includes type definitions. Ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true
  }
}
```

## Next Steps

- [Quick Start](/guide/quickstart) - Build your first transaction
- [Configuration](/guide/configuration) - Advanced configuration options
