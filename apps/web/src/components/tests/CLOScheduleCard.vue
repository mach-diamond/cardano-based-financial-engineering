<template>
  <div class="clo-schedule-card" :class="{ 'collapsed': isCollapsed }">
    <!-- CLO Header -->
    <div class="clo-schedule-header" @click="toggleCollapse">
      <i class="fas clo-chevron" :class="isCollapsed ? 'fa-chevron-right' : 'fa-chevron-down'"></i>
      <div class="clo-schedule-icon"><i class="fas fa-layer-group"></i></div>
      <div class="clo-schedule-info">
        <span class="clo-schedule-name">{{ cloConfig?.name || 'CLO Bond' }}</span>
        <span class="clo-schedule-details">
          {{ cloConfig?.tranches?.length || 0 }} tranches | {{ eligibleLoans.length }} loans
        </span>
      </div>
      <span class="clo-status-badge" :class="'status-' + cloStatus">{{ cloStatus }}</span>
    </div>

    <!-- Collapsible Content -->
    <div v-show="!isCollapsed">
      <!-- Dependency Notice -->
      <div v-if="!allTradesComplete" class="clo-dependency-notice">
        <i class="fas fa-info-circle"></i>
        CLO initialization depends on acquiring CollateralTokens from {{ eligibleLoans.length }} loan contracts
      </div>

      <!-- Action Timeline -->
      <div class="clo-action-timeline">
        <!-- Column Headers -->
        <div class="action-item balance-header-row">
          <div class="action-timing"><span class="balance-header">Time</span></div>
          <div class="action-content"><span class="balance-header">Action</span></div>
          <div class="action-parties"><span class="balance-header">From</span></div>
          <div class="action-parties"><span class="balance-header">To</span></div>
          <div class="action-asset"><span class="balance-header">Asset</span></div>
        </div>

        <!-- Trade Actions (Analyst acquires CollateralTokens from Sellers) -->
        <template v-for="(trade, idx) in tradeActions" :key="trade.id">
          <div class="action-item action-trade" :class="{ 'action-complete': trade.isComplete }">
            <div class="action-timing">{{ trade.timing }}</div>
            <div class="action-content">
              <span class="action-type-badge action-trade">Trade #{{ idx + 1 }}</span>
              <span v-if="trade.price" class="action-amount">{{ trade.price.toLocaleString() }} ADA</span>
            </div>
            <div class="action-parties">
              <span class="party-badge party-originator">{{ trade.sellerName }}</span>
            </div>
            <div class="action-parties">
              <span class="party-badge party-analyst">{{ trade.buyerName }}</span>
            </div>
            <div class="action-asset">
              <span class="asset-badge"><i class="fas fa-certificate"></i> {{ trade.loanAsset }} CT</span>
            </div>
          </div>
        </template>

        <!-- CLO Lifecycle Actions -->
        <template v-for="action in cloActions" :key="action.id">
          <div class="action-item" :class="{
            'action-clo-init': action.actionType === 'init',
            'action-disabled': !allTradesComplete && action.actionType !== 'trade'
          }">
            <div class="action-timing">{{ action.timing }}</div>
            <div class="action-content">
              <span class="action-type-badge" :class="'action-' + action.actionType">{{ action.label }}</span>
              <span v-if="action.description" class="action-description">{{ action.description }}</span>
            </div>
            <div class="action-parties">
              <span class="party-badge" :class="'party-' + action.executorRole.toLowerCase()">{{ action.executor }}</span>
            </div>
            <div class="action-parties">
              <span v-if="action.target" class="party-badge party-contract">{{ action.target }}</span>
              <span v-else class="party-badge party-empty">-</span>
            </div>
            <div class="action-asset">
              <span v-if="action.asset" class="asset-badge"><i :class="action.assetIcon"></i> {{ action.asset }}</span>
              <span v-else class="asset-empty">-</span>
            </div>
          </div>
        </template>
      </div>

      <!-- Summary -->
      <div class="clo-schedule-summary">
        <span class="summary-item">
          <i class="fas fa-exchange-alt"></i>
          {{ tradeActions.length }} trades
        </span>
        <span class="summary-item">
          <i class="fas fa-list-ol"></i>
          {{ cloActions.length }} CLO actions
        </span>
        <span class="summary-item">
          <i class="fas fa-coins"></i>
          {{ totalCollateralValue.toLocaleString() }} ADA collateral
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LoanConfig, CLOConfig } from '@/utils/pipeline/types'
import { NAME_TO_ID_MAP } from '@/utils/pipeline/types'

interface Props {
  loans: LoanConfig[]
  cloConfig: CLOConfig | undefined
  analystId: string | null
  isCollapsed: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'toggle-collapse': []
}>()

// Get loans eligible for CLO (not T1/T6 - must have successful acceptance)
const eligibleLoans = computed(() => {
  return props.loans.filter(l => !['T1', 'T6'].includes(l.lifecycleCase || 'T4'))
})

