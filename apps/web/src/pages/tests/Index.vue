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
      :current-slot="currentSlot"
      :elapsed-time="elapsedTime"
      @run-tests="handleRunTests"
      @cleanup="handleCleanup"
      @load-test-run="loadTestRunById"
      @step-time="handleStepTime"
      @reset-time="handleResetTime"
    />

    <!-- Config Viewer (with built-in config selector) -->
    <ConfigViewer
      :config="testConfig"
      :phases="phases"
      :identities="identities"
      :saved-configs="savedConfigs"
      :selected-config-id="selectedConfigId"
      :loan-count="pipelineConfig.loans.length"
      @import-config="handleImportConfig"
      @config-change="handleConfigChange"
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
      :is-refreshing="isRefreshing"
      @generate-test-users="generateTestUsers"
      @refresh-balances="refreshBalances"
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
  generateRealWallet,
  fullTestCleanup,
  getTestRuns,
  getTestRun,
  getLatestTestRun,
  createTestRun,
  updateTestRunState,
  completeTestRun,
  deleteAllTestRuns,
  deleteAllContractRecords,
  getTestnetBalance,
  getTestnetStatus,
  syncWalletBalances,
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

// Test Config
import { getDefaultConfig, type PipelineConfig } from '@/config/testConfig'
import { NAME_TO_ID_MAP } from '@/utils/pipeline/types'
import type { ConsoleLine } from './components/ConsoleOutput.vue'
import type { LoanContract } from './components/Contracts_Loans.vue'
import type { CLOContract } from './components/Contracts_CLOs.vue'

// Pipeline Module
import {
  runPipeline,
  executePhase as pipelineExecutePhase,
  executeStep as pipelineExecuteStep,
  type PipelineOptions
} from '@/utils/pipeline'
import type { Phase, Identity } from '@/utils/pipeline/types'

const router = useRouter()

// State
const isRunning = ref(false)
const isCleaning = ref(false)
const currentPhase = ref(1)
const currentStepName = ref('Initializing...')
const networkMode = ref<'emulator' | 'preview'>('emulator')
const isGenerating = ref(false)
const isRefreshing = ref(false)

// Config state
const selectedConfigId = ref('default')
const savedConfigs = ref<{ id: string; name: string }[]>([])
const pipelineConfig = ref<PipelineConfig>(getDefaultConfig())

// Test run persistence
const currentTestRunId = ref<number | null>(null)
const availableTestRuns = ref<TestRun[]>([])

// Breakpoint control - set to phase ID to stop before that phase
// null = no breakpoint, 2 = stop before tokenization, 5 = stop before CLO, etc.
const breakpointPhase = ref<number | null>(5) // Default: stop before CLO

// Time tracking
const currentSlot = ref(0)
const elapsedTime = ref(0)
const startTime = ref<number | null>(null)
let timeInterval: number | null = null

function startTimeTracking() {
  startTime.value = Date.now()
  currentSlot.value = 0
  elapsedTime.value = 0

  if (timeInterval) clearInterval(timeInterval)
  timeInterval = window.setInterval(() => {
    if (startTime.value) {
      elapsedTime.value = Date.now() - startTime.value
      // Approximate slot calculation (1 slot ~= 1 second in Cardano)
      currentSlot.value = Math.floor(elapsedTime.value / 1000)
    }
  }, 100)
}

function stopTimeTracking() {
  if (timeInterval) {
    clearInterval(timeInterval)
    timeInterval = null
  }
}

// Manual time control for emulator mode
function handleStepTime(slots: number) {
  // Only allow manual time stepping when not running
  if (isRunning.value) return

  currentSlot.value += slots
  // Update elapsed time to match (1 slot ≈ 1 second)
  elapsedTime.value += slots * 1000

  log(`Advanced time by ${slots.toLocaleString()} slots (now at slot ${currentSlot.value.toLocaleString()})`, 'info')
}

function handleResetTime() {
  // Only allow reset when not running
  if (isRunning.value) return

  currentSlot.value = 0
  elapsedTime.value = 0
  startTime.value = null

  log('Reset simulated time to slot 0', 'info')
}

// Console output
const consoleLines = ref<ConsoleLine[]>([])
const consoleExpanded = ref(true)

