<template>
  <div class="config-panel lifecycle-tab">
    <div class="panel-header">
      <h4>Pipeline Lifecycle</h4>
      <p class="text-muted mb-0">Configure the execution sequence and scheduled actions for each loan</p>
    </div>

    <!-- Pipeline Phases -->
    <div class="pipeline-phases">
      <!-- Phase 1: Setup & Identities -->
      <div class="phase-block collapsible-phase" :class="{ 'collapsed': localCollapsed.phase1 }">
        <div class="phase-header-collapsible" @click="localCollapsed.phase1 = !localCollapsed.phase1">
          <i class="fas phase-chevron" :class="localCollapsed.phase1 ? 'fa-chevron-right' : 'fa-chevron-down'"></i>
          <div class="phase-number">1</div>
          <div class="phase-title">Setup & Identities</div>
          <span class="badge badge-secondary ml-auto">{{ wallets.length }} wallets</span>
        </div>
        <div v-show="!localCollapsed.phase1" class="phase-steps">
          <div class="phase-step-item">
            <span class="action-type-badge action-create">Create</span>
            <span class="step-wallet role-system">System</span>
            <span class="step-arrow">-></span>
            <span class="step-params">{{ wallets.length }} wallets ({{ walletRoleSummary }})</span>
            <span class="step-arrow">-></span>
            <span class="step-contract">Wallets</span>
          </div>
          <div class="phase-step-item">
            <span class="action-type-badge action-fund">Fund</span>
            <span class="step-wallet role-system">Faucet</span>
            <span class="step-arrow">-></span>
            <span class="step-params">{{ totalInitialAda.toLocaleString() }} ADA</span>
            <span class="step-arrow">-></span>
            <span class="step-contract">{{ wallets.length }} Wallets</span>
          </div>
          <div class="phase-step-item step-disabled">
            <span class="action-type-badge action-mint action-disabled">Mint</span>
            <span class="step-wallet text-muted">-</span>
            <span class="step-arrow">-></span>
            <span class="step-params text-muted">Credentials <span class="step-disabled-reason">(Coming soon)</span></span>
            <span class="step-arrow">-></span>
            <span class="step-contract text-muted">-</span>
          </div>
        </div>
      </div>

      <!-- Phase 2: Asset Tokenization -->
      <div class="phase-block collapsible-phase" :class="{ 'collapsed': localCollapsed.phase2 }">
        <div class="phase-header-collapsible" @click="localCollapsed.phase2 = !localCollapsed.phase2">
          <i class="fas phase-chevron" :class="localCollapsed.phase2 ? 'fa-chevron-right' : 'fa-chevron-down'"></i>
          <div class="phase-number">2</div>
          <div class="phase-title">Asset Tokenization</div>
          <span class="badge badge-secondary ml-auto">{{ totalAssets }} assets</span>
        </div>
        <div v-show="!localCollapsed.phase2" class="phase-steps">
          <div v-for="(wallet, wi) in originatorWallets" :key="'mint-' + wi" class="phase-step-item">
            <span class="action-type-badge action-mint">Mint</span>
            <span class="step-wallet role-originator">{{ wallet.name }}</span>
            <span class="step-arrow">-></span>
            <span class="step-params">
              <span v-for="(asset, ai) in wallet.assets" :key="ai">
                {{ asset.quantity }}x {{ asset.name }}<span v-if="ai < (wallet.assets?.length || 0) - 1">, </span>
              </span>
            </span>
            <span class="step-arrow">-></span>
            <span class="step-contract">Minting Policy</span>
          </div>
        </div>
      </div>

      <!-- Phase 3: Initialize Loans -->
      <div class="phase-block collapsible-phase" :class="{ 'collapsed': localCollapsed.phase3 }">
        <div class="phase-header-collapsible" @click="localCollapsed.phase3 = !localCollapsed.phase3">
          <i class="fas phase-chevron" :class="localCollapsed.phase3 ? 'fa-chevron-right' : 'fa-chevron-down'"></i>
          <div class="phase-number">3</div>
          <div class="phase-title">Initialize Loan Contracts</div>
          <span class="badge badge-secondary ml-auto">{{ loans.length }} loans</span>
        </div>
        <div v-show="!localCollapsed.phase3" class="phase-steps">
          <div v-for="(loan, li) in loans" :key="'init-' + li" class="phase-step-item">
            <span class="action-type-badge action-init">Initialize</span>
            <span class="step-wallet role-originator">{{ getOriginatorName(loan.originatorId) }}</span>
            <span class="step-arrow">-></span>
            <span class="step-params">
              {{ loan.asset }} ({{ loan.principal.toLocaleString() }} ADA)
              <span class="lifecycle-badge ml-1" :class="'lc-' + (loan.lifecycleCase || 'T4')">{{ loan.lifecycleCase || 'T4' }}</span>
            </span>
            <span class="step-arrow">-></span>
            <span class="step-contract">Loan #{{ li + 1 }}</span>
          </div>
        </div>
      </div>

      <!-- Phase 4: Run Contracts -->
      <div class="phase-block collapsible-phase" :class="{ 'collapsed': localCollapsed.phase4 }">
        <div class="phase-header-collapsible" @click="localCollapsed.phase4 = !localCollapsed.phase4">
          <i class="fas phase-chevron" :class="localCollapsed.phase4 ? 'fa-chevron-right' : 'fa-chevron-down'"></i>
          <div class="phase-number">4</div>
          <div class="phase-title">Run Contracts</div>
          <span class="badge badge-secondary ml-auto">{{ postInitActionCount }} actions</span>
        </div>
        <div v-show="!localCollapsed.phase4" class="phase-steps phase-steps-timed">
          <template v-for="group in groupedPostInitActions" :key="group.timing">
            <!-- Single action - no grouping needed -->
            <template v-if="group.actions.length === 1">
              <div class="phase-step-item"
                   :class="{
                     'action-late': group.actions[0].action.isLate,
                     'action-rejection': group.actions[0].action.expectedResult === 'rejection'
                   }">
                <span class="action-type-badge" :class="'action-' + group.actions[0].action.actionType">{{ group.actions[0].action.label }}</span>
                <span class="step-wallet" :class="'role-' + group.actions[0].executorRole.toLowerCase()">{{ group.actions[0].executorWallet }}</span>
                <span class="step-arrow">-></span>
                <span class="step-params">
                  <span v-if="group.actions[0].action.amount" class="param-amount">{{ group.actions[0].action.amount.toFixed(2) }} ADA</span>
                  <span v-if="group.actions[0].action.actionType === 'complete'" class="param-token"><i class="fas fa-gem"></i> {{ group.actions[0].loan.asset }}</span>
                  <span v-if="group.actions[0].action.isLate" class="param-late"><i class="fas fa-clock"></i> Late</span>
                  <span v-if="group.actions[0].action.expectedResult === 'rejection'" class="param-rejection"><i class="fas fa-times-circle"></i> Reject</span>
                  <span v-if="!group.actions[0].action.amount && group.actions[0].action.actionType !== 'complete' && !group.actions[0].action.isLate && group.actions[0].action.expectedResult !== 'rejection'" class="param-empty">-</span>
                </span>
                <span class="step-arrow">-></span>
                <span class="step-contract">{{ group.actions[0].contractRef }} ({{ group.actions[0].loan.asset }})</span>
                <span class="step-timing">{{ group.actions[0].action.timing }}</span>
              </div>
            </template>
            <!-- Multiple actions - collapsible group -->
            <template v-else>
              <div class="action-group" :class="{ 'group-collapsed': collapsedGroups[`group-${group.timing}`] !== false }">
                <div class="action-group-header" @click="toggleGroup(group.timing)">
                  <i class="fas group-chevron" :class="collapsedGroups[`group-${group.timing}`] !== false ? 'fa-chevron-right' : 'fa-chevron-down'"></i>
                  <span class="group-summary">{{ group.summary }}</span>
                  <span class="group-count badge badge-pill badge-secondary">{{ group.actions.length }}</span>
                  <span class="step-timing">{{ group.timing }}</span>
                </div>
                <div v-show="collapsedGroups[`group-${group.timing}`] === false" class="action-group-items">
                  <div v-for="item in group.actions" :key="item.action.id" class="phase-step-item"
                       :class="{
                         'action-late': item.action.isLate,
                         'action-rejection': item.action.expectedResult === 'rejection'
                       }">
                    <span class="action-type-badge" :class="'action-' + item.action.actionType">{{ item.action.label }}</span>
                    <span class="step-wallet" :class="'role-' + item.executorRole.toLowerCase()">{{ item.executorWallet }}</span>
                    <span class="step-arrow">-></span>
                    <span class="step-params">
                      <span v-if="item.action.amount" class="param-amount">{{ item.action.amount.toFixed(2) }} ADA</span>
                      <span v-if="item.action.actionType === 'complete'" class="param-token"><i class="fas fa-gem"></i> {{ item.loan.asset }}</span>
                      <span v-if="item.action.isLate" class="param-late"><i class="fas fa-clock"></i> Late</span>
                      <span v-if="item.action.expectedResult === 'rejection'" class="param-rejection"><i class="fas fa-times-circle"></i> Reject</span>
                      <span v-if="!item.action.amount && item.action.actionType !== 'complete' && !item.action.isLate && item.action.expectedResult !== 'rejection'" class="param-empty">-</span>
                    </span>
                    <span class="step-arrow">-></span>
                    <span class="step-contract">{{ item.contractRef }} ({{ item.loan.asset }})</span>
                  </div>
                </div>
              </div>
            </template>
          </template>
        </div>
      </div>
    </div>

    <!-- Loan Action Schedules -->
    <div class="loan-action-schedules mt-4">
      <h5 class="schedules-header mb-3">
        <i class="fas fa-calendar-alt mr-2"></i>Loan Action Schedules
        <small class="text-muted ml-2">(T+0 = Acceptance)</small>
      </h5>
      <div class="loan-schedules-grid">
        <LoanScheduleCard
          v-for="schedule in loanActionSchedules"
          :key="schedule.loan._uid || `loan-${schedule.loanIndex}`"
          :loan="schedule.loan"
          :loan-index="schedule.loanIndex"
          :actions="schedule.actions"
          :borrower-options="borrowerOptions"
          :is-collapsed="!!localCollapsedLoans[schedule.loan._uid || `loan-${schedule.loanIndex}`]"
          @toggle-collapse="toggleLoanSchedule(schedule.loan._uid || `loan-${schedule.loanIndex}`)"
          @update:lifecycle="updateLoanLifecycleCase(schedule.loanIndex, $event)"
          @update:buyer="updateLoanBuyer(schedule.loanIndex, $event)"
          @update:amount="updateActionAmount(schedule.loanIndex, $event)"
        />
      </div>
    </div>

    <!-- CLO Operations -->
    <div class="collapsible-section mt-4" :class="{ 'collapsed': localCollapsed.cloOperations }">
      <div class="collapsible-header" @click="localCollapsed.cloOperations = !localCollapsed.cloOperations">
        <i class="fas" :class="localCollapsed.cloOperations ? 'fa-chevron-right' : 'fa-chevron-down'"></i>
        <h5 class="mb-0"><i class="fas fa-layer-group mr-2"></i>CLO Operations</h5>
        <span class="badge badge-secondary ml-auto">{{ cloConfig?.tranches.length || 0 }} tranches</span>
      </div>
      <div v-show="!localCollapsed.cloOperations" class="collapsible-content">
        <div class="phase-block">
          <div class="phase-steps">
            <div class="phase-step-item">
              <span class="action-type-badge action-clo">Init</span>
              <span class="step-params">{{ cloConfig?.name }} ({{ cloConfig?.tranches.length }} Tranches)</span>
            </div>
            <div class="phase-step-item">
              <span class="action-type-badge action-clo">Bundle</span>
              <span class="step-params">Collateral Tokens from {{ eligibleLoansCount }} active loans</span>
            </div>
            <div class="phase-step-item">
              <span class="action-type-badge action-clo">Mint</span>
              <span class="step-params">Tranche Tokens (Senior, Mezzanine, Junior)</span>
            </div>
            <div class="phase-step-item">
              <span class="action-type-badge action-clo">Distribute</span>
              <span class="step-params">Waterfall payments to tranche holders</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Contract Reference -->
    <ContractReference
      :is-collapsed="localCollapsed.contractReference"
      @toggle="localCollapsed.contractReference = !localCollapsed.contractReference"
      class="mt-4"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { WalletConfig, LoanConfig, CLOConfig } from '@/utils/pipeline/types'
