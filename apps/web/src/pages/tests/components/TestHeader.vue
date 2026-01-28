<template>
  <div class="test-header mb-4">
    <div class="d-flex justify-content-between align-items-center">
      <div>
        <h1 class="h3 mb-1 text-white">Full Lifecycle Test Monitor</h1>
        <p class="text-muted mb-0">Assets → Loans → Collateral → CDO Bundle</p>
      </div>
      <div class="d-flex align-items-end gap-3">
        <!-- Network Selector - Prominent Button Group -->
        <div class="network-selector">
          <div class="network-label">Test Network</div>
          <div class="btn-group btn-group-lg" role="group">
            <button
              type="button"
              class="btn network-btn"
              :class="networkMode === 'emulator' ? 'btn-emulator active' : 'btn-outline-secondary'"
              @click="setNetwork('emulator')"
            >
              <i class="fas fa-desktop mr-2"></i>
              Emulator
            </button>
            <button
              type="button"
              class="btn network-btn"
              :class="networkMode === 'preview' ? 'btn-preview active' : 'btn-outline-secondary'"
              @click="setNetwork('preview')"
            >
              <i class="fas fa-globe mr-2"></i>
              Preview Testnet
            </button>
          </div>
        </div>

        <!-- Run Full Test Button -->
        <button
          @click="$emit('runTests', networkMode)"
          class="btn btn-success btn-lg btn-run-full-test"
          :disabled="isRunning || isCleaning"
        >
          <span v-if="isRunning" class="spinner-border spinner-border-sm mr-2" role="status"></span>
          <i v-else class="fas fa-play mr-2"></i>
          {{ isRunning ? 'Running...' : 'Run Full Test' }}
        </button>

        <!-- Clean Up Button -->
        <button
          @click="$emit('cleanup')"
          class="btn btn-outline-danger btn-lg btn-cleanup"
          :disabled="isRunning || isCleaning"
        >
          <span v-if="isCleaning" class="spinner-border spinner-border-sm mr-2" role="status"></span>
          <i v-else class="fas fa-trash-alt mr-2"></i>
          {{ isCleaning ? 'Cleaning...' : 'Clean Up' }}
        </button>
      </div>
    </div>

    <!-- Network Info Banner -->
    <div class="network-info-banner mt-3" :class="'banner-' + networkMode">
      <div class="d-flex align-items-center">
        <i :class="networkMode === 'emulator' ? 'fas fa-microchip' : 'fas fa-satellite-dish'" class="mr-2"></i>
        <span v-if="networkMode === 'emulator'">
          <strong>Emulator Mode:</strong> Fast, local testing with pre-funded wallets. No real ADA required.
        </span>
        <span v-else>
          <strong>Preview Testnet:</strong> Real blockchain testing. Wallets need funding from faucet.
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  isRunning: boolean
  isCleaning?: boolean
}>()

const emit = defineEmits<{
  runTests: [mode: 'emulator' | 'preview']
  'update:networkMode': [mode: 'emulator' | 'preview']
  cleanup: []
}>()

const networkMode = ref<'emulator' | 'preview'>('emulator')

function setNetwork(mode: 'emulator' | 'preview') {
  networkMode.value = mode
  emit('update:networkMode', mode)
}
</script>

<style scoped>
.test-header {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
  padding: 1.5rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.network-selector {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.network-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
  margin-bottom: 0.35rem;
  font-weight: 600;
}

.network-btn {
  padding: 0.6rem 1.25rem;
  font-weight: 600;
  font-size: 0.95rem;
  border-width: 2px;
  transition: all 0.2s ease;
}

.btn-emulator {
  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
  border-color: #0ea5e9;
  color: white;
  box-shadow: 0 0 20px rgba(14, 165, 233, 0.4);
}

.btn-emulator:hover {
  background: linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%);
  border-color: #38bdf8;
  color: white;
}

.btn-preview {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  border-color: #8b5cf6;
  color: white;
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
}

.btn-preview:hover {
  background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%);
  border-color: #a78bfa;
  color: white;
}

.btn-outline-secondary {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.2);
  color: #94a3b8;
}

.btn-outline-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
  color: #e2e8f0;
}

.btn-run-full-test {
  padding: 0.6rem 1.5rem;
  font-weight: 600;
  font-size: 0.95rem;
  box-shadow: 0 0 20px rgba(34, 197, 94, 0.3);
  /* Match height with network buttons */
  height: calc(0.6rem * 2 + 1.5rem + 4px);
  display: inline-flex;
  align-items: center;
}

.network-info-banner {
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
}

.banner-emulator {
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(2, 132, 199, 0.1) 100%);
  border: 1px solid rgba(14, 165, 233, 0.3);
  color: #7dd3fc;
}

.banner-preview {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(124, 58, 237, 0.1) 100%);
  border: 1px solid rgba(139, 92, 246, 0.3);
  color: #c4b5fd;
}

.gap-3 {
  gap: 1rem;
}

.btn-cleanup {
  padding: 0.6rem 1.25rem;
  font-weight: 600;
  font-size: 0.95rem;
  height: calc(0.6rem * 2 + 1.5rem + 4px);
  display: inline-flex;
  align-items: center;
  border-width: 2px;
  transition: all 0.2s ease;
}

.btn-cleanup:hover:not(:disabled) {
  background: rgba(220, 53, 69, 0.15);
  border-color: #dc3545;
  color: #dc3545;
}
</style>
