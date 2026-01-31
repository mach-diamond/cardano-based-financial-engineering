<template>
  <div
    class="loan-schedule-card"
    :class="[
      'lc-border-' + (loan.lifecycleCase || 'T4'),
      {
        'no-buyer': !hasValidBuyer && !['T1'].includes(loan.lifecycleCase || 'T4'),
        'collapsed': isCollapsed
      }
    ]"
  >
    <!-- Loan Header (clickable to collapse) -->
    <div class="loan-schedule-header" @click="toggleCollapse">
      <i class="fas loan-chevron" :class="isCollapsed ? 'fa-chevron-right' : 'fa-chevron-down'"></i>
      <div class="loan-schedule-index">#{{ loanIndex + 1 }}</div>
      <div class="loan-schedule-info">
        <span class="loan-schedule-asset">{{ loan.asset }}</span>
        <span class="loan-schedule-principal">{{ loan.principal.toLocaleString() }} ADA</span>
      </div>
      <!-- Lifecycle Case Selector -->
      <select
        :value="loan.lifecycleCase || 'T4'"
        @change.stop="onLifecycleChange"
        @click.stop
        class="lifecycle-select"
        :class="'lc-' + (loan.lifecycleCase || 'T4')"
      >
        <option v-for="lc in lifecycleCases" :key="lc.id" :value="lc.id" :title="lc.description">
          {{ lc.id }} - {{ lc.short }}
        </option>
      </select>
    </div>

    <!-- Collapsible Content -->
    <div v-show="!isCollapsed">
      <!-- No Buyer Warning (for non-T1 loans without buyer) -->
      <div v-if="!hasValidBuyer && !['T1'].includes(loan.lifecycleCase || 'T4')" class="no-buyer-warning">
        <i class="fas fa-exclamation-triangle"></i>
        No buyer assigned - select a buyer in Accept action to enable payment schedule
      </div>

      <!-- Action Timeline -->
      <div class="loan-action-timeline">
        <!-- Column Headers -->
        <div class="action-item balance-header-row">
          <div class="action-timing"><span class="balance-header">Time</span></div>
          <div class="action-content"><span class="balance-header">Action</span></div>
          <div v-if="hasBalanceData" class="action-balances">
            <div class="balance-col"><span class="balance-header">Loan</span></div>
            <div class="balance-col"><span class="balance-header">Contract</span></div>
            <div class="balance-col"><span class="balance-header">Interest</span></div>
          </div>
          <div class="action-executor"><span class="balance-header">Executor</span></div>
        </div>
        <template v-for="action in actions" :key="action.id">
        <div
             class="action-item"
             :class="{
               'action-pre-t0': action.timingPeriod < 0,
               'action-t0': action.timingPeriod === 0,
               'action-post-t0': action.timingPeriod > 0,
               'action-late': action.isLate,
               'action-rejection': action.expectedResult === 'rejection',
               'action-disabled': action.actionType !== 'init' && action.actionType !== 'accept' && !hasValidBuyer && !['T1'].includes(loan.lifecycleCase || 'T4')
             }">
          <div class="action-timing" :class="{ 'timing-editable': isTimingEditable(action) }">
            <template v-if="isTimingEditable(action)">
              <span class="timing-prefix">T+</span>
              <input
                type="number"
                :value="getTimingDisplayValue(action.timingPeriod)"
                @change="onTimingChange(action.id, $event)"
                class="timing-input"
                step="1"
                min="0"
                max="1000"
                :title="'Edit timing in ' + getFreqUnit()"
              />
              <span class="timing-suffix">{{ getFreqUnit() }}</span>
            </template>
            <template v-else>{{ action.timing }}</template>
          </div>
          <div class="action-content">
            <span class="action-type-badge" :class="'action-' + action.actionType">
              {{ action.label }}
            </span>
            <!-- Expand button for Update actions -->
            <button
              v-if="action.actionType === 'update'"
              class="update-expand-btn"
              :class="{ 'expanded': isUpdateExpanded(action.id) }"
              @click.stop="toggleUpdateExpansion(action.id)"
              title="Edit update terms"
            >
              <i class="fas" :class="isUpdateExpanded(action.id) ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
            </button>
            <span v-if="action.amount !== undefined" class="action-amount">
              <input
                type="number"
                :value="action.amount"
                @change="onAmountChange(action.id, $event)"
                class="action-amount-input"
                :title="action.description || ''"
              /> ADA
            </span>
            <span v-if="action.isLate" class="action-late-badge">
              <i class="fas fa-clock"></i> Late
            </span>
            <span v-if="action.expectedResult === 'rejection'" class="action-rejection-badge">
              <i class="fas fa-times-circle"></i> Expected Rejection
            </span>
          </div>
          <div v-if="hasBalanceData" class="action-balances">
            <div class="balance-col">
              <span class="balance-value" :class="{ 'balance-zero': action.loanBalance === 0 }">
                {{ action.loanBalance !== undefined ? action.loanBalance.toFixed(2) : '-' }}
              </span>
            </div>
            <div class="balance-col">
              <span class="balance-value balance-contract">
                {{ action.contractBalance !== undefined ? action.contractBalance.toFixed(2) : '-' }}
              </span>
            </div>
            <div class="balance-col">
              <span class="balance-value balance-interest">
                {{ action.interestPaid !== undefined ? action.interestPaid.toFixed(2) : '-' }}
              </span>
            </div>
          </div>
          <!-- Executor Column -->
          <div class="action-executor">
            <!-- Originator actions: init, update, cancel, collect, default -->
            <template v-if="['init', 'update', 'cancel', 'collect', 'default'].includes(action.actionType)">
              <span class="executor-name executor-originator">{{ getOriginatorName() }}</span>
            </template>
            <!-- Buyer actions: accept (with dropdown for open market), pay, complete -->
            <template v-else-if="action.actionType === 'accept'">
              <select
                :value="loan.lifecycleBuyerId || ''"
                @change="onBuyerChange"
                class="executor-select"
              >
                <option value="">Select...</option>
                <option v-for="b in borrowerOptions" :key="b.id" :value="b.id">
                  {{ b.name }}
                </option>
              </select>
            </template>
            <template v-else>
              <span class="executor-name executor-buyer">{{ getBuyerDisplayName() }}</span>
            </template>
          </div>
        </div>
        <!-- Expanded Update Terms Panel -->
        <div
          v-if="action.actionType === 'update' && isUpdateExpanded(action.id)"
          class="update-terms-panel"
        >
          <div class="update-terms-columns">
            <!-- Left Column: Current Terms (Read-only) -->
            <div class="terms-column current-terms">
              <div class="column-header">Current Terms</div>
              <div class="term-row">
                <span class="term-label">Principal</span>
                <span class="term-value">{{ loan.principal.toLocaleString() }} ADA</span>
              </div>
              <div class="term-row">
                <span class="term-label">APR</span>
                <span class="term-value">{{ loan.apr }}%</span>
              </div>
              <div class="term-row">
                <span class="term-label">Frequency</span>
                <span class="term-value">{{ getFrequencyLabel(loan.frequency) }}</span>
              </div>
              <div class="term-row">
                <span class="term-label">Term</span>
                <span class="term-value">{{ loan.termMonths }} periods</span>
              </div>
              <div class="term-row">
                <span class="term-label">Buyer Reservation</span>
                <span class="term-value">{{ getBuyerReservationLabel(loan.borrowerId) }}</span>
              </div>
              <div class="term-row">
                <span class="term-label">Fee Split</span>
                <span class="term-value">{{ 100 - (loan.transferFeeBuyerPercent ?? 50) }}% / {{ loan.transferFeeBuyerPercent ?? 50 }}%</span>
              </div>
              <div class="term-row">
                <span class="term-label">Late Fee</span>
                <span class="term-value">{{ loan.lateFee || 10 }} ADA</span>
              </div>
              <div class="term-row">
                <span class="term-label">Fee Deferment</span>
                <span class="term-value">{{ loan.deferFee ? 'Deferred' : 'Immediate' }}</span>
              </div>
            </div>

            <!-- Right Column: New Terms (Editable) -->
            <div class="terms-column new-terms">
              <div class="column-header">New Terms</div>
              <div class="term-row">
                <span class="term-label">Principal</span>
                <div class="term-input-group">
                  <input
                    type="number"
                    :value="getUpdateTerms(action).principal"
                    @change="onTermChange(action.id, 'principal', parseFloat(($event.target as HTMLInputElement).value))"
                    class="term-input"
                    min="0"
                    step="100"
                  />
                  <span class="term-suffix">ADA</span>
                </div>
              </div>
              <div class="term-row">
                <span class="term-label">APR</span>
                <div class="term-input-group">
                  <input
                    type="number"
                    :value="getUpdateTerms(action).apr"
                    @change="onTermChange(action.id, 'apr', parseFloat(($event.target as HTMLInputElement).value))"
                    class="term-input"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  <span class="term-suffix">%</span>
                </div>
              </div>
              <div class="term-row">
                <span class="term-label">Frequency</span>
                <select
                  :value="getUpdateTerms(action).frequency"
                  @change="onTermChange(action.id, 'frequency', parseInt(($event.target as HTMLSelectElement).value))"
                  class="term-select"
                >
                  <option :value="1">Yearly</option>
                  <option :value="2">Semi-Annual</option>
                  <option :value="4">Quarterly</option>
                  <option :value="12">Monthly</option>
                  <option :value="26">Bi-Weekly</option>
                  <option :value="52">Weekly</option>
                  <option :value="52594">10 min (test)</option>
                </select>
              </div>
              <div class="term-row">
                <span class="term-label">Term</span>
                <div class="term-input-group">
                  <input
                    type="number"
                    :value="getUpdateTerms(action).installments"
                    @change="onTermChange(action.id, 'installments', parseInt(($event.target as HTMLInputElement).value))"
                    class="term-input"
                    min="1"
                    max="360"
                    step="1"
                  />
                  <span class="term-suffix">periods</span>
                </div>
              </div>
              <div class="term-row">
                <span class="term-label">Buyer Reservation</span>
                <select
                  :value="getUpdateTerms(action).buyerReservation || ''"
                  @change="onTermChange(action.id, 'buyerReservation', ($event.target as HTMLSelectElement).value || null)"
                  class="term-select"
                >
                  <option value="">Open Market</option>
                  <option v-for="b in borrowerOptions" :key="b.id" :value="b.id">
                    {{ b.name }}
                  </option>
                </select>
              </div>
              <div class="term-row">
                <span class="term-label">Fee Split</span>
                <div class="fee-split-group">
                  <input
                    type="number"
                    :value="getUpdateTerms(action).feeSplitSeller"
                    @change="onTermChange(action.id, 'feeSplitSeller', parseInt(($event.target as HTMLInputElement).value))"
                    class="term-input fee-input"
                    min="0"
                    max="100"
                    step="5"
                  />
                  <span class="fee-separator">/</span>
                  <input
                    type="number"
                    :value="getUpdateTerms(action).feeSplitBuyer"
                    @change="onTermChange(action.id, 'feeSplitBuyer', parseInt(($event.target as HTMLInputElement).value))"
                    class="term-input fee-input"
                    min="0"
                    max="100"
                    step="5"
                  />
                  <span class="term-suffix">%</span>
                </div>
              </div>
              <div class="term-row">
                <span class="term-label">Late Fee</span>
                <div class="term-input-group">
                  <input
                    type="number"
                    :value="getUpdateTerms(action).lateFee"
                    @change="onTermChange(action.id, 'lateFee', parseFloat(($event.target as HTMLInputElement).value))"
                    class="term-input"
                    min="0"
                    step="1"
                  />
                  <span class="term-suffix">ADA</span>
                </div>
              </div>
              <div class="term-row">
                <span class="term-label">Fee Deferment</span>
                <label class="toggle-switch">
                  <input
                    type="checkbox"
                    :checked="getUpdateTerms(action).feeDeferment"
                    @change="onTermChange(action.id, 'feeDeferment', ($event.target as HTMLInputElement).checked)"
                  />
                  <span class="toggle-slider"></span>
                  <span class="toggle-label">{{ getUpdateTerms(action).feeDeferment ? 'Deferred' : 'Immediate' }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>
        </template>
      </div>

      <!-- Summary -->
      <div class="loan-schedule-summary">
        <span class="summary-item">
          <i class="fas fa-list-ol"></i>
          {{ actions.length }} actions
        </span>
        <span class="summary-item">
          <i class="fas fa-coins"></i>
          {{ totalValue.toFixed(0) }} ADA total
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { LoanConfig } from '@/utils/pipeline/types'
import { NAME_TO_ID_MAP } from '@/utils/pipeline/types'

interface UpdateTermsData {
  principal?: number
  apr?: number
  frequency?: number
  installments?: number
  buyerReservation?: string | null
  feeSplitSeller?: number
  feeSplitBuyer?: number
  feeDeferment?: boolean
  lateFee?: number
  loanBalance?: number
}

interface LoanAction {
  id: string
  loanIndex: number
  actionType: 'init' | 'update' | 'cancel' | 'accept' | 'pay' | 'complete' | 'collect' | 'default'
  label: string
  timing: string
  timingPeriod: number
  amount?: number
  loanBalance?: number      // Remaining principal to be paid
  contractBalance?: number  // Amount accumulated on contract (for Collect)
  interestPaid?: number     // Cumulative interest paid
  expectedResult: 'success' | 'failure' | 'rejection'
  isLate?: boolean
  description?: string
  buyerId?: string | null
  buyerName?: string
  updateTerms?: UpdateTermsData  // For update actions
}

interface BorrowerOption {
  id: string
  name: string
  initialFunding: number
}

interface Props {
  loan: LoanConfig
  loanIndex: number
  actions: LoanAction[]
  borrowerOptions: BorrowerOption[]
  isCollapsed: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'toggle-collapse': []
  'update:lifecycle': [value: string]
  'update:buyer': [value: string | null]
  'update:amount': [actionId: string, value: number]
  'update:timing': [actionId: string, timingPeriod: number]
  'update:terms': [actionId: string, terms: UpdateTermsData]
}>()

// Track which update action is expanded
const expandedUpdateActionId = ref<string | null>(null)

function toggleUpdateExpansion(actionId: string) {
  if (expandedUpdateActionId.value === actionId) {
    expandedUpdateActionId.value = null
  } else {
    expandedUpdateActionId.value = actionId
  }
}

function isUpdateExpanded(actionId: string): boolean {
  return expandedUpdateActionId.value === actionId
}

// Get update terms for an action (with defaults from current loan)
function getUpdateTerms(action: LoanAction): UpdateTermsData {
  // If action has custom terms, use them; otherwise use loan defaults
  const terms = action.updateTerms || {}
  // Fee split: transferFeeBuyerPercent is buyer's share, seller gets the rest
  const buyerFeePercent = props.loan.transferFeeBuyerPercent ?? 50
  const sellerFeePercent = 100 - buyerFeePercent
  return {
    principal: terms.principal ?? props.loan.principal,
    apr: terms.apr ?? props.loan.apr,
    frequency: terms.frequency ?? props.loan.frequency,
    installments: terms.installments ?? props.loan.termMonths,
    buyerReservation: terms.buyerReservation ?? props.loan.borrowerId ?? null,
    feeSplitSeller: terms.feeSplitSeller ?? sellerFeePercent,
    feeSplitBuyer: terms.feeSplitBuyer ?? buyerFeePercent,
    feeDeferment: terms.feeDeferment ?? (props.loan.deferFee ?? false),
    lateFee: terms.lateFee ?? (props.loan.lateFee || 10),
    // Loan balance defaults to previous balance (which starts as principal)
    loanBalance: terms.loanBalance ?? terms.principal ?? props.loan.principal,
  }
}

// Handle term field changes
function onTermChange(actionId: string, field: keyof UpdateTermsData, value: number | string | boolean | null) {
  const action = props.actions.find(a => a.id === actionId)
  if (!action) return

  const currentTerms = getUpdateTerms(action)
  const updatedTerms = { ...currentTerms, [field]: value }

  // If principal changes, update loan balance to match (unless user has manually set it)
  if (field === 'principal' && typeof value === 'number') {
    // Only auto-update if balance was tracking principal
    if (currentTerms.loanBalance === currentTerms.principal) {
      updatedTerms.loanBalance = value
    }
  }

  // Ensure fee splits sum to 100
  if (field === 'feeSplitSeller' && typeof value === 'number') {
    updatedTerms.feeSplitBuyer = 100 - value
  } else if (field === 'feeSplitBuyer' && typeof value === 'number') {
    updatedTerms.feeSplitSeller = 100 - value
  }

  emit('update:terms', actionId, updatedTerms)
}

const lifecycleCases = [
  { id: 'T1', short: 'Cancel', description: 'Init, Update, Cancel - Seller manages contract before buyer acceptance' },
  { id: 'T2', short: 'Default', description: 'Init, Accept, Default - Buyer accepts, misses payments, seller claims default' },
  { id: 'T3', short: 'Nominal (0%)', description: 'Complete Payment (0% Interest) - Full payment lifecycle, no interest' },
  { id: 'T4', short: 'Nominal', description: 'Complete Payment (w/ Interest) - Standard full lifecycle with interest' },
  { id: 'T5', short: 'Late Fee', description: 'Complete Payment (w/ Late Fee) - Missed payment window, late fee applied' },
  { id: 'T6', short: 'Reserved (Reject)', description: 'Buyer Reservation Guard - Wrong buyer attempts acceptance (expected rejection)' },
  { id: 'T7', short: 'Reserved + Fees', description: 'Buyer Reservation with Fees - Reserved buyer with transfer fees' },
]

// Check if a buyer is selected for lifecycle (Accept action)
const hasValidBuyer = computed(() => !!(props.loan.lifecycleBuyerId || props.loan.borrowerId))

const hasBalanceData = computed(() => {
  return props.actions.some(a => a.loanBalance !== undefined || a.contractBalance !== undefined || a.interestPaid !== undefined)
})

const totalValue = computed(() => {
  const loan = props.loan
  const principal = loan.principal
  const apr = loan.apr / 100
  const installments = loan.termMonths
  const periodsPerYear = loan.frequency || 12

  if (installments <= 0) return principal
  if (apr === 0) return principal

  const periodRate = apr / periodsPerYear
  const termPayment = (periodRate * principal) / (1 - Math.pow(1 + periodRate, -installments))
  const totalPaid = termPayment * installments
  return totalPaid
})

function toggleCollapse() {
  emit('toggle-collapse')
}

function onLifecycleChange(event: Event) {
  const target = event.target as HTMLSelectElement
  emit('update:lifecycle', target.value)
}

function onBuyerChange(event: Event) {
  const target = event.target as HTMLSelectElement
  emit('update:buyer', target.value || null)
}

function onAmountChange(actionId: string, event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:amount', actionId, parseFloat(target.value))
}

function onTimingChange(actionId: string, event: Event) {
  const target = event.target as HTMLInputElement
  const displayValue = parseFloat(target.value)
  // Convert display value (e.g., 30m) back to timing period (e.g., 3 periods of 10m)
  const timingPeriod = displayValueToPeriod(displayValue)
  emit('update:timing', actionId, timingPeriod)
}

// Determine if an action's timing is editable
// Pre-acceptance actions (init, update, cancel) and payment actions can have timing adjusted
function isTimingEditable(action: LoanAction): boolean {
  // Allow timing editing for:
  // - update and cancel actions (pre-acceptance)
  // - payment actions (to test late payments)
  // - default action (to test different default timing)
  // - complete and collect actions (post-payment lifecycle)
  const editableTypes = ['update', 'cancel', 'pay', 'default', 'complete', 'collect']
  return editableTypes.includes(action.actionType)
}

// Get originator name for executor column
function getOriginatorName(): string {
  const originatorId = props.loan.originatorId
  if (!originatorId) return 'Unknown'
  const entry = Object.entries(NAME_TO_ID_MAP).find(([_, id]) => id === originatorId)
  return entry ? entry[0] : originatorId.replace('orig-', '').replace(/-/g, ' ')
}

// Get buyer display name for executor column
function getBuyerDisplayName(): string {
  const buyerId = props.loan.lifecycleBuyerId || props.loan.borrowerId
  if (!buyerId) return 'Open Market'
  const entry = Object.entries(NAME_TO_ID_MAP).find(([_, id]) => id === buyerId)
  return entry ? entry[0] : buyerId
}

// Get frequency label for display
function getFrequencyLabel(frequency: number | undefined): string {
  const freq = frequency || 12
  switch (freq) {
    case 1: return 'Yearly'
    case 2: return 'Semi-Annual'
    case 4: return 'Quarterly'
    case 12: return 'Monthly'
    case 26: return 'Bi-Weekly'
    case 52: return 'Weekly'
    case 365: return 'Daily'
    case 8760: return 'Hourly'
    case 17531: return '30 min'
    case 35063: return '15 min'
    case 52594: return '10 min'
    case 105189: return '5 min'
    default: return `${freq}/yr`
  }
}

// Get buyer reservation label for display
function getBuyerReservationLabel(buyerId: string | null | undefined): string {
  if (!buyerId) return 'Open Market'
  const entry = Object.entries(NAME_TO_ID_MAP).find(([_, id]) => id === buyerId)
  return entry ? entry[0] : buyerId
}

// Get frequency info: multiplier (for display) and unit (suffix)
function getFrequencyInfo(): { multiplier: number; unit: string } {
  const frequency = props.loan.frequency || 12
  switch (frequency) {
    case 52: return { multiplier: 1, unit: 'wk' }
    case 26: return { multiplier: 2, unit: 'wk' }
    case 12: return { multiplier: 1, unit: 'mo' }
    case 4: return { multiplier: 1, unit: 'qtr' }
    case 2: return { multiplier: 1, unit: 'semi' }
    case 1: return { multiplier: 1, unit: 'yr' }
    // High frequency for testing (minutes)
    case 365: return { multiplier: 1, unit: 'd' }
    case 8760: return { multiplier: 1, unit: 'hr' }
    case 17531: return { multiplier: 30, unit: 'm' }
    case 35063: return { multiplier: 15, unit: 'm' }
    case 52594: return { multiplier: 10, unit: 'm' }
    case 105189: return { multiplier: 5, unit: 'm' }
    default: return { multiplier: 1, unit: 'p' }
  }
}

// Get just the unit for the suffix
function getFreqUnit(): string {
  return getFrequencyInfo().unit
}

// Convert timing period to display value (period × multiplier)
function getTimingDisplayValue(timingPeriod: number): number {
  const { multiplier } = getFrequencyInfo()
  return timingPeriod * multiplier
}

// Convert display value back to timing period (value ÷ multiplier)
function displayValueToPeriod(displayValue: number): number {
  const { multiplier } = getFrequencyInfo()
  return displayValue / multiplier
}
</script>

<style scoped>
.loan-schedule-card {
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  overflow: hidden;
  border-left: 4px solid #3b82f6;
}

/* Lifecycle border colors */
.loan-schedule-card.lc-border-T1 { border-left-color: #6b7280; }
.loan-schedule-card.lc-border-T2 { border-left-color: #ef4444; }
.loan-schedule-card.lc-border-T3 { border-left-color: #22c55e; }
.loan-schedule-card.lc-border-T4 { border-left-color: #3b82f6; }
.loan-schedule-card.lc-border-T5 { border-left-color: #fbbf24; }
.loan-schedule-card.lc-border-T6 { border-left-color: #dc2626; }
.loan-schedule-card.lc-border-T7 { border-left-color: #8b5cf6; }

.loan-schedule-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
}

.loan-chevron {
  color: #64748b;
  font-size: 0.65rem;
  width: 10px;
  margin-right: 0.25rem;
}

.loan-schedule-index {
  font-weight: 700;
  font-size: 1rem;
  color: #94a3b8;
  min-width: 32px;
}

.loan-schedule-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.loan-schedule-asset {
  font-weight: 600;
  color: #e2e8f0;
  font-size: 0.9rem;
}

.loan-schedule-principal {
  font-size: 0.75rem;
  color: #94a3b8;
}

.lifecycle-select {
  padding: 0.2rem 0.4rem;
  font-size: 0.7rem;
  font-weight: 600;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: inherit;
  cursor: pointer;
  min-width: 90px;
}

.lifecycle-select:focus {
  outline: none;
  border-color: #3b82f6;
}

.lifecycle-select.lc-T1 { color: #9ca3af; border-color: rgba(107, 114, 128, 0.5); }
.lifecycle-select.lc-T2 { color: #fca5a5; border-color: rgba(239, 68, 68, 0.5); }
.lifecycle-select.lc-T3 { color: #86efac; border-color: rgba(34, 197, 94, 0.5); }
.lifecycle-select.lc-T4 { color: #93c5fd; border-color: rgba(59, 130, 246, 0.5); }
.lifecycle-select.lc-T5 { color: #fcd34d; border-color: rgba(251, 191, 36, 0.5); }
.lifecycle-select.lc-T6 { color: #fca5a5; border-color: rgba(220, 38, 38, 0.5); }
.lifecycle-select.lc-T7 { color: #c4b5fd; border-color: rgba(139, 92, 246, 0.5); }

.no-buyer-warning {
  padding: 0.5rem 1rem;
  background: rgba(251, 191, 36, 0.1);
  border-bottom: 1px solid rgba(251, 191, 36, 0.2);
  color: #fcd34d;
  font-size: 0.75rem;
}

.no-buyer-warning i {
  margin-right: 0.5rem;
}

.loan-schedule-card.no-buyer {
  opacity: 0.85;
}

.loan-schedule-card.collapsed .loan-schedule-header {
  border-bottom: none;
}

.loan-action-timeline {
  padding: 0.5rem 0;
  max-height: 300px;
  overflow-y: auto;
}

.action-item {
  display: flex;
  align-items: center;
  padding: 0.35rem 1rem;
  gap: 0.5rem;
  border-left: 2px solid transparent;
  margin-left: 0.5rem;
  transition: background 0.15s ease;
}

.action-item:hover {
  background: rgba(255, 255, 255, 0.03);
}

.action-item.action-pre-t0 { border-left-color: #6b7280; }
.action-item.action-t0 { border-left-color: #22c55e; background: rgba(34, 197, 94, 0.05); }
.action-item.action-post-t0 { border-left-color: #3b82f6; }
.action-item.action-late { border-left-color: #fbbf24; background: rgba(251, 191, 36, 0.05); }
.action-item.action-rejection { border-left-color: #ef4444; background: rgba(239, 68, 68, 0.05); }
.action-item.action-disabled { opacity: 0.4; pointer-events: none; }

.action-timing {
  font-family: 'SF Mono', monospace;
  font-size: 0.7rem;
  color: #64748b;
  min-width: 50px;
  text-align: right;
}

.action-timing.timing-editable {
  display: flex;
  align-items: center;
  gap: 0.15rem;
  justify-content: flex-end;
}

.timing-prefix {
  color: #64748b;
  font-size: 0.65rem;
  font-weight: 500;
}

.timing-input {
  width: 32px;
  padding: 0.1rem 0.15rem;
  font-family: 'SF Mono', monospace;
  font-size: 0.7rem;
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.4);
  border-radius: 3px;
  color: #93c5fd;
  text-align: center;
  -moz-appearance: textfield; /* Firefox */
}

.timing-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

/* Hide spinners completely */
.timing-input::-webkit-inner-spin-button,
.timing-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
  display: none;
}

.timing-suffix {
  color: #64748b;
  font-size: 0.65rem;
}

.action-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 180px; /* Ensure minimum width for action content */
  max-width: 320px; /* Prevent action content from expanding too much */
}

.action-type-badge {
  display: inline-block;
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
}

.action-type-badge.action-init { background: rgba(139, 92, 246, 0.2); color: #c4b5fd; }
.action-type-badge.action-update { background: rgba(14, 165, 233, 0.2); color: #7dd3fc; }
.action-type-badge.action-cancel { background: rgba(107, 114, 128, 0.3); color: #d1d5db; }
.action-type-badge.action-accept { background: rgba(34, 197, 94, 0.2); color: #86efac; }
.action-type-badge.action-pay { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }
.action-type-badge.action-complete { background: rgba(16, 185, 129, 0.2); color: #6ee7b7; }
.action-type-badge.action-collect { background: rgba(245, 158, 11, 0.2); color: #fcd34d; }
.action-type-badge.action-default { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }

.action-amount {
  font-size: 0.75rem;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.action-amount-input {
  width: 80px; /* Fixed width for consistent alignment */
  max-width: 80px;
  padding: 0.15rem 0.3rem;
  font-size: 0.75rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 3px;
  color: #e2e8f0;
  text-align: right;
  flex-shrink: 0;
}

.action-amount-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.action-late-badge,
.action-rejection-badge {
  font-size: 0.65rem;
  padding: 0.1rem 0.3rem;
  border-radius: 2px;
}

.action-late-badge {
  background: rgba(251, 191, 36, 0.2);
  color: #fcd34d;
}

.action-rejection-badge {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
}

.action-balances {
  display: flex;
  gap: 0;
  padding-left: 0.5rem;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
  width: 180px; /* Fixed width to ensure alignment: 3 cols × 55px + padding */
  min-width: 180px;
}

.balance-col {
  font-family: 'SF Mono', monospace;
  font-size: 0.65rem;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  width: 55px;
  padding: 0 0.25rem;
}

.balance-header {
  color: #64748b;
  font-size: 0.55rem;
  font-weight: 600;
  text-transform: uppercase;
}

.balance-header-row {
  border-left-color: transparent !important;
  padding-top: 0.15rem;
  padding-bottom: 0.15rem;
  background: rgba(0, 0, 0, 0.15);
}

.balance-header-row:hover {
  background: rgba(0, 0, 0, 0.15) !important;
}

.balance-header-row .action-timing .balance-header {
  text-align: right;
  display: block;
}

.balance-header-row .action-content .balance-header {
  text-align: left;
  display: block;
}

/* Executor Column */
.action-executor {
  width: 130px;
  min-width: 130px;
  flex-shrink: 0;
  padding-left: 0.5rem;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
}

.executor-name {
  font-size: 0.7rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.executor-originator {
  color: #c4b5fd; /* Purple for originator */
}

.executor-buyer {
  color: #86efac; /* Green for buyer */
}

.executor-select {
  padding: 0.15rem 0.3rem;
  font-size: 0.65rem;
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.4);
  border-radius: 3px;
  color: #86efac;
  cursor: pointer;
  width: 100%;
  max-width: 120px;
}

.executor-select:focus {
  outline: none;
  border-color: #22c55e;
}

.balance-col .balance-value {
  color: #93c5fd;
  font-weight: 500;
}

.balance-col .balance-value.balance-zero {
  color: #22c55e;
}

.balance-col .balance-value.balance-contract {
  color: #fcd34d;
}

.balance-col .balance-value.balance-interest {
  color: #a78bfa;
}

.loan-schedule-summary {
  display: flex;
  gap: 1rem;
  padding: 0.5rem 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.summary-item {
  font-size: 0.7rem;
  color: #64748b;
}

.summary-item i {
  margin-right: 0.25rem;
}

/* Update Terms Expansion */
.update-expand-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  background: rgba(14, 165, 233, 0.15);
  border: 1px solid rgba(14, 165, 233, 0.4);
  border-radius: 3px;
  color: #7dd3fc;
  cursor: pointer;
  font-size: 0.6rem;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.update-expand-btn:hover {
  background: rgba(14, 165, 233, 0.25);
  border-color: rgba(14, 165, 233, 0.6);
}

.update-expand-btn.expanded {
  background: rgba(14, 165, 233, 0.3);
  border-color: #0ea5e9;
}

.update-terms-panel {
  background: rgba(14, 165, 233, 0.05);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 4px;
  margin: 0.25rem 1rem 0.5rem 2.5rem;
  padding: 0.75rem;
  animation: slideDown 0.15s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.update-terms-columns {
  display: flex;
  gap: 1.5rem;
}

.terms-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.terms-column.current-terms {
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  padding-right: 1.5rem;
}

.column-header {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 0.25rem;
}

.current-terms .column-header {
  color: #64748b;
}

.new-terms .column-header {
  color: #7dd3fc;
}

.term-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 28px;
}

.term-label {
  font-size: 0.7rem;
  font-weight: 500;
  color: #94a3b8;
  flex-shrink: 0;
}

.term-value {
  font-size: 0.75rem;
  font-weight: 500;
  color: #e2e8f0;
  text-align: right;
}

.term-input-group {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  justify-content: flex-end;
}

.term-input {
  width: 70px;
  padding: 0.25rem 0.4rem;
  font-size: 0.75rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  color: #e2e8f0;
  text-align: right;
}

.term-input:focus {
  outline: none;
  border-color: #0ea5e9;
  box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2);
}

.term-input.fee-input {
  width: 40px;
  text-align: center;
}

.term-select {
  width: 110px;
  padding: 0.25rem 0.4rem;
  font-size: 0.75rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  color: #e2e8f0;
  cursor: pointer;
}

.term-select:focus {
  outline: none;
  border-color: #0ea5e9;
}

.term-suffix {
  font-size: 0.65rem;
  color: #64748b;
  flex-shrink: 0;
  min-width: 30px;
}

.fee-split-group {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  justify-content: flex-end;
}

.fee-separator {
  color: #64748b;
  font-weight: 500;
}

/* Toggle Switch for Fee Deferment */
.toggle-switch {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.toggle-switch input {
  display: none;
}

.toggle-slider {
  position: relative;
  width: 32px;
  height: 18px;
  background: rgba(100, 116, 139, 0.4);
  border-radius: 9px;
  transition: background 0.2s ease;
}

.toggle-slider::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  background: #94a3b8;
  border-radius: 50%;
  transition: transform 0.2s ease, background 0.2s ease;
}

.toggle-switch input:checked + .toggle-slider {
  background: rgba(14, 165, 233, 0.5);
}

.toggle-switch input:checked + .toggle-slider::after {
  transform: translateX(14px);
  background: #0ea5e9;
}

.toggle-label {
  font-size: 0.7rem;
  color: #94a3b8;
}

/* Hide number input spinners */
.term-input::-webkit-inner-spin-button,
.term-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.term-input {
  -moz-appearance: textfield;
}
</style>
