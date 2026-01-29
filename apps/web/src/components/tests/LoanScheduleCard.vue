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
        <div v-for="action in actions" :key="action.id"
             class="action-item"
             :class="{
               'action-pre-t0': action.timingPeriod < 0,
               'action-t0': action.timingPeriod === 0,
               'action-post-t0': action.timingPeriod > 0,
               'action-late': action.isLate,
               'action-rejection': action.expectedResult === 'rejection',
               'action-disabled': action.actionType !== 'init' && action.actionType !== 'accept' && !hasValidBuyer && !['T1'].includes(loan.lifecycleCase || 'T4')
             }">
          <div class="action-timing">{{ action.timing }}</div>
          <div class="action-content">
            <span class="action-type-badge" :class="'action-' + action.actionType">
              {{ action.label }}
            </span>
            <span v-if="action.amount !== undefined" class="action-amount">
              <input
                type="number"
                :value="action.amount"
                @change="onAmountChange(action.id, $event)"
                class="action-amount-input"
                :title="action.description || ''"
              /> ADA
            </span>
            <!-- Buyer display/selection for Accept action -->
            <span v-if="action.actionType === 'accept'" class="action-buyer">
              <i class="fas fa-user mr-1"></i>
              <!-- Show dropdown if no buyer assigned (open market) -->
              <select
                v-if="!loan.borrowerId"
                :value="loan.borrowerId || ''"
                @change="onBuyerChange"
                class="buyer-select"
              >
                <option value="">Select Buyer...</option>
                <option v-for="b in borrowerOptions" :key="b.id" :value="b.id">
                  {{ b.name }}
                </option>
              </select>
              <!-- Show buyer name if assigned -->
              <span v-else class="buyer-name">{{ action.buyerName }}</span>
            </span>
            <span v-if="action.isLate" class="action-late-badge">
              <i class="fas fa-clock"></i> Late
            </span>
            <span v-if="action.expectedResult === 'rejection'" class="action-rejection-badge">
              <i class="fas fa-times-circle"></i> Expected Rejection
            </span>
          </div>
          <div v-if="action.balance !== undefined" class="action-balance">
            <span class="balance-label">Bal:</span>
            <span class="balance-value" :class="{ 'balance-zero': action.balance === 0 }">
              {{ action.balance.toLocaleString() }}
            </span>
          </div>
        </div>
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
import { computed } from 'vue'
import type { LoanConfig } from '@/utils/pipeline/types'

interface LoanAction {
  id: string
  loanIndex: number
  actionType: 'init' | 'update' | 'cancel' | 'accept' | 'pay' | 'complete' | 'collect' | 'default'
  label: string
  timing: string
  timingPeriod: number
  amount?: number
  balance?: number
  expectedResult: 'success' | 'failure' | 'rejection'
  isLate?: boolean
  description?: string
  buyerId?: string | null
  buyerName?: string
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
}>()

const lifecycleCases = [
  { id: 'T1', short: 'Cancel', description: 'Init, Update, Cancel - Seller manages contract before buyer acceptance' },
  { id: 'T2', short: 'Default', description: 'Init, Accept, Default - Buyer accepts, misses payments, seller claims default' },
  { id: 'T3', short: 'Nominal (0%)', description: 'Complete Payment (0% Interest) - Full payment lifecycle, no interest' },
  { id: 'T4', short: 'Nominal', description: 'Complete Payment (w/ Interest) - Standard full lifecycle with interest' },
  { id: 'T5', short: 'Late Fee', description: 'Complete Payment (w/ Late Fee) - Missed payment window, late fee applied' },
  { id: 'T6', short: 'Reserved (Reject)', description: 'Buyer Reservation Guard - Wrong buyer attempts acceptance (expected rejection)' },
  { id: 'T7', short: 'Reserved + Fees', description: 'Buyer Reservation with Fees - Reserved buyer with transfer fees' },
]

const hasValidBuyer = computed(() => !!props.loan.borrowerId)

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

.action-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
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
  width: 60px;
  padding: 0.15rem 0.3rem;
  font-size: 0.75rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 3px;
  color: #e2e8f0;
  text-align: right;
}

.action-amount-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.action-buyer {
  font-size: 0.75rem;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: auto;
}

.buyer-select {
  padding: 0.15rem 0.3rem;
  font-size: 0.7rem;
  background: rgba(251, 191, 36, 0.15);
  border: 1px solid rgba(251, 191, 36, 0.4);
  border-radius: 3px;
  color: #fcd34d;
  cursor: pointer;
  min-width: 100px;
}

.buyer-select:focus {
  outline: none;
  border-color: #fbbf24;
}

.buyer-name {
  font-weight: 500;
  color: #86efac;
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

.action-balance {
  margin-left: auto;
  font-family: 'SF Mono', monospace;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding-left: 0.5rem;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.action-balance .balance-label {
  color: #64748b;
}

.action-balance .balance-value {
  color: #93c5fd;
  font-weight: 500;
}

.action-balance .balance-value.balance-zero {
  color: #22c55e;
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
</style>
