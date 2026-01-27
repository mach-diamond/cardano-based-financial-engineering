/**
 * Wallet generation utilities for browser/frontend use
 * Uses @lucid-evolution/lucid for real Cardano wallet generation
 */

import { generateSeedPhrase, Lucid, Blockfrost, paymentCredentialOf } from '@lucid-evolution/lucid'

export interface GeneratedWallet {
    id: string
    name: string
    seed: string
    address: string
}

/**
 * Generate a new Cardano wallet with a real address
 * @param id - Unique identifier for the wallet
 * @param name - Display name
 * @returns Generated wallet info
 */
export async function generateWallet(id: string, name: string): Promise<GeneratedWallet> {
    const seed = generateSeedPhrase()

    // Create a temporary Lucid instance to derive the address
    // Using Preview testnet by default
    const lucid = await Lucid(
        new Blockfrost(
            'https://cardano-preview.blockfrost.io/api/v0',
            'previewProjectId' // This is a placeholder, address derivation works offline
        ),
        'Preview'
    )

    lucid.selectWallet.fromSeed(seed)
    const address = await lucid.wallet().address()

    return {
        id,
        name,
        seed,
        address
    }
}

/**
 * Derive address from seed phrase
 */
export async function deriveAddress(seed: string): Promise<string> {
    const lucid = await Lucid(
        new Blockfrost(
            'https://cardano-preview.blockfrost.io/api/v0',
            'previewProjectId'
        ),
        'Preview'
    )
    lucid.selectWallet.fromSeed(seed)
    return await lucid.wallet().address()
}

/**
 * Get payment credential hash from address
 */
export function getPaymentCredentialHash(address: string): string {
    return paymentCredentialOf(address).hash
}