import { NAME_TO_ID_MAP } from '@/utils/pipeline/types'
import LoanScheduleCard from './LoanScheduleCard.vue'
import ContractReference from './ContractReference.vue'

interface LoanAction {
  id: string
  loanIndex: number
  actionType: 'init' | 'update' | 'cancel' | 'accept' | 'pay' | 'complete' | 'collect' | 'default'
  label: string
  timing: string
  timingPeriod: number
  amount?: number
  loanBalance?: number      // Remaining principal to be paid
  contractBalance?: number  // Amount accumulated on contract
  interestPaid?: number     // Cumulative interest paid
  expectedResult: 'success' | 'failure' | 'rejection'
  isLate?: boolean
  description?: string
  buyerId?: string | null
  buyerName?: string
}

interface SortedAction {
  action: LoanAction
  loan: any
  loanIndex: number
  executorWallet: string
  executorRole: string
  contractRef: string
  hasBuyer: boolean
}

interface ActionGroup {
  timing: string
  timingPeriod: number
  actions: SortedAction[]
  summary: string
  isCollapsed: boolean
}

interface CollapsedSections {
  phase1: boolean
  phase2: boolean
  phase3: boolean
  phase4: boolean
  cloOperations: boolean
  contractReference: boolean
}

interface Props {
  wallets: WalletConfig[]
  loans: LoanConfig[]
  cloConfig: CLOConfig | undefined
  collapsedSections: CollapsedSections
  collapsedLoanSchedules: Record<string, boolean>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:collapsed-sections': [value: CollapsedSections]
  'update:collapsed-loan-schedules': [value: Record<string, boolean>]
  'update:loan-lifecycle': [loanIndex: number, value: string]
  'update:loan-buyer': [loanIndex: number, value: string | null]
  'update:action-amount': [loanIndex: number, actionId: string, value: number]
}>()

