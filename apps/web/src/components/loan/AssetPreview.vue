<template>
  <div class="text-center p-3 rounded" style="background-color: #4a5568;">
    <div class="d-flex align-items-center justify-content-center mb-3 mx-auto rounded" style="width: 128px; height: 128px; background-color: #718096;">
      <img
        v-if="asset.metadata?.image"
        :src="asset.metadata.image"
        :alt="assetName"
        class="img-fluid rounded"
        style="max-width: 100%; max-height: 100%; object-fit: cover;"
      />
      <svg v-else width="48" height="48" fill="currentColor" class="text-muted" viewBox="0 0 24 24">
        <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <div class="font-weight-bold">{{ assetName }}</div>
    <small class="text-muted" style="font-family: monospace;">
      {{ asset.policyId.slice(0, 12) }}...
    </small>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Asset } from '@/types'

const props = defineProps<{
  asset: Asset
}>()

const assetName = computed(() => {
  return props.asset.metadata?.name || props.asset.assetName || 'Unnamed Asset'
})
</script>
