<template>
  <router-link :to="`/cdo/${bond.id}`" class="card h-100 text-decoration-none">
    <div class="card-body">
      <div class="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h5 class="card-title mb-1">{{ bond.alias || 'Unnamed Bond' }}</h5>
          <p class="small text-muted mb-0" style="font-family: monospace;">{{ bond.address.slice(0, 20) }}...</p>
        </div>
        <span :class="statusClass">{{ statusText }}</span>
      </div>

      <!-- Tranche Bars -->
      <div class="d-flex rounded overflow-hidden mb-3" style="height: 12px;">
        <div class="bg-success" :style="{ width: `${bond.config.tranches.senior.percentage}%` }"></div>
        <div class="bg-warning" :style="{ width: `${bond.config.tranches.mezzanine.percentage}%` }"></div>
        <div class="bg-danger" :style="{ width: `${bond.config.tranches.junior.percentage}%` }"></div>
      </div>

      <div class="row text-center small">
        <div class="col-4">
          <div class="text-muted">Principal</div>
          <div class="font-weight-bold">{{ formatADA(bond.config.principal) }} ADA</div>
        </div>
        <div class="col-4">
          <div class="text-muted">Collected</div>
          <div class="font-weight-bold">{{ formatADA(bond.state.totalCollected) }} ADA</div>
        </div>
        <div class="col-4">
          <div class="text-muted">Collateral</div>
          <div class="font-weight-bold">
            {{ bond.state.collateral.filter(c => !c.isDefaulted).length }} /
            {{ bond.state.collateral.length }}
          </div>
        </div>
      </div>
    </div>
  </router-link>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CDOBond } from '@/types'

const props = defineProps<{
  bond: CDOBond
}>()

const statusText = computed(() => {
  if (props.bond.state.isLiquidated) return 'Liquidated'
  if (props.bond.state.isMatured) return 'Matured'
  return 'Active'
})

const statusClass = computed(() => {
  if (props.bond.state.isLiquidated) return 'badge badge-danger'
  if (props.bond.state.isMatured) return 'badge badge-success'
  return 'badge badge-info'
})

function formatADA(lovelace: bigint): string {
  return (Number(lovelace) / 1_000_000).toLocaleString()
}
</script>
