<template>
  <div class="card bg-dark border-secondary overflow-hidden">
    <div class="card-header py-2 d-flex justify-content-between align-items-center bg-dark">
      <span class="text-secondary small font-weight-bold text-uppercase">Execution Console</span>
      <button @click="$emit('clear')" class="btn btn-sm btn-link text-muted p-0">Clear</button>
    </div>
    <div class="card-body p-0" style="background: #0d1117">
      <div ref="consoleRef" class="console-output">
        <div v-if="lines.length === 0" class="p-3 text-muted small italic">
          Logs will appear here during test execution...
        </div>
        <div v-for="(line, idx) in lines" :key="idx" class="console-line" :class="line.type">
          <span class="console-time">{{ line.time }}</span>
          <span class="console-text">{{ line.text }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

interface ConsoleLine {
  time: string
  text: string
  type: 'info' | 'success' | 'error' | 'phase'
}

const props = defineProps<{
  lines: ConsoleLine[]
}>()

defineEmits<{
  (e: 'clear'): void
}>()

const consoleRef = ref<HTMLElement>()

const scrollToBottom = () => {
  if (consoleRef.value) {
    consoleRef.value.scrollTop = consoleRef.value.scrollHeight
  }
}

watch(() => props.lines.length, () => {
  setTimeout(scrollToBottom, 50)
}, { deep: true })

onMounted(scrollToBottom)
</script>
