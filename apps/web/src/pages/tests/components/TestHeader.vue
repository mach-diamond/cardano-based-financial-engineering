<template>
  <div class="test-header mb-4">
    <!-- Top Row: Title and Test Run Selector -->
    <div class="d-flex justify-content-between align-items-start mb-3">
      <div>
        <h1 class="h3 mb-1 text-white">Full Lifecycle Test Monitor</h1>
        <p class="text-muted mb-0">Assets → Loans → Collateral → CLO Bundle</p>
      </div>

      <!-- Test Run Selector - Top Right Corner (always visible) -->
      <div class="test-run-selector">
        <div class="network-label">Load Test Run ({{ networkMode }})</div>
        <select
          class="form-control form-control-sm test-run-dropdown"
          :value="currentTestRunId || ''"
          @change="handleTestRunChange"
          :disabled="isRunning"
        >
          <option value="">New Run</option>
          <option v-for="run in filteredTestRuns" :key="run.id" :value="run.id">
            #{{ run.id }} - {{ formatRunName(run) }}
          </option>
        </select>
        <div v-if="filteredTestRuns.length === 0 && availableTestRuns && availableTestRuns.length > 0" class="other-runs-hint">
          {{ availableTestRuns.length }} run(s) on other networks
        </div>
        <div v-else-if="otherModeRunCount > 0" class="other-runs-hint">
          {{ otherModeRunCount }} run(s) on {{ networkMode === 'emulator' ? 'preview/preprod' : 'emulator' }}
        </div>
      </div>
    </div>

    <!-- Bottom Row: Controls -->
    <div class="d-flex justify-content-between align-items-end">
      <!-- Simulated Time Display with Controls -->
      <div class="time-display-panel">
        <div class="time-display" :class="{ 'preview-mode': networkMode !== 'emulator' }">
          <div class="network-label">
            {{ networkMode === 'emulator' ? 'Simulated Time' : (networkMode === 'preprod' ? 'Preprod Testnet' : 'Preview Testnet') }}
          </div>
          <div class="time-value">
            <i class="fas fa-clock mr-2"></i>
            <span>Slot {{ currentSlot.toLocaleString() }}</span>
            <span class="time-separator">|</span>
            <span class="elapsed-time">{{ formatElapsed(elapsedTime) }}</span>
          </div>
        </div>
        <div v-if="networkMode === 'emulator'" class="time-controls">
          <button class="btn btn-sm btn-time" @click="$emit('stepTime', 1)" title="Advance 1 slot" :disabled="isRunning">
            <i class="fas fa-step-forward"></i> +1
          </button>
          <button class="btn btn-sm btn-time" @click="$emit('stepTime', 100)" title="Advance 100 slots" :disabled="isRunning">
            <i class="fas fa-forward"></i> +100
          </button>
          <button class="btn btn-sm btn-time" @click="$emit('stepTime', 43200)" title="Advance 1 day (~43200 slots)" :disabled="isRunning">
            <i class="fas fa-calendar-day"></i> +1d
          </button>
          <button class="btn btn-sm btn-time" @click="$emit('stepTime', 2592000)" title="Advance 30 days (~2.59M slots)" :disabled="isRunning">
            <i class="fas fa-calendar-alt"></i> +30d
          </button>
          <button class="btn btn-sm btn-time-reset" @click="$emit('resetTime')" title="Reset to slot 0" :disabled="isRunning">
            <i class="fas fa-undo"></i>
          </button>
        </div>
      </div>

      <!-- Action Buttons Group -->
      <div class="d-flex align-items-end gap-3">
        <!-- Network Selector -->
        <div class="network-selector">
          <div class="network-label">Test Network</div>
          <div class="btn-group btn-group-lg" role="group">
            <button
              type="button"
              class="btn network-btn"
              :class="networkMode === 'emulator' ? 'btn-emulator active' : 'btn-outline-secondary'"
              @click="setNetwork('emulator')"
            >
              <i class="fas fa-desktop mr-2"></i>
              Emulator
            </button>
            <button
              type="button"
              class="btn network-btn"
              :class="networkMode === 'preview' ? 'btn-preview active' : 'btn-outline-secondary'"
              @click="setNetwork('preview')"
            >
              <i class="fas fa-globe mr-2"></i>
              Preview
            </button>
            <button
              type="button"
              class="btn network-btn"
              :class="networkMode === 'preprod' ? 'btn-preprod active' : 'btn-outline-secondary'"
              @click="setNetwork('preprod')"
            >
              <i class="fas fa-server mr-2"></i>
              Preprod
            </button>
          </div>
        </div>

        <!-- Run Full Test Button -->
        <button
          @click="$emit('runTests', networkMode)"
          class="btn btn-success btn-lg btn-run-full-test"
          :disabled="isRunning"
        >
          <span v-if="isRunning" class="spinner-border spinner-border-sm mr-2" role="status"></span>
          <i v-else class="fas fa-play mr-2"></i>
          {{ isRunning ? 'Running...' : 'Run Full Test' }}
        </button>

      </div>
    </div>

    <!-- Network Info Banner -->
    <div class="network-info-banner mt-3" :class="'banner-' + networkMode">
      <div class="d-flex align-items-center justify-content-between">
        <div>
          <i :class="networkMode === 'emulator' ? 'fas fa-microchip' : 'fas fa-satellite-dish'" class="mr-2"></i>
          <span v-if="networkMode === 'emulator'">
            <strong>Emulator Mode:</strong> Fast, local testing with pre-funded wallets. No real ADA required.
          </span>
          <span v-else-if="networkMode === 'preprod'">
            <strong>Preprod Testnet:</strong> Real blockchain testing on preprod. Wallets must be funded from faucet before proceeding.
            <span class="preview-warning ml-2">(Contract operations require loan-contract/cdo-bond integration)</span>
          </span>
          <span v-else>
            <strong>Preview Testnet:</strong> Real blockchain testing. Wallets must be funded from faucet before proceeding.
            <span class="preview-warning ml-2">(Contract operations require loan-contract/cdo-bond integration)</span>
          </span>
        </div>
        <div v-if="currentTestRunId" class="test-run-badge">
          <span class="badge badge-info">Run #{{ currentTestRunId }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface TestRun {
  id: number
  name: string
  status: string
  networkMode: string
  createdAt: string
}

