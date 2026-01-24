<template>
  <router-link :to="`/loan/${loan.id}`" class="card hover:border-mint-500 transition-colors">
    <div class="card-body">
      <div class="flex justify-between items-start mb-4">
        <div>
          <h3 class="font-semibold text-lg">{{ loan.alias || 'Unnamed Loan' }}</h3>
          <p class="text-sm text-gray-400 font-mono">{{ loan.address.slice(0, 20) }}...</p>
        </div>
        <LoanStatusBadge :state="loan.state" />
      </div>

      <div class="grid grid-cols-3 gap-4 mb-4">
        <div>
          <div class="text-xs text-gray-500">Principal</div>
          <div class="font-medium">{{ formatADA(loan.terms.principal) }} ADA</div>
        </div>
        <div>
          <div class="text-xs text-gray-500">Balance</div>
          <div class="font-medium">{{ formatADA(loan.state.balance) }} ADA</div>
        </div>
        <div>
          <div class="text-xs text-gray-500">Progress</div>
          <div class="font-medium">{{ progressPercent.toFixed(1) }}%</div>
        </div>
      </div>

      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: `${progressPercent}%` }"></div>
      </div>
    </div>
  </router-link>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LoanContract } from '@/types'
import LoanStatusBadge from './LoanStatusBadge.vue'

const props = defineProps<{
  loan: LoanContract
}>()

const progressPercent = computed(() => {
  const principal = Number(props.loan.terms.principal)
  const balance = Number(props.loan.state.balance)
  return ((principal - balance) / principal) * 100
})

function formatADA(lovelace: bigint): string {
  return (Number(lovelace) / 1_000_000).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
</script>
