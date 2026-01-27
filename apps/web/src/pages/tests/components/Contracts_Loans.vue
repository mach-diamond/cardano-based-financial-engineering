<template>
  <div class="row mb-4">
    <!-- Loan Tests -->
    <div class="col-lg-12 mb-4 mb-lg-0">
      <div class="card h-100">
        <div class="card-header d-flex justify-content-between align-items-center">
          <div class="d-flex align-items-center">
            <div class="suite-icon suite-icon--primary mr-2">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h6 class="mb-0">Loan Contract</h6>
          </div>
          <span class="badge badge-secondary">{{ loanTests.length }} tests</span>
        </div>
        <div class="card-body p-0">
          <div class="test-list">
            <TestItem
              v-for="test in loanTests"
              :key="test.id"
              :test="test"
              @view="$emit('viewTest', test)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import TestItem from '@/components/dashboard/TestItem.vue'
import type { TestResult } from '@/types'

defineProps<{
  loanTests: TestResult[]
}>()

defineEmits<{
  viewTest: [test: TestResult]
}>()
</script>
