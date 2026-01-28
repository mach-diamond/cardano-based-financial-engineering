<template>
  <div class="card mb-4 contracts-card contracts-card--loan">
    <div class="card-header section-header" @click="expanded = !expanded">
      <div class="d-flex align-items-center">
        <div class="section-icon section-icon--loan mr-3">
          <i class="fas fa-exchange-alt"></i>
        </div>
        <div>
          <h5 class="mb-0 text-white">Loan Contracts</h5>
          <small class="text-muted">{{ contracts.length }} contracts{{ contracts.length > 0 ? ` | ${passedCount} passed` : '' }}</small>
        </div>
      </div>
      <div class="d-flex align-items-center">
        <span v-if="contracts.length > 0" class="badge badge-pill badge-primary mr-2">{{ contracts.length }}</span>
        <span v-if="contracts.length === 0" class="badge badge-secondary mr-2">Empty</span>
        <span v-else-if="allPassed" class="badge badge-success mr-2">All Passed</span>
        <span v-else-if="hasFailed" class="badge badge-danger mr-2">Failed</span>
        <span v-else-if="hasRunning" class="badge badge-warning mr-2">Running</span>
        <span v-else class="badge badge-secondary mr-2">Pending</span>
        <button v-if="contracts.length > 0" @click.stop="$emit('runAll')" class="btn btn-sm btn-outline-success mr-2" :disabled="hasRunning">
          <i class="fas fa-play mr-1"></i> Run All
        </button>
        <span class="collapse-icon">{{ expanded ? '▲' : '▼' }}</span>
      </div>
    </div>
    <div v-show="expanded" class="card-body">
      <!-- Empty State -->
      <div v-if="contracts.length === 0" class="empty-state">
        <i class="fas fa-file-contract"></i>
        <p>No loan contracts initialized</p>
        <small>Run "Initialize Loan Contracts" phase to populate</small>
      </div>

      <!-- Contract List -->
      <div v-else class="contracts-list">
        <div v-for="contract in contracts" :key="contract.id" class="contract-row">
          <!-- Icon -->
          <div class="contract-type-icon">
            <i class="fas fa-exchange-alt"></i>
          </div>

          <!-- Contract Info -->
          <div class="contract-info-section">
            <h5 class="mb-0">
              <span class="text-info">{{ contract.alias || 'Loan Contract' }}</span>
            </h5>
            <h6 class="mb-0">
              <span>Transfer Contract</span> |
              <span class="text-muted">{{ contract.subtype || 'Asset-Backed' }}</span>
            </h6>
          </div>

          <!-- Base Token / Collateral -->
          <div class="contract-asset-section">
            <div class="asset-line">
              <i class="fa fa-lock text-muted"></i>
              <span>{{ contract.collateral?.quantity || 1 }}</span>
              <span class="asset-name">{{ contract.collateral?.assetName || 'NFT' }}</span>
              <i class="text-muted">{{ formatPolicy(contract.collateral?.policyId) }}</i>
            </div>
            <div class="terms-line">
              <i class="fa fa-chart-line text-muted"></i>
              <span>{{ formatAda(contract.principal) }} ₳ at {{ contract.apr || 5 }}% APR</span>
            </div>
            <div class="terms-line">
              <i class="fa fa-clock text-muted"></i>
              <span>{{ contract.termLength || '12 months' }}</span>
            </div>
          </div>

          <!-- State Info (NEW) -->
          <div class="contract-state-section">
            <!-- Contract Status Badge -->
            <div class="state-badge mb-1">
              <span v-if="contract.state?.isActive && !contract.state?.isPaidOff" class="badge badge-success badge-sm">Active</span>
              <span v-else-if="contract.state?.isPaidOff" class="badge badge-info badge-sm">Paid Off</span>
              <span v-else-if="contract.state?.isDefaulted" class="badge badge-danger badge-sm">Defaulted</span>
              <span v-else class="badge badge-warning badge-sm">Pending</span>
            </div>
            <!-- Progress Bar -->
            <div class="progress-mini" v-if="contract.state">
              <div class="progress-bar bg-success" :style="{ width: `${getProgressPercent(contract)}%` }"></div>
            </div>
            <div class="state-info">
              <span v-if="contract.state" class="text-muted small">
                {{ getProgressPercent(contract).toFixed(0) }}% | {{ getCurrentInstallment(contract) }}/{{ contract.installments || 12 }}
              </span>
              <span v-else class="text-muted small">--</span>
            </div>
          </div>

          <!-- Test Status -->
          <div class="contract-status-section">
            <i v-if="contract.status === 'passed'" class="fas fa-check-circle text-success"></i>
            <i v-else-if="contract.status === 'running'" class="fas fa-spinner fa-spin text-warning"></i>
            <i v-else-if="contract.status === 'failed'" class="fas fa-times-circle text-danger"></i>
            <i v-else class="far fa-circle text-muted"></i>
          </div>

          <!-- Actions -->
          <div class="contract-actions">
            <button @click="$emit('viewContract', contract)" class="btn btn-sm btn-outline-info">
              View
            </button>
            <button @click="$emit('executeContract', contract)" class="btn btn-sm btn-outline-success" :disabled="contract.status === 'running'" title="Execute">
              <i class="fas fa-bolt"></i>
            </button>
          </div>

          <hr class="contract-divider">
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

