<template>
  <div class="container-fluid py-4">
    <!-- Fixed Progress Bar Overlay (when running) -->
    <ProgressOverlay
      :is-running="isRunning"
      :current-step-name="currentStepName"
      :current-phase="currentPhase"
      :completed-steps="completedSteps"
      :total-steps="totalSteps"
    />

    <!-- Header -->
    <TestHeader :is-running="isRunning" @run-tests="handleRunTests" />

    <!-- Config Viewer (collapsible) -->
    <ConfigViewer
      :config="testConfig"
      :phases="phases"
      :identities="identities"
      @import-config="handleImportConfig"
    />

    <!-- Stats Cards -->
    <StatsCards :stats="statsWithTotal" />

    <!-- Full Lifecycle Test (Main Feature) -->
    <LifecycleSection
      :phases="phases"
      :identities="identities"
      :is-running="isRunning"
      :completed-steps="completedSteps"
      :total-steps="totalSteps"
      :lifecycle-status="lifecycleStatus"
      @run-full-test="handleRunTests(networkMode)"
      @execute-phase="handleExecutePhase"
      @execute-step="handleExecuteStep"
    />

    <!-- Identities & Wallets -->
    <IdentitiesSection
      :identities="identities"
      :is-running="isRunning"
      :is-generating="isGenerating"
      @generate-test-users="generateTestUsers"
    />

    <!-- Individual Test Suites -->
    <Contracts_Loans
      :contracts="loanContracts"
      @view-contract="viewLoanContract"
      @execute-contract="executeLoanContract"
      @run-all="runAllLoanContracts"
    />

    <Contracts_CLOs
      :contracts="cloContracts"
      @view-contract="viewCLOContract"
      @execute-contract="executeCLOContract"
      @run-all="runAllCLOContracts"
    />

    <!-- Loan Portfolio Visualization -->
    <div class="row mb-4">
      <div class="col-lg-8 mb-4 mb-lg-0">
        <LoanPortfolio :loan-portfolio="loanPortfolio" />
      </div>

      <!-- CDO Tranche Structure -->
      <div class="col-lg-4">
        <TrancheStructure :total-value="totalLoanValue" />
      </div>
    </div>

    <!-- Console Output -->
    <ConsoleOutput :console-lines="consoleLines" @clear="clearConsole" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

// API Service
import {
  getWallets,
  getTestConfig,
  createWallet,
  deleteAllWallets,
  generateMockAddress,
  generateMockPaymentKeyHash,
  generateMockPrivateKey,
  type WalletFromDB,
  type TestSetupConfig
} from '@/services/api'

// Components
import ProgressOverlay from './components/ProgressOverlay.vue'
import TestHeader from './components/TestHeader.vue'
import StatsCards from './components/StatsCards.vue'
import LifecycleSection from './components/LifecycleSection.vue'
import IdentitiesSection from './components/IdentitiesSection.vue'
import LoanPortfolio from './components/LoanPortfolio.vue'
import TrancheStructure from './components/TrancheStructure.vue'
import Contracts_CLOs from './components/Contracts_CLOs.vue'
import Contracts_Loans from './components/Contracts_Loans.vue'
import ConsoleOutput from './components/ConsoleOutput.vue'
import ConfigViewer from './components/ConfigViewer.vue'
import type { ConsoleLine } from './components/ConsoleOutput.vue'
import type { LoanContract } from './components/Contracts_Loans.vue'
import type { CLOContract } from './components/Contracts_CLOs.vue'

// Test Runner Utility
import * as runner from './testRunner'
import type { Phase, Identity } from './testRunner'

const router = useRouter()

// State
const isRunning = ref(false)
const currentPhase = ref(1)
const currentStepName = ref('Initializing...')
const networkMode = ref<'emulator' | 'preview'>('emulator')
const isGenerating = ref(false)

// Console output
const consoleLines = ref<ConsoleLine[]>([])

// Identity State - starts empty, loaded from DB
const identities = ref<Identity[]>([])

// Test configuration from backend
const testConfig = ref<TestSetupConfig | null>(null)