// Identity State - starts empty, loaded from DB
const identities = ref<Identity[]>([])

// Test configuration from backend
const testConfig = ref<TestSetupConfig | null>(null)

// Convert DB wallet to Identity format
function walletToIdentity(wallet: WalletFromDB): Identity {
  // Use stored balance from database if available, otherwise 0
  const storedBalance = wallet.balance ? BigInt(wallet.balance) : 0n

  return {
    id: NAME_TO_ID_MAP[wallet.name] || `wallet-${wallet.name.toLowerCase().replace(/\s+/g, '-')}`,
    name: wallet.name,
    role: wallet.role,
    address: wallet.address,
    wallets: [{
      id: `w${wallet.id}`,
      name: 'Main',
      address: wallet.address,
      balance: storedBalance,
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

      // Restore phases state - match by phase ID, then step ID (not array index)
      if (run.state.phases && run.state.phases.length > 0) {
        for (const savedPhase of run.state.phases) {
          const matchingPhase = phases.value.find(p => p.id === savedPhase.id)
          if (matchingPhase) {
            matchingPhase.status = savedPhase.status || 'pending'
            matchingPhase.expanded = savedPhase.expanded ?? matchingPhase.expanded
            if (savedPhase.steps) {
              for (const savedStep of savedPhase.steps) {
                const matchingStep = matchingPhase.steps.find((s: any) => s.id === savedStep.id)
                if (matchingStep) {
                  matchingStep.status = savedStep.status || 'pending'
                }
              }
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

      // Restore phases state - match by phase ID, then step ID (not array index)
      if (latestRun.state.phases && latestRun.state.phases.length > 0) {
        for (const savedPhase of latestRun.state.phases) {
          const matchingPhase = phases.value.find(p => p.id === savedPhase.id)
          if (matchingPhase) {
            matchingPhase.status = savedPhase.status || 'pending'
            matchingPhase.expanded = savedPhase.expanded ?? matchingPhase.expanded
            if (savedPhase.steps) {
              for (const savedStep of savedPhase.steps) {
                const matchingStep = matchingPhase.steps.find((s: any) => s.id === savedStep.id)
                if (matchingStep) {
                  matchingStep.status = savedStep.status || 'pending'
                }
              }
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
  // Load saved configs from localStorage
  const storedConfigs = JSON.parse(localStorage.getItem('mintmatrix-test-configs') || '[]')
  savedConfigs.value = storedConfigs.map((cfg: any) => ({ id: cfg.id, name: cfg.name }))

  // Check for active config from config page (takes priority)
  const activeConfig = sessionStorage.getItem('mintmatrix-active-config')
  if (activeConfig) {
    try {
      pipelineConfig.value = JSON.parse(activeConfig)
      log('Loaded configuration from Config page', 'success')
      sessionStorage.removeItem('mintmatrix-active-config') // Clear after loading
    } catch (e) {
      console.warn('Failed to load active config:', e)
    }
  } else {
    // No active config from session, check for persisted selection in localStorage
    const savedConfigId = localStorage.getItem('mintmatrix-selected-config-id')
    if (savedConfigId && savedConfigId !== 'default') {
      selectedConfigId.value = savedConfigId
      const found = storedConfigs.find((cfg: any) => cfg.id === savedConfigId)
      if (found && found.config) {
        pipelineConfig.value = found.config
        log(`Loaded saved configuration: ${found.name}`, 'info')
      }
    }
  }

  // Always update phases from current config (ensures step count matches config)
  updatePhasesFromConfig(pipelineConfig.value)

  // Load test config from backend
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

// Load selected config from dropdown
function loadSelectedConfig() {
  if (selectedConfigId.value === 'default') {
    pipelineConfig.value = getDefaultConfig()
    updatePhasesFromConfig(pipelineConfig.value)
    log('Loaded default configuration', 'success')
    return
  }

  // Load from localStorage
  const storedConfigs = JSON.parse(localStorage.getItem('mintmatrix-test-configs') || '[]')
  const found = storedConfigs.find((cfg: any) => cfg.id === selectedConfigId.value)
  if (found && found.config) {
    pipelineConfig.value = found.config
    updatePhasesFromConfig(pipelineConfig.value)
    log(`Loaded configuration: ${found.name}`, 'success')
  }
}

// Handle config change from ConfigViewer dropdown
function handleConfigChange(configId: string) {
  selectedConfigId.value = configId
  loadSelectedConfig()
}

// Generate consistent wallet ID (matches walletToIdentity logic)
function getWalletId(name: string): string {
  return NAME_TO_ID_MAP[name] || `wallet-${name.toLowerCase().replace(/\s+/g, '-')}`
}

// Update phases/steps based on pipeline config
function updatePhasesFromConfig(config: PipelineConfig) {
  // Update Phase 1: Setup & Identities
  const phase1 = phases.value.find(p => p.id === 1)
  if (phase1) {
    const walletList = config.wallets.map(w => ({ role: w.role, name: w.name }))
    phase1.steps = [
      { id: 'S1', name: 'Create Wallets', status: 'pending', action: 'create-wallets', wallets: walletList },
      { id: 'S2', name: 'Fund All Wallets', status: 'pending', action: 'fund-wallets', wallets: walletList },
      {
        id: 'S3',
        name: 'Mint Credentials',
        status: 'disabled' as const,
        action: 'mint-credentials',
        disabled: true,
        disabledReason: 'Coming soon',
        wallets: walletList
      },
    ]
  }

  // Update Phase 2: Asset Tokenization
  const phase2 = phases.value.find(p => p.id === 2)
  if (phase2) {
    const originators = config.wallets.filter(w => w.role === 'Originator')
    phase2.steps = originators
      .filter(o => o.assets && o.assets.length > 0)
      .flatMap((o, idx) => o.assets!.map((asset, aidx) => ({
        id: `A${idx * 10 + aidx + 1}`,
        name: `Mint ${asset.name} tokens (${o.name})`,
        status: 'pending' as const,
        originatorId: getWalletId(o.name),
        asset: asset.name,
        qty: BigInt(asset.quantity)
      })))
  }

  // Update Phase 3: Initialize Loan Contracts
  const phase3 = phases.value.find(p => p.id === 3)
  if (phase3) {
    phase3.steps = config.loans.map((loan, idx) => {
      const isReserved = loan.reservedBuyer !== false
      const borrower = config.wallets.find(w => getWalletId(w.name) === loan.borrowerId)
      return {
        id: `L${idx + 1}`,
        name: isReserved
          ? `Create: ${borrower?.name || 'Unknown'} ← ${loan.asset} (Reserved)`
          : `Create: Open Market ${loan.asset} Loan`,
        status: 'pending' as const,
        action: 'create-loan',
        contractRef: `LOAN-${loan.asset}-${isReserved ? loan.borrowerId : 'Open'}`,
        borrowerId: isReserved ? loan.borrowerId : null,
        originatorId: loan.originatorId,
        asset: loan.asset,
        qty: loan.quantity,
        principal: loan.principal,
        reservedBuyer: isReserved
      }
    })
  }

  // Update Phase 4: Accept Loan Contracts
  const phase4 = phases.value.find(p => p.id === 4)
  if (phase4) {
    phase4.steps = config.loans.map((loan, idx) => {
      const isReserved = loan.reservedBuyer !== false
      const borrower = config.wallets.find(w => getWalletId(w.name) === loan.borrowerId)
      return {
        id: `AC${idx + 1}`,
        name: `Accept: ${borrower?.name || 'Available Buyer'} → ${loan.asset} Loan`,
        status: 'pending' as const,
        action: 'accept-loan',
        contractRef: `LOAN-${loan.asset}-${isReserved ? loan.borrowerId : 'Open'}`,
        signerId: loan.borrowerId || getWalletId(borrower?.name || `borrower-${idx}`),
        signerRole: 'Borrower' as const
      }
    })
  }

  // Update Phase 5: CLO Bundle & Distribution
  const phase5 = phases.value.find(p => p.id === 5)
  if (phase5 && config.clo) {
    phase5.steps = [
      { id: 'C1', name: 'Bundle Collateral Tokens', status: 'pending' as const, action: 'bundle-collateral', signerId: 'analyst', signerRole: 'Analyst' as const },
      { id: 'C2', name: `Deploy CLO: ${config.clo.name} (${config.clo.tranches.length} Tranches)`, status: 'pending' as const, action: 'deploy-clo', signerId: 'analyst', signerRole: 'Analyst' as const },
      { id: 'C3', name: 'Distribute Tranche Tokens', status: 'pending' as const, action: 'distribute-tranches', signerId: 'analyst', signerRole: 'Analyst' as const },
    ]
  }

  // Update Phase 6: Make Loan Payments
  const phase6 = phases.value.find(p => p.id === 6)
  if (phase6) {
    phase6.steps = config.loans.map((loan, idx) => {
      const borrower = config.wallets.find(w => getWalletId(w.name) === loan.borrowerId)
      const isReserved = loan.reservedBuyer !== false
      return {
        id: `P${idx + 1}`,
        name: `Pay: ${borrower?.name || 'Borrower'} → ${loan.asset} Loan`,
        status: 'pending' as const,
        action: 'make-payment',
        contractRef: `LOAN-${loan.asset}-${isReserved ? loan.borrowerId : 'Open'}`,
        signerId: loan.borrowerId || getWalletId(borrower?.name || `borrower-${idx}`),
        signerRole: 'Borrower' as const,
        amount: Math.round(loan.principal / 12) // Approximate monthly payment
      }
    })
  }

  log('Pipeline phases updated from configuration', 'info')
}

// Generate test wallets and save to DB
// Uses real Cardano addresses via Lucid (can receive funds on Preview testnet)
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

    // Create each wallet with real Cardano addresses
    const newIdentities: Identity[] = []
    for (const walletConfig of config.wallets) {
      log(`Creating wallet: ${walletConfig.name}...`, 'info')

      // Generate real Cardano wallet via backend (uses Lucid)
      const generated = await generateRealWallet()

      // Save to DB (use seed phrase as private key for recovery)
      const savedWallet = await createWallet({
        name: walletConfig.name,
        role: walletConfig.role,
        address: generated.address,
        paymentKeyHash: generated.paymentKeyHash,
        privateKey: generated.seedPhrase
      })

      // Convert to Identity format
      newIdentities.push(walletToIdentity(savedWallet))

      await new Promise(r => setTimeout(r, 50)) // Small delay for UI feedback
    }

    identities.value = newIdentities
    log(`Generated ${newIdentities.length} wallets with real Cardano addresses`, 'success')
    log('You can now fund these addresses on Preview testnet and refresh balances', 'info')
  } catch (err) {
    log('Error generating wallets: ' + (err as Error).message, 'error')
    console.error(err)
  } finally {
    isGenerating.value = false
  }
}

// Refresh wallet balances from blockchain (Preview testnet via Blockfrost)
// Also persists balances to database for next page load
async function refreshBalances() {
  if (identities.value.length === 0) {
    log('No wallets to refresh', 'warning')
    return
  }

  isRefreshing.value = true
  try {
    // Check if provider is configured
    const status = await getTestnetStatus()
    if (!status.configured) {
      log('No blockchain provider configured. Set BLOCKFROST_PREVIEW or MAESTRO_PREVIEW in backend .env file.', 'error')
      return
    }

    log('Fetching real blockchain balances...', 'info')

    // Debug: Show first address being queried
    const firstAddr = identities.value[0]?.address
    if (firstAddr) {
      log(`First address: ${firstAddr.slice(0, 40)}...`, 'info')
    }

    let updated = 0
    let totalAda = 0n

    // Create updated identities array to trigger Vue reactivity
    const updatedIdentities = [...identities.value]

    // Collect balance updates for DB sync
    const balanceUpdates: { address: string; balance: string }[] = []

    for (let i = 0; i < updatedIdentities.length; i++) {
      const identity = updatedIdentities[i]
      if (!identity.address) continue

      try {
        const result = await getTestnetBalance(identity.address)
        console.log(`Balance result for ${identity.name}:`, result)
        const balance = BigInt(result.balance)

        // Create new wallet object with updated balance (for Vue reactivity)
        if (identity.wallets[0]) {
          updatedIdentities[i] = {
            ...identity,
            wallets: [
              {
                ...identity.wallets[0],
                balance
              },
              ...identity.wallets.slice(1)
            ]
          }
        }

        // Add to balance updates for DB sync
        balanceUpdates.push({
          address: identity.address,
          balance: balance.toString()
        })

        totalAda += balance
        updated++

        if (balance > 0n) {
          log(`  ${identity.name}: ${(Number(balance) / 1_000_000).toFixed(2)} ADA`, 'success')
        } else {
          log(`  ${identity.name}: 0 ADA (not funded)`, 'info')
        }
      } catch (err) {
        // Address might not exist on chain yet (0 balance)
        if (identity.wallets[0]) {
          updatedIdentities[i] = {
            ...identity,
            wallets: [
              {
                ...identity.wallets[0],
                balance: 0n
              },
              ...identity.wallets.slice(1)
            ]
          }
        }
        // Still add to updates with 0 balance
        balanceUpdates.push({
          address: identity.address,
          balance: '0'
        })
        console.error(`Balance error for ${identity.name}:`, err)
        log(`  ${identity.name}: 0 ADA (${(err as Error).message})`, 'warning')
      }
    }

    // Reassign to trigger Vue reactivity
    identities.value = updatedIdentities

    // Persist balances to database
    if (balanceUpdates.length > 0) {
      try {
        const syncResult = await syncWalletBalances(balanceUpdates)
        log(`Saved ${syncResult.updated} wallet balances to database`, 'info')
      } catch (syncErr) {
        console.error('Failed to sync balances to DB:', syncErr)
        log('Warning: Could not save balances to database', 'warning')
      }
    }

    log(`Refreshed ${updated} wallet balances. Total: ${(Number(totalAda) / 1_000_000).toFixed(2)} ADA`, 'success')
  } catch (err) {
    log('Error refreshing balances: ' + (err as Error).message, 'error')
    console.error(err)
  } finally {
    isRefreshing.value = false
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
// Steps are populated by updatePhasesFromConfig based on loaded configuration
const phases = ref<Phase[]>([
  {
    id: 1,
    name: 'Setup & Identities',
    description: 'Create and fund wallets for all participants',
    status: 'pending',
    expanded: true,
    steps: [] // Populated from config
  },
  {
    id: 2,
    name: 'Asset Tokenization',
    description: 'Originators mint tokenized real-world assets',
    status: 'pending',
    expanded: true,
    steps: [] // Populated from config
  },
  {
    id: 3,
    name: 'Initialize Loan Contracts',
    description: 'Create loans using tokenized assets as collateral',
    status: 'pending',
    expanded: true,
    steps: [] // Populated from config
  },
  {
    id: 4,
    name: 'Accept Loan Contracts',
    description: 'Buyers accept loans and make first payment to activate',
    status: 'pending',
    expanded: true,
    steps: [] // Populated from config
  },
  {
    id: 5,
    name: 'CLO Bundle & Distribution',
    description: 'Bundle collateral into CLO with tranches',
    status: 'pending',
    expanded: false,
    steps: [] // Populated from config
  },
  {
    id: 6,
    name: 'Make Loan Payments',
    description: 'Borrowers make scheduled payments on their loans',
    status: 'pending',
    expanded: false,
    steps: [] // Populated from config
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

// Progress bar computed values (excludes disabled steps)
const enabledSteps = computed(() => lifecycleTests.value.filter(s => !s.disabled && s.status !== 'disabled'))
const totalSteps = computed(() => enabledSteps.value.length)
const completedSteps = computed(() => enabledSteps.value.filter(s => s.status === 'passed').length)

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

// Build pipeline options object for runner calls
function buildPipelineOptions(mode: 'emulator' | 'preview' = networkMode.value): PipelineOptions {
  return {
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
    testRunId: currentTestRunId,
    onPhaseComplete: saveTestState
  }
}

async function handleRunTests(mode: 'emulator' | 'preview' = networkMode.value) {
  // Start time tracking
  startTimeTracking()

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

  await runPipeline(buildPipelineOptions(mode))

  // Stop time tracking
  stopTimeTracking()

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

  await pipelineExecutePhase(phase, buildPipelineOptions())

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

  await pipelineExecuteStep(phase, step, buildPipelineOptions())

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
