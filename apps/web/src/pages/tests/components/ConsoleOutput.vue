<template>
  <div class="card console-card">
    <div class="card-header d-flex justify-content-between align-items-center section-header" @click="$emit('toggle')">
      <div class="d-flex align-items-center">
        <div class="section-icon section-icon--console mr-3">
          <i class="fas fa-terminal"></i>
        </div>
        <div>
          <h6 class="mb-0 text-white">Test Console</h6>
          <small class="text-muted">{{ consoleLines.length }} messages</small>
        </div>
      </div>
      <div class="d-flex align-items-center">
        <button @click.stop="$emit('clear')" class="btn btn-sm btn-outline-secondary mr-2">
          <i class="fas fa-eraser mr-1"></i> Clear
        </button>
        <span class="collapse-icon">{{ expanded ? '▲' : '▼' }}</span>
      </div>
    </div>
    <div v-show="expanded" class="card-body console-output" ref="consoleRef">
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
  expanded?: boolean
}>()

defineEmits<{
  clear: []
  toggle: []
}>()

const consoleRef = ref<HTMLElement>()

// Auto-scroll when new lines are added
watch(() => props.consoleLines.length, () => {
  nextTick(() => {
    if (consoleRef.value && props.expanded) {
      consoleRef.value.scrollTop = consoleRef.value.scrollHeight
    }
  })
})
</script>

<style scoped>
.console-card {
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
}

.section-header {
  cursor: pointer;
  transition: background 0.2s ease;
}

.section-header:hover {
  background: rgba(255, 255, 255, 0.05);
}

.section-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
}

.section-icon--console {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(99, 102, 241, 0.1) 100%);
  color: #818cf8;
}

.collapse-icon {
  color: #94a3b8;
  font-size: 0.8rem;
}

.console-output {
  max-height: 300px;
  overflow-y: auto;
  font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
  font-size: 0.8rem;
  line-height: 1.5;
  background: rgba(0, 0, 0, 0.3);
  padding: 1rem;
}

.console-line {
  display: flex;
  gap: 1rem;
  padding: 0.15rem 0;
}

.console-time {
  color: #64748b;
  white-space: nowrap;
}

.console-text {
  flex: 1;
}

.console-line.info .console-text {
  color: #94a3b8;
}

.console-line.success .console-text {
  color: #10b981;
}

.console-line.error .console-text {
  color: #ef4444;
}

.console-line.phase .console-text {
  color: #8b5cf6;
  font-weight: 600;
}
</style>
