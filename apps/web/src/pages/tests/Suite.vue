<template>
  <div class="container py-4">
    <!-- Header -->
    <div class="d-flex align-items-center mb-4">
      <router-link to="/tests" class="back-button mr-3">
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </router-link>
      <div class="flex-grow-1">
        <div class="d-flex align-items-center flex-wrap">
          <h1 class="h4 mb-0 text-white mr-3">{{ test?.name || 'Test Details' }}</h1>
          <span v-if="test" class="status-badge" :class="'status-' + test.status">
            <span class="status-dot"></span>
            {{ test.status }}
          </span>
        </div>
        <p class="text-muted mb-0 small mt-1">{{ test?.description || `Test ID: ${suiteId}` }}</p>
      </div>
      <button v-if="test" @click="rerunTest" class="btn btn-outline-primary" :disabled="isRunning">
        <svg v-if="!isRunning" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="mr-1">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span v-else class="spinner-border spinner-border-sm mr-1" role="status"></span>
        {{ isRunning ? 'Running...' : 'Rerun Test' }}
      </button>
    </div>

    <!-- Test Overview Cards -->
    <div class="row mb-4">
      <div class="col-md-3 col-6 mb-3 mb-md-0">
        <div class="info-card">
          <div class="info-icon" :class="'icon-' + test?.status">
            <svg v-if="test?.status === 'passed'" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            <svg v-else-if="test?.status === 'failed'" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
            <svg v-else width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="info-content">
            <div class="info-label">Status</div>
            <div class="info-value" :class="'text-' + statusColor">
              {{ test?.status || 'Unknown' }}
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-3 col-6 mb-3 mb-md-0">
        <div class="info-card">
          <div class="info-icon icon-neutral">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="info-content">
            <div class="info-label">Duration</div>
            <div class="info-value">{{ formatDuration(test?.duration || 0) }}</div>
          </div>
        </div>
      </div>
      <div class="col-md-3 col-6">
        <div class="info-card">
          <div class="info-icon icon-neutral">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div class="info-content">
            <div class="info-label">Started</div>
            <div class="info-value">{{ formatTime(test?.startedAt) }}</div>
          </div>
        </div>
      </div>
      <div class="col-md-3 col-6">
        <div class="info-card">
          <div class="info-icon icon-neutral">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div class="info-content">
            <div class="info-label">Steps</div>
            <div class="info-value">{{ mockSteps.length }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="test?.error" class="error-card mb-4">
      <div class="error-header">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        <span>Error Details</span>
      </div>
      <pre class="error-message">{{ test.error }}</pre>
    </div>

    <!-- Test Steps Timeline -->
    <div class="card mb-4">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h6 class="mb-0">Execution Timeline</h6>
        <div class="d-flex align-items-center">
          <span class="badge badge-secondary mr-2">{{ mockSteps.length }} steps</span>
          <span class="text-muted small">Total: {{ formatDuration(mockSteps.reduce((s, t) => s + t.duration, 0)) }}</span>
        </div>
      </div>
      <div class="card-body p-0">
        <div class="timeline">
          <div v-for="(step, index) in mockSteps" :key="index"
               class="timeline-item"
               :class="{ 'timeline-item--active': step.status === 'running' }">
            <div class="timeline-connector">
              <div class="timeline-line" :class="'line-' + step.status"></div>
              <div class="timeline-marker" :class="'marker-' + step.status">
                <svg v-if="step.status === 'passed'" width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                <svg v-else-if="step.status === 'failed'" width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
                <svg v-else-if="step.status === 'running'" width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="spin">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span v-else class="step-number">{{ index + 1 }}</span>
              </div>
            </div>
            <div class="timeline-content">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <div class="step-name">{{ step.name }}</div>
                  <div class="step-description">{{ step.description }}</div>
                </div>
                <div class="step-meta">
                  <div class="step-duration">{{ step.duration }}ms</div>
                </div>
              </div>
              <div v-if="step.txHash" class="step-tx mt-2">
                <span class="tx-label">TX:</span>
                <a :href="`https://preview.cexplorer.io/tx/${step.txHash}`" target="_blank" class="tx-link">
                  {{ step.txHash.slice(0, 16) }}...{{ step.txHash.slice(-8) }}
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="ml-1">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Transaction Details -->
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h6 class="mb-0">Transactions</h6>
        <span class="badge badge-secondary">{{ mockTransactions.length }} txs</span>
      </div>
      <div class="card-body">
        <div v-if="mockTransactions.length === 0" class="empty-state">
          <div class="empty-icon">
            <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p class="empty-title">No transactions recorded</p>
          <p class="empty-description">Transactions will appear here after a successful test run</p>
        </div>
        <div v-else class="tx-table">
          <div class="tx-row tx-header">
            <div class="tx-cell tx-action">Action</div>
            <div class="tx-cell tx-hash">Transaction Hash</div>
            <div class="tx-cell tx-fee">Fee</div>
            <div class="tx-cell tx-status">Status</div>
          </div>
          <div v-for="tx in mockTransactions" :key="tx.hash" class="tx-row">
            <div class="tx-cell tx-action">
              <span class="tx-action-name">{{ tx.action }}</span>
            </div>
            <div class="tx-cell tx-hash">
              <a :href="`https://preview.cexplorer.io/tx/${tx.hash}`" target="_blank" class="tx-link">
                {{ tx.hash.slice(0, 20) }}...{{ tx.hash.slice(-8) }}
              </a>
            </div>
            <div class="tx-cell tx-fee">
              <span class="fee-amount">{{ tx.fee }}</span>
              <span class="fee-unit">ADA</span>
            </div>
            <div class="tx-cell tx-status">
              <span class="tx-badge" :class="tx.confirmed ? 'tx-confirmed' : 'tx-pending'">
                {{ tx.confirmed ? 'Confirmed' : 'Pending' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import type { TestResult } from '@/types'

const route = useRoute()
const suiteId = computed(() => route.params.suite as string)
const isRunning = ref(false)

// Mock test data based on suite ID
const test = computed<TestResult | null>(() => {
  const tests: Record<string, TestResult> = {
    'LOAN-1': { id: 'LOAN-1', name: 'Create Loan', description: 'Initialize loan contract with NFT collateral', status: 'passed', duration: 12000, steps: [], startedAt: new Date() },
    'LOAN-2': { id: 'LOAN-2', name: 'Accept Contract', description: 'Buyer accepts loan terms and pays first installment', status: 'passed', duration: 15000, steps: [], startedAt: new Date() },
    'LOAN-3': { id: 'LOAN-3', name: 'Make Payment', description: 'Process single installment payment', status: 'passed', duration: 18000, steps: [], startedAt: new Date() },
    'LOAN-4': { id: 'LOAN-4', name: 'Collect Payment', description: 'Seller collects available payments', status: 'passed', duration: 10000, steps: [], startedAt: new Date() },
    'LOAN-5': { id: 'LOAN-5', name: 'Cancel Loan', description: 'Cancel unaccepted loan and return collateral', status: 'passed', duration: 8000, steps: [], startedAt: new Date() },
    'LOAN-6': { id: 'LOAN-6', name: 'Default', description: 'Mark loan as defaulted after grace period', status: 'failed', duration: 8000, steps: [], startedAt: new Date(), error: 'Assertion failed: Expected collateral to be returned to seller\n\nExpected: addr_test1qz...\nReceived: null\n\nStack trace:\n  at assertCollateralReturned (tests/loan.test.ts:142)\n  at processDefault (tests/loan.test.ts:138)' },
    'CDO-1': { id: 'CDO-1', name: 'Create CDO Bond', description: 'Bundle 5 loans into CDO with tranche structure', status: 'passed', duration: 45000, steps: [], startedAt: new Date() },
    'CDO-2': { id: 'CDO-2', name: 'Collect Payments', description: 'Collect payments from underlying collateral', status: 'passed', duration: 12000, steps: [], startedAt: new Date() },
    'CDO-3': { id: 'CDO-3', name: 'Distribute Yields', description: 'Waterfall distribution to tranche holders', status: 'passed', duration: 18000, steps: [], startedAt: new Date() },
    'CDO-4': { id: 'CDO-4', name: 'Mark Default', description: 'Mark collateral position as defaulted', status: 'passed', duration: 8000, steps: [], startedAt: new Date() },
    'CDO-5': { id: 'CDO-5', name: 'Maturity', description: 'Mature CDO after term ends', status: 'pending', duration: 0, steps: [], startedAt: new Date() },
    'CDO-6': { id: 'CDO-6', name: 'Liquidation', description: 'Liquidate CDO on high default rate', status: 'passed', duration: 22000, steps: [], startedAt: new Date() },
  }
  return tests[suiteId.value] || null
})

const statusColor = computed(() => {
  const colors: Record<string, string> = {
    passed: 'success',
    failed: 'danger',
    running: 'warning',
    pending: 'muted',
  }
  return colors[test.value?.status || ''] || 'muted'
})

// Mock steps for timeline
const mockSteps = computed(() => {
  const baseSteps = [
    { name: 'Initialize Lucid', description: 'Connect to Preview network', status: 'passed', duration: 234 },
    { name: 'Setup Wallet', description: 'Load test wallet credentials', status: 'passed', duration: 89 },
    { name: 'Build Transaction', description: 'Construct contract initialization TX', status: 'passed', duration: 456, txHash: 'abc123def456789012345678901234567890abcdef1234567890abcdef12345678' },
    { name: 'Sign Transaction', description: 'Sign with test wallet', status: 'passed', duration: 123 },
    { name: 'Submit Transaction', description: 'Broadcast to network', status: test.value?.status === 'failed' ? 'failed' : 'passed', duration: 2345, txHash: 'def456abc789012345678901234567890abcdef1234567890abcdef123456789a' },
    { name: 'Await Confirmation', description: 'Wait for block inclusion', status: test.value?.status === 'failed' ? 'pending' : 'passed', duration: 8000 },
  ]

  // Add more steps for CDO tests
  if (suiteId.value?.startsWith('CDO')) {
    baseSteps.push(
      { name: 'Verify Collateral', description: 'Check all collateral tokens locked', status: 'passed', duration: 345 },
      { name: 'Mint Tranche Tokens', description: 'Mint Senior/Mezzanine/Junior tokens', status: 'passed', duration: 567 },
    )
  }

  return baseSteps
})

// Mock transactions
const mockTransactions = computed(() => {
  if (test.value?.status === 'failed') return []
  return [
    { action: 'Initialize Contract', hash: 'abc123def456789012345678901234567890abcdef1234567890abcdef12345678', fee: '0.18', confirmed: true },
    { action: 'Lock Collateral', hash: 'def456abc789012345678901234567890abcdef1234567890abcdef123456789a', fee: '0.21', confirmed: true },
  ]
})

function formatDuration(ms: number): string {
  if (ms === 0) return '-'
  const seconds = Math.floor(ms / 1000)
  if (seconds >= 60) {
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

function formatTime(date?: Date): string {
  if (!date) return '-'
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

async function rerunTest() {
  isRunning.value = true
  setTimeout(() => {
    isRunning.value = false
  }, 3000)
}
</script>

<style scoped>
.back-button {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6c757d;
  transition: all 0.2s ease;
}

.back-button:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  transform: translateX(-2px);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-passed { background: rgba(40, 167, 69, 0.15); color: #28a745; }
.status-passed .status-dot { background: #28a745; }
.status-failed { background: rgba(220, 53, 69, 0.15); color: #dc3545; }
.status-failed .status-dot { background: #dc3545; }
.status-running { background: rgba(255, 193, 7, 0.15); color: #ffc107; }
.status-running .status-dot { background: #ffc107; animation: pulse 1.5s ease-in-out infinite; }
.status-pending { background: rgba(108, 117, 125, 0.15); color: #6c757d; }
.status-pending .status-dot { background: #6c757d; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* Info Cards */
.info-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.info-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-passed { background: rgba(40, 167, 69, 0.15); color: #28a745; }
.icon-failed { background: rgba(220, 53, 69, 0.15); color: #dc3545; }
.icon-running { background: rgba(255, 193, 7, 0.15); color: #ffc107; }
.icon-pending { background: rgba(108, 117, 125, 0.15); color: #6c757d; }
.icon-neutral { background: rgba(255, 255, 255, 0.05); color: #6c757d; }

.info-label {
  font-size: 0.75rem;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 1.125rem;
  font-weight: 600;
  color: #fff;
}

.text-success { color: #28a745 !important; }
.text-danger { color: #dc3545 !important; }
.text-warning { color: #ffc107 !important; }
.text-muted { color: #6c757d !important; }

/* Error Card */
.error-card {
  background: rgba(220, 53, 69, 0.05);
  border: 1px solid rgba(220, 53, 69, 0.2);
  border-radius: 14px;
  overflow: hidden;
}

.error-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: rgba(220, 53, 69, 0.1);
  color: #dc3545;
  font-weight: 600;
}

.error-message {
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  font-size: 0.8125rem;
  color: #dc3545;
  background: transparent;
  padding: 1rem;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Timeline */
.timeline {
  position: relative;
}

.timeline-item {
  display: flex;
  padding: 1rem 1.25rem;
  transition: background 0.2s ease;
}

.timeline-item:hover {
  background: rgba(255, 255, 255, 0.02);
}

.timeline-item--active {
  background: rgba(255, 193, 7, 0.05);
}

.timeline-connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 1rem;
}

.timeline-line {
  width: 2px;
  flex: 1;
  min-height: 20px;
  margin-top: 4px;
}

.line-passed { background: #28a745; }
.line-failed { background: #dc3545; }
.line-running { background: #ffc107; }
.line-pending { background: rgba(108, 117, 125, 0.3); }

.timeline-item:last-child .timeline-line {
  display: none;
}

.timeline-marker {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 600;
}

.marker-passed { background: rgba(40, 167, 69, 0.2); color: #28a745; }
.marker-failed { background: rgba(220, 53, 69, 0.2); color: #dc3545; }
.marker-running { background: rgba(255, 193, 7, 0.2); color: #ffc107; }
.marker-pending { background: rgba(108, 117, 125, 0.2); color: #6c757d; }

.step-number {
  font-size: 0.625rem;
}

.timeline-content {
  flex: 1;
  min-width: 0;
}

.step-name {
  font-weight: 600;
  color: #fff;
}

.step-description {
  font-size: 0.8125rem;
  color: #6c757d;
  margin-top: 2px;
}

.step-meta {
  text-align: right;
}

.step-duration {
  font-size: 0.75rem;
  font-family: monospace;
  color: #6c757d;
  background: rgba(255, 255, 255, 0.05);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.step-tx {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: monospace;
  font-size: 0.75rem;
}

.tx-label {
  color: #6c757d;
}

.tx-link {
  color: #17a2b8;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}

.tx-link:hover {
  color: #138496;
  text-decoration: underline;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
}

.empty-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(108, 117, 125, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6c757d;
  margin: 0 auto 1rem;
}

.empty-title {
  color: #fff;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.empty-description {
  color: #6c757d;
  font-size: 0.875rem;
  margin-bottom: 0;
}

/* Transaction Table */
.tx-table {
  display: flex;
  flex-direction: column;
}

.tx-row {
  display: grid;
  grid-template-columns: 1.5fr 2fr 0.75fr 1fr;
  gap: 1rem;
  padding: 0.875rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  align-items: center;
}

.tx-row:last-child {
  border-bottom: none;
}

.tx-header {
  font-size: 0.75rem;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding-bottom: 0.75rem;
}

.tx-action-name {
  font-weight: 500;
  color: #fff;
}

.tx-hash {
  font-family: monospace;
  font-size: 0.8125rem;
}

.tx-fee {
  text-align: right;
}

.fee-amount {
  color: #fff;
  font-weight: 500;
}

.fee-unit {
  color: #6c757d;
  font-size: 0.75rem;
  margin-left: 0.25rem;
}

.tx-status {
  text-align: center;
}

.tx-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
}

.tx-confirmed {
  background: rgba(40, 167, 69, 0.15);
  color: #28a745;
}

.tx-pending {
  background: rgba(255, 193, 7, 0.15);
  color: #ffc107;
}
</style>
