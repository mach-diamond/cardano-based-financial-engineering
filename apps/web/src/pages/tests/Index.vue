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
    <TestHeader
      :is-running="isRunning"
      :is-cleaning="isCleaning"
      :available-test-runs="availableTestRuns"
      :current-test-run-id="currentTestRunId"
      @run-tests="handleRunTests"
      @cleanup="handleCleanup"
      @load-test-run="loadTestRunById"
    />

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
      :breakpoint-phase="breakpointPhase"
      @run-full-test="handleRunTests(networkMode)"
      @execute-phase="handleExecutePhase"
      @execute-step="handleExecuteStep"
      @set-breakpoint="(phaseId: number | null) => breakpointPhase = phaseId"
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
      :loan-portfolio="loanPortfolio"
      :total-loan-value="totalLoanValue"
      @view-contract="viewCLOContract"
      @execute-contract="executeCLOContract"
      @run-all="runAllCLOContracts"
    />

    <!-- Console Output (collapsible) -->
    <ConsoleOutput
      :console-lines="consoleLines"
      :expanded="consoleExpanded"
      @clear="clearConsole"
      @toggle="consoleExpanded = !consoleExpanded"
    />
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
  fullTestCleanup,
  getTestRuns,
  getTestRun,
  getLatestTestRun,
  createTestRun,
  updateTestRunState,
  completeTestRun,
  deleteAllTestRuns,
  deleteAllContractRecords,
  type WalletFromDB,
  type TestSetupConfig,
  type TestRunState,
  type TestRun
} from '@/services/api'

// Components
import ProgressOverlay from './components/ProgressOverlay.vue'
import TestHeader from './components/TestHeader.vue'
import StatsCards from './components/StatsCards.vue'
import LifecycleSection from './components/LifecycleSection.vue'
import IdentitiesSection from './components/IdentitiesSection.vue'
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
const isCleaning = ref(false)
const currentPhase = ref(1)
const currentStepName = ref('Initializing...')
const networkMode = ref<'emulator' | 'preview'>('emulator')
const isGenerating = ref(false)

// Test run persistence
const currentTestRunId = ref<number | null>(null)
const availableTestRuns = ref<TestRun[]>([])

// Breakpoint control - set to phase ID to stop before that phase
// null = no breakpoint, 2 = stop before tokenization, 4 = stop before CLO, etc.
const breakpointPhase = ref<number | null>(4) // Default: stop before CLO

// Console output
const consoleLines = ref<ConsoleLine[]>([])
const consoleExpanded = ref(true)

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

      // Sync lifecycle step status based on loaded data
      syncStepStatusFromState()
    }
  } catch (err) {
    log('Could not connect to backend API. Make sure it\'s running with `just api`', 'error')
  }
}

