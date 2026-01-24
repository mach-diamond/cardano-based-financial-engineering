<template>
  <span class="badge" :class="badgeClass">
    {{ networkLabel }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWalletStore } from '@/stores/wallet'

const wallet = useWalletStore()

const networkLabel = computed(() => {
  if (!wallet.isConnected) return 'Not Connected'
  return wallet.networkName
})

const badgeClass = computed(() => {
  if (!wallet.isConnected) {
    return 'badge-secondary'
  }
  // Preview/Preprod = testnet (networkId 0)
  // Mainnet = networkId 1
  return wallet.networkId === 0 ? 'badge-warning' : 'badge-success'
})
</script>
