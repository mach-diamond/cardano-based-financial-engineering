/**
 * Test Setup and Utilities
 * @module tests/setup
 */

import 'dotenv/config';

export type TestNetwork = 'emulator' | 'preview' | 'preprod';

/**
 * Get the current test network from environment
 */
export function getTestNetwork(): TestNetwork {
  const network = process.env.NETWORK?.toLowerCase();
  if (network === 'preview' || network === 'preprod') {
    return network;
  }
  return 'emulator';
}

/**
 * Get Blockfrost key for network
 */
export function getBlockfrostKey(network: TestNetwork): string | undefined {
  switch (network) {
    case 'preview':
      return process.env.BLOCKFROST_PREVIEW;
    case 'preprod':
      return process.env.BLOCKFROST_PREPROD;
    default:
      return undefined;
  }
}

/**
 * Wait for UTxO to be indexed on testnet
 * @param ms - Milliseconds to wait
 */
export async function waitForSync(ms: number = 30000): Promise<void> {
  if (getTestNetwork() !== 'emulator') {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delay?: number;
    backoffFactor?: number;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, delay = 1000, backoffFactor = 2 } = options;

  let lastError: Error | undefined;
  let currentDelay = delay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));

      if (attempt < maxAttempts) {
        console.log(`Attempt ${attempt} failed, retrying in ${currentDelay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, currentDelay));
        currentDelay *= backoffFactor;
      }
    }
  }

  throw lastError;
}

/**
 * Generate test collateral configuration
 */
export function generateTestCollateral(count: number = 5) {
  return Array.from({ length: count }, (_, i) => ({
    policyId: 'test_policy_' + i.toString().padStart(2, '0'),
    assetName: 'TestCollateral' + i.toString().padStart(2, '0'),
  }));
}

/**
 * Format lovelace to ADA string
 */
export function formatADA(lovelace: bigint): string {
  return (Number(lovelace) / 1_000_000).toFixed(6) + ' ADA';
}