// Local state synced with props
const localCollapsed = ref({ ...props.collapsedSections })
const localCollapsedLoans = ref({ ...props.collapsedLoanSchedules })
const collapsedGroups = ref<Record<string, boolean>>({})

watch(() => props.collapsedSections, (val) => {
  localCollapsed.value = { ...val }
}, { deep: true })

watch(() => props.collapsedLoanSchedules, (val) => {
  localCollapsedLoans.value = { ...val }
}, { deep: true })

watch(localCollapsed, (val) => {
  emit('update:collapsed-sections', { ...val })
}, { deep: true })

watch(localCollapsedLoans, (val) => {
  emit('update:collapsed-loan-schedules', { ...val })
}, { deep: true })

const frequencyOptions = [
  { value: 12, label: 'mo', fullLabel: 'Monthly' },
  { value: 4, label: 'qtr', fullLabel: 'Quarterly' },
  { value: 2, label: 'semi', fullLabel: 'Bi-Annual' },
  { value: 52, label: 'wk', fullLabel: 'Weekly' },
  { value: 365, label: 'd', fullLabel: 'Daily' },
  { value: 8760, label: 'hr', fullLabel: 'Hourly' },
  { value: 17531, label: '30m', fullLabel: '30-min' },
  { value: 35063, label: '15m', fullLabel: '15-min' },
  { value: 52594, label: '10m', fullLabel: '10-min' },
  { value: 105189, label: '5m', fullLabel: '5-min' },
]

