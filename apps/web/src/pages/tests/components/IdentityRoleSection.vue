<template>
  <div :class="columnView ? 'column-section' : ''">
    <div class="section-header" @click="$emit('toggle')">
      <div class="d-flex align-items-center">
        <h6 class="text-muted text-uppercase small mb-0 mr-2">{{ roleName }}</h6>
        <span class="badge badge-sm badge-secondary">{{ identities.length }} | {{ stats.assets }} assets | {{ stats.ada }} ADA</span>
      </div>
      <span class="collapse-icon">{{ expanded ? '▲' : '▼' }}</span>
    </div>
    <div v-show="expanded" :class="columnView ? '' : 'row'" class="mt-2 mb-3">
      <div v-for="identity in identities" :key="identity.id" :class="columnView ? 'mb-2' : 'col-md-6 col-lg-3 mb-3'">
        <WalletCard :identity="identity" :is-running="isRunning" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import WalletCard from '../../../components/tests/WalletCard.vue'

defineProps<{
  roleName: string
  identities: any[]
  stats: { assets: number, ada: number }
  expanded: boolean
  columnView: boolean
  isRunning: boolean
}>()

defineEmits<{
  (e: 'toggle'): void
}>()
</script>
