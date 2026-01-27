<template>
  <div class="row mb-4">
    <!-- CLO Tests -->
    <div class="col-lg-12">
      <div class="card h-100">
        <div class="card-header d-flex justify-content-between align-items-center">
          <div class="d-flex align-items-center">
            <div class="suite-icon suite-icon--info mr-2">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h6 class="mb-0">CLO Bond</h6>
          </div>
          <span class="badge badge-secondary">{{ cloTests.length }} tests</span>
        </div>
        <div class="card-body p-0">
          <div class="test-list">
            <TestItem
              v-for="test in cloTests"
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
  cloTests: TestResult[]
}>()

defineEmits<{
  viewTest: [test: TestResult]
}>()
</script>
