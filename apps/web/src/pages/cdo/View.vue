<template>
  <div class="container py-4">
    <!-- Header -->
    <div class="d-flex align-items-center justify-content-between mb-4">
      <div class="d-flex align-items-center">
        <router-link to="/cdo" class="btn btn-link text-muted p-0 mr-3">
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </router-link>
        <div>
          <h1 class="h3 mb-0 text-white">{{ bond?.alias || 'CDO Bond' }}</h1>
          <p class="text-muted mb-0 small" style="font-family: monospace;">{{ bond?.address }}</p>
        </div>
      </div>
      <span v-if="bond" :class="statusClass" class="h5 px-3 py-2">{{ statusText }}</span>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="card">
      <div class="card-body text-center py-5">
        <div class="spinner-border text-primary mb-3" role="status">
          <span class="sr-only">Loading...</span>
        </div>
        <p class="text-muted mb-0">Loading bond data...</p>
      </div>
    </div>

    <!-- Bond Data -->
    <template v-else-if="bond">
      <!-- Tranche Overview -->
      <div class="card mb-4">
        <div class="card-header">
          <h5 class="mb-0">Tranche Allocation</h5>
        </div>
        <div class="card-body">
          <!-- Tranche Bar -->
          <div class="d-flex rounded overflow-hidden mb-4" style="height: 24px;">
            <div class="bg-success d-flex align-items-center justify-content-center text-white small"
                 :style="{ width: `${bond.config.tranches.senior.percentage}%` }">
              {{ bond.config.tranches.senior.percentage }}%
            </div>
            <div class="bg-warning d-flex align-items-center justify-content-center text-dark small"
                 :style="{ width: `${bond.config.tranches.mezzanine.percentage}%` }">
              {{ bond.config.tranches.mezzanine.percentage }}%
            </div>
            <div class="bg-danger d-flex align-items-center justify-content-center text-white small"
                 :style="{ width: `${bond.config.tranches.junior.percentage}%` }">
              {{ bond.config.tranches.junior.percentage }}%
            </div>
          </div>

          <div class="row text-center">
            <div class="col-md-4 mb-3 mb-md-0">
              <div class="p-3 rounded" style="background-color: rgba(40, 167, 69, 0.2);">
                <div class="text-success font-weight-bold">Senior</div>
                <div class="h4 mb-0">{{ formatADA(seniorValue) }} ADA</div>
                <div class="small text-muted">{{ bond.config.tranches.senior.rate }}% APR</div>
              </div>
            </div>
            <div class="col-md-4 mb-3 mb-md-0">
              <div class="p-3 rounded" style="background-color: rgba(255, 193, 7, 0.2);">
                <div class="text-warning font-weight-bold">Mezzanine</div>
                <div class="h4 mb-0">{{ formatADA(mezzValue) }} ADA</div>
                <div class="small text-muted">{{ bond.config.tranches.mezzanine.rate }}% APR</div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="p-3 rounded" style="background-color: rgba(220, 53, 69, 0.2);">
                <div class="text-danger font-weight-bold">Junior</div>
                <div class="h4 mb-0">{{ formatADA(juniorValue) }} ADA</div>
                <div class="small text-muted">{{ bond.config.tranches.junior.rate }}% APR</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Collateral Pool -->
      <div class="card mb-4">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h5 class="mb-0">Collateral Pool</h5>
          <span class="badge badge-secondary">
            {{ activeCollateral }} / {{ bond.state.collateral.length }} Active
          </span>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-dark mb-0">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th class="text-right">Principal</th>
                  <th class="text-right">APR</th>
                  <th class="text-right">Payments</th>
                  <th class="text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(c, i) in bond.state.collateral" :key="i">
                  <td>
                    <div class="font-weight-bold">{{ c.assetName || 'Unnamed' }}</div>
                    <div class="small text-muted" style="font-family: monospace;">
                      {{ c.policyId.slice(0, 12) }}...
                    </div>
                  </td>
                  <td class="text-right">{{ formatADA(c.principal) }} ADA</td>
                  <td class="text-right">{{ (c.apr / 100).toFixed(2) }}%</td>
                  <td class="text-right">{{ c.paymentsMade }} / {{ c.totalPayments }}</td>
                  <td class="text-center">
                    <span v-if="c.isDefaulted" class="badge badge-danger">Defaulted</span>
                    <span v-else-if="c.paymentsMade >= c.totalPayments" class="badge badge-success">Complete</span>
                    <span v-else class="badge badge-info">Active</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Manager Actions -->
      <div v-if="isManager" class="card mb-4">
        <div class="card-header">
          <h5 class="mb-0">Manager Actions</h5>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-4 mb-3 mb-md-0">
              <button
                @click="handleCollect"
                :disabled="!canCollect"
                class="btn btn-primary btn-block"
              >
                Collect Payments
              </button>
              <small class="text-muted d-block text-center mt-1">
                Collect from loan contracts
              </small>
            </div>
            <div class="col-md-4 mb-3 mb-md-0">
              <button
                @click="handleDistribute"
                :disabled="!canDistribute"
                class="btn btn-success btn-block"
              >
                Distribute Yields
              </button>
              <small class="text-muted d-block text-center mt-1">
                Pay tranche holders
              </small>
            </div>
            <div class="col-md-4">
              <button
                @click="handleMature"
                :disabled="!canMature"
                class="btn btn-secondary btn-block"
              >
                Mature Bond
              </button>
              <small class="text-muted d-block text-center mt-1">
                Close the bond
              </small>
            </div>
          </div>
        </div>
      </div>

      <!-- Distribution History -->
      <div class="card">
        <div class="card-header">
          <h5 class="mb-0">Distribution History</h5>
        </div>
        <div class="card-body">
          <div v-if="distributions.length === 0" class="text-center py-4 text-muted">
            No distributions yet
          </div>
          <div v-else class="table-responsive">
            <table class="table table-dark mb-0">
              <thead>
                <tr>
                  <th>Date</th>
                  <th class="text-right">Total</th>
                  <th class="text-right text-success">Senior</th>
                  <th class="text-right text-warning">Mezz</th>
                  <th class="text-right text-danger">Junior</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(d, i) in distributions" :key="i">
                  <td>{{ formatDate(d.timestamp) }}</td>
                  <td class="text-right">{{ formatADA(d.total) }} ADA</td>
                  <td class="text-right text-success">{{ formatADA(d.senior) }} ADA</td>
                  <td class="text-right text-warning">{{ formatADA(d.mezzanine) }} ADA</td>
                  <td class="text-right text-danger">{{ formatADA(d.junior) }} ADA</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- No Data -->
    <div v-else class="card">
      <div class="card-body text-center py-5">
        <p class="text-muted mb-0">Bond not found or failed to load.</p>
        <router-link to="/cdo" class="btn btn-primary mt-3">Back to Bonds</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'
