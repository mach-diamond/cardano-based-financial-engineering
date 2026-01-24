<template>
  <div
    @click="$emit('view')"
    class="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg cursor-pointer hover:bg-gray-700/50 transition-colors"
  >
    <div class="flex items-center space-x-3">
      <!-- Status Icon -->
      <div :class="statusClass">
        <svg v-if="test.status === 'passed'" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        <svg v-else-if="test.status === 'failed'" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>
        <svg v-else-if="test.status === 'running'" class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
        </svg>
      </div>

      <div>
        <div class="font-medium">
          <span class="text-gray-400 text-sm mr-2">{{ test.id }}</span>
          {{ test.name }}
        </div>
        <div class="text-xs text-gray-500">{{ test.description }}</div>
      </div>
    </div>

    <div class="text-right">
      <div v-if="test.duration > 0" class="text-sm text-gray-400">
        {{ formatDuration(test.duration) }}
      </div>
      <div v-if="test.error" class="text-xs text-red-400 max-w-48 truncate">
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
    passed: 'text-green-400',
    failed: 'text-red-400',
    running: 'text-yellow-400',
    pending: 'text-gray-400',
  }
  return classes[props.test.status] || 'text-gray-400'
})

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds >= 60) {
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  }
  return `${seconds}s`
}
</script>
