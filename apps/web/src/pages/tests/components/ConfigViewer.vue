<template>
  <div class="config-viewer mb-4">
    <!-- Collapsed Header -->
    <div
      class="config-header d-flex justify-content-between align-items-center"
      @click="isExpanded = !isExpanded"
      role="button"
    >
      <div class="d-flex align-items-center">
        <i
          class="fas fa-chevron-right expand-icon mr-2"
          :class="{ 'expanded': isExpanded }"
        ></i>
        <i class="fas fa-cog text-info mr-2"></i>
        <span class="config-title">Test Configuration</span>
        <span class="badge badge-secondary ml-2">{{ walletCount }} wallets</span>
        <span class="badge badge-info ml-2">{{ phaseCount }} phases</span>
      </div>
      <div class="d-flex align-items-center" @click.stop>
        <button
          class="btn btn-sm btn-outline-info mr-2"
          @click="copyToClipboard"
          title="Copy JSON to clipboard"
        >
          <i class="fas fa-copy mr-1"></i>
          Copy
        </button>
        <button
          class="btn btn-sm btn-outline-success mr-2"
          @click="downloadJson"
          title="Download as JSON file"
        >
          <i class="fas fa-download mr-1"></i>
          Export
        </button>
        <button
          class="btn btn-sm btn-outline-warning"
          @click="loadFromFile"
          title="Load config from file"
        >
          <i class="fas fa-upload mr-1"></i>
          Import
        </button>
        <input
          type="file"
          ref="fileInput"
          accept=".json"
          class="d-none"
          @change="handleFileUpload"
        />
      </div>
    </div>

    <!-- Expanded Content -->
    <transition name="expand">
      <div v-if="isExpanded" class="config-content">
        <!-- Tabs -->
        <ul class="nav nav-tabs config-tabs">
          <li class="nav-item">
            <a
              class="nav-link"
              :class="{ active: activeTab === 'wallets' }"
              @click="activeTab = 'wallets'"
            >
              <i class="fas fa-wallet mr-1"></i>
              Wallets
            </a>
          </li>
          <li class="nav-item">
            <a
              class="nav-link"
              :class="{ active: activeTab === 'phases' }"
              @click="activeTab = 'phases'"
            >
              <i class="fas fa-tasks mr-1"></i>
              Phases
            </a>
          </li>
          <li class="nav-item">
            <a
              class="nav-link"
              :class="{ active: activeTab === 'full' }"
              @click="activeTab = 'full'"
            >
              <i class="fas fa-code mr-1"></i>
              Full JSON
            </a>
          </li>
        </ul>

        <!-- Tab Content -->
        <div class="tab-content">
          <!-- Wallets Tab -->
          <div v-if="activeTab === 'wallets'" class="config-json-wrapper">
            <pre class="config-json"><code>{{ formattedWallets }}</code></pre>
          </div>

          <!-- Phases Tab -->
          <div v-if="activeTab === 'phases'" class="config-json-wrapper">
            <pre class="config-json"><code>{{ formattedPhases }}</code></pre>
          </div>

          <!-- Full JSON Tab -->
          <div v-if="activeTab === 'full'" class="config-json-wrapper">
            <pre class="config-json"><code>{{ formattedFullConfig }}</code></pre>
          </div>
        </div>

        <!-- Copy Success Toast -->
        <transition name="fade">
          <div v-if="showCopySuccess" class="copy-toast">
            <i class="fas fa-check mr-1"></i>
            Copied to clipboard!
          </div>
        </transition>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  config: {
    wallets: Array<{
      name: string
      role: string
      initialAda?: number
    }>
    defaultFunding?: {
      originator: number
      borrower: number
      analyst: number
      investor: number
    }
  } | null
  phases: Array<{
    id: number
    name: string
    description: string
    steps: any[]
  }>
  identities: Array<{
    id: string
    name: string
    role: string
    address: string
  }>
}>()

const emit = defineEmits<{
  'import-config': [config: any]
}>()

const isExpanded = ref(false)
const activeTab = ref<'wallets' | 'phases' | 'full'>('wallets')
const showCopySuccess = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const walletCount = computed(() => props.config?.wallets?.length || props.identities?.length || 0)
const phaseCount = computed(() => props.phases?.length || 0)

const formattedWallets = computed(() => {
  const wallets = props.config?.wallets || props.identities?.map(i => ({
    name: i.name,
    role: i.role,
    address: i.address
  })) || []
  return JSON.stringify(wallets, null, 2)
})

const formattedPhases = computed(() => {
  const phaseSummary = props.phases.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    stepCount: p.steps.length,
    steps: p.steps.map(s => ({
      id: s.id,
      name: s.name,
      status: s.status
    }))
  }))
  return JSON.stringify(phaseSummary, null, 2)
})

const formattedFullConfig = computed(() => {
  const fullConfig = {
    config: props.config,
    phases: props.phases.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      steps: p.steps
    })),
    identities: props.identities
  }
  return JSON.stringify(fullConfig, null, 2)
})

function copyToClipboard() {
  const text = activeTab.value === 'wallets'
    ? formattedWallets.value
    : activeTab.value === 'phases'
    ? formattedPhases.value
    : formattedFullConfig.value

  navigator.clipboard.writeText(text).then(() => {
    showCopySuccess.value = true
    setTimeout(() => {
      showCopySuccess.value = false
    }, 2000)
  })
}

function downloadJson() {
  const text = formattedFullConfig.value
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mintmatrix-test-config-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function loadFromFile() {
  fileInput.value?.click()
}

function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const config = JSON.parse(e.target?.result as string)
      emit('import-config', config)
    } catch (err) {
      console.error('Failed to parse config file:', err)
      alert('Invalid JSON file')
    }
  }
  reader.readAsText(file)

  // Reset input
  input.value = ''
}
</script>

<style scoped>
.config-viewer {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.7) 100%);
  border-radius: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.config-header {
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background 0.2s ease;
}

.config-header:hover {
  background: rgba(255, 255, 255, 0.05);
}

.config-title {
  font-weight: 600;
  color: #e2e8f0;
}

.expand-icon {
  transition: transform 0.2s ease;
  color: #64748b;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.config-content {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.config-tabs {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0 1rem;
  background: rgba(0, 0, 0, 0.2);
}

.config-tabs .nav-link {
  color: #94a3b8;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.config-tabs .nav-link:hover {
  color: #e2e8f0;
  border-bottom-color: rgba(255, 255, 255, 0.2);
}

.config-tabs .nav-link.active {
  color: #38bdf8;
  border-bottom-color: #38bdf8;
  background: transparent;
}

.config-json-wrapper {
  max-height: 400px;
  overflow: auto;
}

.config-json {
  margin: 0;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.3);
  color: #a5f3fc;
  font-size: 0.75rem;
  line-height: 1.5;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  white-space: pre;
}

.copy-toast {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  background: #22c55e;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
}

/* Transitions */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  max-height: 500px;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Scrollbar styling */
.config-json-wrapper::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.config-json-wrapper::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}

.config-json-wrapper::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.config-json-wrapper::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