// Map wallet name to identity ID (for consistent IDs between UI and DB)
const nameToIdMap: Record<string, string> = {
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

// Convert DB wallet to Identity format
function walletToIdentity(wallet: WalletFromDB): Identity {
  return {
    id: nameToIdMap[wallet.name] || `wallet-${wallet.id}`,
    name: wallet.name,
    role: wallet.role,
    address: wallet.address,
    wallets: [{
      id: `w${wallet.id}`,
      name: 'Main',
      address: wallet.address,
      balance: 0n,
      assets: []
    }]
  }
}

// Load wallets from DB on mount
async function loadWalletsFromDB() {
  try {
    const wallets = await getWallets()
    if (wallets.length > 0) {
      identities.value = wallets.map(walletToIdentity)
      log(`Loaded ${wallets.length} wallets from database`, 'success')
    }
  } catch (err) {
    log('Could not connect to backend API. Make sure it\'s running with `just api`', 'error')
  }
}

onMounted(async () => {
  // Load test config
  try {
    testConfig.value = await getTestConfig()
  } catch (err) {
    console.warn('Could not load test config:', err)
  }
  // Load wallets
  loadWalletsFromDB()
})

// Handle importing a config file
function handleImportConfig(config: any) {
  if (config.config) {
    testConfig.value = config.config
  }
  if (config.identities) {
    identities.value = config.identities
  }
  log('Imported configuration from file', 'success')
}

// Generate test wallets and save to DB
async function generateTestUsers() {
  isGenerating.value = true
  try {
    // First, clear existing wallets
    log('Clearing existing wallets...', 'info')
    await deleteAllWallets()
    identities.value = []

    // Get wallet config from backend
    log('Fetching wallet configuration...', 'info')
    const config = await getTestConfig()

    // Create each wallet
    const newIdentities: Identity[] = []
    for (const walletConfig of config.wallets) {
      log(`Creating wallet: ${walletConfig.name}...`, 'info')

      const address = generateMockAddress()
      const paymentKeyHash = generateMockPaymentKeyHash()
      const privateKey = generateMockPrivateKey()

      // Save to DB
      const savedWallet = await createWallet({
        name: walletConfig.name,
        role: walletConfig.role,
        address,
        paymentKeyHash,
        privateKey
      })

      // Convert to Identity format
      newIdentities.push(walletToIdentity(savedWallet))

      await new Promise(r => setTimeout(r, 30)) // Small delay for UI feedback
    }

    identities.value = newIdentities
    log(`Generated ${newIdentities.length} wallets and saved to database`, 'success')
  } catch (err) {
    log('Error generating wallets: ' + (err as Error).message, 'error')
    console.error(err)
  } finally {
    isGenerating.value = false
  }
}

// Loan Portfolio
const loanPortfolio = ref([
  { id: 1, principal: 2500, apr: 5, payments: 0, totalPayments: 24, active: false, defaulted: false, asset: 'Home', borrower: 'Office Operator LLC' },
  { id: 2, principal: 2500, apr: 5.5, payments: 0, totalPayments: 24, active: false, defaulted: false, asset: 'RealEstate', borrower: 'Luxury Apartments LLC' },
  { id: 3, principal: 50000, apr: 4, payments: 0, totalPayments: 60, active: false, defaulted: false, asset: 'Airplane', borrower: 'Cardano Airlines LLC' },
  { id: 4, principal: 50000, apr: 4, payments: 0, totalPayments: 60, active: false, defaulted: false, asset: 'Airplane', borrower: 'Superfast Cargo Air' },
  { id: 5, principal: 350, apr: 6, payments: 0, totalPayments: 12, active: false, defaulted: false, asset: 'Home', borrower: 'Alice Doe' },
  { id: 6, principal: 8000, apr: 7, payments: 0, totalPayments: 36, active: false, defaulted: false, asset: 'Boat', borrower: 'Boat Operator LLC' },
])

const totalLoanValue = computed(() =>
  loanPortfolio.value.reduce((sum, loan) => sum + loan.principal, 0)
)

// Extended Phases with individual executable steps
const phases = ref<Phase[]>([
  {
    id: 1,
    name: 'Setup & Identities',
    description: 'Create and fund wallets for all participants',
    status: 'pending',
    expanded: true,
    steps: [
      {
        id: 'S1',
        name: 'Create Wallets',
        status: 'pending',
        action: 'create-wallets',
        wallets: [
          { role: 'Originator', name: 'MachDiamond Jewelry' },
          { role: 'Originator', name: 'Airplane Manufacturing LLC' },
          { role: 'Originator', name: 'Bob Smith' },
          { role: 'Originator', name: 'Premier Asset Holdings' },
          { role: 'Originator', name: 'Yacht Makers Corp' },
          { role: 'Borrower', name: 'Cardano Airlines LLC' },
          { role: 'Borrower', name: 'Superfast Cargo Air' },
          { role: 'Borrower', name: 'Alice Doe' },
          { role: 'Borrower', name: 'Office Operator LLC' },
          { role: 'Borrower', name: 'Luxury Apartments LLC' },
          { role: 'Borrower', name: 'Boat Operator LLC' },
          { role: 'Analyst', name: 'Cardano Investment Bank' },
          { role: 'Investor', name: 'Senior Tranche Investor' },
          { role: 'Investor', name: 'Mezzanine Tranche Investor' },
          { role: 'Investor', name: 'Junior Tranche Investor' },
          { role: 'Investor', name: 'Hedge Fund Alpha' },
        ]
      },
      {
        id: 'S2',
        name: 'Fund All Wallets',
        status: 'pending',
        action: 'fund-wallets',
        wallets: [
          { role: 'Originator', name: 'MachDiamond Jewelry' },
          { role: 'Originator', name: 'Airplane Manufacturing LLC' },
          { role: 'Originator', name: 'Bob Smith' },
          { role: 'Originator', name: 'Premier Asset Holdings' },
          { role: 'Originator', name: 'Yacht Makers Corp' },
          { role: 'Borrower', name: 'Cardano Airlines LLC' },
          { role: 'Borrower', name: 'Superfast Cargo Air' },
          { role: 'Borrower', name: 'Alice Doe' },
          { role: 'Borrower', name: 'Office Operator LLC' },
          { role: 'Borrower', name: 'Luxury Apartments LLC' },
          { role: 'Borrower', name: 'Boat Operator LLC' },
          { role: 'Analyst', name: 'Cardano Investment Bank' },
          { role: 'Investor', name: 'Senior Tranche Investor' },
          { role: 'Investor', name: 'Mezzanine Tranche Investor' },
          { role: 'Investor', name: 'Junior Tranche Investor' },
          { role: 'Investor', name: 'Hedge Fund Alpha' },
        ]
      },
    ]
  },
  {
    id: 2,
    name: 'Asset Tokenization',
    description: 'Originators mint tokenized real-world assets',
    status: 'pending',
    expanded: true,
    steps: [
      { id: 'A1', name: 'Mint Diamond tokens (MachDiamond)', status: 'pending', originatorId: 'orig-jewelry', asset: 'Diamond', qty: 2n },
      { id: 'A2', name: 'Mint Airplane tokens', status: 'pending', originatorId: 'orig-airplane', asset: 'Airplane', qty: 10n },
      { id: 'A3', name: 'Mint Home token (Bob Smith)', status: 'pending', originatorId: 'orig-home', asset: 'Home', qty: 1n },
      { id: 'A4', name: 'Mint RealEstate tokens', status: 'pending', originatorId: 'orig-realestate', asset: 'RealEstate', qty: 10n },
      { id: 'A5', name: 'Mint Boat tokens', status: 'pending', originatorId: 'orig-yacht', asset: 'Boat', qty: 3n },
    ]
  },
  {
    id: 3,
    name: 'Initialize Loan Contracts',
    description: 'Create loans using tokenized assets as collateral',
    status: 'pending',
    expanded: true,
    steps: [
      { id: 'L1', name: 'Loan: Alice Doe ← Diamond', status: 'pending', borrowerId: 'bor-alice', originatorId: 'orig-jewelry', asset: 'Diamond', qty: 2, principal: 15000 },
      { id: 'L2', name: 'Loan: Cardano Airlines ← Airplane', status: 'pending', borrowerId: 'bor-cardanoair', originatorId: 'orig-airplane', asset: 'Airplane', qty: 5, principal: 50000 },
      { id: 'L3', name: 'Loan: Superfast Cargo ← Airplane', status: 'pending', borrowerId: 'bor-superfastcargo', originatorId: 'orig-airplane', asset: 'Airplane', qty: 5, principal: 50000 },
      { id: 'L4', name: 'Loan: Office Operator ← RealEstate', status: 'pending', borrowerId: 'bor-officeop', originatorId: 'orig-realestate', asset: 'RealEstate', qty: 5, principal: 2500 },
      { id: 'L5', name: 'Loan: Luxury Apartments ← RealEstate', status: 'pending', borrowerId: 'bor-luxuryapt', originatorId: 'orig-realestate', asset: 'RealEstate', qty: 5, principal: 2500 },
      { id: 'L6', name: 'Loan: Boat Operator ← Boat', status: 'pending', borrowerId: 'bor-boatop', originatorId: 'orig-yacht', asset: 'Boat', qty: 3, principal: 8000 },
    ]
  },
  {
    id: 4,
    name: 'CLO Bundle & Distribution',
    description: 'Bundle collateral into CLO with 3 tranches',
    status: 'pending',
    expanded: false,
    steps: [
      { id: 'C1', name: 'Bundle 6 Collateral Tokens', status: 'pending' },
      { id: 'C2', name: 'Deploy CLO Contract (3 Tranches)', status: 'pending' },
      { id: 'C3', name: 'Distribute Tranche Tokens to Investors', status: 'pending' },
    ]
  },
  {
    id: 5,
    name: 'Make Loan Payments',
    description: 'Borrowers make scheduled payments on their loans',
    status: 'pending',
    expanded: false,
    steps: [
      { id: 'P1', name: 'Payment: Alice Doe → Diamond Loan', status: 'pending', borrowerId: 'bor-alice', amount: 1500 },
      { id: 'P2', name: 'Payment: Cardano Airlines → Airplane Loan', status: 'pending', borrowerId: 'bor-cardanoair', amount: 5000 },
      { id: 'P3', name: 'Payment: Superfast Cargo → Airplane Loan', status: 'pending', borrowerId: 'bor-superfastcargo', amount: 5000 },
      { id: 'P4', name: 'Payment: Office Operator → RealEstate Loan', status: 'pending', borrowerId: 'bor-officeop', amount: 250 },
      { id: 'P5', name: 'Payment: Luxury Apartments → RealEstate Loan', status: 'pending', borrowerId: 'bor-luxuryapt', amount: 250 },
      { id: 'P6', name: 'Payment: Boat Operator → Boat Loan', status: 'pending', borrowerId: 'bor-boatop', amount: 800 },
    ]
  }
])

const lifecycleTests = computed(() => phases.value.flatMap(p => p.steps))
const lifecycleStatus = computed<'passed' | 'failed' | 'running' | 'pending'>(() => {
  const statuses = phases.value.map(p => p.status)
  if (statuses.some(s => s === 'failed')) return 'failed'
  if (statuses.some(s => s === 'running')) return 'running'
  if (statuses.every(s => s === 'passed')) return 'passed'
  return 'pending'
})

// Progress bar computed values
const totalSteps = computed(() => lifecycleTests.value.length)
const completedSteps = computed(() => lifecycleTests.value.filter(s => s.status === 'passed').length)

// Contract State - starts empty, populated during "Initialize Loan Contracts" phase
const loanContracts = ref<LoanContract[]>([])
const cloContracts = ref<CLOContract[]>([])

const stats = computed(() => {
  const allContracts = [...loanContracts.value, ...cloContracts.value]
  return {
    passed: allContracts.filter(c => c.status === 'passed').length,
    failed: allContracts.filter(c => c.status === 'failed').length,
    running: allContracts.filter(c => c.status === 'running').length,
    pending: allContracts.filter(c => c.status === 'pending').length,
  }
})

const statsWithTotal = computed(() => ({
  ...stats.value,
  total: loanContracts.value.length + cloContracts.value.length + lifecycleTests.value.length
}))

function log(text: string, type: ConsoleLine['type'] = 'info') {
  const time = new Date().toLocaleTimeString('en-US', { hour12: false })
  consoleLines.value.push({ time, text, type })
}

async function handleRunTests(mode: 'emulator' | 'preview' = networkMode.value) {
  await runner.runTests(
    mode,
    identities,
    phases,
    isRunning,
    currentPhase,
    currentStepName,
    log,
    stats,
    loanContracts,
    cloContracts
  )
}

async function handleExecutePhase(phase: Phase) {
  await runner.executePhase(
    phase,
    identities,
    phases,
    isRunning,
    currentStepName,
    log,
    loanContracts,
    cloContracts
  )
}

async function handleExecuteStep(phase: Phase, step: any) {
  await runner.executeStep(
    phase,
    step,
    identities,
    phases,
    isRunning,
    currentStepName,
    log,
    loanContracts,
    cloContracts
  )
}

function clearConsole() {
  consoleLines.value = []
}

// Loan Contract handlers
function viewLoanContract(contract: LoanContract) {
  router.push(`/tests/loan/${contract.id}`)
}

function executeLoanContract(contract: LoanContract) {
  log(`Executing loan contract: ${contract.alias || contract.id}`, 'info')
  // TODO: Wire to actual contract execution
}

function runAllLoanContracts() {
  log('Running all loan contracts...', 'info')
  // TODO: Wire to batch execution
}

// CLO Contract handlers
function viewCLOContract(contract: CLOContract) {
  router.push(`/tests/clo/${contract.id}`)
}

function executeCLOContract(contract: CLOContract) {
  log(`Executing CLO contract: ${contract.alias || contract.id}`, 'info')
  // TODO: Wire to actual contract execution
}

function runAllCLOContracts() {
  log('Running all CLO contracts...', 'info')
  // TODO: Wire to batch execution
}

</script>

<style>
@import './tests.css';
</style>