const props = withDefaults(defineProps<{
  isRunning: boolean
  availableTestRuns?: TestRun[]
  currentTestRunId?: number | null
  currentSlot?: number
  elapsedTime?: number // in milliseconds
}>(), {
  currentSlot: 0,
  elapsedTime: 0,
})

const emit = defineEmits<{
  runTests: [mode: 'emulator' | 'preview' | 'preprod']
  'update:networkMode': [mode: 'emulator' | 'preview' | 'preprod']
  loadTestRun: [runId: number]
  stepTime: [slots: number]
  resetTime: []
}>()

const networkMode = ref<'emulator' | 'preview' | 'preprod'>('emulator')

// Filter test runs by current network mode
const filteredTestRuns = computed(() => {
  if (!props.availableTestRuns) return []
  return props.availableTestRuns.filter(run => run.networkMode === networkMode.value)
})

// Count runs on the other network mode
const otherModeRunCount = computed(() => {
  if (!props.availableTestRuns) return 0
  return props.availableTestRuns.filter(run => run.networkMode !== networkMode.value).length
})

function setNetwork(mode: 'emulator' | 'preview' | 'preprod') {
  networkMode.value = mode
  emit('update:networkMode', mode)
}

function handleTestRunChange(event: Event) {
  const target = event.target as HTMLSelectElement
  const runId = parseInt(target.value, 10)
  if (runId && !isNaN(runId)) {
    emit('loadTestRun', runId)
  } else {
    // "New Run" selected - emit with 0 to trigger state reset
    emit('loadTestRun', 0)
  }
}

function formatRunName(run: TestRun): string {
  const status = run.status === 'passed' ? '✓' : run.status === 'failed' ? '✗' : '○'
  const date = new Date(run.createdAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  return `${status} ${date} (${run.networkMode})`
}

function formatElapsed(ms: number): string {
  if (ms === 0) return '0:00'
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  }
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}
</script>