// Sync lifecycle step status based on current state
// This ensures steps show as "passed" if their prerequisites are already satisfied
function syncStepStatusFromState() {
  // Phase 1: Setup & Identities
  const phase1 = phases.value.find(p => p.id === 1)
  if (phase1) {
    // Step 1: Create Wallets - passed if we have identities
    const createWalletsStep = phase1.steps.find((s: any) => s.id === 'S1')
    if (createWalletsStep && identities.value.length > 0) {
      createWalletsStep.status = 'passed'
    }

    // Step 2: Fund Wallets - passed if any wallet has balance
    const fundWalletsStep = phase1.steps.find((s: any) => s.id === 'S2')
    if (fundWalletsStep && identities.value.some(i => i.wallets.some(w => w.balance > 0n))) {
      fundWalletsStep.status = 'passed'
    }

    // Update phase status
    if (phase1.steps.every((s: any) => s.status === 'passed')) {
      phase1.status = 'passed'
    } else if (phase1.steps.some((s: any) => s.status === 'passed')) {
      phase1.status = 'pending' // Partially complete
    }
  }

  // Phase 2: Asset Tokenization - passed if originators have assets
  const phase2 = phases.value.find(p => p.id === 2)
  if (phase2) {
    phase2.steps.forEach((step: any) => {
      if ('originatorId' in step) {
        const originator = identities.value.find(i => i.id === step.originatorId)
        if (originator && originator.wallets.some(w => w.assets.length > 0)) {
          step.status = 'passed'
        }
      }
    })

    if (phase2.steps.every((s: any) => s.status === 'passed')) {
      phase2.status = 'passed'
    } else if (phase2.steps.some((s: any) => s.status === 'passed')) {
      phase2.status = 'pending'
    }
  }

  // Phase 3: Initialize Loan Contracts - passed if loan contracts exist
  const phase3 = phases.value.find(p => p.id === 3)
  if (phase3 && loanContracts.value.length > 0) {
    phase3.steps.forEach((step: any) => {
      if ('borrowerId' in step) {
        const borrower = identities.value.find(i => i.id === step.borrowerId)
        const loan = loanContracts.value.find(l => l.borrower === borrower?.name)
        if (loan) {
          step.status = 'passed'
        }
      }
    })

    if (phase3.steps.every((s: any) => s.status === 'passed')) {
      phase3.status = 'passed'
    } else if (phase3.steps.some((s: any) => s.status === 'passed')) {
      phase3.status = 'pending'
    }
  }

  // Phase 4: CLO Bundle - passed if CLO contracts exist
  const phase4 = phases.value.find(p => p.id === 4)
  if (phase4 && cloContracts.value.length > 0) {
    phase4.steps.forEach((s: any) => s.status = 'passed')
    phase4.status = 'passed'
  }
}

// Load available test runs for dropdown
async function loadAvailableTestRuns() {
  try {
    availableTestRuns.value = await getTestRuns(20)
  } catch (err) {
    console.warn('Could not load test runs:', err)
  }
}

// Load a specific test run by ID
async function loadTestRunById(runId: number) {
  try {
    const run = await getTestRun(runId)
    console.log('loadTestRunById: Raw response:', run)
    console.log('loadTestRunById: State:', run?.state)
    console.log('loadTestRunById: loanContracts in state:', run?.state?.loanContracts)
    console.log('loadTestRunById: cloContracts in state:', run?.state?.cloContracts)

    if (run && run.state) {
      // Reset all phases to pending first
      phases.value.forEach(phase => {
        phase.status = 'pending'
        phase.steps.forEach((step: any) => {
          step.status = 'pending'
        })
      })

      currentTestRunId.value = run.id

      // Restore phases state
      if (run.state.phases && run.state.phases.length > 0) {
        for (let i = 0; i < run.state.phases.length && i < phases.value.length; i++) {
          phases.value[i].status = run.state.phases[i].status || 'pending'
          phases.value[i].expanded = run.state.phases[i].expanded ?? phases.value[i].expanded
          if (run.state.phases[i].steps) {
            for (let j = 0; j < run.state.phases[i].steps.length && j < phases.value[i].steps.length; j++) {
              phases.value[i].steps[j].status = run.state.phases[i].steps[j].status || 'pending'
            }
          }
        }
      }

      // Restore identities
      if (run.state.identities && run.state.identities.length > 0) {
        identities.value = run.state.identities.map((id: any) => ({
          ...id,
          wallets: id.wallets?.map((w: any) => ({
            ...w,
            balance: BigInt(w.balance || '0'),
            assets: w.assets?.map((a: any) => ({
              ...a,
              quantity: BigInt(a.quantity || '0')
            })) || []
          })) || []
        }))
      }

      // Restore loan contracts
      if (run.state.loanContracts && run.state.loanContracts.length > 0) {
        loanContracts.value = run.state.loanContracts
        console.log('loadTestRunById: Restored loanContracts:', loanContracts.value.length)
      } else {
        loanContracts.value = []
        console.log('loadTestRunById: No loanContracts to restore')
      }

      // Restore CLO contracts
      if (run.state.cloContracts && run.state.cloContracts.length > 0) {
        cloContracts.value = run.state.cloContracts
        console.log('loadTestRunById: Restored cloContracts:', cloContracts.value.length)
      } else {
        cloContracts.value = []
        console.log('loadTestRunById: No cloContracts to restore')
      }

      currentPhase.value = run.state.currentPhase || 1
      log(`Loaded test run #${run.id}: ${run.name}`, 'success')

      // Sync step status based on restored state
      syncStepStatusFromState()
    }
  } catch (err) {
    log(`Error loading test run: ${(err as Error).message}`, 'error')
    console.error('loadTestRunById: Error:', err)
  }
}

