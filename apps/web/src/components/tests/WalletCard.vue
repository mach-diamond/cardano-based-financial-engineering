<template>
  <div class="card wallet-card h-100 border-dark shadow-sm">
    <div class="card-body p-3">
      <div class="d-flex justify-content-between align-items-start mb-2">
        <span class="badge" :class="badgeClass">{{ identity.role }}</span>
        <div class="status-dot" :class="{ 'active': isRunning }"></div>
      </div>
      <h6 class="text-white font-weight-bold mb-1 wallet-name">{{ identity.name }}</h6>
      <div class="small text-muted mb-2 font-family-mono wallet-address">
        {{ identity.address }}
      </div>
      
      <div class="d-flex justify-content-between align-items-center mb-1">
        <span class="small text-muted">ADA Balance</span>
        <span class="font-weight-bold text-mint">{{ formattedBalance }}</span>
      </div>
      
      <div class="mt-2 border-top border-dark pt-2">
        <div class="small text-muted mb-1">Assets:</div>
        <div class="d-flex flex-wrap" style="gap: 4px;">
          <span v-for="asset in wallet.assets" :key="asset.assetName" 
                class="badge badge-secondary asset-badge">
            {{ asset.assetName }} ({{ asset.quantity }})
          </span>
          <span v-if="wallet.assets.length === 0" class="text-muted small fst-italic">No assets</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Identity, SimulatedWallet, IdentityRole } from '@/types'

const props = defineProps<{
  identity: Identity
  isRunning: boolean
}>()

const wallet = computed<SimulatedWallet>(() => props.identity.wallets[0])

const formattedBalance = computed(() => {
  return (Number(wallet.value.balance) / 1_000_000).toFixed(0)
})

const badgeClass = computed(() => {
  const role = props.identity.role as IdentityRole
  switch (role) {
    case 'Originator': return 'badge-primary'
    case 'Borrower': return 'badge-info'
    case 'Analyst': return 'badge-warning'
    case 'Investor': return 'badge-success'
    default: return 'badge-secondary'
  }
})
</script>

<style scoped>
.wallet-card {
  transition: all 0.3s ease;
}
.wallet-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}
.wallet-name {
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.asset-badge {
  font-size: 0.65rem;
}
.wallet-address {
  word-break: break-all;
  font-size: 0.7rem;
  line-height: 1.3;
}
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #6c757d;
}
.status-dot.active {
  background-color: #ffc107;
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
