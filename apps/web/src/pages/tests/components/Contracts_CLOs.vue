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
        <span class="collapse-icon">{{ expanded ? '▲' : '▼' }}</span>
      </div>
    </div>
    <div v-show="expanded" class="card-body p-0">
      <!-- Portfolio and Tranche Visualization -->
      <div class="row m-0 portfolio-section">
        <div class="col-lg-8 p-3 border-right-subtle">
          <h6 class="section-subtitle mb-3">
            <i class="fas fa-briefcase mr-2"></i>
            Loan Portfolio ({{ loanPortfolio.length }} Loans)
            <span class="badge badge-primary ml-2">{{ totalPrincipal.toLocaleString() }} ADA</span>
          </h6>
          <div class="loan-grid">
            <div v-for="loan in loanPortfolio" :key="loan.id"
                 class="loan-chip"
                 :class="{ 'loan-defaulted': loan.defaulted, 'loan-active': loan.active }">
              <div class="loan-chip-header">
                <span class="loan-number">#{{ loan.id }}</span>
                <span class="loan-status-dot" :class="loan.defaulted ? 'bg-danger' : loan.active ? 'bg-success' : 'bg-secondary'"></span>
              </div>
              <div class="loan-amount">{{ loan.principal }} ADA</div>
              <div class="loan-apr">{{ loan.apr }}% APR</div>
              <div class="loan-progress">
                <div class="progress" style="height: 3px;">
                  <div class="progress-bar" :class="loan.defaulted ? 'bg-danger' : 'bg-success'"
                       :style="{ width: `${(loan.payments / loan.totalPayments) * 100}%` }"></div>
                </div>
                <small class="text-muted">{{ loan.payments }}/{{ loan.totalPayments }}</small>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-4 p-3">
          <h6 class="section-subtitle mb-3">
            <i class="fas fa-layer-group mr-2"></i>
            CLO Tranche Structure
          </h6>
          <div class="tranche-stack">
            <div class="tranche tranche-senior">
              <div class="tranche-label">Senior</div>
              <div class="tranche-allocation">70%</div>
              <div class="tranche-value">{{ seniorValue.toFixed(1) }} ADA</div>
              <div class="tranche-tokens">700 tokens</div>
            </div>
            <div class="tranche tranche-mezzanine">
              <div class="tranche-label">Mezzanine</div>
              <div class="tranche-allocation">20%</div>
              <div class="tranche-value">{{ mezzValue.toFixed(1) }} ADA</div>
              <div class="tranche-tokens">200 tokens</div>
            </div>
            <div class="tranche tranche-junior">
              <div class="tranche-label">Junior</div>
              <div class="tranche-allocation">10%</div>
              <div class="tranche-value">{{ juniorValue.toFixed(1) }} ADA</div>
              <div class="tranche-tokens">100 tokens</div>
            </div>
          </div>
          <div class="waterfall-info mt-3">
            <small class="text-muted">
              <strong>Waterfall:</strong> Payments flow Senior → Mezz → Junior<br>
              <strong>Losses:</strong> Absorbed Junior → Mezz → Senior
            </small>
          </div>
        </div>
      </div>

      <hr class="m-0 section-divider">

      <!-- Empty State -->
      <div v-if="contracts.length === 0" class="empty-state">
        <i class="fas fa-layer-group"></i>
        <p>No CLO bond contracts initialized</p>
        <small>Run "CLO Bundle & Distribution" phase to create</small>
      </div>

      <!-- Contract List -->
      <div v-else class="contracts-list p-3">
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
          </div>

          <hr class="contract-divider">
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

export interface Loan {
  id: number
  principal: number
  apr: number
  payments: number
  totalPayments: number
  active: boolean
  defaulted: boolean
  asset: string
  borrower: string
}

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
  loanPortfolio: Loan[]
  totalLoanValue: number
}>()

defineEmits<{
  viewContract: [contract: CLOContract]
}>()

const expanded = ref(false)

const passedCount = computed(() => props.contracts.filter(c => c.status === 'passed').length)
const allPassed = computed(() => props.contracts.length > 0 && props.contracts.every(c => c.status === 'passed'))
const hasFailed = computed(() => props.contracts.some(c => c.status === 'failed'))
const hasRunning = computed(() => props.contracts.some(c => c.status === 'running'))

const totalPrincipal = computed(() =>
  props.loanPortfolio.reduce((sum, loan) => sum + loan.principal, 0)
)

const seniorValue = computed(() => props.totalLoanValue * 0.7)
const mezzValue = computed(() => props.totalLoanValue * 0.2)
const juniorValue = computed(() => props.totalLoanValue * 0.1)

function formatAda(lovelace?: number): string {
  if (!lovelace) return '0'
  return (lovelace / 1_000_000).toLocaleString()
}
</script>

<style scoped>
/* Portfolio section */
.portfolio-section {
  background: rgba(0, 0, 0, 0.15);
}

.border-right-subtle {
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.section-subtitle {
  color: #94a3b8;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
}

.section-divider {
  border-color: rgba(255, 255, 255, 0.1);
}

/* Loan grid */
.loan-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.75rem;
}

.loan-chip {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  padding: 0.75rem;
  transition: all 0.2s ease;
}

.loan-chip:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
}

.loan-chip.loan-active {
  border-color: rgba(16, 185, 129, 0.3);
}

.loan-chip.loan-defaulted {
  border-color: rgba(239, 68, 68, 0.3);
}

.loan-chip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.loan-number {
  font-size: 0.7rem;
  color: #94a3b8;
}

.loan-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.loan-amount {
  font-size: 0.9rem;
  font-weight: 600;
  color: #e2e8f0;
}

.loan-apr {
  font-size: 0.7rem;
  color: #94a3b8;
  margin-bottom: 0.5rem;
}

.loan-progress small {
  font-size: 0.65rem;
}

/* Tranche stack */
.tranche-stack {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tranche {
  padding: 0.75rem;
  border-radius: 0.375rem;
  display: grid;
  grid-template-columns: 1fr auto auto;
  grid-template-rows: auto auto;
  gap: 0.25rem 1rem;
  align-items: center;
}

.tranche-label {
  font-weight: 600;
  font-size: 0.85rem;
}

.tranche-allocation {
  font-weight: 700;
  font-size: 1rem;
  text-align: right;
}

.tranche-value {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  grid-column: 1;
}

.tranche-tokens {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.5);
  text-align: right;
  grid-column: 2 / -1;
}

.tranche-senior {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #10b981;
}

.tranche-mezzanine {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(245, 158, 11, 0.1) 100%);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #f59e0b;
}

.tranche-junior {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.1) 100%);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.waterfall-info {
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 0.375rem;
}

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
