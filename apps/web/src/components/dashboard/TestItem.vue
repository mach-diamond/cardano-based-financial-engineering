<template>
  <div
    @click="$emit('view')"
    class="test-item d-flex align-items-center justify-content-between p-3 rounded cursor-pointer"
    :class="{ 'test-item--failed': test.status === 'failed' }"
  >
    <div class="d-flex align-items-center">
      <!-- Status Icon -->
      <div class="test-status-icon mr-3" :class="statusClass">
        <!-- Passed -->
        <svg v-if="test.status === 'passed'" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        <!-- Failed -->
        <svg v-else-if="test.status === 'failed'" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>
        <!-- Running -->
        <svg v-else-if="test.status === 'running'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="spin">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <!-- Pending -->
        <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
        </svg>
      </div>

      <div>
        <div class="d-flex align-items-center">
          <span class="test-id mr-2">{{ test.id }}</span>
          <span class="test-name">{{ test.name }}</span>
        </div>
        <div class="test-description">{{ test.description }}</div>
      </div>
    </div>

    <div class="text-right">
      <div v-if="test.duration > 0" class="test-duration">
        {{ formatDuration(test.duration) }}
      </div>
      <div v-if="test.error" class="test-error text-truncate" style="max-width: 180px;">
        {{ test.error }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TestResult } from '@/types'

const props = defineProps<{
  test: TestResult
}>()

defineEmits<{
  view: []
}>()

const statusClass = computed(() => {
  const classes: Record<string, string> = {
    passed: 'status-passed',
    failed: 'status-failed',
    running: 'status-running',
    pending: 'status-pending',
  }
  return classes[props.test.status] || 'status-pending'
})

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds >= 60) {
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  }
  return `${seconds}s`
}
</script>

<style scoped>
.test-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.2s ease;
}

.test-item:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
  transform: translateX(4px);
}

.test-item--failed {
  border-left: 3px solid #dc3545;
}

.cursor-pointer {
  cursor: pointer;
}

.test-id {
  font-size: 0.75rem;
  font-family: monospace;
  color: #6c757d;
  background: rgba(108, 117, 125, 0.15);
  padding: 2px 6px;
  border-radius: 4px;
}

.test-name {
  font-weight: 500;
  color: #fff;
}

.test-description {
  font-size: 0.75rem;
  color: #6c757d;
  margin-top: 2px;
}

.test-duration {
  font-size: 0.875rem;
  color: #6c757d;
  font-family: monospace;
}

.test-error {
  font-size: 0.75rem;
  color: #dc3545;
}

.test-status-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-passed { color: #28a745; }
.status-failed { color: #dc3545; }
.status-running { color: #ffc107; }
.status-pending { color: #6c757d; }

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
