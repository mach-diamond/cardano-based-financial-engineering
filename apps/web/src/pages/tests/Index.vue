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

    <!-- Stats Cards -->
    <StatsCards :stats="statsWithTotal" />

    <!-- Full Lifecycle Test (Main Feature) -->
    <LifecycleSection
      :phases="phases"
      :identities="identities"
      :manual-mode="manualMode"
      :is-running="isRunning"
      :completed-steps="completedSteps"
      :total-steps="totalSteps"
      :lifecycle-status="lifecycleStatus"
      @update:manual-mode="manualMode = $event"
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
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

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
const manualMode = ref(true)
const isGenerating = ref(false)

// Console output
const consoleLines = ref<ConsoleLine[]>([])

// Identity State - All Participants
const identities = ref<Identity[]>([
  // Originators
  { id: 'orig-jewelry', name: 'MachDiamond Jewelry', role: 'Originator', address: 'addr_test1qr_machdiamond', wallets: [{ id: 'w0', name: 'Main', address: 'addr_test1qr_machdiamond', balance: 0n, assets: [] }] },
  { id: 'orig-airplane', name: 'Airplane Manufacturing LLC', role: 'Originator', address: 'addr_test1qr_airplane', wallets: [{ id: 'w1', name: 'Main', address: 'addr_test1qr_airplane', balance: 0n, assets: [] }] },
  { id: 'orig-home', name: 'Bob Smith', role: 'Originator', address: 'addr_test1qr_bob', wallets: [{ id: 'w2', name: 'Main', address: 'addr_test1qr_bob', balance: 0n, assets: [] }] },
  { id: 'orig-realestate', name: 'Premier Asset Holdings', role: 'Originator', address: 'addr_test1qr_premier', wallets: [{ id: 'w3', name: 'Main', address: 'addr_test1qr_premier', balance: 0n, assets: [] }] },
  { id: 'orig-yacht', name: 'Yacht Makers Corp', role: 'Originator', address: 'addr_test1qr_yacht', wallets: [{ id: 'w4', name: 'Main', address: 'addr_test1qr_yacht', balance: 0n, assets: [] }] },
  // Borrowers
  { id: 'bor-cardanoair', name: 'Cardano Airlines LLC', role: 'Borrower', address: 'addr_test1qb_cardanoair', wallets: [{ id: 'w5', name: 'Main', address: 'addr_test1qb_cardanoair', balance: 0n, assets: [] }] },
  { id: 'bor-superfastcargo', name: 'Superfast Cargo Air', role: 'Borrower', address: 'addr_test1qb_superfastcargo', wallets: [{ id: 'w6', name: 'Main', address: 'addr_test1qb_superfastcargo', balance: 0n, assets: [] }] },
  { id: 'bor-alice', name: 'Alice Doe', role: 'Borrower', address: 'addr_test1qb_alice', wallets: [{ id: 'w7', name: 'Main', address: 'addr_test1qb_alice', balance: 0n, assets: [] }] },
  { id: 'bor-officeop', name: 'Office Operator LLC', role: 'Borrower', address: 'addr_test1qb_officeop', wallets: [{ id: 'w8', name: 'Main', address: 'addr_test1qb_officeop', balance: 0n, assets: [] }] },
  { id: 'bor-luxuryapt', name: 'Luxury Apartments LLC', role: 'Borrower', address: 'addr_test1qb_luxuryapt', wallets: [{ id: 'w9', name: 'Main', address: 'addr_test1qb_luxuryapt', balance: 0n, assets: [] }] },
  { id: 'bor-boatop', name: 'Boat Operator LLC', role: 'Borrower', address: 'addr_test1qb_boatop', wallets: [{ id: 'w10', name: 'Main', address: 'addr_test1qb_boatop', balance: 0n, assets: [] }] },
  // Analyst
  { id: 'analyst', name: 'Cardano Investment Bank', role: 'Analyst', address: 'addr_test1qa_cib', wallets: [{ id: 'w11', name: 'Main', address: 'addr_test1qa_cib', balance: 0n, assets: [] }] },
  // Investors
  { id: 'inv-1', name: 'Senior Tranche Investor', role: 'Investor', address: 'addr_test1qi_senior', wallets: [{ id: 'w12', name: 'Main', address: 'addr_test1qi_senior', balance: 0n, assets: [] }] },
  { id: 'inv-2', name: 'Mezzanine Tranche Investor', role: 'Investor', address: 'addr_test1qi_mezz', wallets: [{ id: 'w13', name: 'Main', address: 'addr_test1qi_mezz', balance: 0n, assets: [] }] },
  { id: 'inv-3', name: 'Junior Tranche Investor', role: 'Investor', address: 'addr_test1qi_junior', wallets: [{ id: 'w14', name: 'Main', address: 'addr_test1qi_junior', balance: 0n, assets: [] }] },
  { id: 'inv-4', name: 'Hedge Fund Alpha', role: 'Investor', address: 'addr_test1qi_hedgea', wallets: [{ id: 'w15', name: 'Main', address: 'addr_test1qi_hedgea', balance: 0n, assets: [] }] },
])