const walletCounts = computed(() => ({
  originators: props.wallets.filter(w => w.role === 'Originator').length,
  borrowers: props.wallets.filter(w => w.role === 'Borrower').length,
  agents: props.wallets.filter(w => w.role === 'Agent').length,
  analysts: props.wallets.filter(w => w.role === 'Analyst').length,
  investors: props.wallets.filter(w => w.role === 'Investor').length,
}))

const walletRoleSummary = computed(() => {
  const counts = walletCounts.value
  const parts = []
  if (counts.originators > 0) parts.push(`${counts.originators} Originator${counts.originators > 1 ? 's' : ''}`)
  if (counts.borrowers > 0) parts.push(`${counts.borrowers} Borrower${counts.borrowers > 1 ? 's' : ''}`)
  if (counts.agents > 0) parts.push(`${counts.agents} Agent${counts.agents > 1 ? 's' : ''}`)
  if (counts.analysts > 0) parts.push(`${counts.analysts} Analyst${counts.analysts > 1 ? 's' : ''}`)
  if (counts.investors > 0) parts.push(`${counts.investors} Investor${counts.investors > 1 ? 's' : ''}`)
  return parts.join(', ')
})

const totalInitialAda = computed(() => {
  return props.wallets.reduce((sum, w) => sum + (w.initialFunding || 0), 0)
})

const originatorWallets = computed(() => {
  return props.wallets.filter(w => w.role === 'Originator' && w.assets && w.assets.length > 0)
})

const totalAssets = computed(() => {
  return originatorWallets.value.reduce((sum, w) => sum + (w.assets?.length || 0), 0)
})

const eligibleLoansCount = computed(() => {
  return props.loans.filter(l => !['T1', 'T6'].includes(l.lifecycleCase || 'T4')).length
})