<style scoped>
.test-header {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
  padding: 1.5rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.test-run-selector {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.time-display-panel {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.time-display {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  background: rgba(0, 0, 0, 0.3);
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  border: 1px solid rgba(14, 165, 233, 0.3);
}

.time-display.preview-mode {
  border-color: rgba(139, 92, 246, 0.3);
}

.time-value {
  display: flex;
  align-items: center;
  font-family: monospace;
  font-size: 0.95rem;
  color: #22d3ee;
}

.time-separator {
  margin: 0 0.75rem;
  color: rgba(255, 255, 255, 0.3);
}

.elapsed-time {
  color: #a5b4fc;
}

.time-controls {
  display: flex;
  gap: 0.25rem;
  margin-top: 0.5rem;
}

.btn-time {
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  background: rgba(14, 165, 233, 0.1);
  border: 1px solid rgba(14, 165, 233, 0.3);
  color: #7dd3fc;
  transition: all 0.2s ease;
}

.btn-time:hover:not(:disabled) {
  background: rgba(14, 165, 233, 0.2);
  border-color: rgba(14, 165, 233, 0.5);
  color: #22d3ee;
}

.btn-time:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-time-reset {
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  background: rgba(107, 114, 128, 0.1);
  border: 1px solid rgba(107, 114, 128, 0.3);
  color: #9ca3af;
  transition: all 0.2s ease;
}

.btn-time-reset:hover:not(:disabled) {
  background: rgba(107, 114, 128, 0.2);
  border-color: rgba(107, 114, 128, 0.5);
  color: #d1d5db;
}

.btn-time-reset:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.test-run-dropdown {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #e2e8f0;
  border-radius: 0.375rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.85rem;
  min-width: 180px;
  min-height: 2rem;
  line-height: 1.25;
  cursor: pointer;
}

.test-run-dropdown:focus {
  background: rgba(255, 255, 255, 0.15);
  border-color: #0ea5e9;
  outline: none;
  box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.3);
}

.test-run-dropdown option {
  background: #1e293b;
  color: #e2e8f0;
}

.other-runs-hint {
  font-size: 0.7rem;
  color: #64748b;
  margin-top: 0.25rem;
  font-style: italic;
}

.test-run-badge .badge {
  font-size: 0.75rem;
  padding: 0.35rem 0.6rem;
}

.network-selector {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.network-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
  margin-bottom: 0.35rem;
  font-weight: 600;
}

.network-btn {
  padding: 0.6rem 1.25rem;
  font-weight: 600;
  font-size: 0.95rem;
  border-width: 2px;
  transition: all 0.2s ease;
}

.btn-emulator {
  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
  border-color: #0ea5e9;
  color: white;
  box-shadow: 0 0 20px rgba(14, 165, 233, 0.4);
}

.btn-emulator:hover {
  background: linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%);
  border-color: #38bdf8;
  color: white;
}

.btn-preview {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  border-color: #8b5cf6;
  color: white;
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
}

.btn-preview:hover {
  background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%);
  border-color: #a78bfa;
  color: white;
}

.btn-preprod {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  border-color: #f59e0b;
  color: white;
  box-shadow: 0 0 20px rgba(245, 158, 11, 0.4);
}

.btn-preprod:hover {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  border-color: #fbbf24;
  color: white;
}

.btn-outline-secondary {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.2);
  color: #94a3b8;
}

.btn-outline-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
  color: #e2e8f0;
}

.btn-run-full-test {
  padding: 0.6rem 1.5rem;
  font-weight: 600;
  font-size: 0.95rem;
  box-shadow: 0 0 20px rgba(34, 197, 94, 0.3);
  /* Match height with network buttons */
  height: calc(0.6rem * 2 + 1.5rem + 4px);
  display: inline-flex;
  align-items: center;
}

.network-info-banner {
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
}

.banner-emulator {
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(2, 132, 199, 0.1) 100%);
  border: 1px solid rgba(14, 165, 233, 0.3);
  color: #7dd3fc;
}

.banner-preview {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(124, 58, 237, 0.1) 100%);
  border: 1px solid rgba(139, 92, 246, 0.3);
  color: #c4b5fd;
}

.banner-preprod {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.1) 100%);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #fcd34d;
}

.preview-warning {
  color: #fbbf24;
  font-size: 0.75rem;
  opacity: 0.9;
}

.gap-3 {
  gap: 1rem;
}

</style>
