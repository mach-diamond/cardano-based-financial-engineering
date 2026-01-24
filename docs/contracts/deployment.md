# Contract Deployment

This guide covers deploying MintMatrix smart contracts to Cardano networks.

## Pre-Deployed Contracts

MintMatrix contracts are pre-deployed on all networks. The SDK automatically uses the correct addresses:

| Network | CDO Bond | Asset Transfer |
|---------|----------|----------------|
| Preview | `addr_test1...` | `addr_test1...` |
| Preprod | `addr_test1...` | `addr_test1...` |
| Mainnet | `addr1...` | `addr1...` |

**For most users, no deployment is needed.** The SDK handles everything.

## Custom Deployment

For enterprise or specialized deployments, you can deploy your own contract instances.

### Requirements

- Compiled contract CBOR (provided in `@mintmatrix/contracts`)
- Sufficient ADA for deployment (~5-10 ADA)
- Cardano CLI or Lucid Evolution

### Using the SDK

```typescript
import { MintMatrix, deployContract } from '@mintmatrix/sdk';
import cdoBondScript from '@mintmatrix/contracts/cdo-bond.json';

const client = await MintMatrix.create({
  network: 'Preview',
  blockfrostKey: process.env.BLOCKFROST_PREVIEW!,
});

// Deploy CDO Bond contract
const deployment = await deployContract(client, {
  script: cdoBondScript,
  type: 'spending',
});

console.log('Script Hash:', deployment.scriptHash);
console.log('Address:', deployment.address);
```

### Using Cardano CLI

```bash
# Generate script address
cardano-cli address build \
  --payment-script-file cdo-bond.plutus \
  --testnet-magic 2 \
  --out-file cdo-bond.addr

# View the address
cat cdo-bond.addr
```

### Reference Script Deployment

For gas efficiency, deploy reference scripts:

```typescript
const refScript = await deployReferenceScript(client, {
  script: cdoBondScript,
  utxoValue: 20_000_000n, // 20 ADA locked with script
});

console.log('Reference UTxO:', refScript.txHash, refScript.outputIndex);
```

Using reference scripts reduces transaction size and fees.

## Contract Verification

### Verify Script Hash

Ensure you're using authentic MintMatrix contracts:

```typescript
import { verifyContractHash } from '@mintmatrix/sdk';

const isValid = verifyContractHash({
  script: cdoBondScript,
  expectedHash: 'abc123...', // Official hash from docs
});

if (!isValid) {
  throw new Error('Contract hash mismatch - possible tampering');
}
```

### Official Script Hashes

| Contract | Network | Script Hash |
|----------|---------|-------------|
| CDO Bond | Preview | `hash_preview...` |
| CDO Bond | Preprod | `hash_preprod...` |
| CDO Bond | Mainnet | `hash_mainnet...` |
| Asset Transfer | Preview | `hash_preview...` |
| Asset Transfer | Preprod | `hash_preprod...` |
| Asset Transfer | Mainnet | `hash_mainnet...` |

*(Actual hashes will be published after mainnet deployment)*

## Network Configuration

### Preview (Testing)

```typescript
const client = await MintMatrix.create({
  network: 'Preview',
  blockfrostKey: process.env.BLOCKFROST_PREVIEW!,
});
```

- Free test ADA from faucet
- Fast block times (~20 seconds)
- May have occasional resets

### Preprod (Staging)

```typescript
const client = await MintMatrix.create({
  network: 'Preprod',
  blockfrostKey: process.env.BLOCKFROST_PREPROD!,
});
```

- More stable than Preview
- Closer to mainnet parameters
- Good for final testing

### Mainnet (Production)

```typescript
const client = await MintMatrix.create({
  network: 'Mainnet',
  blockfrostKey: process.env.BLOCKFROST_MAINNET!,
});
```

- Real ADA required
- Production security
- No test transactions

## Security Checklist

Before mainnet deployment:

- [ ] Audit completed by reputable firm
- [ ] Testnet testing completed (all scenarios)
- [ ] Script hashes verified
- [ ] Reference scripts deployed
- [ ] Monitoring configured
- [ ] Incident response plan ready

## Upgradeability

PlutusV3 contracts are immutable. For upgrades:

1. Deploy new contract version
2. Migrate state (if applicable)
3. Update SDK configuration
4. Deprecate old contract

The SDK supports multiple contract versions:

```typescript
const client = await MintMatrix.create({
  network: 'Mainnet',
  blockfrostKey: '...',
  contracts: {
    cdoBond: {
      version: 'v2',
      scriptHash: 'new_hash...',
    },
  },
});
```

## Troubleshooting

### "Script hash mismatch"

The compiled script doesn't match expected hash. Ensure you're using official distributions.

### "Insufficient collateral"

Increase the ADA locked in your wallet for Plutus transaction collateral.

### "Reference script not found"

The reference script UTxO may have been consumed. Redeploy the reference script.

### "Network mismatch"

Ensure your Blockfrost key matches the target network.
