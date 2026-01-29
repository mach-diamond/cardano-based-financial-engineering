/**
 * Master Test Configuration
 * Centralized configuration for the test pipeline
 */

import type { PipelineConfig, WalletConfig, LoanConfig, CLOConfig, MonteCarloConfig } from '@/utils/pipeline/types'

// Re-export types for convenience
export type { PipelineConfig, WalletConfig, LoanConfig, CLOConfig, MonteCarloConfig }

/**
 * Default wallet configurations for testing
 */
export const DEFAULT_WALLETS: WalletConfig[] = [
  // Originators - asset owners who create loan contracts
  { name: 'MachDiamond Jewelry', role: 'Originator', initialFunding: 5000, assets: [{ name: 'Diamond', quantity: 2 }] },
  { name: 'Airplane Manufacturing LLC', role: 'Originator', initialFunding: 10000, assets: [{ name: 'Airplane', quantity: 10 }] },
  { name: 'Bob Smith', role: 'Originator', initialFunding: 3000, assets: [{ name: 'Home', quantity: 1 }] },
  { name: 'Premier Asset Holdings', role: 'Originator', initialFunding: 5000, assets: [{ name: 'RealEstate', quantity: 10 }] },
  { name: 'Yacht Makers Corp', role: 'Originator', initialFunding: 5000, assets: [{ name: 'Boat', quantity: 3 }] },

  // Borrowers - buyers who accept loan contracts
  { name: 'Cardano Airlines LLC', role: 'Borrower', initialFunding: 3000 },
  { name: 'Superfast Cargo Air', role: 'Borrower', initialFunding: 3000 },
  { name: 'Alice Doe', role: 'Borrower', initialFunding: 1000 },
  { name: 'Office Operator LLC', role: 'Borrower', initialFunding: 1500 },
  { name: 'Luxury Apartments LLC', role: 'Borrower', initialFunding: 1500 },
  { name: 'Boat Operator LLC', role: 'Borrower', initialFunding: 2000 },

  // Analyst - creates and manages CLOs
  { name: 'Cardano Investment Bank', role: 'Analyst', initialFunding: 1000 },

  // Investors - purchase tranche tokens
  { name: 'Senior Tranche Investor', role: 'Investor', initialFunding: 50000 },
  { name: 'Mezzanine Tranche Investor', role: 'Investor', initialFunding: 30000 },
  { name: 'Junior Tranche Investor', role: 'Investor', initialFunding: 20000 },
  { name: 'Hedge Fund Alpha', role: 'Investor', initialFunding: 100000 },
]

/**
 * Default loan configurations
 * lifecycleCase determines test scenario: T1=Cancel, T2=Default, T3=Nominal(0%), T4=Nominal, T5=LateFee, T6=RejectGuard, T7=Reserved+Fees
 */
export const DEFAULT_LOANS: LoanConfig[] = [
  // Reserved buyer loans
  { borrowerId: 'bor-alice', originatorId: 'orig-jewelry', asset: 'Diamond', quantity: 2, principal: 500, apr: 6, termMonths: 12, reservedBuyer: true, lifecycleCase: 'T4' },
  { borrowerId: 'bor-cardanoair', originatorId: 'orig-airplane', asset: 'Airplane', quantity: 5, principal: 2000, apr: 4, termMonths: 60, reservedBuyer: true, lifecycleCase: 'T4' },
  { borrowerId: 'bor-officeop', originatorId: 'orig-realestate', asset: 'RealEstate', quantity: 5, principal: 500, apr: 5, termMonths: 24, reservedBuyer: true, lifecycleCase: 'T4' },

  // Open market loans
  { borrowerId: null as any, originatorId: 'orig-airplane', asset: 'Airplane', quantity: 5, principal: 2000, apr: 4.5, termMonths: 60, reservedBuyer: false, lifecycleCase: 'T4' },
  { borrowerId: null as any, originatorId: 'orig-realestate', asset: 'RealEstate', quantity: 5, principal: 500, apr: 5.5, termMonths: 24, reservedBuyer: false, lifecycleCase: 'T4' },
  { borrowerId: null as any, originatorId: 'orig-yacht', asset: 'Boat', quantity: 3, principal: 800, apr: 7, termMonths: 36, reservedBuyer: false, lifecycleCase: 'T4' },
]

/**
 * Default CLO configuration
 */
export const DEFAULT_CLO: CLOConfig = {
  name: 'MintMatrix CLO Series 1',
  tranches: [
    { name: 'Senior', allocation: 60, yieldModifier: 0.8 },
    { name: 'Mezzanine', allocation: 25, yieldModifier: 1.0 },
    { name: 'Junior', allocation: 15, yieldModifier: 1.5 },
  ],
}

/**
 * Default Monte Carlo configuration
 */
export const DEFAULT_MONTE_CARLO: MonteCarloConfig = {
  iterations: 1000,
  parameters: {
    defaultProbability: { min: 0.01, max: 0.15 },
    interestRateShock: { min: -0.02, max: 0.05 },
    prepaymentRate: { min: 0.05, max: 0.20 },
  },
}

/**
 * Create a full pipeline configuration
 */
export function createPipelineConfig(options: {
  network?: 'emulator' | 'preview'
  wallets?: WalletConfig[]
  loans?: LoanConfig[]
  clo?: CLOConfig
  monteCarlo?: MonteCarloConfig
} = {}): PipelineConfig {
  return {
    network: options.network || 'emulator',
    wallets: options.wallets || DEFAULT_WALLETS,
    loans: options.loans || DEFAULT_LOANS,
    clo: options.clo || DEFAULT_CLO,
    monteCarlo: options.monteCarlo,
  }
}

/**
 * Get default configuration for quick testing
 */
export function getDefaultConfig(): PipelineConfig {
  return createPipelineConfig()
}

/**
 * Validate a pipeline configuration
 */
export function validateConfig(config: PipelineConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check wallets
  if (!config.wallets || config.wallets.length === 0) {
    errors.push('At least one wallet is required')
  }

  // Check for required roles
  const roles = new Set(config.wallets.map(w => w.role))
  if (!roles.has('Originator')) {
    errors.push('At least one Originator wallet is required')
  }
  if (!roles.has('Borrower')) {
    errors.push('At least one Borrower wallet is required')
  }

  // Check loans
  for (const loan of config.loans) {
    const originator = config.wallets.find(w =>
      w.name.toLowerCase().includes(loan.originatorId.replace('orig-', '').replace('-', ' '))
    )
    if (!originator) {
      errors.push(`Loan references unknown originator: ${loan.originatorId}`)
    }
  }

  // Check CLO tranches sum to 100%
  if (config.clo) {
    const totalAllocation = config.clo.tranches.reduce((sum, t) => sum + t.allocation, 0)
    if (Math.abs(totalAllocation - 100) > 0.01) {
      errors.push(`CLO tranche allocations must sum to 100%, got ${totalAllocation}%`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export default {
  DEFAULT_WALLETS,
  DEFAULT_LOANS,
  DEFAULT_CLO,
  DEFAULT_MONTE_CARLO,
  createPipelineConfig,
  getDefaultConfig,
  validateConfig,
}
