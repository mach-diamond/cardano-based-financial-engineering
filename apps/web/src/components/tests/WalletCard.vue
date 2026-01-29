<template>
  <div class="card wallet-card border-0" :class="gradientClass">
    <div class="card-body">
      <!-- Row 1: Name + Balance -->
      <div class="d-flex justify-content-between align-items-center mb-1">
        <div class="d-flex align-items-center">
          <span class="wallet-name">{{ identity.name }}</span>
          <div class="status-dot ml-2" :class="{ 'active': isRunning }"></div>
        </div>
        <span class="ada-balance">₳ {{ formattedBalance }}</span>
      </div>

      <!-- Row 2: Full Address with Copy Button -->
      <div class="address-row">
        <div class="address-full" :title="identity.address">
          {{ identity.address }}
        </div>
        <button class="copy-btn" @click="copyAddress" :class="{ 'copied': addressCopied }">
          <i v-if="!addressCopied" class="fas fa-copy"></i>
          <i v-else class="fas fa-check"></i>
        </button>
      </div>

      <!-- Row 3: Assets -->
      <div class="assets-row">
        <div
          v-for="asset in wallet.assets"
          :key="asset.assetName"
          class="asset-chip"
          :title="asset.policyId"
          @click="copyPolicy(asset.policyId)"
        >
          <span class="asset-icon">{{ getAssetEmoji(asset.assetName) }}</span>
          <span class="asset-name">{{ asset.assetName }}</span>
          <span class="asset-qty">×{{ asset.quantity }}</span>
        </div>
        <div v-if="wallet.assets.length === 0" class="no-assets">No assets</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Identity, SimulatedWallet, IdentityRole } from '@/types'

const props = defineProps<{
  identity: Identity
  isRunning: boolean
}>()

const wallet = computed<SimulatedWallet>(() => props.identity.wallets[0])
const addressCopied = ref(false)

const formattedBalance = computed(() => {
  return (Number(wallet.value.balance) / 1_000_000).toLocaleString()
})

function copyAddress() {
  navigator.clipboard.writeText(props.identity.address)
  addressCopied.value = true
  setTimeout(() => {
    addressCopied.value = false
  }, 2000)
}

function copyPolicy(policyId: string) {
  navigator.clipboard.writeText(policyId)
}

const gradientClass = computed(() => {
  const role = props.identity.role as IdentityRole
  switch (role) {
    case 'Originator': return 'bg-gradient-primary-dark'
    case 'Borrower': return 'bg-gradient-info-dark'
    case 'Analyst': return 'bg-gradient-warning-dark'
    case 'Investor': return 'bg-gradient-success-dark'
    default: return 'bg-gradient-secondary-dark'
  }
})

function getAssetEmoji(assetName: string): string {
  const name = assetName.toLowerCase()
  if (name.includes('airplane') || name.includes('aircraft')) return '✈️'
  if (name.includes('home')) return '🏠'
  if (name.includes('realestate') || name.includes('real estate')) return '🏢'
  if (name.includes('boat') || name.includes('yacht')) return '🚢'
  if (name.includes('diamond') || name.includes('jewelry') || name.includes('jewel')) return '💎'
  if (name.includes('collateral') || name.includes('coll')) return '📄'
  if (name.includes('clo') || name.includes('tranche') || name.includes('manager')) return '📊'
  if (name.includes('senior')) return '🥇'
  if (name.includes('mezzanine') || name.includes('mezz')) return '🥈'
  if (name.includes('junior')) return '🥉'
  return '📦'
}
</script>

<style scoped>
.wallet-card {
  height: auto;
  min-height: 95px;
  border-radius: 12px !important;
  transition: all 0.2s ease;
  color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.wallet-card .card-body {
  padding: 0.5rem 0.75rem !important;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.wallet-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.bg-gradient-primary-dark { background: linear-gradient(135deg, #1a1f35 0%, #1e3a8a 100%); }
.bg-gradient-info-dark { background: linear-gradient(135deg, #1a1f35 0%, #0e7490 100%); }
.bg-gradient-warning-dark { background: linear-gradient(135deg, #1a1f35 0%, #92400e 100%); }
.bg-gradient-success-dark { background: linear-gradient(135deg, #1a1f35 0%, #059669 100%); }
.bg-gradient-secondary-dark { background: linear-gradient(135deg, #1a1f35 0%, #374151 100%); }

.wallet-name {
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
}

.ada-balance {
  font-size: 0.85rem;
  font-weight: 700;
  color: #fbbf24;
  white-space: nowrap;
}

/* Address Row - Full Address Display */
.address-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  padding: 0.35rem 0.5rem;
  margin: 0.15rem 0;
}

.address-full {
  font-family: 'SF Mono', Monaco, 'Courier New', monospace;
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.7);
  word-break: break-all;
  line-height: 1.4;
  flex: 1;
  user-select: all;
}

.copy-btn {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.copy-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.copy-btn.copied {
  background: rgba(16, 185, 129, 0.3);
  color: #34d399;
}

/* Assets Row */
.assets-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  width: 100%;
}

.asset-chip {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 0.2rem 0.5rem;
  cursor: pointer;
  transition: background 0.2s;
}

.asset-chip:hover {
  background: rgba(255, 255, 255, 0.15);
}

.asset-icon {
  font-size: 0.7rem;
  flex-shrink: 0;
}

.asset-name {
  font-size: 0.6rem;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
}

.asset-qty {
  font-size: 0.65rem;
  font-weight: 700;
  color: #10b981;
  background: rgba(16, 185, 129, 0.15);
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
}

.no-assets {
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.3);
  font-style: italic;
}

/* Status Dot */
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
}

.status-dot.active {
  background-color: #fbbf24;
  box-shadow: 0 0 6px #fbbf24;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.7; }
}
</style>