const borrowerOptions = computed(() => {
  return props.wallets
    .filter(w => w.role === 'Borrower')
    .map(w => ({
      id: NAME_TO_ID_MAP[w.name] || `bor-${w.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: w.name,
      initialFunding: w.initialFunding || 0
    }))
})

function getOriginatorName(originatorId: string | null): string {
  if (!originatorId) return 'Unknown'
  const entry = Object.entries(NAME_TO_ID_MAP).find(([_, id]) => id === originatorId)
  return entry ? entry[0] : originatorId.replace('orig-', '').replace(/-/g, ' ')
}

function getBuyerName(borrowerId: string | null): string {
  if (!borrowerId) return 'Open Market'
  const entry = Object.entries(NAME_TO_ID_MAP).find(([_, id]) => id === borrowerId)
  return entry ? entry[0] : borrowerId
}

function getFrequencyLabel(frequency?: number): string {
  const freq = frequencyOptions.find(f => f.value === (frequency || 12))
  if (freq) return freq.label
  return 'p'
}

function calculateTermPayment(loan: { principal: number; apr: number; termMonths: number; frequency?: number }): number {
  const principal = loan.principal
  const apr = loan.apr / 100
  const installments = loan.termMonths
  const periodsPerYear = loan.frequency || 12

  if (installments <= 0) return 0
  if (apr === 0) return principal / installments

  const periodRate = apr / periodsPerYear
  return (periodRate * principal) / (1 - Math.pow(1 + periodRate, -installments))
}

function hasValidBuyer(loan: any): boolean {
  return !!loan.borrowerId
}

function generateLoanActions(loan: any, loanIndex: number): LoanAction[] {
  const actions: LoanAction[] = []
  const lifecycleCase = loan.lifecycleCase || 'T4'
  const termPayment = calculateTermPayment(loan)
  const totalPayments = loan.termMonths
  const freqLabel = getFrequencyLabel(loan.frequency)
  const buyerId = loan.borrowerId || null
  const buyerName = getBuyerName(buyerId)
  const principal = loan.principal
  const apr = loan.apr / 100
  const periodsPerYear = loan.frequency || 12
  const periodRate = apr / periodsPerYear

  let loanBalance = principal        // Remaining principal
  let contractBalance = 0            // Cumulative payments on contract
  let interestPaid = 0               // Cumulative interest

  actions.push({
    id: `${loanIndex}-init`,
    loanIndex,
    actionType: 'init',
    label: 'Initialize',
    timing: 'T-0',
    timingPeriod: -1,
    loanBalance,
    contractBalance,
    interestPaid,
    expectedResult: 'success',
    description: `Create loan contract with ${loan.asset} as collateral`
  })

  switch (lifecycleCase) {
    case 'T1':
      actions.push({
        id: `${loanIndex}-update`,
        loanIndex,
        actionType: 'update',
        label: 'Update Terms',
        timing: 'T-0',
        timingPeriod: -1,
        expectedResult: 'success',
        description: 'Seller updates contract terms'
      })
      actions.push({
        id: `${loanIndex}-cancel`,
        loanIndex,
        actionType: 'cancel',
        label: 'Cancel',
        timing: 'T-0',
        timingPeriod: -1,
        expectedResult: 'success',
        description: 'Seller cancels contract, reclaims collateral'
      })
      break

    case 'T2': {
      const interest1 = loanBalance * periodRate
      const principalPaid1 = termPayment - interest1
      loanBalance -= principalPaid1
      contractBalance += termPayment
      interestPaid += interest1
      actions.push({
        id: `${loanIndex}-accept`,
        loanIndex,
        actionType: 'accept',
        label: 'Accept',
        timing: 'T+0',
        timingPeriod: 0,
        amount: termPayment,
        loanBalance,
        contractBalance,
        interestPaid,
        expectedResult: 'success',
        buyerId,
        buyerName,
        description: `Buyer accepts and pays first installment`
      })
      actions.push({
        id: `${loanIndex}-default`,
        loanIndex,
        actionType: 'default',
        label: 'Claim Default',
        timing: `T+2${freqLabel}`,
        timingPeriod: 2,
        loanBalance,
        contractBalance,
        interestPaid,
        expectedResult: 'success',
        description: 'Seller claims default after missed payments'
      })
      break
    }

    case 'T3':
    case 'T4':
    case 'T7': {
      // First payment (Accept)
      const interest1 = lifecycleCase === 'T3' ? 0 : loanBalance * periodRate
      const principalPaid1 = termPayment - interest1
      loanBalance -= principalPaid1
      contractBalance += termPayment
      interestPaid += interest1
      actions.push({
        id: `${loanIndex}-accept`,
        loanIndex,
        actionType: 'accept',
        label: 'Accept',
        timing: 'T+0',
        timingPeriod: 0,
        amount: termPayment,
        loanBalance,
        contractBalance,
        interestPaid,
        expectedResult: 'success',
        buyerId,
        buyerName,
        description: `Buyer accepts and pays 1st of ${totalPayments} installments`
      })
      // Remaining payments
      for (let i = 2; i <= totalPayments; i++) {
        const interest = lifecycleCase === 'T3' ? 0 : loanBalance * periodRate
        const principalPaid = termPayment - interest
        loanBalance = Math.max(0, loanBalance - principalPaid)
        contractBalance += termPayment
        interestPaid += interest
        actions.push({
          id: `${loanIndex}-pay-${i}`,
          loanIndex,
          actionType: 'pay',
          label: `Pay #${i}`,
          timing: `T+${i-1}${freqLabel}`,
          timingPeriod: i - 1,
          amount: termPayment,
          loanBalance,
          contractBalance,
          interestPaid,
          expectedResult: 'success',
          description: `Installment ${i} of ${totalPayments}`
        })
      }
      actions.push({
        id: `${loanIndex}-complete`,
        loanIndex,
        actionType: 'complete',
        label: 'Complete',
        timing: `T+${totalPayments}${freqLabel}`,
        timingPeriod: totalPayments,
        loanBalance: 0,
        contractBalance,
        interestPaid,
        expectedResult: 'success',
        description: 'Transfer asset ownership to buyer'
      })
      actions.push({
        id: `${loanIndex}-collect`,
        loanIndex,
        actionType: 'collect',
        label: 'Collect',
        timing: `T+${totalPayments}${freqLabel}`,
        timingPeriod: totalPayments,
        loanBalance: 0,
        contractBalance: 0,
        interestPaid,
        expectedResult: 'success',
        description: 'Seller collects accumulated payments'
      })
      break
    }

    case 'T5': {
      // First payment (Accept)
      const interest1 = loanBalance * periodRate
      const principalPaid1 = termPayment - interest1
      loanBalance -= principalPaid1
      contractBalance += termPayment
      interestPaid += interest1
      actions.push({
        id: `${loanIndex}-accept`,
        loanIndex,
        actionType: 'accept',
        label: 'Accept',
        timing: 'T+0',
        timingPeriod: 0,
        amount: termPayment,
        loanBalance,
        contractBalance,
        interestPaid,
        expectedResult: 'success',
        buyerId,
        buyerName,
        description: `Buyer accepts and pays 1st installment`
      })
      // Late payment (includes late fee)
      const lateFee = loan.lateFee || 10
      const interest2 = loanBalance * periodRate
      const principalPaid2 = termPayment - interest2
      loanBalance = Math.max(0, loanBalance - principalPaid2)
      contractBalance += termPayment + lateFee
      interestPaid += interest2
      actions.push({
        id: `${loanIndex}-pay-2-late`,
        loanIndex,
        actionType: 'pay',
        label: 'Pay #2 (Late)',
        timing: `T+1${freqLabel}+`,
        timingPeriod: 1.5,
        amount: termPayment + lateFee,
        loanBalance,
        contractBalance,
        interestPaid,
        expectedResult: 'success',
        isLate: true,
        description: `Late payment with ${lateFee} ADA fee`
      })
      // Remaining payments
      for (let i = 3; i <= totalPayments; i++) {
        const interest = loanBalance * periodRate
        const principalPaid = termPayment - interest
        loanBalance = Math.max(0, loanBalance - principalPaid)
        contractBalance += termPayment
        interestPaid += interest
        actions.push({
          id: `${loanIndex}-pay-${i}`,
          loanIndex,
          actionType: 'pay',
          label: `Pay #${i}`,
          timing: `T+${i-1}${freqLabel}`,
          timingPeriod: i - 1,
          amount: termPayment,
          loanBalance,
          contractBalance,
          interestPaid,
          expectedResult: 'success'
        })
      }
      actions.push({
        id: `${loanIndex}-complete`,
        loanIndex,
        actionType: 'complete',
        label: 'Complete',
        timing: `T+${totalPayments}${freqLabel}`,
        timingPeriod: totalPayments,
        loanBalance: 0,
        contractBalance,
        interestPaid,
        expectedResult: 'success',
        description: 'Transfer asset ownership to buyer'
      })
      actions.push({
        id: `${loanIndex}-collect`,
        loanIndex,
        actionType: 'collect',
        label: 'Collect',
        timing: `T+${totalPayments}${freqLabel}`,
        timingPeriod: totalPayments,
        loanBalance: 0,
        contractBalance: 0,
        interestPaid,
        expectedResult: 'success',
        description: 'Seller collects accumulated payments'
      })
      break
    }

    case 'T6':
      actions.push({
        id: `${loanIndex}-accept-reject`,
        loanIndex,
        actionType: 'accept',
        label: 'Accept (Wrong Buyer)',
        timing: 'T+0',
        timingPeriod: 0,
        amount: termPayment,
        expectedResult: 'rejection',
        buyerId: 'wrong-buyer',
        buyerName: 'Wrong Buyer',
        description: 'Non-reserved buyer attempts acceptance (expected rejection)'
      })
      break
  }

  return actions
}

