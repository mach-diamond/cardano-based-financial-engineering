<template>
  <div class="d-flex justify-content-between align-items-center mb-4">
    <div>
      <h1 class="h3 mb-1 text-white">Full Lifecycle Test Monitor</h1>
      <p class="text-muted mb-0">Assets → Loans → Collateral → CDO Bundle</p>
    </div>
    <div class="d-flex gap-2">
      <button @click="$emit('runTests', 'demo')" class="btn btn-outline-info mr-2" :disabled="isRunning">
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="mr-1">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Demo Mode
      </button>
      <button @click="$emit('runTests', 'emulator')" class="btn btn-outline-secondary mr-2" :disabled="isRunning">
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="mr-1">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        Emulator
      </button>
      <button @click="$emit('runTests', 'preview')" class="btn btn-primary" :disabled="isRunning">
        <svg v-if="!isRunning" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="mr-1">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
        <span v-if="isRunning" class="spinner-border spinner-border-sm mr-1" role="status"></span>
        {{ isRunning ? 'Running...' : 'Preview Testnet' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  isRunning: boolean
}>()

defineEmits<{
  runTests: [mode: 'demo' | 'emulator' | 'preview']
}>()
</script>
