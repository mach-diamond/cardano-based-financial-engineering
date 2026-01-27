<template>
  <div class="card wallet-card h-100 border-0" :class="gradientClass">
    <div class="card-body p-3 overflow-hidden">
      <div class="d-flex align-items-center h-100">
        <!-- DID-STYLE ICON SECTION -->
        <div class="role-icon-container mr-3">
          <div class="did-border" :class="`border-role-${identity.role.toLowerCase()}`">
            <div class="did-avatar">
              <span class="did-initials">{{ roleInitials }}</span>
            </div>
          </div>
        </div>

        <!-- INFO SECTION -->
        <div class="info-section flex-grow-1 min-width-0">
          <div class="d-flex justify-content-between align-items-center mb-0">
            <h6 class="text-white font-weight-bold mb-0 text-truncate">{{ identity.name }}</h6>
            <div class="status-dot" :class="{ 'active': isRunning }"></div>
          </div>
          <div class="small text-white-50 mb-1 font-family-mono text-truncate">
            {{ identity.address.slice(0, 16) }}...{{ identity.address.slice(-8) }}
          </div>
          
          <div class="d-flex align-items-center gap-2 mt-auto">
            <span class="ada-balance">₳ {{ formattedBalance }}</span>
            <div class="asset-list-horizontal">
              <div v-for="asset in wallet.assets" :key="asset.assetName" 
                   class="asset-mini-card" :title="`${asset.assetName} (${asset.policyId.slice(0, 8)}...)`">
                <i :class="getAssetIcon(asset.assetName)" class="asset-icon-fa"></i>
                <div class="asset-info-mini">
                  <span class="asset-name-mini">{{ asset.assetName }}</span>
                  <span class="asset-policy-mini">{{ asset.policyId.slice(0, 8) }}...</span>
                </div>
                <span class="asset-qty-mini">x{{ asset.quantity }}</span>
              </div>
            </div>
          </div>
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
    case 'Analyst': return 'CIB'
    case 'Investor': return 'IN'
    default: return 'ID'
  }
})

function getAssetIcon(assetName: string): string {
  const name = assetName.toLowerCase()
  if (name.includes('airplane') || name.includes('aircraft')) return 'fas fa-plane'
  if (name.includes('home') || name.includes('realestate') || name.includes('real estate')) return 'fas fa-building'
  if (name.includes('boat') || name.includes('yacht')) return 'fas fa-ship'
  if (name.includes('diamond') || name.includes('jewelry') || name.includes('jewel')) return 'fas fa-gem'
  if (name.includes('collateral') || name.includes('coll')) return 'fas fa-file-contract'
  if (name.includes('clo') || name.includes('tranche')) return 'fas fa-layer-group'
  return 'fas fa-cube'
}
</script>

<style scoped>
.wallet-card {
  height: 105px !important;
  border-radius: 15px !important;
  transition: all 0.3s ease;
  color: #fff;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.wallet-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
}

.bg-gradient-primary-dark { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); }
.bg-gradient-info-dark { background: linear-gradient(135deg, #0f172a 0%, #0e7490 100%); }
.bg-gradient-warning-dark { background: linear-gradient(135deg, #0f172a 0%, #92400e 100%); }
.bg-gradient-success-dark { background: linear-gradient(135deg, #0f172a 0%, #059669 100%); }
.bg-gradient-secondary-dark { background: linear-gradient(135deg, #0f172a 0%, #374151 100%); }

.role-icon-container {
  width: 75px;
  flex-shrink: 0;
}

.did-border {
  width: 75px;
  height: 75px;
  padding: 3px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.border-role-originator { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
.border-role-borrower { background: linear-gradient(135deg, #06b6d4, #0891b2); }
.border-role-analyst { background: linear-gradient(135deg, #f59e0b, #d97706); }
.border-role-investor { background: linear-gradient(135deg, #10b981, #059669); }

.did-avatar {
  width: 100%;
  height: 100%;
  background: #111;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.did-initials {
  font-size: 1.25rem;
  font-weight: 800;
  color: #fff;
  letter-spacing: 1px;
}

.ada-balance {
  font-weight: 800;
  font-size: 0.95rem;
  color: #fbbf24;
  white-space: nowrap;
}

.asset-list-horizontal {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.asset-list-horizontal::-webkit-scrollbar {
  height: 3px;
}

.asset-list-horizontal::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.asset-mini-card {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 4px 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.asset-icon-fa {
  font-size: 0.9rem;
  color: #fbbf24;
  width: 20px;
  text-align: center;
}

.asset-info-mini {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.asset-name-mini {
  font-size: 0.7rem;
  font-weight: 700;
  color: #fff;
}

.asset-policy-mini {
  font-size: 0.55rem;
  color: rgba(255, 255, 255, 0.5);
  font-family: monospace;
}

.asset-qty-mini {
  font-size: 0.75rem;
  font-weight: 800;
  color: #10b981;
  margin-left: 2px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.2);
}

.status-dot.active {
  background-color: #fbbf24;
  box-shadow: 0 0 8px #fbbf24;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.7; }
}
</style>