const loanActionSchedules = computed(() => {
  return props.loans.map((loan, index) => ({
    loanIndex: index,
    loan,
    actions: generateLoanActions(loan, index)
  }))
})

const postInitActionCount = computed(() => {
  return sortedPostInitActions.value.length
})

const sortedPostInitActions = computed((): SortedAction[] => {
  const allActions: SortedAction[] = []

  for (const schedule of loanActionSchedules.value) {
    const loanHasBuyer = hasValidBuyer(schedule.loan)
    const isT1Lifecycle = ['T1'].includes(schedule.loan.lifecycleCase || 'T4')

    for (const action of schedule.actions) {
      if (action.actionType === 'init') continue

      if (!loanHasBuyer && !isT1Lifecycle && action.actionType !== 'accept') {
        continue
      }

      let executorWallet = ''
      let executorRole = ''

      if (['accept', 'pay', 'complete'].includes(action.actionType)) {
        executorWallet = action.buyerName || getBuyerName(schedule.loan.borrowerId) || 'Open Market'
        executorRole = 'Borrower'
      } else if (['collect', 'default', 'update', 'cancel'].includes(action.actionType)) {
        const originator = props.wallets.find(w =>
          NAME_TO_ID_MAP[w.name] === schedule.loan.originatorId ||
          w.name.toLowerCase().includes(schedule.loan.originatorId?.replace('orig-', '').replace(/-/g, ' '))
        )
        executorWallet = originator?.name || schedule.loan.originatorId || 'Unknown'
        executorRole = 'Originator'
      }

      allActions.push({
        action,
        loan: schedule.loan,
        loanIndex: schedule.loanIndex,
        executorWallet,
        executorRole,
        contractRef: `Loan #${schedule.loanIndex + 1}`,
        hasBuyer: loanHasBuyer
      })
    }
  }

  return allActions.sort((a, b) => {
    if (a.action.timingPeriod !== b.action.timingPeriod) {
      return a.action.timingPeriod - b.action.timingPeriod
    }
    return a.loanIndex - b.loanIndex
  })
})