// Load test run state from database
async function loadTestRunFromDB() {
  try {
    // Also load available runs for dropdown
    await loadAvailableTestRuns()

    const latestRun = await getLatestTestRun()
    console.log('loadTestRunFromDB: Latest run:', latestRun)
    console.log('loadTestRunFromDB: State:', latestRun?.state)
    console.log('loadTestRunFromDB: loanContracts in state:', latestRun?.state?.loanContracts)

    if (latestRun && latestRun.state) {
      currentTestRunId.value = latestRun.id

      // Restore phases state
      if (latestRun.state.phases && latestRun.state.phases.length > 0) {
        for (let i = 0; i < latestRun.state.phases.length && i < phases.value.length; i++) {
          phases.value[i].status = latestRun.state.phases[i].status || 'pending'
          phases.value[i].expanded = latestRun.state.phases[i].expanded ?? phases.value[i].expanded
          if (latestRun.state.phases[i].steps) {
            for (let j = 0; j < latestRun.state.phases[i].steps.length && j < phases.value[i].steps.length; j++) {
              phases.value[i].steps[j].status = latestRun.state.phases[i].steps[j].status || 'pending'
            }
          }
        }
      }

      // Restore identities
      if (latestRun.state.identities && latestRun.state.identities.length > 0) {
        identities.value = latestRun.state.identities.map((id: any) => ({
          ...id,
          wallets: id.wallets?.map((w: any) => ({
            ...w,
            balance: BigInt(w.balance || '0'),
            assets: w.assets?.map((a: any) => ({
              ...a,
              quantity: BigInt(a.quantity || '0')
            })) || []
          })) || []
        }))
      }

      // Restore loan contracts
      if (latestRun.state.loanContracts && latestRun.state.loanContracts.length > 0) {
        loanContracts.value = latestRun.state.loanContracts
        console.log('loadTestRunFromDB: Restored loanContracts:', loanContracts.value.length)
      } else {
        console.log('loadTestRunFromDB: No loanContracts in state to restore')
      }

      // Restore CLO contracts
      if (latestRun.state.cloContracts && latestRun.state.cloContracts.length > 0) {
        cloContracts.value = latestRun.state.cloContracts
        console.log('loadTestRunFromDB: Restored cloContracts:', cloContracts.value.length)
      } else {
        console.log('loadTestRunFromDB: No cloContracts in state to restore')
      }

      currentPhase.value = latestRun.state.currentPhase || 1
      log(`Restored test state from run #${latestRun.id} (${latestRun.status})`, 'success')

      // Sync step status based on restored state
      syncStepStatusFromState()
    } else {
      console.log('loadTestRunFromDB: No latest run found or no state')
    }
  } catch (err) {
    console.warn('loadTestRunFromDB: Error:', err)
  }
}

// Save current test state to database
async function saveTestState() {
  if (!currentTestRunId.value) {
    console.warn('saveTestState: No test run ID, skipping save')
    return
  }

  // Deep clone contracts to ensure we capture current state
  const contractsCopy = JSON.parse(JSON.stringify(loanContracts.value))
  const cloContractsCopy = JSON.parse(JSON.stringify(cloContracts.value))

  console.log('saveTestState: Saving state with:', {
    testRunId: currentTestRunId.value,
    loanContractsCount: contractsCopy.length,
    cloContractsCount: cloContractsCopy.length,
    identitiesCount: identities.value.length
  })

  const state: TestRunState = {
    phases: phases.value.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      status: p.status,
      expanded: p.expanded,
      steps: p.steps.map((s: any) => ({
        id: s.id,
        name: s.name,
        status: s.status
      }))
    })),
    identities: identities.value.map(id => ({
      ...id,
      wallets: id.wallets.map(w => ({
        ...w,
        balance: w.balance.toString(),
        assets: w.assets.map(a => ({
          ...a,
          quantity: a.quantity.toString()
        }))
      }))
    })),
    loanContracts: contractsCopy,
    cloContracts: cloContractsCopy,
    currentPhase: currentPhase.value,
    completedSteps: completedSteps.value,
    totalSteps: totalSteps.value
  }

  try {
    const result = await updateTestRunState(currentTestRunId.value, state)
    console.log('saveTestState: Save result:', result ? 'success' : 'failed')
  } catch (err) {
    console.error('saveTestState: Error saving:', err)
  }
}

