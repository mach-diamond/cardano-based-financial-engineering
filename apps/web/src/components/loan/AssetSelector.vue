<template>
  <div>
    <div v-if="assets.length === 0" class="text-center py-4">
      <div class="rounded-circle bg-secondary d-inline-flex align-items-center justify-content-center mb-3" style="width: 64px; height: 64px;">
        <svg width="32" height="32" fill="currentColor" class="text-muted" viewBox="0 0 24 24">
          <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <p class="text-muted mb-2">No assets found in your wallet</p>
      <small class="text-muted">Mint or transfer an NFT to use as collateral</small>
    </div>

    <select
      v-else
      :value="modelValue?.policyId"
      @change="onSelect"
      class="form-control"
    >
      <option value="" disabled selected>Select an asset</option>
      <option
        v-for="asset in assets"
        :key="asset.policyId + asset.assetName"
        :value="asset.policyId"
      >
        ({{ asset.quantity }}) {{ asset.assetName || 'Unnamed Asset' }} - {{ asset.policyId.slice(0, 8) }}...
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import type { Asset } from '@/types'

const props = defineProps<{
  modelValue: Asset | null
  assets: Asset[]
}>()

const emit = defineEmits<{
  'update:modelValue': [asset: Asset | null]
}>()

function onSelect(event: Event) {
  const target = event.target as HTMLSelectElement
  const asset = props.assets.find(a => a.policyId === target.value)
  emit('update:modelValue', asset || null)
}
</script>