const groupedPostInitActions = computed((): ActionGroup[] => {
  const groups: ActionGroup[] = []
  let currentGroup: ActionGroup | null = null

  for (const item of sortedPostInitActions.value) {
    if (!currentGroup || currentGroup.timingPeriod !== item.action.timingPeriod) {
      if (currentGroup) {
        groups.push(currentGroup)
      }
      const groupKey = `group-${item.action.timing}`
      currentGroup = {
        timing: item.action.timing,
        timingPeriod: item.action.timingPeriod,
        actions: [item],
        summary: '',
        isCollapsed: collapsedGroups.value[groupKey] ?? true
      }
    } else {
      currentGroup.actions.push(item)
    }
  }

  if (currentGroup) {
    groups.push(currentGroup)
  }

  // Generate summaries for groups
  for (const group of groups) {
    if (group.actions.length === 1) {
      group.summary = ''
    } else {
      const typeCounts: Record<string, number> = {}
      for (const item of group.actions) {
        const type = item.action.actionType
        typeCounts[type] = (typeCounts[type] || 0) + 1
      }
      const parts = Object.entries(typeCounts)
        .map(([type, count]) => {
          const label = type.charAt(0).toUpperCase() + type.slice(1)
          return count > 1 ? `${label} x${count}` : label
        })
      group.summary = parts.join(', ')
    }
  }

  return groups
})

function toggleGroup(timing: string) {
  const key = `group-${timing}`
  collapsedGroups.value[key] = !collapsedGroups.value[key]
}

function toggleLoanSchedule(uid: string) {
  localCollapsedLoans.value[uid] = !localCollapsedLoans.value[uid]
}

function updateLoanLifecycleCase(loanIndex: number, value: string) {
  emit('update:loan-lifecycle', loanIndex, value)
}

function updateLoanBuyer(loanIndex: number, value: string | null) {
  emit('update:loan-buyer', loanIndex, value)
}

function updateActionAmount(loanIndex: number, actionId: string, value: number) {
  emit('update:action-amount', loanIndex, actionId, value)
}
</script>

<style scoped>
.config-panel {
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  padding: 1.5rem;
}

.panel-header h4 {
  color: #f1f5f9;
  margin-bottom: 0.25rem;
}

.pipeline-phases {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.collapsible-phase {
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.5rem;
  overflow: hidden;
}

.collapsible-phase.collapsed {
  border-color: rgba(255, 255, 255, 0.05);
}

.phase-header-collapsible {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s ease;
}

.phase-header-collapsible:hover {
  background: rgba(255, 255, 255, 0.03);
}

.phase-chevron {
  color: #64748b;
  font-size: 0.7rem;
  width: 12px;
}

.phase-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.8rem;
  flex-shrink: 0;
}

.phase-title {
  font-weight: 600;
  color: #e2e8f0;
  font-size: 0.9rem;
}

.collapsible-phase .phase-steps {
  padding: 0 0.5rem 0.75rem 0.5rem;
}

.phase-steps .phase-step-item {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.4rem 0.75rem;
  border-radius: 0.25rem;
  margin: 0.15rem 0;
  transition: background 0.15s ease;
}

.phase-steps .phase-step-item:hover {
  background: rgba(255, 255, 255, 0.03);
}

.action-type-badge {
  display: inline-block;
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  min-width: 70px;
  text-align: center;
}

