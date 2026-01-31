<template>
  <div class="card console-card" :class="{ 'console-collapsed': !expanded }">
    <div class="card-header d-flex justify-content-between align-items-center section-header" @click="$emit('toggle')">
      <div class="d-flex align-items-center">
        <div class="section-icon section-icon--console mr-3">
          <i class="fas fa-terminal"></i>
        </div>
        <div>
          <h6 class="mb-0 text-white">Test Console</h6>
          <small class="text-muted">
            {{ filteredLines.length }}{{ searchQuery ? ` of ${consoleLines.length}` : '' }} messages
          </small>
        </div>
      </div>
      <div class="d-flex align-items-center">
        <!-- Search Input -->
        <div class="console-search mr-2" @click.stop>
          <i class="fas fa-search search-icon"></i>
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="Filter..."
            @keydown.stop
          />
          <button
            v-if="searchQuery"
            class="search-clear"
            @click="searchQuery = ''"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
        <button @click.stop="$emit('clear')" class="btn btn-sm btn-outline-secondary mr-2">
          <i class="fas fa-eraser mr-1"></i> Clear
        </button>
        <span class="collapse-icon">{{ expanded ? '▲' : '▼' }}</span>
      </div>
    </div>
    <div v-show="expanded" class="card-body console-output" ref="consoleRef">
      <div v-for="(line, i) in filteredLines" :key="i" class="console-line" :class="line.type">
        <span class="console-time">{{ line.time }}</span>
        <span class="console-text" v-html="highlightMatch(line.text)"></span>
      </div>
      <div v-if="filteredLines.length === 0 && consoleLines.length > 0" class="text-center py-4 text-muted">
        <p class="mb-0">No matches for "{{ searchQuery }}"</p>
      </div>
      <div v-if="consoleLines.length === 0" class="text-center py-4 text-muted">
        <p class="mb-0">Run tests to see output here</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'

export interface ConsoleLine {
  time: string
  text: string
  type: 'info' | 'success' | 'error' | 'phase' | 'warning'
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
const searchQuery = ref('')

// Filter console lines based on search query
const filteredLines = computed(() => {
  if (!searchQuery.value.trim()) {
    return props.consoleLines
  }
  const query = searchQuery.value.toLowerCase()
  return props.consoleLines.filter(line =>
    line.text.toLowerCase().includes(query) ||
    line.time.toLowerCase().includes(query)
  )
})

// Highlight matching text in results
function highlightMatch(text: string): string {
  if (!searchQuery.value.trim()) {
    return escapeHtml(text)
  }
  const query = searchQuery.value
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi')
  return escapeHtml(text).replace(regex, '<mark class="search-highlight">$1</mark>')
}

// Escape HTML to prevent XSS
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// Escape regex special characters
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Auto-scroll when new lines are added (only when not searching)
watch(() => props.consoleLines.length, () => {
  nextTick(() => {
    if (consoleRef.value && props.expanded && !searchQuery.value) {
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

.console-card.console-collapsed .card-header {
  border-bottom: none;
  border-radius: 0.75rem;
}

.console-card.console-collapsed {
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

.console-line.warning .console-text {
  color: #f59e0b;
}

/* Search Input */
.console-search {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 8px;
  color: #64748b;
  font-size: 0.75rem;
  pointer-events: none;
}

.search-input {
  width: 150px;
  padding: 0.25rem 1.75rem 0.25rem 1.75rem;
  font-size: 0.75rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  color: #e2e8f0;
  transition: all 0.15s ease;
}

.search-input:focus {
  outline: none;
  border-color: #6366f1;
  background: rgba(0, 0, 0, 0.4);
  width: 200px;
}

.search-input::placeholder {
  color: #64748b;
}

.search-clear {
  position: absolute;
  right: 4px;
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0.15rem 0.35rem;
  font-size: 0.65rem;
  border-radius: 2px;
}

.search-clear:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

/* Search Highlight */
:deep(.search-highlight) {
  background: rgba(251, 191, 36, 0.3);
  color: #fcd34d;
  padding: 0 2px;
  border-radius: 2px;
}
</style>