onMounted(async () => {
  // Load test config
  try {
    testConfig.value = await getTestConfig()
  } catch (err) {
    console.warn('Could not load test config:', err)
  }

  // Load latest test run state (this will also restore identities if available)
  await loadTestRunFromDB()

  // If no identities from test run, try loading wallets directly
  if (identities.value.length === 0) {
    await loadWalletsFromDB()
  }
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

// Loan Portfolio (principals scaled to match borrower wallet funding)
const loanPortfolio = ref([
  { id: 1, principal: 500, apr: 5, payments: 0, totalPayments: 24, active: false, defaulted: false, asset: 'RealEstate', borrower: 'Office Operator LLC' },
  { id: 2, principal: 500, apr: 5.5, payments: 0, totalPayments: 24, active: false, defaulted: false, asset: 'RealEstate', borrower: 'Luxury Apartments LLC' },
  { id: 3, principal: 2000, apr: 4, payments: 0, totalPayments: 60, active: false, defaulted: false, asset: 'Airplane', borrower: 'Cardano Airlines LLC' },
  { id: 4, principal: 2000, apr: 4, payments: 0, totalPayments: 60, active: false, defaulted: false, asset: 'Airplane', borrower: 'Superfast Cargo Air' },
  { id: 5, principal: 500, apr: 6, payments: 0, totalPayments: 12, active: false, defaulted: false, asset: 'Diamond', borrower: 'Alice Doe' },
  { id: 6, principal: 800, apr: 7, payments: 0, totalPayments: 36, active: false, defaulted: false, asset: 'Boat', borrower: 'Boat Operator LLC' },
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
      { id: 'L1', name: 'Loan: Alice Doe ← Diamond', status: 'pending', borrowerId: 'bor-alice', originatorId: 'orig-jewelry', asset: 'Diamond', qty: 2, principal: 500 },
      { id: 'L2', name: 'Loan: Cardano Airlines ← Airplane', status: 'pending', borrowerId: 'bor-cardanoair', originatorId: 'orig-airplane', asset: 'Airplane', qty: 5, principal: 2000 },
      { id: 'L3', name: 'Loan: Superfast Cargo ← Airplane', status: 'pending', borrowerId: 'bor-superfastcargo', originatorId: 'orig-airplane', asset: 'Airplane', qty: 5, principal: 2000 },
      { id: 'L4', name: 'Loan: Office Operator ← RealEstate', status: 'pending', borrowerId: 'bor-officeop', originatorId: 'orig-realestate', asset: 'RealEstate', qty: 5, principal: 500 },
      { id: 'L5', name: 'Loan: Luxury Apartments ← RealEstate', status: 'pending', borrowerId: 'bor-luxuryapt', originatorId: 'orig-realestate', asset: 'RealEstate', qty: 5, principal: 500 },
      { id: 'L6', name: 'Loan: Boat Operator ← Boat', status: 'pending', borrowerId: 'bor-boatop', originatorId: 'orig-yacht', asset: 'Boat', qty: 3, principal: 800 },
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
      { id: 'P1', name: 'Payment: Alice Doe → Diamond Loan', status: 'pending', borrowerId: 'bor-alice', amount: 50 },
      { id: 'P2', name: 'Payment: Cardano Airlines → Airplane Loan', status: 'pending', borrowerId: 'bor-cardanoair', amount: 200 },
      { id: 'P3', name: 'Payment: Superfast Cargo → Airplane Loan', status: 'pending', borrowerId: 'bor-superfastcargo', amount: 200 },
      { id: 'P4', name: 'Payment: Office Operator → RealEstate Loan', status: 'pending', borrowerId: 'bor-officeop', amount: 25 },
      { id: 'P5', name: 'Payment: Luxury Apartments → RealEstate Loan', status: 'pending', borrowerId: 'bor-luxuryapt', amount: 25 },
      { id: 'P6', name: 'Payment: Boat Operator → Boat Loan', status: 'pending', borrowerId: 'bor-boatop', amount: 30 },
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
  // Create a new test run in DB
  try {
    const initialState: TestRunState = {
      phases: [],
      identities: [],
      loanContracts: [],
      cloContracts: [],
      currentPhase: 1,
      completedSteps: 0,
      totalSteps: totalSteps.value
    }
    const testRun = await createTestRun({
      name: `Test Run ${new Date().toLocaleString()}`,
      description: `${mode} mode test`,
      networkMode: mode,
      state: initialState
    })
    currentTestRunId.value = testRun.id
    log(`Created test run #${testRun.id}`, 'info')
  } catch (err) {
    console.warn('Could not create test run:', err)
  }

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
    cloContracts,
    breakpointPhase,
    saveTestState, // Called after each phase
    currentTestRunId // Pass test run ID for DB persistence
  )

  // Save final state
  await saveTestState()

  // Mark test run as complete
  if (currentTestRunId.value) {
    const status = lifecycleStatus.value === 'failed' ? 'failed' : 'passed'
    await completeTestRun(currentTestRunId.value, status)
  }
}

async function handleExecutePhase(phase: Phase) {
  // Create a test run if one doesn't exist
  if (!currentTestRunId.value) {
    try {
      const testRun = await createTestRun({
        name: `Manual Phase: ${phase.name}`,
        networkMode: networkMode.value,
        state: { phases: [], identities: [], loanContracts: [], cloContracts: [], currentPhase: phase.id, completedSteps: 0, totalSteps: totalSteps.value }
      })
      currentTestRunId.value = testRun.id
    } catch (err) {
      console.warn('Could not create test run:', err)
    }
  }

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

  // Save state after phase execution
  await saveTestState()
}

async function handleExecuteStep(phase: Phase, step: any) {
  // Create a test run if one doesn't exist
  if (!currentTestRunId.value) {
    try {
      const testRun = await createTestRun({
        name: `Manual Step: ${step.name}`,
        networkMode: networkMode.value,
        state: { phases: [], identities: [], loanContracts: [], cloContracts: [], currentPhase: phase.id, completedSteps: 0, totalSteps: totalSteps.value }
      })
      currentTestRunId.value = testRun.id
    } catch (err) {
      console.warn('Could not create test run:', err)
    }
  }

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

  // Save state after step execution
  await saveTestState()
}

function clearConsole() {
  consoleLines.value = []
}

// Clean up all test state
async function handleCleanup() {
  isCleaning.value = true
  try {
    log('Starting cleanup...', 'info')

    // Reset backend state
    await fullTestCleanup()
    log('Backend state cleared (emulator, contracts, wallets)', 'success')

    // Delete all contracts from process_smart_contract table
    await deleteAllContractRecords()
    log('Contract records cleared', 'success')

    // Delete all test runs
    await deleteAllTestRuns()
    currentTestRunId.value = null
    log('Test runs cleared', 'success')

    // Reset UI state
    identities.value = []
    loanContracts.value = []
    cloContracts.value = []
    loanPortfolio.value = loanPortfolio.value.map(loan => ({
      ...loan,
      payments: 0,
      active: false,
      defaulted: false
    }))

    // Reset phases to pending
    phases.value.forEach(phase => {
      phase.status = 'pending'
      phase.steps.forEach(step => {
        step.status = 'pending'
      })
    })

    log('UI state reset complete', 'success')
    log('Ready for a fresh test run', 'info')
  } catch (err) {
    log('Cleanup error: ' + (err as Error).message, 'error')
    console.error(err)
  } finally {
    isCleaning.value = false
  }
}

// Loan Contract handlers
function viewLoanContract(contract: LoanContract) {
  // Pass contract data via route state for viewing
  router.push({
    path: `/tests/loan/${contract.id}`,
    state: { contract }
  })
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
