<template>
  <div class="card h-100">
    <div class="card-header d-flex justify-content-between align-items-center">
      <h6 class="mb-0">Loan Portfolio ({{ loanPortfolio.length }} Loans)</h6>
      <span class="badge badge-primary">Total: {{ totalPrincipal.toLocaleString() }} ADA</span>
    </div>
    <div class="card-body">
      <div class="loan-grid">
        <div v-for="loan in loanPortfolio" :key="loan.id"
             class="loan-chip"
             :class="{ 'loan-defaulted': loan.defaulted, 'loan-active': loan.active }">
          <div class="loan-chip-header">
            <span class="loan-number">#{{ loan.id }}</span>
            <span class="loan-status-dot" :class="loan.defaulted ? 'bg-danger' : loan.active ? 'bg-success' : 'bg-secondary'"></span>
          </div>
          <div class="loan-amount">{{ loan.principal }} ADA</div>
          <div class="loan-apr">{{ loan.apr }}% APR</div>
          <div class="loan-progress">
            <div class="progress" style="height: 3px;">
              <div class="progress-bar" :class="loan.defaulted ? 'bg-danger' : 'bg-success'"
                   :style="{ width: `${(loan.payments / loan.totalPayments) * 100}%` }"></div>
            </div>
            <small class="text-muted">{{ loan.payments }}/{{ loan.totalPayments }}</small>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface Loan {
  id: number
  principal: number
  apr: number
  payments: number
  totalPayments: number
  active: boolean
  defaulted: boolean
  asset: string
  borrower: string
}

const props = defineProps<{
  loanPortfolio: Loan[]
}>()

const totalPrincipal = computed(() =>
  props.loanPortfolio.reduce((sum, loan) => sum + loan.principal, 0)
)
</script>
