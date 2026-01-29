<template>
  <div class="collapsible-section" :class="{ 'collapsed': isCollapsed }">
    <div class="collapsible-header" @click="$emit('toggle')">
      <i class="fas" :class="isCollapsed ? 'fa-chevron-right' : 'fa-chevron-down'"></i>
      <h5 class="mb-0"><i class="fas fa-book mr-2"></i>Contract Reference</h5>
      <span class="badge badge-secondary ml-auto">Documentation</span>
    </div>
    <div v-show="!isCollapsed" class="collapsible-content">
      <!-- Contract Type Tabs (Loan / CLO) -->
      <div class="contract-ref-tabs">
        <div class="contract-type-tabs">
          <button
            class="contract-type-tab"
            :class="{ active: contractType === 'loan' }"
            @click="contractType = 'loan'"
          >
            <i class="fas fa-file-contract mr-1"></i> Loan Contract
          </button>
          <button
            class="contract-type-tab"
            :class="{ active: contractType === 'clo' }"
            @click="contractType = 'clo'"
          >
            <i class="fas fa-layer-group mr-1"></i> CLO Contract
          </button>
        </div>

        <!-- Sub-tabs (Actions / Lifecycle Cases) -->
        <div class="contract-sub-tabs">
          <button
            class="contract-sub-tab"
            :class="{ active: subTab === 'actions' }"
            @click="subTab = 'actions'"
          >
            <i class="fas fa-code mr-1"></i> Actions
          </button>
          <button
            class="contract-sub-tab"
            :class="{ active: subTab === 'lifecycle' }"
            @click="subTab = 'lifecycle'"
          >
            <i class="fas fa-clock mr-1"></i> Lifecycle Cases
          </button>
        </div>
      </div>

      <!-- Loan Contract Content -->
      <div v-if="contractType === 'loan'" class="contract-ref-content">
        <!-- Loan Actions -->
        <div v-if="subTab === 'actions'" class="contract-actions-reference">
          <p class="text-muted small mb-3">
            <i class="fas fa-info-circle mr-1"></i>
            Actions from <code>asset-transfer/src/actions</code> for amortized loan contracts
          </p>
          <div class="actions-grid">
            <div v-for="action in loanActions" :key="action.name" class="action-ref-card">
              <div class="action-ref-header">
                <span class="action-ref-name" :class="'action-' + action.name">{{ action.label }}</span>
                <span class="action-ref-executor">{{ action.executor }}</span>
              </div>
              <div class="action-ref-desc">{{ action.description }}</div>
              <div v-if="action.params.length > 0" class="action-ref-params">
                <div v-for="param in action.params" :key="param.name" class="param-item">
                  <code class="param-name">{{ param.name }}</code>
                  <span class="param-type">{{ param.type }}</span>
                  <span class="param-desc">{{ param.desc }}</span>
                </div>
              </div>
              <div v-else class="action-ref-params text-muted small">No parameters</div>
            </div>
          </div>
        </div>

        <!-- Loan Lifecycle Cases -->
        <div v-if="subTab === 'lifecycle'" class="lifecycle-ref">
          <p class="text-muted small mb-3">
            <i class="fas fa-info-circle mr-1"></i>
            Test case scenarios from <code>Tx_Tests.md</code> covering loan lifecycle paths
          </p>
          <div class="lifecycle-cases-detailed">
            <div v-for="lc in loanLifecycleCases" :key="lc.id" class="lifecycle-case-card" :class="'lc-border-' + lc.id">
              <div class="lifecycle-case-header">
                <span class="lifecycle-case-id" :class="'lc-' + lc.id">{{ lc.id }}</span>
                <span class="lifecycle-case-name">{{ lc.short }}</span>
              </div>
              <div class="lifecycle-case-desc">{{ lc.description }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- CLO Contract Content -->
      <div v-if="contractType === 'clo'" class="contract-ref-content">
        <!-- CLO Actions -->
        <div v-if="subTab === 'actions'" class="contract-actions-reference">
          <p class="text-muted small mb-3">
            <i class="fas fa-info-circle mr-1"></i>
            CLO contract actions for collateralized loan obligations
          </p>
          <div class="actions-grid">
            <div v-for="action in cloActions" :key="action.name" class="action-ref-card">
              <div class="action-ref-header">
                <span class="action-ref-name" :class="'action-' + action.name">{{ action.label }}</span>
                <span class="action-ref-executor">{{ action.executor }}</span>
              </div>
              <div class="action-ref-desc">{{ action.description }}</div>
              <div v-if="action.params.length > 0" class="action-ref-params">
                <div v-for="param in action.params" :key="param.name" class="param-item">
                  <code class="param-name">{{ param.name }}</code>
                  <span class="param-type">{{ param.type }}</span>
                  <span class="param-desc">{{ param.desc }}</span>
                </div>
              </div>
              <div v-else class="action-ref-params text-muted small">No parameters</div>
            </div>
          </div>
        </div>

        <!-- CLO Lifecycle Cases -->
        <div v-if="subTab === 'lifecycle'" class="lifecycle-ref">
          <p class="text-muted small mb-3">
            <i class="fas fa-info-circle mr-1"></i>
            Test case scenarios for CLO lifecycle paths
          </p>
          <div class="lifecycle-cases-detailed">
            <div v-for="lc in cloLifecycleCases" :key="lc.id" class="lifecycle-case-card" :class="'lc-border-' + lc.id">
              <div class="lifecycle-case-header">
                <span class="lifecycle-case-id" :class="'lc-' + lc.id">{{ lc.id }}</span>
                <span class="lifecycle-case-name">{{ lc.short }}</span>
              </div>
              <div class="lifecycle-case-desc">{{ lc.description }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  isCollapsed: boolean
}

defineProps<Props>()
defineEmits<{
  'toggle': []
}>()

const contractType = ref<'loan' | 'clo'>('loan')
const subTab = ref<'actions' | 'lifecycle'>('actions')

const loanActions = [
  {
    name: 'init',
    label: 'Initialize',
    description: 'Locks asset into contract, mints CollateralToken',
    executor: 'Originator (Seller)',
    params: [
      { name: 'buyer', type: 'string | null', desc: 'Reserved buyer address (null = open market)' },
      { name: 'base_asset', type: 'Asset', desc: 'Asset to transfer (policy, name, quantity)' },
      { name: 'principal', type: 'number', desc: 'Total loan amount in lovelace' },
      { name: 'apr', type: 'number', desc: 'Annual rate in basis points (2000 = 20%)' },
      { name: 'frequency', type: 'number', desc: 'Payments per year (12=monthly)' },
      { name: 'installments', type: 'number', desc: 'Total number of payments' },
      { name: 'deferFee', type: 'boolean', desc: 'Defer seller transfer fee to end' },
    ]
  },
  {
    name: 'update',
    label: 'Update Terms',
    description: 'Modify contract terms before acceptance',
    executor: 'Originator (Seller)',
    params: [
      { name: 'state', type: 'ContractState', desc: 'New contract state/terms' },
      { name: 'deferFee', type: 'boolean', desc: 'Update fee deferment setting' },
    ]
  },
  {
    name: 'cancel',
    label: 'Cancel',
    description: 'Burns CollateralToken, returns asset to seller',
    executor: 'Originator (Seller)',
    params: []
  },
  {
    name: 'accept',
    label: 'Accept',
    description: 'Buyer accepts terms, makes first payment, receives LiabilityToken',
    executor: 'Borrower (Buyer)',
    params: [
      { name: 'payment', type: 'number', desc: 'First installment amount in lovelace' },
      { name: 'timestamp', type: 'number', desc: 'Transaction timestamp' },
    ]
  },
  {
    name: 'pay',
    label: 'Pay',
    description: 'Make installment payment',
    executor: 'Borrower (Buyer)',
    params: [
      { name: 'payment', type: 'number', desc: 'Payment amount in lovelace' },
      { name: 'timestamp', type: 'number', desc: 'Transaction timestamp' },
    ]
  },
  {
    name: 'collect',
    label: 'Collect',
    description: 'Withdraw accumulated payments from contract',
    executor: 'Originator (Seller)',
    params: [
      { name: 'payment', type: 'number', desc: 'Amount to withdraw in lovelace' },
    ]
  },
  {
    name: 'complete',
    label: 'Complete Transfer',
    description: 'Burns tokens, transfers asset to buyer after final payment',
    executor: 'Borrower (Buyer)',
    params: []
  },
  {
    name: 'default',
    label: 'Claim Default',
    description: 'Seller reclaims asset after missed payments',
    executor: 'Originator (Seller)',
    params: []
  },
]

const cloActions = [
  {
    name: 'clo',
    label: 'Init',
    description: 'Create CLO structure with tranche configuration',
    executor: 'CLO Manager',
    params: [
      { name: 'name', type: 'string', desc: 'CLO pool name' },
      { name: 'tranches', type: 'Tranche[]', desc: 'Tranche definitions (senior, mezz, junior)' },
    ]
  },
  {
    name: 'clo',
    label: 'Bundle',
    description: 'Add collateral tokens from active loan contracts',
    executor: 'CLO Manager',
    params: [
      { name: 'collateralTokens', type: 'Asset[]', desc: 'Collateral tokens to bundle' },
    ]
  },
  {
    name: 'clo',
    label: 'Mint',
    description: 'Mint tranche tokens for investors',
    executor: 'CLO Manager',
    params: []
  },
  {
    name: 'clo',
    label: 'Distribute',
    description: 'Waterfall payment distribution to tranche holders',
    executor: 'CLO Manager',
    params: [
      { name: 'amount', type: 'number', desc: 'Amount to distribute in lovelace' },
    ]
  },
  {
    name: 'default',
    label: 'Liquidate',
    description: 'Early liquidation due to default threshold breach',
    executor: 'CLO Manager',
    params: []
  },
  {
    name: 'complete',
    label: 'Mature',
    description: 'Complete CLO lifecycle, return collateral',
    executor: 'CLO Manager',
    params: []
  },
]

const loanLifecycleCases = [
  { id: 'T1', short: 'Cancel', description: 'Init, Update, Cancel - Seller manages contract before buyer acceptance' },
  { id: 'T2', short: 'Default', description: 'Init, Accept, Default - Buyer accepts, misses payments, seller claims default' },
  { id: 'T3', short: 'Nominal (0%)', description: 'Complete Payment (0% Interest) - Full payment lifecycle, no interest' },
  { id: 'T4', short: 'Nominal', description: 'Complete Payment (w/ Interest) - Standard full lifecycle with interest' },
  { id: 'T5', short: 'Late Fee', description: 'Complete Payment (w/ Late Fee) - Missed payment window, late fee applied' },
  { id: 'T6', short: 'Reserved (Reject)', description: 'Buyer Reservation Guard - Wrong buyer attempts acceptance (expected rejection)' },
  { id: 'T7', short: 'Reserved + Fees', description: 'Buyer Reservation with Fees - Reserved buyer with transfer fees' },
]

const cloLifecycleCases = [
  { id: 'C1', short: 'Nominal', description: 'Create, Bundle, Distribute, Mature - Standard CLO lifecycle' },
  { id: 'C2', short: 'Partial Default', description: 'Some underlying loans default, waterfall distribution' },
  { id: 'C3', short: 'Liquidation', description: 'Major default triggers early liquidation' },
  { id: 'C4', short: 'Redemption', description: 'Early redemption by tranche holders' },
]
</script>

<style scoped>
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

.contract-ref-tabs {
  margin-bottom: 1rem;
}

.contract-type-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 0.75rem;
}

