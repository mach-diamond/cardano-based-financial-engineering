<template>
  <div class="card mb-4 contracts-card contracts-card--clo">
    <div class="card-header section-header" @click="expanded = !expanded">
      <div class="d-flex align-items-center">
        <div class="section-icon section-icon--clo mr-3">
          <i class="fas fa-layer-group"></i>
        </div>
        <div>
          <h5 class="mb-0 text-white">CLO Bond Contracts</h5>
          <small class="text-muted">{{ contracts.length }} contracts{{ contracts.length > 0 ? ` | ${passedCount} passed` : '' }}</small>
        </div>
      </div>
      <div class="d-flex align-items-center">
        <span v-if="contracts.length > 0" class="badge badge-pill badge-info mr-2">{{ contracts.length }}</span>
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
        <i class="fas fa-layer-group"></i>
        <p>No CLO bond contracts initialized</p>
        <small>Run "Initialize CLO Bonds" phase to populate</small>
      </div>

      <!-- Contract List -->
      <div v-else class="contracts-list">
        <div v-for="contract in contracts" :key="contract.id" class="contract-row">
          <!-- Icon -->
          <div class="contract-type-icon">
            <i class="fas fa-layer-group"></i>
          </div>

          <!-- Contract Info -->
          <div class="contract-info-section">
            <h5 class="mb-0">
              <span class="text-info">{{ contract.alias || 'CLO Bond' }}</span>
            </h5>
            <h6 class="mb-0">
              <span>Bond Contract</span> |
              <span class="text-muted">{{ contract.subtype || 'Waterfall' }}</span>
            </h6>
          </div>

          <!-- Tranche / Collateral Info -->
          <div class="contract-asset-section">
            <div class="asset-line">
              <i class="fa fa-cubes text-muted"></i>
              <span>{{ contract.tranches?.length || 3 }} Tranches</span>
              <span class="tranche-labels">
                <span class="tranche-badge senior">Senior</span>
                <span class="tranche-badge mezz">Mezz</span>
                <span class="tranche-badge junior">Junior</span>
              </span>
            </div>
            <div class="terms-line">
              <i class="fa fa-coins text-muted"></i>
              <span>{{ formatAda(contract.totalValue) }} ₳ Total Value</span>
            </div>
            <div class="terms-line">
              <i class="fa fa-file-contract text-muted"></i>
              <span>{{ contract.collateralCount || 0 }} Loan Contracts</span>
            </div>
          </div>

          <!-- Status -->
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

export interface CLOContract {
  id: string
  alias?: string
  subtype?: string
  tranches?: {
    name: string
    allocation: number
    yieldModifier: number
  }[]
  totalValue: number
  collateralCount: number
  status: 'pending' | 'running' | 'passed' | 'failed'
  manager?: string
}

const props = defineProps<{
  contracts: CLOContract[]
}>()

defineEmits<{
  viewContract: [contract: CLOContract]
  executeContract: [contract: CLOContract]
  runAll: []
}>()

const expanded = ref(true)

const passedCount = computed(() => props.contracts.filter(c => c.status === 'passed').length)
const allPassed = computed(() => props.contracts.length > 0 && props.contracts.every(c => c.status === 'passed'))
const hasFailed = computed(() => props.contracts.some(c => c.status === 'failed'))
const hasRunning = computed(() => props.contracts.some(c => c.status === 'running'))

function formatAda(lovelace?: number): string {
  if (!lovelace) return '0'
  return (lovelace / 1_000_000).toLocaleString()
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

/* Tranche badges */
.tranche-labels {
  display: flex;
  gap: 0.25rem;
  margin-left: 0.5rem;
}

.tranche-badge {
  font-size: 0.6rem;
  padding: 0.1rem 0.35rem;
  border-radius: 3px;
  font-weight: 600;
  text-transform: uppercase;
}

.tranche-badge.senior {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

.tranche-badge.mezz {
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
}

.tranche-badge.junior {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

/* Action buttons */
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
</style>
