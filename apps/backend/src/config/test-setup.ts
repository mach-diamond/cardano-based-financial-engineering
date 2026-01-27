/**
 * Test Environment Configuration
 * Defines initial wallets, assets, and funding for test runs
 */

export interface WalletConfig {
    name: string
    role: 'Originator' | 'Borrower' | 'Analyst' | 'Investor'
    initialAda: number // in ADA (not lovelace)
}

export interface AssetConfig {
    policyId: string
    assetName: string
    quantity: number
    mintTo: string // wallet name to mint to
}

export interface TestSetupConfig {
    wallets: WalletConfig[]
    assets: AssetConfig[]
    defaultFunding: {
        originator: number
        borrower: number
        analyst: number
        investor: number
    }
}

/**
 * Default test environment configuration
 */
export const testConfig: TestSetupConfig = {
    // Initial wallets to create
    wallets: [
        // Originators - create and package loans
        { name: 'Originator Alpha', role: 'Originator', initialAda: 10000 },
        { name: 'Originator Beta', role: 'Originator', initialAda: 10000 },

        // Borrowers - take out loans
        { name: 'Borrower 1', role: 'Borrower', initialAda: 1000 },
        { name: 'Borrower 2', role: 'Borrower', initialAda: 1000 },
        { name: 'Borrower 3', role: 'Borrower', initialAda: 1000 },
        { name: 'Borrower 4', role: 'Borrower', initialAda: 1000 },
        { name: 'Borrower 5', role: 'Borrower', initialAda: 1000 },

        // CLO Manager - structures CLO deals
        { name: 'CLO Manager', role: 'Analyst', initialAda: 5000 },

        // Investors - buy CLO tranches
        { name: 'Senior Investor', role: 'Investor', initialAda: 50000 },
        { name: 'Mezz Investor', role: 'Investor', initialAda: 25000 },
        { name: 'Junior Investor', role: 'Investor', initialAda: 10000 },
    ],

    // NFTs to mint as collateral for borrowers
    assets: [
        { policyId: 'test_nft_policy_1', assetName: 'CryptoArt001', quantity: 1, mintTo: 'Borrower 1' },
        { policyId: 'test_nft_policy_1', assetName: 'CryptoArt002', quantity: 1, mintTo: 'Borrower 2' },
        { policyId: 'test_nft_policy_1', assetName: 'CryptoArt003', quantity: 1, mintTo: 'Borrower 3' },
        { policyId: 'test_nft_policy_2', assetName: 'RealEstate001', quantity: 1, mintTo: 'Borrower 4' },
        { policyId: 'test_nft_policy_2', assetName: 'RealEstate002', quantity: 1, mintTo: 'Borrower 5' },
    ],

    // Default funding amounts by role (in ADA)
    defaultFunding: {
        originator: 10000,
        borrower: 1000,
        analyst: 5000,
        investor: 25000,
    },
}

/**
 * Get wallet config by name
 */
export function getWalletConfig(name: string): WalletConfig | undefined {
    return testConfig.wallets.find(w => w.name === name)
}

/**
 * Get all wallets by role
 */
export function getWalletsByRole(role: WalletConfig['role']): WalletConfig[] {
    return testConfig.wallets.filter(w => w.role === role)
}

/**
 * Get assets to mint for a specific wallet
 */
export function getAssetsForWallet(walletName: string): AssetConfig[] {
    return testConfig.assets.filter(a => a.mintTo === walletName)
}

/**
 * Calculate total ADA needed for test setup
 */
export function getTotalAdaRequired(): number {
    return testConfig.wallets.reduce((sum, w) => sum + w.initialAda, 0)
}