import type { CDOBond } from '@/types'

interface Distribution {
  timestamp: number
  total: bigint
  senior: bigint
  mezzanine: bigint
  junior: bigint
}

const route = useRoute()
const wallet = useWalletStore()

// State
const bond = ref<CDOBond | null>(null)
const isLoading = ref(true)
const distributions = ref<Distribution[]>([])

// Load bond on mount
onMounted(() => {
  loadBond()
})

async function loadBond() {
  isLoading.value = true
  try {
    // TODO: Fetch from blockchain using SDK
    // const bondId = route.params.id as string
    // bond.value = await sdk.cdo.getBond(bondId)

    // Mock data for now
    bond.value = null
  } catch (error) {
    console.error('Failed to load bond:', error)
  } finally {
    isLoading.value = false
  }
}

// Computed properties
const statusText = computed(() => {
  if (!bond.value) return 'Unknown'
  if (bond.value.state.isLiquidated) return 'Liquidated'
  if (bond.value.state.isMatured) return 'Matured'
  return 'Active'
})

const statusClass = computed(() => {
  if (!bond.value) return 'badge badge-secondary'
  if (bond.value.state.isLiquidated) return 'badge badge-danger'
  if (bond.value.state.isMatured) return 'badge badge-success'
  return 'badge badge-info'
})

const activeCollateral = computed(() => {
  if (!bond.value) return 0
  return bond.value.state.collateral.filter(c => !c.isDefaulted).length
})

const seniorValue = computed(() => {
  if (!bond.value) return 0n
  return BigInt(bond.value.config.principal * bond.value.config.tranches.senior.percentage / 100)
})

const mezzValue = computed(() => {
  if (!bond.value) return 0n
  return BigInt(bond.value.config.principal * bond.value.config.tranches.mezzanine.percentage / 100)
})

const juniorValue = computed(() => {
  if (!bond.value) return 0n
  return BigInt(bond.value.config.principal * bond.value.config.tranches.junior.percentage / 100)
})

const isManager = computed(() => {
  return wallet.isConnected && bond.value?.managerAddress === wallet.address
})

const canCollect = computed(() => isManager.value && !bond.value?.state.isMatured)
const canDistribute = computed(() => isManager.value && !bond.value?.state.isMatured)
const canMature = computed(() => isManager.value && !bond.value?.state.isMatured)

// Helpers
function formatADA(lovelace: bigint): string {
  return (Number(lovelace) / 1_000_000).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString()
}

// Action handlers
async function handleCollect() {
  // TODO: Implement
  alert('Collect action')
}

async function handleDistribute() {
  // TODO: Implement
  alert('Distribute action')
}

async function handleMature() {
  // TODO: Implement
  alert('Mature action')
}
</script>
