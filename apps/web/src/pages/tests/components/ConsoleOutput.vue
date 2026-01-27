<template>
  <div class="card">
    <div class="card-header d-flex justify-content-between align-items-center">
      <h6 class="mb-0">Test Console</h6>
      <button @click="$emit('clear')" class="btn btn-sm btn-outline-secondary">Clear</button>
    </div>
    <div class="card-body console-output" ref="consoleRef">
      <div v-for="(line, i) in consoleLines" :key="i" class="console-line" :class="line.type">
        <span class="console-time">{{ line.time }}</span>
        <span class="console-text">{{ line.text }}</span>
      </div>
      <div v-if="consoleLines.length === 0" class="text-center py-4 text-muted">
        <p class="mb-0">Run tests to see output here</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

export interface ConsoleLine {
  time: string
  text: string
  type: 'info' | 'success' | 'error' | 'phase'
}

const props = defineProps<{
  consoleLines: ConsoleLine[]
}>()

defineEmits<{
  clear: []
}>()

const consoleRef = ref<HTMLElement>()

// Auto-scroll when new lines are added
watch(() => props.consoleLines.length, () => {
  nextTick(() => {
    if (consoleRef.value) {
      consoleRef.value.scrollTop = consoleRef.value.scrollHeight
    }
  })
})
</script>
