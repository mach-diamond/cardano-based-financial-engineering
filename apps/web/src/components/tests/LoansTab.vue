<template>
  <div class="config-panel">
    <div class="panel-header d-flex justify-content-between align-items-start">
      <div>
        <h4>Loan Configuration</h4>
        <p class="text-muted">Define loan contracts between originators and borrowers</p>
      </div>
      <button class="btn btn-primary" @click="$emit('add-loan')">
        <i class="fas fa-plus mr-1"></i> Add Loan
      </button>
    </div>

    <!-- Assets to Mint Reference -->
    <div v-if="totalAssetsToMint.length > 0" class="assets-reference-bar mb-3">
      <div class="d-flex align-items-center justify-content-between mb-2">
        <span class="text-muted small"><i class="fas fa-coins mr-1"></i> Assets Available for Loans:</span>
      </div>
      <div class="asset-pills">
        <span
          v-for="(asset, idx) in totalAssetsToMint"
          :key="idx"
          class="asset-pill"
          :class="{
            'fully-allocated': asset.unallocated === 0 && !asset.overAllocated,
            'partially-allocated': asset.unallocated > 0 && asset.allocated > 0,
            'over-allocated': asset.overAllocated
          }"
        >
          <span class="asset-pill-originator">{{ asset.originator }}</span>
          <strong>{{ asset.name }}</strong>
          <span class="asset-pill-count" :class="{ 'over': asset.overAllocated }">{{ asset.allocated }}/{{ asset.total }}</span>
          <span v-if="asset.overAllocated" class="asset-pill-warning"><i class="fas fa-exclamation-triangle"></i> Over!</span>
          <span v-else-if="asset.unallocated > 0" class="asset-pill-remaining">({{ asset.unallocated }} left)</span>
        </span>
      </div>
    </div>
    <div v-else class="alert alert-info small mb-3">
      <i class="fas fa-info-circle mr-1"></i>
      No assets defined. Add assets to Originator wallets in the Wallets tab.
    </div>

    <div class="table-responsive loans-table-wide">
      <table class="table table-dark config-table loans-table">
        <thead>
          <tr>
            <th style="width: 30px;"></th>
            <th style="width: 40px;" class="sortable-header" @click="sortLoans('index')" title="Loan #">
              # <i v-if="sortColumn === 'index'" :class="sortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down'"></i>
            </th>
            <th style="min-width: 120px;" class="sortable-header" @click="sortLoans('originator')">
              Originator <i v-if="sortColumn === 'originator'" :class="sortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down'"></i>
            </th>
            <th style="min-width: 90px;">Asset</th>
            <th style="width: 55px;">Qty</th>
            <th style="width: 90px;" class="sortable-header" @click="sortLoans('principal')">
              Principal <i v-if="sortColumn === 'principal'" :class="sortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down'"></i>
            </th>
            <th style="width: 70px;" class="sortable-header" @click="sortLoans('apr')">
              APR % <i v-if="sortColumn === 'apr'" :class="sortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down'"></i>
            </th>
            <th style="width: 100px;">Frequency</th>
            <th style="width: 65px;">Term</th>
            <th style="min-width: 120px;">Borrower</th>
            <th style="width: 100px;" title="Transfer fee split (Buyer% / Seller%)">Fee Split</th>
            <th style="width: 50px;" title="Defer seller fee">Defer</th>
            <th style="width: 70px;" title="Late payment fee in ADA">Late Fee</th>
            <th style="min-width: 95px;">Lifecycle</th>
            <th style="width: 35px;"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(loan, index) in sortedLoans"
            :key="loan._uid || index"
            draggable="true"
            @dragstart="onDragStart($event, loan)"
            @dragover.prevent="onDragOver($event, loan)"
            @drop="onDrop($event, loan)"
            @dragend="onDragEnd"
            :class="{ 'drag-over': dropTargetUid === loan._uid }"
          >
            <td class="drag-handle" title="Drag to reorder">
              <i class="fas fa-grip-vertical"></i>
            </td>
            <td class="loan-index">{{ index + 1 }}</td>
            <td>
              <select v-model="loan.originatorId" class="form-control form-control-sm config-input" @change="onOriginatorChange(loan)">
                <option v-for="w in originatorsWithAssets" :key="w.id" :value="w.id">{{ w.name }}</option>
              </select>
            </td>
            <td>
              <select v-model="loan.asset" class="form-control form-control-sm config-input">
                <option value="">--</option>
                <option v-for="asset in getWalletAssets(loan.originatorId)" :key="asset" :value="asset">
                  {{ asset }}
                </option>
              </select>
            </td>
            <td>
              <input v-model.number="loan.quantity" type="number" min="1" class="form-control form-control-sm config-input input-narrow" />
            </td>
            <td>
              <input v-model.number="loan.principal" type="number" class="form-control form-control-sm config-input" />
            </td>
            <td>
              <input v-model.number="loan.apr" type="number" step="0.1" class="form-control form-control-sm config-input input-narrow" />
            </td>
            <td>
              <select v-model="loan.frequency" class="form-control form-control-sm config-input frequency-select">
                <option v-for="freq in frequencyOptions" :key="freq.value" :value="freq.value" :class="{ 'text-danger': freq.isTest }">
                  {{ freq.label }}
                </option>
              </select>
            </td>
            <td>
              <input v-model.number="loan.termMonths" type="number" class="form-control form-control-sm config-input input-narrow" />
            </td>
            <td>
              <select v-model="loan.borrowerId" class="form-control form-control-sm config-input">
                <option :value="null">Open</option>
                <option v-for="b in borrowerOptions" :key="b.id" :value="b.id">
                  {{ b.name }}
                </option>
              </select>
            </td>
            <td>
              <div class="fee-split-compact">
                <input v-model.number="loan.transferFeeBuyerPercent" type="number" min="0" max="100" class="form-control form-control-sm config-input fee-input" title="Buyer %" />
                <span class="fee-divider">/</span>
                <span class="fee-seller" title="Seller %">{{ 100 - (loan.transferFeeBuyerPercent || 50) }}</span>
              </div>
            </td>
            <td class="text-center">
              <input type="checkbox" v-model="loan.deferFee" class="form-check-input" :disabled="loan.principal < 10000" :title="loan.principal < 10000 ? 'Requires principal >= 10k' : 'Defer seller fee'" />
            </td>
            <td>
              <input v-model.number="loan.lateFee" type="number" min="0" step="1" class="form-control form-control-sm config-input input-narrow" placeholder="10" />
            </td>
            <td>
              <select v-model="loan.lifecycleCase" class="form-control form-control-sm config-input" :class="'lifecycle-' + (loan.lifecycleCase || 'T4')">
                <option v-for="lc in lifecycleCases" :key="lc.id" :value="lc.id" :title="lc.description">
                  {{ lc.id }}
                </option>
              </select>
            </td>
            <td>
              <button class="btn btn-sm btn-outline-danger btn-icon" @click="$emit('remove-loan', index)">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Loan Calculations Summary -->
    <LoanAnalysisGrid :loans="sortedLoans" class="mt-4" />

    <!-- Lifecycle Case Legend -->
    <div class="lifecycle-legend mt-3">
      <small class="text-muted">Lifecycle Cases:</small>
      <div class="legend-items">
        <span v-for="lc in lifecycleCases" :key="lc.id" class="legend-item" :class="'lifecycle-' + lc.id" :title="lc.description">
          <strong>{{ lc.id }}</strong>: {{ lc.short }}
        </span>
      </div>
    </div>

    <div class="panel-footer">
      <div class="stat-chips">
        <span class="stat-chip">{{ loans.length }} Total Loans</span>
        <span class="stat-chip reserved">{{ loanCounts.reserved }} Reserved</span>
        <span class="stat-chip open">{{ loanCounts.open }} Open Market</span>
        <span class="stat-chip">{{ loanCounts.totalPrincipal.toLocaleString() }} ADA Principal</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { LoanConfig, WalletConfig } from '@/utils/pipeline/types'
