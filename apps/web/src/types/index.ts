/**
 * Web App Type Definitions
 */

// Network types
export type NetworkId = 0 | 1; // 0 = testnet, 1 = mainnet
export type NetworkName = 'Preview' | 'Preprod' | 'Mainnet';

// Wallet types
export interface WalletState {
  isConnected: boolean;
  address: string | null;
  networkId: NetworkId;
  balance: bigint;
  walletName: string | null;
}

// Asset types
export interface Asset {
  policyId: string;
  assetName: string;
  quantity: bigint;
  metadata?: AssetMetadata;
}

export interface AssetMetadata {
  name?: string;
  description?: string;
  image?: string;
  [key: string]: unknown;
}

// Loan Contract types
export interface LoanTerms {
  principal: bigint;        // lovelace
  apr: number;              // basis points (e.g., 700 = 7%)
  frequency: number;        // payments per year
  installments: number;     // total number of payments
  lateFee: bigint;          // lovelace
  transferFee: bigint;      // lovelace
}

export interface LoanState {
  balance: bigint;          // remaining balance in lovelace
  lastPayment: PaymentRecord | null;
  startTime: number | null; // POSIX timestamp
  isActive: boolean;
  isDefaulted: boolean;
  isPaidOff: boolean;
}

export interface PaymentRecord {
  amount: bigint;
  timestamp: number;
  installmentNumber: number;
}

export interface LoanContract {
  id: string;
  address: string;
  policyId: string;
  alias?: string;
  seller: string;
  buyer: string | null;
  baseAsset: Asset;
  terms: LoanTerms;
  state: LoanState;
  createdAt: Date;
}

// CDO Bond types
export interface TrancheConfig {
  percentage: number;       // 0-100
  interestRate: number;     // basis points
}

export interface BondConfig {
  principal: bigint;
  tranches: {
    senior: TrancheConfig;
    mezzanine: TrancheConfig;
    junior: TrancheConfig;
  };
  termMonths: number;
  collateralPolicyId: string;
  collateralAssetName: string;
}

export interface CollateralState {
  index: number;
  isDefaulted: boolean;
  totalPaid: bigint;
  lastPaymentDate?: Date;
}

export interface BondState {
  totalCollected: bigint;
  totalDistributed: bigint;
  isMatured: boolean;
  isLiquidated: boolean;
  collateral: CollateralState[];
}

export interface CDOBond {
  id: string;
  address: string;
  policyId: string;
  alias?: string;
  manager: string;
  config: BondConfig;
  state: BondState;
  createdAt: Date;
}

// Test types
export type TestStatus = 'pending' | 'running' | 'passed' | 'failed';

export interface TestStep {
  id: string;
  name: string;
  status: TestStatus;
  duration?: number;
  error?: string;
  txHash?: string;
}

export interface TestResult {
  id: string;
  name: string;
  description: string;
  status: TestStatus;
  duration: number;
  steps: TestStep[];
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface TestSuite {
  id: string;
  name: string;
  network: 'emulator' | 'preview' | 'preprod';
  tests: TestResult[];
  timestamp: Date;
  totalPassed: number;
  totalFailed: number;
}

// Identity and Simulation types
export type IdentityRole = 'Originator' | 'Borrower' | 'Agent' | 'Analyst' | 'Investor';

export interface Identity {
  id: string;
  name: string;
  role: IdentityRole;
  address: string;
  wallets: SimulatedWallet[];
}

export interface SimulatedWallet {
  id: string;
  name: string;
  address: string;
  balance: bigint;
  assets: Asset[];
}

export interface SimulationState {
  identities: Identity[];
  currentPhase: number;
  totalSteps: number;
  currentStep: number;
  isRunning: boolean;
  logs: string[];
}

// Form types
export interface LoanFormData {
  alias: string;
  selectedAsset: Asset | null;
  quantity: number;
  buyer: string;
  hasBuyer: boolean;
  principal: number;        // ADA
  apr: number;              // percentage
  frequency: number;        // payments per year
  installments: number;
  lateFee: number;          // ADA
  feeSplit: number;         // 0-100 (seller/buyer split)
  deferFee: boolean;
}

export interface CDOFormData {
  alias: string;
  principal: number;        // ADA
  seniorPercentage: number;
  seniorRate: number;
  mezzPercentage: number;
  mezzRate: number;
  juniorPercentage: number;
  juniorRate: number;
  termMonths: number;
  collateral: Asset[];
}

// Utility types
export interface SelectOption<T = string> {
  label: string;
  value: T;
}

export interface TimeDisplay {
  years?: number;
  months?: number;
  weeks?: number;
  days?: number;
  hours?: number;
  minutes?: number;
}