// CLO status based on dependencies
const cloStatus = computed(() => {
  if (eligibleLoans.value.length === 0) return 'no-collateral'
  if (!allTradesComplete.value) return 'pending-trades'
  return 'ready'
})

// Check if all trades are marked complete (simplified - in real impl would check state)
const allTradesComplete = computed(() => {
  // For now, assume trades complete after loan acceptance
  return eligibleLoans.value.length > 0 && eligibleLoans.value.every(l =>
    !!(l.lifecycleBuyerId || l.borrowerId)
  )
})

// Total collateral value from eligible loans
const totalCollateralValue = computed(() => {
  return eligibleLoans.value.reduce((sum, l) => sum + (l.principal || 0), 0)
})

// Get name from ID
function getNameFromId(id: string | null): string {
  if (!id) return 'Unknown'
  const entry = Object.entries(NAME_TO_ID_MAP).find(([_, v]) => v === id)
  return entry ? entry[0] : id.replace('orig-', '').replace('bor-', '').replace(/-/g, ' ')
}

// Get frequency info for timing display
function getFrequencyInfo(frequency?: number): { multiplier: number; unit: string } {
  const freq = frequency || 12
  switch (freq) {
    case 52: return { multiplier: 1, unit: 'wk' }
    case 12: return { multiplier: 1, unit: 'mo' }
    case 4: return { multiplier: 1, unit: 'qtr' }
    case 52594: return { multiplier: 10, unit: 'm' }
    case 105189: return { multiplier: 5, unit: 'm' }
    default: return { multiplier: 1, unit: 'p' }
  }
}

// Generate trade actions - Analyst buys CollateralTokens from Sellers
const tradeActions = computed(() => {
  const analystName = getNameFromId(props.analystId)

  return eligibleLoans.value.map((loan, idx) => {
    const sellerName = getNameFromId(loan.originatorId)
    const { multiplier, unit } = getFrequencyInfo(loan.frequency)
    // Trade happens after loan is accepted (T+0 of loan + small buffer)
    const tradeTiming = `T+${1 * multiplier}${unit}`

    return {
      id: `trade-${idx}`,
      loanIndex: idx,
      loanAsset: loan.asset,
      sellerName,
      buyerName: analystName,
      timing: tradeTiming,
      price: Math.round(loan.principal * 0.1), // ~10% of principal as trade price
      isComplete: !!(loan.lifecycleBuyerId || loan.borrowerId)
    }
  })
})

// Generate CLO lifecycle actions
const cloActions = computed(() => {
  const analystName = getNameFromId(props.analystId)
  const cloName = props.cloConfig?.name || 'CLO Bond'

  // Find the latest trade timing to determine CLO T+0
  const maxLoanPeriods = Math.max(...eligibleLoans.value.map(l => l.termMonths || 6))
  const sampleFreq = eligibleLoans.value[0]?.frequency || 12
  const { multiplier, unit } = getFrequencyInfo(sampleFreq)

  // CLO starts after all trades complete (after loan T+0 + 1 period buffer)
  const cloT0 = 2 * multiplier

  const actions = [
    {
      id: 'clo-init',
      actionType: 'init',
      label: 'Initialize',
      timing: `T+${cloT0}${unit}`,
      executor: analystName,
      executorRole: 'Analyst',
      target: 'CLO Contract',
      description: `Create ${cloName}`,
      asset: null,
      assetIcon: ''
    },
    {
      id: 'clo-bundle',
      actionType: 'bundle',
      label: 'Bundle',
      timing: `T+${cloT0}${unit}`,
      executor: analystName,
      executorRole: 'Analyst',
      target: cloName,
      description: `Lock ${eligibleLoans.value.length} CollateralTokens`,
      asset: `${eligibleLoans.value.length} CTs`,
      assetIcon: 'fas fa-certificate'
    },
    {
      id: 'clo-mint',
      actionType: 'mint',
      label: 'Mint Tranches',
      timing: `T+${cloT0}${unit}`,
      executor: analystName,
      executorRole: 'Analyst',
      target: cloName,
      description: `${props.cloConfig?.tranches?.length || 3} tranche tokens`,
      asset: 'Tranche NFTs',
      assetIcon: 'fas fa-layer-group'
    },
    {
      id: 'clo-collect',
      actionType: 'collect',
      label: 'Collect',
      timing: `T+${(cloT0 + maxLoanPeriods) * multiplier}${unit}`,
      executor: analystName,
      executorRole: 'Analyst',
      target: cloName,
      description: 'Collect loan payments',
      asset: 'ADA',
      assetIcon: 'fas fa-coins'
    },
    {
      id: 'clo-distribute',
      actionType: 'distribute',
      label: 'Distribute',
      timing: `T+${(cloT0 + maxLoanPeriods) * multiplier}${unit}`,
      executor: analystName,
      executorRole: 'Analyst',
      target: 'Tranche Holders',
      description: 'Waterfall distribution',
      asset: 'ADA',
      assetIcon: 'fas fa-coins'
    },
    {
      id: 'clo-mature',
      actionType: 'mature',
      label: 'Mature',
      timing: `T+${(cloT0 + maxLoanPeriods + 1) * multiplier}${unit}`,
      executor: analystName,
      executorRole: 'Analyst',
      target: cloName,
      description: 'Close bond, release collateral',
      asset: null,
      assetIcon: ''
    }
  ]

  return actions
})