.action-type-badge.action-create { background: rgba(100, 116, 139, 0.2); color: #94a3b8; }
.action-type-badge.action-fund { background: rgba(34, 197, 94, 0.2); color: #86efac; }
.action-type-badge.action-mint { background: rgba(16, 185, 129, 0.2); color: #34d399; }
.action-type-badge.action-init { background: rgba(139, 92, 246, 0.2); color: #c4b5fd; }
.action-type-badge.action-update { background: rgba(14, 165, 233, 0.2); color: #7dd3fc; }
.action-type-badge.action-cancel { background: rgba(107, 114, 128, 0.3); color: #d1d5db; }
.action-type-badge.action-accept { background: rgba(34, 197, 94, 0.2); color: #86efac; }
.action-type-badge.action-pay { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }
.action-type-badge.action-complete { background: rgba(16, 185, 129, 0.2); color: #6ee7b7; }
.action-type-badge.action-collect { background: rgba(245, 158, 11, 0.2); color: #fcd34d; }
.action-type-badge.action-default { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }
.action-type-badge.action-clo { background: rgba(20, 184, 166, 0.2); color: #5eead4; }
.action-type-badge.action-disabled { opacity: 0.5; background: rgba(108, 117, 125, 0.15) !important; color: #6c757d !important; }

.step-wallet {
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  min-width: 100px;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.step-wallet.role-system { background: rgba(100, 116, 139, 0.2); color: #94a3b8; }
.step-wallet.role-originator { background: rgba(139, 92, 246, 0.2); color: #c4b5fd; }
.step-wallet.role-borrower { background: rgba(34, 197, 94, 0.2); color: #86efac; }

.step-arrow {
  color: #475569;
  font-size: 0.7rem;
}

.step-params {
  font-size: 0.75rem;
  color: #94a3b8;
  flex: 1;
  min-width: 100px;
  word-break: break-word;
}

.step-params .param-amount { color: #93c5fd; font-weight: 500; }
.step-params .param-token { color: #a78bfa; font-weight: 500; }
.step-params .param-late { color: #fbbf24; margin-left: 0.5rem; }
.step-params .param-rejection { color: #ef4444; margin-left: 0.5rem; }
.step-params .param-empty { color: #475569; }

.step-contract {
  font-size: 0.75rem;
  color: #e2e8f0;
  font-weight: 500;
  min-width: 100px;
}

.step-timing {
  font-family: 'SF Mono', monospace;
  font-size: 0.7rem;
  color: #64748b;
  min-width: 60px;
  text-align: right;
  margin-left: auto;
}

.step-disabled { opacity: 0.6; }
.step-disabled .step-params { text-decoration: line-through; }
.step-disabled-reason { font-size: 0.7rem; color: #6c757d; font-style: italic; }

.lifecycle-badge {
  font-size: 0.6rem;
  font-weight: 700;
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
  background: rgba(59, 130, 246, 0.3);
  color: #93c5fd;
}

.lifecycle-badge.lc-T1 { background: rgba(107, 114, 128, 0.3); color: #d1d5db; }
.lifecycle-badge.lc-T2 { background: rgba(239, 68, 68, 0.3); color: #fca5a5; }
.lifecycle-badge.lc-T3 { background: rgba(34, 197, 94, 0.3); color: #86efac; }
.lifecycle-badge.lc-T4 { background: rgba(59, 130, 246, 0.3); color: #93c5fd; }
.lifecycle-badge.lc-T5 { background: rgba(251, 191, 36, 0.3); color: #fde047; }
.lifecycle-badge.lc-T6 { background: rgba(239, 68, 68, 0.2); color: #f87171; }
.lifecycle-badge.lc-T7 { background: rgba(139, 92, 246, 0.3); color: #c4b5fd; }

.phase-steps-timed .phase-step-item {
  padding-right: 1rem;
}

.phase-steps-timed .phase-step-item.action-late {
  background: rgba(251, 191, 36, 0.05);
  border-left: 2px solid #fbbf24;
}

.phase-steps-timed .phase-step-item.action-rejection {
  background: rgba(239, 68, 68, 0.05);
  border-left: 2px solid #ef4444;
}

/* Action Groups */
.action-group {
  background: rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 0.375rem;
  margin: 0.25rem 0;
  overflow: hidden;
}

.action-group.group-collapsed {
  border-color: rgba(255, 255, 255, 0.04);
}

.action-group-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s ease;
}

.action-group-header:hover {
  background: rgba(255, 255, 255, 0.03);
}

.group-chevron {
  color: #64748b;
  font-size: 0.65rem;
  width: 10px;
  flex-shrink: 0;
}

.group-summary {
  font-size: 0.75rem;
  font-weight: 600;
  color: #cbd5e1;
  flex: 1;
}

.group-count {
  font-size: 0.65rem;
  background: rgba(100, 116, 139, 0.3);
  color: #94a3b8;
  padding: 0.1rem 0.4rem;
}

.action-group-items {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-left: 1rem;
  background: rgba(0, 0, 0, 0.05);
}

.action-group-items .phase-step-item {
  border-left: 2px solid rgba(100, 116, 139, 0.2);
  margin-left: 0.25rem;
  padding-left: 0.5rem;
}

.loan-action-schedules h5 {
  color: #e2e8f0;
  font-weight: 600;
}

.loan-schedules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
}

.collapsible-section {
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.5rem;
  overflow: hidden;
}

.collapsible-section.collapsed {
  border-color: rgba(255, 255, 255, 0.05);
}

.collapsible-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.2);
  cursor: pointer;
  user-select: none;
  transition: background 0.15s ease;
}

.collapsible-header:hover {
  background: rgba(0, 0, 0, 0.3);
}

.collapsible-header i.fas {
  color: #64748b;
  font-size: 0.75rem;
  width: 12px;
}

.collapsible-header h5 {
  font-size: 0.95rem;
  font-weight: 600;
  color: #e2e8f0;
}

.collapsible-content {
  padding: 1rem;
}

.phase-block {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 0.25rem;
  padding: 0.5rem;
}
</style>
