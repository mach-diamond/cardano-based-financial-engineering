/**
 * Pipeline Types
 * Core type definitions for the test pipeline runner
 */

export type TestNetwork = 'emulator' | 'preview' | 'preprod'

export interface Identity {
  id: string
  name: string
  role: 'Originator' | 'Borrower' | 'Agent' | 'Analyst' | 'Investor'
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

export type PhaseStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped' | 'disabled'

export interface Step {
  id: string
  name: string
  status: PhaseStatus
  action?: string
  disabled?: boolean // If true, step is skipped during execution
  disabledReason?: string // Optional reason for why step is disabled
  [key: string]: any // Allow additional step-specific properties
}

export interface LogFunction {
  (text: string, type?: 'info' | 'success' | 'error' | 'phase' | 'warning'): void
}

// Type alias for log types
export type LogType = 'info' | 'success' | 'error' | 'phase' | 'warning'

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
  principalAda?: number // in ADA (for update actions)
  apr: number
  frequency?: number // Payment periods per year: 12=Monthly, 4=Quarterly, etc.
  termLength: string
  installments?: number
  lateFee?: number // Late fee in ADA
  deferFee?: boolean // Defer seller fee
  status: PhaseStatus
  borrower: string | null // null = open to market
  originator: string
  contractAddress?: string
  policyId?: string
  txHash?: string // Latest transaction hash
  loanIndex?: number // Index in config for step matching
  state?: {
    balance: number
    isActive: boolean
    isPaidOff: boolean
    isDefaulted?: boolean
    isCancelled?: boolean
    startTime?: number
    paymentCount?: number
    lastPayment?: {
      amount: number
      timestamp: number
      installmentNumber: number
    }
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
  role: 'Originator' | 'Borrower' | 'Agent' | 'Analyst' | 'Investor'
  initialFunding: number // in ADA
  assets?: {
    name: string
    quantity: number
  }[]
}

export type LifecycleCaseId = 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7'

// Action timing override for custom scheduling
export interface ActionTimingOverride {
  actionId: string       // e.g., 'init', 'update', 'cancel', 'accept', 'pay-2', etc.
  timingPeriod: number   // Custom timing period (can be decimal for late payments)
  isLate?: boolean       // Mark if this is intentionally late
}

// Update Terms override for Update actions
export interface ActionTermsOverride {
  actionId: string        // e.g., '0-update' for first loan's update action
  principal?: number      // Updated principal in ADA
  apr?: number            // Updated APR %
  frequency?: number      // Updated payment frequency
  installments?: number   // Updated number of installments
  buyerReservation?: string | null  // Reserved buyer ID or null for open market
  feeSplitSeller?: number // Seller fee percentage (0-100)
  feeSplitBuyer?: number  // Buyer fee percentage (0-100)
  feeDeferment?: boolean  // Whether to defer fees
  lateFee?: number        // Late fee in ADA
  loanBalance?: number    // Updated loan balance in ADA
}

export interface LoanConfig {
  _uid?: string // Unique ID for stable v-for keys (runtime only)
  borrowerId: string // Reserved buyer ID (set in Loans tab) - empty for open market
  originatorId: string
  agentId?: string | null // Agent wallet (optional)
  asset: string
  quantity: number
  principal: number // in ADA
  apr: number
  frequency?: number // Payment periods per year: 12=Monthly, 4=Quarterly, 52=Weekly, etc.
  termMonths: number // Number of payment installments
  reservedBuyer?: boolean // true = reserved for specific borrower, false = open market
  lifecycleCase?: LifecycleCaseId // Test scenario: T1=Cancel, T2=Default, T3=Nominal(0%), T4=Nominal, T5=LateFee, T6=RejectGuard, T7=Reserved+Fees
  lifecycleBuyerId?: string | null // Buyer for Accept action in Lifecycle tab - doesn't affect initial contract
  agentFee?: number // Agent referral fee in ADA
  transferFeeBuyerPercent?: number // Transfer fee split - buyer percentage (0-100)
  deferFee?: boolean // Defer seller fee until end of loan
  lateFee?: number // Late payment fee in ADA
  actionTimings?: ActionTimingOverride[] // Custom timing overrides for actions
  actionTerms?: ActionTermsOverride[] // Custom terms for Update actions
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
