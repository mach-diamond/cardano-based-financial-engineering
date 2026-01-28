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
 * Matches the identities used in the Test Suite UI
 */
export const testConfig: TestSetupConfig = {
    // Initial wallets to create (matches Test Suite UI identities)
    // Funding should be ~2x expected loan principal to cover payments + fees
    wallets: [
        // Originators - own assets and create loans (need tx fees only)
        { name: 'MachDiamond Jewelry', role: 'Originator', initialAda: 1000 },
        { name: 'Airplane Manufacturing LLC', role: 'Originator', initialAda: 1000 },
        { name: 'Bob Smith', role: 'Originator', initialAda: 1000 },
        { name: 'Premier Asset Holdings', role: 'Originator', initialAda: 1000 },
        { name: 'Yacht Makers Corp', role: 'Originator', initialAda: 1000 },

        // Borrowers - take out loans, need enough to cover principal + payments
        // Loan principals scaled down to be realistic:
        // - Diamond loan: 500 ADA principal → Alice needs ~1000 ADA
        // - Airplane loans: 2000 ADA each → Airlines need ~4000 ADA each
        // - RealEstate loans: 500 ADA each → Operators need ~1000 ADA each
        // - Boat loan: 800 ADA → Boat Operator needs ~1600 ADA
        { name: 'Cardano Airlines LLC', role: 'Borrower', initialAda: 5000 },
        { name: 'Superfast Cargo Air', role: 'Borrower', initialAda: 5000 },
        { name: 'Alice Doe', role: 'Borrower', initialAda: 1500 },
        { name: 'Office Operator LLC', role: 'Borrower', initialAda: 1500 },
        { name: 'Luxury Apartments LLC', role: 'Borrower', initialAda: 1500 },
        { name: 'Boat Operator LLC', role: 'Borrower', initialAda: 2000 },

        // Analyst - structures CLO deals (needs tx fees)
        { name: 'Cardano Investment Bank', role: 'Analyst', initialAda: 2000 },

        // Investors - buy CLO tranche tokens (need to cover tranche purchases)
        { name: 'Senior Tranche Investor', role: 'Investor', initialAda: 10000 },
        { name: 'Mezzanine Tranche Investor', role: 'Investor', initialAda: 5000 },
        { name: 'Junior Tranche Investor', role: 'Investor', initialAda: 3000 },
        { name: 'Hedge Fund Alpha', role: 'Investor', initialAda: 15000 },
    ],

    // NFTs to mint as collateral (minted to Originators, used in loans)
    assets: [
        { policyId: 'policy_diamond', assetName: 'Diamond', quantity: 2, mintTo: 'MachDiamond Jewelry' },
        { policyId: 'policy_airplane', assetName: 'Airplane', quantity: 10, mintTo: 'Airplane Manufacturing LLC' },
        { policyId: 'policy_home', assetName: 'Home', quantity: 1, mintTo: 'Bob Smith' },
        { policyId: 'policy_realestate', assetName: 'RealEstate', quantity: 10, mintTo: 'Premier Asset Holdings' },
        { policyId: 'policy_boat', assetName: 'Boat', quantity: 3, mintTo: 'Yacht Makers Corp' },
    ],

    // Default funding amounts by role (in ADA)
    defaultFunding: {
        originator: 10000,
        borrower: 2000,
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