// Generate real wallet addresses
async function generateTestUsers() {
  isGenerating.value = true
  try {
    for (const identity of identities.value) {
      const randomBytes = Array.from({ length: 56 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
      const testnetPrefix = 'addr_test1qz'
      identity.address = testnetPrefix + randomBytes
      identity.wallets[0].address = identity.address
      await new Promise(r => setTimeout(r, 50))
    }
    log('Generated real wallet addresses for all identities', 'success')
  } catch (err) {
    log('Error generating wallets: ' + (err as Error).message, 'error')
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
    description: 'Fund wallets for all 16 participants',
    status: 'pending',
    expanded: true,
    steps: [
      { id: 'S1', name: 'Fund MachDiamond Jewelry', status: 'pending', targetId: 'orig-jewelry' },
      { id: 'S2', name: 'Fund Airplane Manufacturing LLC', status: 'pending', targetId: 'orig-airplane' },
      { id: 'S3', name: 'Fund Bob Smith', status: 'pending', targetId: 'orig-home' },
      { id: 'S4', name: 'Fund Premier Asset Holdings', status: 'pending', targetId: 'orig-realestate' },
      { id: 'S5', name: 'Fund Yacht Makers Corp', status: 'pending', targetId: 'orig-yacht' },
      { id: 'S6', name: 'Fund Cardano Airlines LLC', status: 'pending', targetId: 'bor-cardanoair' },
      { id: 'S7', name: 'Fund Superfast Cargo Air', status: 'pending', targetId: 'bor-superfastcargo' },
      { id: 'S8', name: 'Fund Alice Doe', status: 'pending', targetId: 'bor-alice' },
      { id: 'S9', name: 'Fund Office Operator LLC', status: 'pending', targetId: 'bor-officeop' },
      { id: 'S10', name: 'Fund Luxury Apartments LLC', status: 'pending', targetId: 'bor-luxuryapt' },
      { id: 'S11', name: 'Fund Boat Operator LLC', status: 'pending', targetId: 'bor-boatop' },
      { id: 'S12', name: 'Fund Cardano Investment Bank', status: 'pending', targetId: 'analyst' },
      { id: 'S13', name: 'Fund Senior Tranche Investor', status: 'pending', targetId: 'inv-1' },
      { id: 'S14', name: 'Fund Mezzanine Tranche Investor', status: 'pending', targetId: 'inv-2' },
      { id: 'S15', name: 'Fund Junior Tranche Investor', status: 'pending', targetId: 'inv-3' },
      { id: 'S16', name: 'Fund Hedge Fund Alpha', status: 'pending', targetId: 'inv-4' },
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

async function handleRunTests(mode: 'demo' | 'emulator' | 'preview') {
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
