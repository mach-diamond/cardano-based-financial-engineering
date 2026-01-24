<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-white">Test Monitor</h1>
        <p class="text-gray-400">Visualize and monitor integration test results</p>
      </div>
      <div class="flex space-x-4">
        <button @click="runTests('emulator')" class="btn btn-secondary" :disabled="isRunning">
          Run Emulator Tests
        </button>
        <button @click="runTests('preview')" class="btn btn-primary" :disabled="isRunning">
          Run Testnet Tests
        </button>
      </div>
    </div>

    <!-- Test Status Overview -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="card">
        <div class="card-body text-center">
          <div class="text-3xl font-bold text-green-400">{{ stats.passed }}</div>
          <div class="text-sm text-gray-400">Passed</div>
        </div>
      </div>
      <div class="card">
        <div class="card-body text-center">
          <div class="text-3xl font-bold text-red-400">{{ stats.failed }}</div>
          <div class="text-sm text-gray-400">Failed</div>
        </div>
      </div>
      <div class="card">
        <div class="card-body text-center">
          <div class="text-3xl font-bold text-yellow-400">{{ stats.running }}</div>
          <div class="text-sm text-gray-400">Running</div>
        </div>
      </div>
      <div class="card">
        <div class="card-body text-center">
          <div class="text-3xl font-bold text-gray-400">{{ stats.pending }}</div>
          <div class="text-sm text-gray-400">Pending</div>
        </div>
      </div>
    </div>

    <!-- Running Test Progress -->
    <div v-if="isRunning" class="card border-yellow-700">
      <div class="card-header bg-yellow-900/20">
        <div class="flex items-center justify-between">
          <h3 class="font-semibold text-yellow-400">Running Tests...</h3>
          <div class="animate-spin w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full"></div>
        </div>
      </div>
      <div class="card-body">
        <div class="space-y-2">
          <div v-for="test in activeTests" :key="test.id" class="flex items-center space-x-3">
            <div class="w-2 h-2 rounded-full animate-pulse" :class="testStatusColor(test.status)"></div>
            <span class="text-sm">{{ test.name }}</span>
            <span v-if="test.status === 'running'" class="text-xs text-gray-400">
              Step {{ currentStep }}/{{ totalSteps }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Test Suites -->
    <div class="space-y-4">
      <h2 class="text-lg font-semibold text-gray-300">Test Suites</h2>

      <div class="grid md:grid-cols-2 gap-6">
        <!-- CDO Tests -->
        <div class="card">
          <div class="card-header">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold">CDO Bond Tests</h3>
              <span class="badge badge-info">4 tests</span>
            </div>
          </div>
          <div class="card-body space-y-3">
            <TestItem
              v-for="test in cdoTests"
              :key="test.id"
              :test="test"
              @view="viewTestDetails(test)"
            />
          </div>
        </div>

        <!-- Loan Tests -->
        <div class="card">
          <div class="card-header">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold">Loan Contract Tests</h3>
              <span class="badge badge-info">7 tests</span>
            </div>
          </div>
          <div class="card-body space-y-3">
            <TestItem
              v-for="test in loanTests"
              :key="test.id"
              :test="test"
              @view="viewTestDetails(test)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Test Runs -->
    <div class="card">
      <div class="card-header">
        <h3 class="font-semibold">Recent Test Runs</h3>
      </div>
      <div class="card-body">
        <div v-if="recentRuns.length === 0" class="text-center py-8 text-gray-500">
          No test runs yet. Click "Run Tests" to start.
        </div>
        <div v-else class="space-y-2">
          <router-link
            v-for="run in recentRuns"
            :key="run.id"
            :to="`/tests/${run.id}`"
            class="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <div class="flex items-center space-x-4">
              <div :class="run.totalFailed > 0 ? 'text-red-400' : 'text-green-400'">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path v-if="run.totalFailed === 0" fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  <path v-else fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
              </div>
              <div>
                <div class="font-medium">{{ run.name }}</div>
                <div class="text-xs text-gray-400">
                  {{ formatDate(run.timestamp) }} • {{ run.network }}
                </div>
              </div>
            </div>
            <div class="text-right">
              <div class="text-sm">
                <span class="text-green-400">{{ run.totalPassed }}</span> /
                <span class="text-red-400">{{ run.totalFailed }}</span>
              </div>
              <div class="text-xs text-gray-400">
                {{ formatDuration(run.tests.reduce((sum, t) => sum + t.duration, 0)) }}
              </div>
            </div>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { TestResult, TestSuite } from '@/types'
import TestItem from '@/components/dashboard/TestItem.vue'

const router = useRouter()

// State
const isRunning = ref(false)
const currentStep = ref(0)
const totalSteps = ref(0)

// Mock data
const cdoTests = ref<TestResult[]>([
  { id: 'T1', name: 'Basic Lifecycle', description: 'Create → Collect → Distribute', status: 'passed', duration: 45000, steps: [], startedAt: new Date() },
  { id: 'T2', name: 'Default Scenario', description: 'Create → Default → Distribute with losses', status: 'passed', duration: 52000, steps: [], startedAt: new Date() },
  { id: 'T3', name: 'Maturity', description: 'Create → Mature → Redeem', status: 'pending', duration: 0, steps: [], startedAt: new Date() },
  { id: 'T4', name: 'Liquidation', description: 'Create → Excessive defaults → Liquidate', status: 'passed', duration: 68000, steps: [], startedAt: new Date() },
])

const loanTests = ref<TestResult[]>([
  { id: 'L1', name: 'Loan Creation', description: 'Initialize loan contract', status: 'passed', duration: 12000, steps: [], startedAt: new Date() },
  { id: 'L2', name: 'Accept Contract', description: 'Buyer accepts loan', status: 'passed', duration: 15000, steps: [], startedAt: new Date() },
  { id: 'L3', name: 'Make Payment', description: 'Process installment payment', status: 'passed', duration: 18000, steps: [], startedAt: new Date() },
  { id: 'L4', name: 'Multiple Payments', description: 'Sequential payment processing', status: 'passed', duration: 45000, steps: [], startedAt: new Date() },
  { id: 'L5', name: 'Late Payment', description: 'Late fee application', status: 'passed', duration: 22000, steps: [], startedAt: new Date() },
  { id: 'L6', name: 'Default', description: 'Mark loan as defaulted', status: 'failed', duration: 8000, steps: [], startedAt: new Date(), error: 'Insufficient collateral' },
  { id: 'L7', name: 'Complete Transfer', description: 'Full payoff and asset transfer', status: 'pending', duration: 0, steps: [], startedAt: new Date() },
])

const recentRuns = ref<TestSuite[]>([])

const activeTests = computed(() => [...cdoTests.value, ...loanTests.value].filter(t => t.status === 'running'))

const stats = computed(() => {
  const all = [...cdoTests.value, ...loanTests.value]
  return {
    passed: all.filter(t => t.status === 'passed').length,
    failed: all.filter(t => t.status === 'failed').length,
    running: all.filter(t => t.status === 'running').length,
    pending: all.filter(t => t.status === 'pending').length,
  }
})

function testStatusColor(status: string) {
  const colors: Record<string, string> = {
    passed: 'bg-green-400',
    failed: 'bg-red-400',
    running: 'bg-yellow-400',
    pending: 'bg-gray-400',
  }
  return colors[status] || 'bg-gray-400'
}

async function runTests(network: 'emulator' | 'preview') {
  isRunning.value = true
  // TODO: Implement actual test running
  setTimeout(() => {
    isRunning.value = false
  }, 5000)
}

function viewTestDetails(test: TestResult) {
  router.push(`/tests/${test.id}`)
}

function formatDate(date: Date): string {
  return date.toLocaleString()
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}
</script>