export interface LoanContractState {
  isActive: boolean
  isPaidOff: boolean
  isDefaulted: boolean
  balance: number
  startTime?: number
  lastPayment?: {
    amount: number
    timestamp: number
    installmentNumber: number
  }
}

export interface LoanContract {
  id: string
  alias?: string
  subtype?: string
  collateral?: {
    quantity: number
    assetName: string
    policyId: string
  }
  principal: number
  apr: number // basis points
  installments?: number
  frequency?: number // payments per year
  termLength?: string
  status: 'pending' | 'running' | 'passed' | 'failed'
  borrower?: string
  originator?: string
  contractAddress?: string
  policyId?: string
  state?: LoanContractState
}

const props = defineProps<{
  contracts: LoanContract[]
}>()

defineEmits<{
  viewContract: [contract: LoanContract]
  executeContract: [contract: LoanContract]
  runAll: []
}>()

const expanded = ref(false)

const passedCount = computed(() => props.contracts.filter(c => c.status === 'passed').length)
const allPassed = computed(() => props.contracts.length > 0 && props.contracts.every(c => c.status === 'passed'))
const hasFailed = computed(() => props.contracts.some(c => c.status === 'failed'))
const hasRunning = computed(() => props.contracts.some(c => c.status === 'running'))

function formatPolicy(policyId?: string): string {
  if (!policyId) return ''
  if (policyId.length < 12) return policyId
  return `${policyId.slice(0, 8)}...`
}

function formatAda(lovelace?: number): string {
  if (!lovelace) return '0'
  return (lovelace / 1_000_000).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function getProgressPercent(contract: LoanContract): number {
  const principal = contract.principal || 1
  const balance = contract.state?.balance ?? contract.principal
  return ((principal - balance) / principal) * 100
}

function getCurrentInstallment(contract: LoanContract): number {
  if (!contract.state?.lastPayment) return 0
  return contract.state.lastPayment.installmentNumber || 0
}
</script>

<style scoped>
/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: rgba(255, 255, 255, 0.4);
}

.empty-state i {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
}

.empty-state p {
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
}

.empty-state small {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.3);
}

/* Contracts list */
.contracts-list {
  display: flex;
  flex-direction: column;
}

.contract-row {
  display: grid;
  grid-template-columns: 40px 1.5fr 2fr 1fr 40px auto;
  gap: 1rem;
  align-items: center;
  padding: 0.75rem 0.5rem;
  position: relative;
}

.contract-divider {
  position: absolute;
  bottom: 0;
  left: 0.5rem;
  right: 0.5rem;
  margin: 0;
  border-color: rgba(255, 255, 255, 0.05);
}

.contract-row:last-child .contract-divider {
  display: none;
}

/* Icon */
.contract-type-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(23, 162, 184, 0.2);
  border-radius: 0.5rem;
  color: #17a2b8;
}

/* Typography */
.contract-info-section h5 {
  font-size: 0.9rem;
}

.contract-info-section h6 {
  font-size: 0.75rem;
  color: #6c757d;
}

/* Asset display */
.asset-line, .terms-line {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #fff;
}

.asset-line i:first-child,
.terms-line i:first-child {
  width: 16px;
  text-align: center;
}

.asset-name {
  font-weight: 600;
  color: #fbbf24;
}

/* State section (NEW) */
.contract-state-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  min-width: 80px;
}

.state-badge .badge-sm {
  font-size: 0.65rem;
  padding: 0.2rem 0.5rem;
}

.progress-mini {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.progress-mini .progress-bar {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.state-info {
  font-size: 0.7rem;
  white-space: nowrap;
}

/* Status icon */
.contract-status-section {
  display: flex;
  align-items: center;
  justify-content: center;
}

.contract-status-section i {
  font-size: 1.25rem;
}

/* Action buttons */
.contract-actions {
  display: flex;
  gap: 0.5rem;
}

.contract-actions .btn {
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.contract-actions .btn-outline-success {
  width: 32px;
  padding: 0;
}

/* Responsive */
@media (max-width: 992px) {
  .contract-row {
    grid-template-columns: 36px 1fr auto auto;
    gap: 0.75rem;
  }

  .contract-asset-section,
  .contract-state-section {
    display: none;
  }
}
</style>
