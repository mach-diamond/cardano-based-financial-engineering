/**
 * Pipeline Types
 * Core type definitions for the test pipeline runner
 */

export type TestNetwork = 'emulator' | 'preview'

export interface Identity {
  id: string
  name: string
  role: 'Originator' | 'Borrower' | 'Analyst' | 'Investor'
  address: string
  wallets: Wallet[]
}

export interface Wallet {
  id: string
  name: string
  address: string
  balance: bigint
  assets: Asset[]
}

export interface Asset {
  policyId: string
  assetName: string
  quantity: bigint
}

export interface Phase {
  id: number
  name: string
  description: string
  status: PhaseStatus
  expanded: boolean
  steps: Step[]
}

export type PhaseStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped'

export interface Step {
  id: string
  name: string
  status: PhaseStatus
  action?: string
  [key: string]: any // Allow additional step-specific properties
}

export interface LogFunction {
  (text: string, type?: 'info' | 'success' | 'error' | 'phase' | 'warning'): void
}

export interface LoanContract {
  id: string
  alias: string
  subtype: string
  collateral: {
    quantity: number
    assetName: string
    policyId: string
  }
  principal: number // in lovelace
  apr: number
  termLength: string
  status: PhaseStatus
  borrower: string | null // null = open to market
  originator: string
  state?: {
    balance: number
    isActive: boolean
    isPaidOff: boolean
    startTime?: number
  }
}

export interface CLOContract {
  id: string
  alias: string
  subtype: string
  tranches: Tranche[]
  totalValue: number
  collateralCount: number
  status: PhaseStatus
  manager: string
}

export interface Tranche {
  name: string
  allocation: number
  yieldModifier: number
}

// Pipeline Configuration Types
export interface PipelineConfig {
  network: TestNetwork
  wallets: WalletConfig[]
  loans: LoanConfig[]
  clo?: CLOConfig
  monteCarlo?: MonteCarloConfig
}

export interface WalletConfig {
  name: string
  role: 'Originator' | 'Borrower' | 'Analyst' | 'Investor'
  initialFunding: number // in ADA
  assets?: {
    name: string
    quantity: number
  }[]
}

export interface LoanConfig {
  borrowerId: string
  originatorId: string
  asset: string
  quantity: number
  principal: number // in ADA
  apr: number
  termMonths: number
  reservedBuyer?: boolean // true = reserved for specific borrower, false = open market
}

export interface CLOConfig {
  name: string
  tranches: {
    name: string
    allocation: number
    yieldModifier: number
  }[]
}

export interface MonteCarloConfig {
  iterations: number
  parameters: {
    defaultProbability: { min: number; max: number }
    interestRateShock: { min: number; max: number }
    prepaymentRate: { min: number; max: number }
  }
}

// Pipeline State
export interface PipelineState {
  testRunId: number | null
  network: TestNetwork
  currentTime: number // Simulated blockchain time
  slotNumber: number
  isRunning: boolean
  isPaused: boolean
  currentPhase: number
  breakpointPhase: number | null
  identities: Identity[]
  loanContracts: LoanContract[]
  cloContracts: CLOContract[]
}

// Action Result
export interface ActionResult {
  success: boolean
  message: string
  data?: any
  error?: Error
}

// Map wallet name to identity ID
export const NAME_TO_ID_MAP: Record<string, string> = {
  'MachDiamond Jewelry': 'orig-jewelry',
  'Airplane Manufacturing LLC': 'orig-airplane',
  'Bob Smith': 'orig-home',
  'Premier Asset Holdings': 'orig-realestate',
  'Yacht Makers Corp': 'orig-yacht',
  'Cardano Airlines LLC': 'bor-cardanoair',
  'Superfast Cargo Air': 'bor-superfastcargo',
  'Alice Doe': 'bor-alice',
  'Office Operator LLC': 'bor-officeop',
  'Luxury Apartments LLC': 'bor-luxuryapt',
  'Boat Operator LLC': 'bor-boatop',
  'Cardano Investment Bank': 'analyst',
  'Senior Tranche Investor': 'inv-1',
  'Mezzanine Tranche Investor': 'inv-2',
  'Junior Tranche Investor': 'inv-3',
  'Hedge Fund Alpha': 'inv-4',
}
