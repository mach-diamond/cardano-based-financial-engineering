<template>
  <div class="card wallet-card border-0" :class="gradientClass">
    <div class="card-body">
      <!-- Row 1: Role Badge + Name + Balance -->
      <div class="d-flex justify-content-between align-items-center mb-1">
        <div class="d-flex align-items-center">
          <span class="role-badge" :class="`role-${identity.role.toLowerCase()}`">{{ roleInitials }}</span>
          <span class="wallet-name">{{ identity.name }}</span>
          <div class="status-dot ml-2" :class="{ 'active': isRunning }"></div>
        </div>
        <span class="ada-balance">₳ {{ formattedBalance }}</span>
      </div>

      <!-- Row 2: Address (clickable) -->
      <div class="address-row" @click="toggleAddress" :title="addressExpanded ? 'Click to collapse' : 'Click to copy'">
        <span class="address-text" :class="{ 'expanded': addressExpanded }">
          {{ displayAddress }}
        </span>
        <i v-if="!addressExpanded" class="ni ni-single-copy-04 copy-icon"></i>
        <i v-else class="ni ni-check-bold copy-icon text-success"></i>
      </div>

      <!-- Row 3: Assets -->
      <div class="assets-row">
        <div v-for="asset in wallet.assets" :key="asset.assetName" class="asset-chip" :title="asset.assetName">
          <span class="asset-icon">{{ getAssetEmoji(asset.assetName) }}</span>
          <span class="asset-name">{{ asset.assetName }}</span>
          <span class="asset-policy">{{ formatPolicy(asset.policyId) }}</span>
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
const addressExpanded = ref(false)

const formattedBalance = computed(() => {
  return (Number(wallet.value.balance) / 1_000_000).toLocaleString()
})

const displayAddress = computed(() => {
  const addr = props.identity.address
  if (addressExpanded.value) {
    return addr
  }
  return `addr...${addr.slice(-8)}`
})

function toggleAddress() {
  if (!addressExpanded.value) {
    navigator.clipboard.writeText(props.identity.address)
  }
  addressExpanded.value = !addressExpanded.value
  if (addressExpanded.value) {
    setTimeout(() => {
      addressExpanded.value = false
    }, 3000)
  }
}

function formatPolicy(policyId: string): string {
  if (policyId.length < 8) return policyId
  return `${policyId.slice(0, 4)}...${policyId.slice(-4)}`
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

const roleInitials = computed(() => {
  const role = props.identity.role as IdentityRole
  switch (role) {
    case 'Originator': return 'OR'
    case 'Borrower': return 'BO'
    case 'Analyst': return 'CLO'
    case 'Investor': return 'INV'
    default: return 'ID'
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
  height: 100px;
  min-height: 100px;
  max-height: 100px;
  border-radius: 12px !important;
  transition: all 0.2s ease;
  color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.wallet-card .card-body {
  height: 100%;
  padding: 0.5rem 0.75rem !important;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
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

/* Role Badge */
.role-badge {
  font-size: 0.6rem;
  font-weight: 700;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  margin-right: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.role-originator { background: rgba(59, 130, 246, 0.3); color: #93c5fd; }
.role-borrower { background: rgba(6, 182, 212, 0.3); color: #67e8f9; }
.role-analyst { background: rgba(245, 158, 11, 0.3); color: #fcd34d; }
.role-investor { background: rgba(16, 185, 129, 0.3); color: #6ee7b7; }

.wallet-name {
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.ada-balance {
  font-size: 0.85rem;
  font-weight: 700;
  color: #fbbf24;
  white-space: nowrap;
}

/* Address Row */
.address-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  cursor: pointer;
  padding: 0.15rem 0;
}

.address-row:hover .address-text {
  color: #fff;
}

.address-text {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.6);
  transition: color 0.2s;
}

.address-text.expanded {
  font-size: 0.55rem;
  word-break: break-all;
}

.copy-icon {
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.4);
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
  flex: 1;
  min-width: 0;
}

.asset-icon {
  font-size: 0.7rem;
}

.asset-name {
  font-size: 0.6rem;
  font-weight: 600;
  color: #fff;
  max-width: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-policy {
  font-size: 0.5rem;
  color: rgba(255, 255, 255, 0.4);
  font-family: monospace;
}

.asset-qty {
  font-size: 0.6rem;
  font-weight: 700;
  color: #10b981;
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