.contract-type-tab {
  padding: 0.5rem 1rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.375rem;
  color: #94a3b8;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.contract-type-tab:hover {
  background: rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.15);
}

.contract-type-tab.active {
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.4);
  color: #93c5fd;
}

.contract-sub-tabs {
  display: flex;
  gap: 0.25rem;
}

.contract-sub-tab {
  padding: 0.35rem 0.75rem;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 0.25rem;
  color: #64748b;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.contract-sub-tab:hover {
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.05);
}

.contract-sub-tab.active {
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.15);
}

.contract-ref-content {
  min-height: 200px;
}

.contract-actions-reference {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 0.375rem;
  padding: 0.75rem;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.75rem;
}

.action-ref-card {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.375rem;
  padding: 0.75rem;
}

.action-ref-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.action-ref-name {
  font-weight: 600;
  font-size: 0.85rem;
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
}

.action-ref-name.action-init { background: rgba(139, 92, 246, 0.2); color: #c4b5fd; }
.action-ref-name.action-update { background: rgba(14, 165, 233, 0.2); color: #7dd3fc; }
.action-ref-name.action-cancel { background: rgba(107, 114, 128, 0.3); color: #d1d5db; }
.action-ref-name.action-accept { background: rgba(34, 197, 94, 0.2); color: #86efac; }
.action-ref-name.action-pay { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }
.action-ref-name.action-complete { background: rgba(16, 185, 129, 0.2); color: #6ee7b7; }
.action-ref-name.action-collect { background: rgba(245, 158, 11, 0.2); color: #fcd34d; }
.action-ref-name.action-default { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }
.action-ref-name.action-clo { background: rgba(20, 184, 166, 0.2); color: #5eead4; }

.action-ref-executor {
  font-size: 0.65rem;
  color: #64748b;
  font-style: italic;
}

.action-ref-desc {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-bottom: 0.5rem;
  line-height: 1.4;
}

.action-ref-params {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 0.5rem;
}

.param-item {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  font-size: 0.65rem;
  padding: 0.2rem 0;
  align-items: baseline;
}

.param-name {
  background: rgba(0, 0, 0, 0.3);
  padding: 0.1rem 0.3rem;
  border-radius: 2px;
  color: #f8fafc;
  font-size: 0.65rem;
}

.param-type {
  color: #64748b;
  font-family: 'SF Mono', monospace;
}

.param-desc {
  color: #94a3b8;
  flex: 1;
  min-width: 100px;
}

.lifecycle-cases-detailed {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.75rem;
}

.lifecycle-case-card {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-left: 3px solid;
  border-radius: 0.375rem;
  padding: 0.75rem 1rem;
}

.lifecycle-case-card.lc-border-T1 { border-left-color: #6b7280; }
.lifecycle-case-card.lc-border-T2 { border-left-color: #ef4444; }
.lifecycle-case-card.lc-border-T3 { border-left-color: #22c55e; }
.lifecycle-case-card.lc-border-T4 { border-left-color: #3b82f6; }
.lifecycle-case-card.lc-border-T5 { border-left-color: #fbbf24; }
.lifecycle-case-card.lc-border-T6 { border-left-color: #dc2626; }
.lifecycle-case-card.lc-border-T7 { border-left-color: #8b5cf6; }
.lifecycle-case-card.lc-border-C1 { border-left-color: #14b8a6; }
.lifecycle-case-card.lc-border-C2 { border-left-color: #f59e0b; }
.lifecycle-case-card.lc-border-C3 { border-left-color: #ef4444; }
.lifecycle-case-card.lc-border-C4 { border-left-color: #8b5cf6; }

.lifecycle-case-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.lifecycle-case-id {
  font-weight: 700;
  font-size: 0.85rem;
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
}

.lifecycle-case-id.lc-T1 { color: #9ca3af; }
.lifecycle-case-id.lc-T2 { color: #fca5a5; }
.lifecycle-case-id.lc-T3 { color: #86efac; }
.lifecycle-case-id.lc-T4 { color: #93c5fd; }
.lifecycle-case-id.lc-T5 { color: #fcd34d; }
.lifecycle-case-id.lc-T6 { color: #fca5a5; }
.lifecycle-case-id.lc-T7 { color: #c4b5fd; }
.lifecycle-case-id.lc-C1 { color: #5eead4; }
.lifecycle-case-id.lc-C2 { color: #fcd34d; }
.lifecycle-case-id.lc-C3 { color: #fca5a5; }
.lifecycle-case-id.lc-C4 { color: #c4b5fd; }

.lifecycle-case-name {
  font-weight: 600;
  color: #e2e8f0;
  font-size: 0.9rem;
}

.lifecycle-case-desc {
  font-size: 0.75rem;
  color: #94a3b8;
  line-height: 1.4;
}
</style>
