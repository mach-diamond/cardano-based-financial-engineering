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
        <!-- Sortable Headers -->
        <div class="contracts-header">
          <div class="header-cell header-icon"></div>
          <div class="header-cell header-info">Contract</div>
          <div class="header-cell header-asset sortable" @click="toggleSort('asset')">
            Asset
            <i :class="getSortIcon('asset')"></i>
          </div>
          <div class="header-cell header-term sortable" @click="toggleSort('term')">
            Term
            <i :class="getSortIcon('term')"></i>
          </div>
          <div class="header-cell header-status">Status</div>
          <div class="header-cell header-actions">Actions</div>
        </div>
        <div v-for="contract in sortedContracts" :key="contract.id" class="contract-row">
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
                {{ getProgressPercent(contract).toFixed(0) }}% | {{ getCurrentInstallment(contract) }}/{{ getInstallments(contract) }}
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
            <button @click="toggleContractDetails(contract.id)" class="btn btn-sm btn-outline-secondary" title="Show Datum">
              <i :class="expandedContracts.has(contract.id) ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
            </button>
          </div>

          <hr class="contract-divider">

          <!-- Expanded Details with Datum History -->
          <div v-if="expandedContracts.has(contract.id)" class="contract-details-expanded">
            <div class="datum-section">
              <h6 class="datum-header">
                <i class="fas fa-database mr-2"></i>Contract Datum
                <button @click="fetchDatumHistory(contract)" class="btn btn-xs btn-outline-info ml-2">
                  <i class="fas fa-sync-alt"></i>
                </button>
              </h6>

              <!-- Datum Card Carousel -->
              <div class="datum-carousel" v-if="datumHistory.get(contract.id)?.length">
                <div
                  v-for="(datum, idx) in datumHistory.get(contract.id)"
                  :key="idx"
                  class="datum-card"
                  :class="{ active: idx === 0 }"
                >
                  <div class="datum-card-header">
                    <span class="badge" :class="idx === 0 ? 'badge-success' : 'badge-secondary'">
                      {{ idx === 0 ? 'Current' : `v${datumHistory.get(contract.id)!.length - idx}` }}
                    </span>
                  </div>
                  <div class="datum-card-body">
                    <div class="datum-field">
                      <label>Status:</label>
                      <span :class="datum.buyer ? 'text-success' : 'text-warning'">
                        {{ datum.buyer ? 'Active' : 'Pending' }}
                      </span>
                    </div>
                    <div class="datum-field" v-if="datum.buyer">
                      <label>Buyer:</label>
                      <span>{{ datum.buyer?.slice(0, 16) }}...</span>
                    </div>
                    <div class="datum-field" v-if="datum.base_asset">
                      <label>Asset:</label>
                      <span>{{ formatAssetName(datum.base_asset?.asset_name) }}</span>
                    </div>
                    <div class="datum-field" v-if="datum.balance !== undefined">
                      <label>Balance:</label>
                      <span>{{ formatLovelace(datum.balance) }} ₳</span>
                    </div>
                    <div class="datum-field" v-if="datum.terms">
                      <label>Principal:</label>
                      <span>{{ formatLovelace(datum.terms.principal) }} ₳</span>
                    </div>
                    <div class="datum-field" v-if="datum.terms">
                      <label>Installments:</label>
                      <span>{{ datum.terms.installments || '?' }}</span>
                    </div>
                    <div class="datum-field" v-if="datum.last_payment">
                      <label>Last Payment:</label>
                      <span>{{ formatLovelace(datum.last_payment.amount) }} ₳</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Loading or Empty State -->
              <div v-else class="datum-empty">
                <i class="fas fa-info-circle text-muted"></i>
                <span>Click refresh to load datum from database</span>
              </div>

              <!-- Raw JSON Toggle -->
              <div class="datum-raw-toggle mt-2">
                <button @click="toggleRawJson(contract.id)" class="btn btn-xs btn-outline-secondary">
                  <i class="fas fa-code mr-1"></i>
                  {{ showRawJson.has(contract.id) ? 'Hide' : 'Show' }} Raw JSON
                </button>
              </div>
              <pre v-if="showRawJson.has(contract.id) && datumHistory.get(contract.id)?.[0]" class="datum-raw-json">{{ JSON.stringify(datumHistory.get(contract.id)?.[0], null, 2) }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'

export interface LoanContractState {
  isActive: boolean
  isPaidOff: boolean
  isDefaulted?: boolean
  balance: number
  startTime?: number
  paymentCount?: number // Track how many payments have been made
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

interface ContractDatum {
  buyer?: string | null
  base_asset?: {
    policy?: string
    asset_name?: string
    quantity?: number | string
  }
  balance?: number | string
  terms?: {
    principal?: number | string
    apr?: number | string
    frequency?: number | string
    installments?: number | string
    time?: number | string | null
    fees?: {
      late_fee?: number | string
      transfer_fee_seller?: number | string
      transfer_fee_buyer?: number | string
      referral_fee?: number | string
      referral_fee_addr?: string | null
    }
  }
  last_payment?: {
    amount?: number | string
    time?: number | string
  } | null
}

const props = defineProps<{
  contracts: LoanContract[]
}>()

defineEmits<{
  viewContract: [contract: LoanContract]
}>()

const expanded = ref(false)
const expandedContracts = reactive(new Set<string>())
const datumHistory = reactive(new Map<string, ContractDatum[]>())
const showRawJson = reactive(new Set<string>())

// Sorting state
const sortField = ref<'asset' | 'term' | null>(null)
const sortDirection = ref<'asc' | 'desc'>('asc')

function toggleSort(field: 'asset' | 'term') {
  if (sortField.value === field) {
    // Toggle direction or clear
    if (sortDirection.value === 'asc') {
      sortDirection.value = 'desc'
    } else {
      sortField.value = null
      sortDirection.value = 'asc'
    }
  } else {
    sortField.value = field
    sortDirection.value = 'asc'
  }
}

function getSortIcon(field: 'asset' | 'term'): string {
  if (sortField.value !== field) return 'fas fa-sort text-muted'
  return sortDirection.value === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down'
}

const sortedContracts = computed(() => {
  if (!sortField.value) return props.contracts

  return [...props.contracts].sort((a, b) => {
    let comparison = 0

    if (sortField.value === 'asset') {
      const assetA = (a.collateral?.assetName || '').toLowerCase()
      const assetB = (b.collateral?.assetName || '').toLowerCase()
      comparison = assetA.localeCompare(assetB)
    } else if (sortField.value === 'term') {
      const termA = getInstallments(a)
      const termB = getInstallments(b)
      comparison = termA - termB
    }

    return sortDirection.value === 'asc' ? comparison : -comparison
  })
})

function toggleContractDetails(contractId: string) {
  if (expandedContracts.has(contractId)) {
    expandedContracts.delete(contractId)
  } else {
    expandedContracts.add(contractId)
  }
}

function toggleRawJson(contractId: string) {
  if (showRawJson.has(contractId)) {
    showRawJson.delete(contractId)
  } else {
    showRawJson.add(contractId)
  }
}

async function fetchDatumHistory(contract: LoanContract) {
  if (!contract.contractAddress) {
    console.warn('No contract address to fetch datum for')
    return
  }

  try {
    const response = await fetch(`/api/loan/debug/datum/${encodeURIComponent(contract.contractAddress)}`)
    const data = await response.json()

    if (data.success && data.contractDatum) {
      // Store as array (future: could track history)
      datumHistory.set(contract.id, [data.contractDatum])
    } else {
      console.warn('No datum in response:', data)
      // Store empty array to show "no datum" state
      datumHistory.set(contract.id, [])
    }
  } catch (err) {
    console.error('Failed to fetch datum:', err)
    datumHistory.set(contract.id, [])
  }
}

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

function formatLovelace(value?: number | string): string {
  if (value === undefined || value === null) return '0'
  const num = typeof value === 'string' ? parseInt(value) : value
  if (isNaN(num)) return '0'
  return (num / 1_000_000).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function formatAssetName(hexOrText?: string): string {
  if (!hexOrText) return 'Unknown'
  // If it looks like hex (all hex chars and even length), try to decode
  if (/^[0-9a-fA-F]+$/.test(hexOrText) && hexOrText.length % 2 === 0) {
    try {
      const decoded = Buffer.from(hexOrText, 'hex').toString('utf8')
      // Only return decoded if it looks like readable text
      if (/^[\x20-\x7E]+$/.test(decoded)) {
        return decoded
      }
    } catch {
      // Fall through to return original
    }
  }
  return hexOrText
}

function getProgressPercent(contract: LoanContract): number {
  // If no state or not active, show 0%
  if (!contract.state || !contract.state.isActive) {
    // Unless it's paid off, then show 100%
    if (contract.state?.isPaidOff) return 100
    return 0
  }

  const principal = contract.principal || 1
  const balance = contract.state.balance

  // If balance is undefined or equal to principal, no progress yet
  if (balance === undefined || balance === principal) return 0

  // Calculate progress (principal paid off so far)
  const paid = principal - balance
  const percent = (paid / principal) * 100

  // Clamp between 0 and 100
  return Math.max(0, Math.min(100, percent))
}

function getCurrentInstallment(contract: LoanContract): number {
  // Use explicit paymentCount if available and non-zero
  if (contract.state?.paymentCount !== undefined && contract.state.paymentCount > 0) {
    return contract.state.paymentCount
  }

  // Fall back to lastPayment if available
  if (contract.state?.lastPayment?.installmentNumber) {
    return contract.state.lastPayment.installmentNumber
  }

  // If isPaidOff, assume all installments are complete
  if (contract.state?.isPaidOff) {
    return getInstallments(contract)
  }

  // Estimate from balance reduction if active or has any balance paid
  if (contract.principal) {
    const balance = contract.state?.balance ?? contract.principal
    const paid = contract.principal - balance
    if (paid > 0) {
      const installments = getInstallments(contract)
      const paymentAmount = contract.principal / installments
      return Math.max(1, Math.round(paid / paymentAmount))
    }
  }

  return 0
}

function getInstallments(contract: LoanContract): number {
  // Try to get from contract directly
  if (contract.installments) return contract.installments

  // Parse from termLength
  if (contract.termLength) {
    const match = contract.termLength.match(/(\d+)/)
    if (match) return parseInt(match[1])
  }

  return 12 // Default
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

/* Sortable headers */
.contracts-header {
  display: grid;
  grid-template-columns: 40px 1.5fr 2fr 1fr 40px auto;
  gap: 1rem;
  padding: 0.5rem 0.5rem;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 0.5rem;
  border-radius: 0.375rem 0.375rem 0 0;
}

.header-cell {
  font-size: 0.75rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-cell.sortable {
  cursor: pointer;
  user-select: none;
  transition: color 0.15s;
}

.header-cell.sortable:hover {
  color: #e2e8f0;
}

.header-cell.sortable i {
  font-size: 0.65rem;
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

/* Expanded contract details */
.contract-details-expanded {
  grid-column: 1 / -1;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 0.5rem;
  margin-top: 0.5rem;
}

.datum-section {
  width: 100%;
}

.datum-header {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  font-size: 0.85rem;
  color: #94a3b8;
}

.datum-header .btn-xs {
  padding: 0.15rem 0.4rem;
  font-size: 0.7rem;
}

/* Datum carousel */
.datum-carousel {
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}

.datum-carousel::-webkit-scrollbar {
  height: 6px;
}

.datum-carousel::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.datum-card {
  min-width: 220px;
  max-width: 280px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  overflow: hidden;
  flex-shrink: 0;
}

.datum-card.active {
  border-color: rgba(16, 185, 129, 0.4);
  background: rgba(16, 185, 129, 0.08);
}

.datum-card-header {
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.datum-card-body {
  padding: 0.75rem;
}

.datum-field {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.8rem;
}

.datum-field:last-child {
  margin-bottom: 0;
}

.datum-field label {
  color: #94a3b8;
  margin: 0;
  font-weight: 500;
}

.datum-field span {
  color: #e2e8f0;
  font-family: monospace;
  font-size: 0.75rem;
}

/* Empty and loading states */
.datum-empty {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.85rem;
}

/* Raw JSON display */
.datum-raw-toggle .btn-xs {
  padding: 0.2rem 0.5rem;
  font-size: 0.7rem;
}

.datum-raw-json {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.375rem;
  font-size: 0.7rem;
  color: #a5d6ff;
  max-height: 300px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
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

  .datum-carousel {
    flex-direction: column;
  }

  .datum-card {
    min-width: unset;
    max-width: unset;
    width: 100%;
  }
}
</style>