function toggleCollapse() {
  emit('toggle-collapse')
}
</script>

<style scoped>
.clo-schedule-card {
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  overflow: hidden;
  border-left: 4px solid #14b8a6;
}

.clo-schedule-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
}

.clo-chevron {
  color: #64748b;
  font-size: 0.65rem;
  width: 10px;
  margin-right: 0.25rem;
}

.clo-schedule-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(20, 184, 166, 0.2);
  color: #5eead4;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
}

.clo-schedule-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.clo-schedule-name {
  font-weight: 600;
  color: #e2e8f0;
  font-size: 0.9rem;
}

.clo-schedule-details {
  font-size: 0.75rem;
  color: #94a3b8;
}

.clo-status-badge {
  padding: 0.2rem 0.5rem;
  font-size: 0.65rem;
  font-weight: 600;
  border-radius: 4px;
  text-transform: uppercase;
}

.clo-status-badge.status-ready {
  background: rgba(34, 197, 94, 0.2);
  color: #86efac;
}

.clo-status-badge.status-pending-trades {
  background: rgba(251, 191, 36, 0.2);
  color: #fcd34d;
}

.clo-status-badge.status-no-collateral {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
}

.clo-dependency-notice {
  padding: 0.5rem 1rem;
  background: rgba(20, 184, 166, 0.1);
  border-bottom: 1px solid rgba(20, 184, 166, 0.2);
  color: #5eead4;
  font-size: 0.75rem;
}

.clo-dependency-notice i {
  margin-right: 0.5rem;
}

.collapsed .clo-schedule-header {
  border-bottom: none;
}

.clo-action-timeline {
  padding: 0.5rem 0;
  max-height: 400px;
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

.action-item.action-trade {
  border-left-color: #f59e0b;
  background: rgba(245, 158, 11, 0.03);
}

.action-item.action-trade.action-complete {
  border-left-color: #22c55e;
}

.action-item.action-clo-init {
  border-left-color: #14b8a6;
  background: rgba(20, 184, 166, 0.05);
}

.action-item.action-disabled {
  opacity: 0.4;
}

.action-timing {
  font-family: 'SF Mono', monospace;
  font-size: 0.7rem;
  color: #64748b;
  min-width: 60px;
  text-align: right;
}

.action-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 180px;
  max-width: 250px;
}

.action-type-badge {
  display: inline-block;
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
}

.action-type-badge.action-trade { background: rgba(245, 158, 11, 0.2); color: #fcd34d; }
.action-type-badge.action-init { background: rgba(139, 92, 246, 0.2); color: #c4b5fd; }
.action-type-badge.action-bundle { background: rgba(20, 184, 166, 0.2); color: #5eead4; }
.action-type-badge.action-mint { background: rgba(16, 185, 129, 0.2); color: #34d399; }
.action-type-badge.action-collect { background: rgba(245, 158, 11, 0.2); color: #fcd34d; }
.action-type-badge.action-distribute { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }
.action-type-badge.action-mature { background: rgba(34, 197, 94, 0.2); color: #86efac; }

.action-amount {
  font-size: 0.7rem;
  color: #94a3b8;
}

.action-description {
  font-size: 0.65rem;
  color: #64748b;
}

.action-parties {
  min-width: 120px;
}

.party-badge {
  display: inline-block;
  padding: 0.1rem 0.35rem;
  border-radius: 3px;
  font-size: 0.65rem;
  font-weight: 500;
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.party-badge.party-originator { background: rgba(139, 92, 246, 0.2); color: #c4b5fd; }
.party-badge.party-analyst { background: rgba(20, 184, 166, 0.2); color: #5eead4; }
.party-badge.party-contract { background: rgba(100, 116, 139, 0.2); color: #94a3b8; }
.party-badge.party-empty { background: transparent; color: #475569; }

.action-asset {
  min-width: 100px;
}

.asset-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.1rem 0.35rem;
  border-radius: 3px;
  font-size: 0.65rem;
  font-weight: 500;
  background: rgba(168, 85, 247, 0.2);
  color: #c4b5fd;
}

.asset-badge i {
  font-size: 0.6rem;
}

.asset-empty {
  color: #475569;
  font-size: 0.65rem;
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

.balance-header {
  color: #64748b;
  font-size: 0.55rem;
  font-weight: 600;
  text-transform: uppercase;
}

.clo-schedule-summary {
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