import { NAME_TO_ID_MAP } from '@/utils/pipeline/types'
import LoanAnalysisGrid from './LoanAnalysisGrid.vue'

interface Props {
  loans: LoanConfig[]
  wallets: WalletConfig[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'add-loan': []
  'remove-loan': [index: number]
  'reorder-loans': [fromIndex: number, toIndex: number]
}>()

const sortColumn = ref<string | null>(null)
const sortDirection = ref<'asc' | 'desc'>('asc')
const draggedUid = ref<string | null>(null)
const dropTargetUid = ref<string | null>(null)

const lifecycleCases = [
  { id: 'T1', short: 'Cancel', description: 'Init, Update, Cancel - Seller manages contract before buyer acceptance' },
  { id: 'T2', short: 'Default', description: 'Init, Accept, Default - Buyer accepts, misses payments, seller claims default' },
  { id: 'T3', short: 'Nominal (0%)', description: 'Complete Payment (0% Interest) - Full payment lifecycle, no interest' },
  { id: 'T4', short: 'Nominal', description: 'Complete Payment (w/ Interest) - Standard full lifecycle with interest' },
  { id: 'T5', short: 'Late Fee', description: 'Complete Payment (w/ Late Fee) - Missed payment window, late fee applied' },
  { id: 'T6', short: 'Reserved (Reject)', description: 'Buyer Reservation Guard - Wrong buyer attempts acceptance (expected rejection)' },
  { id: 'T7', short: 'Reserved + Fees', description: 'Buyer Reservation with Fees - Reserved buyer with transfer fees' },
]

const frequencyOptions = [
  { value: 12, label: 'Monthly', isTest: false },
  { value: 4, label: 'Quarterly', isTest: false },
  { value: 2, label: 'Bi-Annual', isTest: false },
  { value: 52, label: 'Weekly', isTest: false },
  { value: 365, label: 'Daily', isTest: true },
  { value: 8760, label: 'Hourly', isTest: true },
  { value: 17531, label: '30-min', isTest: true },
  { value: 35063, label: '15-min', isTest: true },
  { value: 52594, label: '10-min', isTest: true },
  { value: 105189, label: '5-min', isTest: true },
]

const sortedLoans = computed(() => {
  if (!sortColumn.value) return props.loans

  const sorted = [...props.loans]
  sorted.sort((a, b) => {
    let aVal: any, bVal: any

    switch (sortColumn.value) {
      case 'index':
        return 0
      case 'originator':
        aVal = a.originatorId || ''
        bVal = b.originatorId || ''
        break
      case 'principal':
        aVal = a.principal
        bVal = b.principal
        break
      case 'apr':
        aVal = a.apr
        bVal = b.apr
        break
      default:
        return 0
    }

    if (aVal < bVal) return sortDirection.value === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDirection.value === 'asc' ? 1 : -1
    return 0
  })

  return sorted
})

const originatorsWithAssets = computed(() => {
  return props.wallets
    .filter(w => w.role === 'Originator' && w.assets && w.assets.length > 0)
    .map(w => ({
      id: NAME_TO_ID_MAP[w.name] || `wallet-${w.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: w.name,
      assetCount: w.assets?.length || 0
    }))
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

const totalAssetsToMint = computed(() => {
  const assetMap = new Map<string, { total: number; allocated: number; originator: string }>()

  for (const wallet of props.wallets) {
    if (wallet.role === 'Originator' && wallet.assets) {
      for (const asset of wallet.assets) {
        const existing = assetMap.get(asset.name) || { total: 0, allocated: 0, originator: wallet.name }
        existing.total += asset.quantity
        if (!existing.originator) existing.originator = wallet.name
        assetMap.set(asset.name, existing)
      }
    }
  }

  for (const loan of props.loans) {
    if (loan.asset && assetMap.has(loan.asset)) {
      const asset = assetMap.get(loan.asset)!
      asset.allocated += loan.quantity || 0
    }
  }

  return Array.from(assetMap.entries()).map(([name, data]) => ({
    name,
    total: data.total,
    allocated: data.allocated,
    unallocated: data.total - data.allocated,
    overAllocated: data.allocated > data.total,
    allocatedPercent: data.total > 0 ? Math.min(100, Math.round((data.allocated / data.total) * 100)) : 0,
    originator: data.originator,
  }))
})

const loanCounts = computed(() => ({
  reserved: props.loans.filter(l => l.reservedBuyer).length,
  open: props.loans.filter(l => !l.reservedBuyer).length,
  totalPrincipal: props.loans.reduce((sum, l) => sum + l.principal, 0),
}))

function getWalletAssets(walletId: string): string[] {
  if (!walletId) return []

  const wallet = props.wallets.find(w => {
    const wid = NAME_TO_ID_MAP[w.name] || `wallet-${w.name.toLowerCase().replace(/\s+/g, '-')}`
    return wid === walletId
  })

  if (!wallet || !wallet.assets) return []
  return wallet.assets.map(a => a.name)
}

function onOriginatorChange(loan: any) {
  const assets = getWalletAssets(loan.originatorId)
  if (!assets.includes(loan.asset)) {
    loan.asset = assets.length > 0 ? assets[0] : ''
  }
}

function sortLoans(column: string) {
  if (sortColumn.value === column) {
    if (sortDirection.value === 'asc') {
      sortDirection.value = 'desc'
    } else {
      sortColumn.value = null
      sortDirection.value = 'asc'
    }
  } else {
    sortColumn.value = column
    sortDirection.value = 'asc'
  }
}

function onDragStart(event: DragEvent, loan: any) {
  draggedUid.value = loan._uid
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

function onDragOver(_event: DragEvent, loan: any) {
  dropTargetUid.value = loan._uid
}

function onDrop(_event: DragEvent, targetLoan: any) {
  if (!draggedUid.value || draggedUid.value === targetLoan._uid) return

  sortColumn.value = null

  const sourceIndex = props.loans.findIndex(l => l._uid === draggedUid.value)
  const targetIndex = props.loans.findIndex(l => l._uid === targetLoan._uid)

  if (sourceIndex !== -1 && targetIndex !== -1) {
    emit('reorder-loans', sourceIndex, targetIndex)
  }

  draggedUid.value = null
  dropTargetUid.value = null
}

function onDragEnd() {
  draggedUid.value = null
  dropTargetUid.value = null
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

.panel-footer {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.stat-chips {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.stat-chip {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.8rem;
  background: rgba(255, 255, 255, 0.1);
  color: #94a3b8;
}

.stat-chip.reserved { background: rgba(14, 165, 233, 0.2); color: #38bdf8; }
.stat-chip.open { background: rgba(249, 115, 22, 0.2); color: #fb923c; }

.config-table {
  background: transparent;
  margin-bottom: 0;
}

.config-table thead th {
  background: rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  font-weight: 500;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0.6rem 0.5rem;
  white-space: nowrap;
}

.config-table tbody tr {
  background: rgba(0, 0, 0, 0.15);
}

.config-table tbody tr:hover {
  background: rgba(0, 0, 0, 0.25);
}

.config-table td {
  border-color: rgba(255, 255, 255, 0.05);
  vertical-align: middle;
  padding: 0.4rem 0.5rem;
}

.config-input.form-control-sm {
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
  height: auto;
  min-height: 32px;
  background: rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
}

.config-input.form-control-sm:focus {
  background: rgba(0, 0, 0, 0.4);
  border-color: #38bdf8;
  color: #f1f5f9;
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
}

.config-table .btn-icon {
  padding: 0.25rem 0.5rem;
  line-height: 1;
}

.loans-table-wide {
  overflow-x: auto;
}

.loans-table-wide table {
  min-width: 1200px;
}

.input-narrow {
  width: 70px !important;
  min-width: 70px;
  text-align: center;
}

.fee-split-compact {
  display: flex;
  align-items: center;
  gap: 2px;
}

.fee-split-compact .fee-input {
  width: 42px !important;
  min-width: 42px;
  text-align: center;
  padding: 0.25rem 0.3rem;
  font-size: 0.8rem;
}

.fee-divider {
  color: #64748b;
  font-size: 0.75rem;
}

.fee-seller {
  color: #a78bfa;
  font-size: 0.8rem;
  font-weight: 500;
  min-width: 28px;
  text-align: center;
}

.frequency-select {
  font-size: 0.75rem !important;
  padding: 0.25rem 0.4rem !important;
}

.drag-handle {
  cursor: grab;
  color: #475569;
  text-align: center;
  width: 30px;
  padding: 0.4rem 0.25rem !important;
}

.drag-handle:hover {
  color: #94a3b8;
}

.drag-handle:active {
  cursor: grabbing;
}

tr.drag-over {
  background: rgba(59, 130, 246, 0.15) !important;
  border-top: 2px solid #3b82f6;
}

.loan-index {
  font-weight: 700;
  color: #94a3b8;
  text-align: center;
  font-size: 0.85rem;
}

.sortable-header {
  cursor: pointer;
  user-select: none;
  transition: background 0.15s ease;
}

.sortable-header:hover {
  background: rgba(255, 255, 255, 0.05);
}

.sortable-header i {
  margin-left: 0.25rem;
  font-size: 0.65rem;
  opacity: 0.8;
}

.lifecycle-T1, select.lifecycle-T1 { background: rgba(107, 114, 128, 0.3) !important; border-left: 3px solid #6b7280; }
.lifecycle-T2, select.lifecycle-T2 { background: rgba(239, 68, 68, 0.3) !important; border-left: 3px solid #ef4444; }
.lifecycle-T3, select.lifecycle-T3 { background: rgba(34, 197, 94, 0.3) !important; border-left: 3px solid #22c55e; }
.lifecycle-T4, select.lifecycle-T4 { background: rgba(59, 130, 246, 0.3) !important; border-left: 3px solid #3b82f6; }
.lifecycle-T5, select.lifecycle-T5 { background: rgba(251, 191, 36, 0.3) !important; border-left: 3px solid #fbbf24; }
.lifecycle-T6, select.lifecycle-T6 { background: rgba(239, 68, 68, 0.2) !important; border-left: 3px solid #dc2626; }
.lifecycle-T7, select.lifecycle-T7 { background: rgba(139, 92, 246, 0.3) !important; border-left: 3px solid #8b5cf6; }

.lifecycle-legend {
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 0.5rem;
}

.legend-items {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.legend-item {
  padding: 0.2rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  cursor: help;
}

.legend-item.lifecycle-T1 { background: rgba(107, 114, 128, 0.4); color: #d1d5db; }
.legend-item.lifecycle-T2 { background: rgba(239, 68, 68, 0.4); color: #fca5a5; }
.legend-item.lifecycle-T3 { background: rgba(34, 197, 94, 0.4); color: #86efac; }
.legend-item.lifecycle-T4 { background: rgba(59, 130, 246, 0.4); color: #93c5fd; }
.legend-item.lifecycle-T5 { background: rgba(251, 191, 36, 0.4); color: #fde047; }
.legend-item.lifecycle-T6 { background: rgba(239, 68, 68, 0.3); color: #f87171; }
.legend-item.lifecycle-T7 { background: rgba(139, 92, 246, 0.4); color: #c4b5fd; }

.assets-reference-bar {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
}

.asset-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.asset-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.8rem;
  background: rgba(139, 92, 246, 0.2);
  border: 1px solid rgba(139, 92, 246, 0.3);
  color: #c4b5fd;
}

.asset-pill.fully-allocated {
  background: rgba(34, 197, 94, 0.2);
  border-color: rgba(34, 197, 94, 0.3);
  color: #86efac;
}

.asset-pill.partially-allocated {
  background: rgba(245, 158, 11, 0.2);
  border-color: rgba(245, 158, 11, 0.3);
  color: #fcd34d;
}

.asset-pill.over-allocated {
  background: rgba(239, 68, 68, 0.25);
  border-color: rgba(239, 68, 68, 0.5);
  color: #fca5a5;
}

.asset-pill-originator {
  font-size: 0.7rem;
  color: #94a3b8;
  padding-right: 0.25rem;
  border-right: 1px solid rgba(255, 255, 255, 0.15);
  margin-right: 0.25rem;
}

.asset-pill-count {
  font-weight: 600;
  background: rgba(255, 255, 255, 0.1);
  padding: 0.1rem 0.4rem;
  border-radius: 0.25rem;
}

.asset-pill-count.over {
  background: rgba(239, 68, 68, 0.3);
  color: #f87171;
}

.asset-pill-remaining {
  font-size: 0.7rem;
  opacity: 0.8;
}

.asset-pill-warning {
  font-size: 0.7rem;
  color: #f87171;
  font-weight: 600;
}

.form-check-input {
  background-color: rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.2);
}

.form-check-input:checked {
  background-color: #3b82f6;
  border-color: #3b82f6;
}

.loans-table .form-check-input {
  margin: 0;
  position: relative;
}

.loans-table .form-check-input:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
</style>
