/**
 * MintMatrix Main Client
 *
 * The primary entry point for interacting with MintMatrix smart contracts.
 *
 * @example
 * ```typescript
 * import { MintMatrix } from '@mintmatrix/sdk';
 *
 * const client = await MintMatrix.create({
 *   network: 'Preview',
 *   blockfrostKey: process.env.BLOCKFROST_KEY,
 * });
 *
 * // Create a CDO bond
 * const bond = await client.cdo.create({
 *   collateral: [...],
 *   trancheConfig: { senior: 60, mezzanine: 30, junior: 10 },
 * });
 *
 * // Collect a payment
 * await client.cdo.collect({ bondAddress: bond.bondAddress });
 * ```
 *
 * @module client
 */

import { Lucid, Blockfrost, Kupmios } from "@lucid-evolution/lucid";
import type { LucidEvolution } from "@lucid-evolution/lucid";
import type { Network, ProviderConfig } from "./types";
import { CDOClient } from "./cdo";
import { LoanClient } from "./loan";

/**
 * Configuration for MintMatrix client
 */
export interface MintMatrixConfig {
  /** Cardano network to connect to */
  network: Network;
  /** Blockfrost API key (required for Blockfrost provider) */
  blockfrostKey?: string;
  /** Custom Kupo endpoint (for Kupmios provider) */
  kupoEndpoint?: string;
  /** Custom Ogmios endpoint (for Kupmios provider) */
  ogmiosEndpoint?: string;
  /** Wallet seed phrase (optional - can be set later) */
  seedPhrase?: string;
}

/**
 * Main MintMatrix client for interacting with financial instrument contracts
 */
export class MintMatrix {
  private _api: LucidEvolution;
  private _network: Network;
  private _cdo: CDOClient | null = null;
  private _loan: LoanClient | null = null;

  private constructor(api: LucidEvolution, network: Network) {
    this._api = api;
    this._network = network;
  }

  /**
   * Create a new MintMatrix client instance
   *
   * @param config - Client configuration
   * @returns Initialized MintMatrix client
   *
   * @example
   * ```typescript
   * const client = await MintMatrix.create({
   *   network: 'Preview',
   *   blockfrostKey: 'your-api-key',
   * });
   * ```
   */
  static async create(config: MintMatrixConfig): Promise<MintMatrix> {
    const { network, blockfrostKey, kupoEndpoint, ogmiosEndpoint, seedPhrase } = config;

    let api: LucidEvolution;

    if (blockfrostKey) {
      // Use Blockfrost provider
      const endpoint = `https://cardano-${network.toLowerCase()}.blockfrost.io/api/v0`;
      api = await Lucid(new Blockfrost(endpoint, blockfrostKey), network);
    } else if (kupoEndpoint && ogmiosEndpoint) {
      // Use Kupmios provider
      api = await Lucid(new Kupmios(kupoEndpoint, ogmiosEndpoint), network);
    } else {
      throw new Error(
        "Either blockfrostKey or both kupoEndpoint and ogmiosEndpoint must be provided"
      );
    }

    // Select wallet if seed phrase provided
    if (seedPhrase) {
      api.selectWallet.fromSeed(seedPhrase);
    }

    return new MintMatrix(api, network);
  }

  /**
   * Get the underlying Lucid Evolution API instance
   */
  get api(): LucidEvolution {
    return this._api;
  }

  /**
   * Get the current network
   */
  get network(): Network {
    return this._network;
  }

  /**
   * Get the CDO client for bond operations
   */
  get cdo(): CDOClient {
    if (!this._cdo) {
      this._cdo = new CDOClient(this._api, this._network);
    }
    return this._cdo;
  }

  /**
   * Get the Loan client for lending operations
   */
  get loan(): LoanClient {
    if (!this._loan) {
      this._loan = new LoanClient(this._api, this._network);
    }
    return this._loan;
  }

  /**
   * Set the wallet from a seed phrase
   *
   * @param seedPhrase - BIP39 seed phrase
   */
  selectWalletFromSeed(seedPhrase: string): void {
    this._api.selectWallet.fromSeed(seedPhrase);
  }

  /**
   * Get the current wallet address
   *
   * @returns Wallet address or null if no wallet selected
   */
  async getWalletAddress(): Promise<string | null> {
    try {
      return await this._api.wallet().address();
    } catch {
      return null;
    }
  }

  /**
   * Get wallet UTxOs
   *
   * @returns Array of UTxOs in the wallet
   */
  async getWalletUtxos() {
    return this._api.wallet().getUtxos();
  }
}
