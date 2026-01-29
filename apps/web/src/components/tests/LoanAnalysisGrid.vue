<template>
  <div class="loan-calculations">
    <h6 class="text-muted mb-2"><i class="fas fa-calculator mr-1"></i> Loan Analysis</h6>
    <div class="calculations-grid">
      <div v-for="(loan, index) in loans" :key="loan._uid || ('calc-' + index)" class="loan-calc-card">
        <div class="calc-header">
          <span class="calc-index">#{{ index + 1 }}</span>
          <span class="calc-asset">{{ loan.asset || 'Unnamed' }}</span>
          <span class="calc-principal">{{ loan.principal.toLocaleString() }} ADA</span>
        </div>
        <div class="calc-body">
          <div class="calc-row">
            <span class="calc-label">Payment</span>
            <span class="calc-value">{{ calculateTermPayment(loan).toFixed(2) }} / {{ getFrequencyLabel(loan.frequency) }}</span>
          </div>
          <div class="calc-row">
            <span class="calc-label">Interest</span>
            <span class="calc-value" :class="{ 'text-success': loan.apr > 0 }">+{{ calculateTotalInterest(loan).toFixed(2) }}</span>
          </div>
          <div class="calc-row total">
            <span class="calc-label">Total</span>
            <span class="calc-value text-info">{{ calculateTotalValue(loan).toFixed(2) }} ADA</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LoanConfig } from '@/utils/pipeline/types'

interface Props {
  loans: LoanConfig[]
}

defineProps<Props>()

const frequencyOptions = [
  { value: 12, label: 'Monthly' },
  { value: 4, label: 'Quarterly' },
  { value: 2, label: 'Bi-Annual' },
  { value: 52, label: 'Weekly' },
  { value: 365, label: 'Daily' },
  { value: 8760, label: 'Hourly' },
  { value: 17531, label: '30-min' },
  { value: 35063, label: '15-min' },
  { value: 52594, label: '10-min' },
  { value: 105189, label: '5-min' },
]

function getFrequencyLabel(frequency?: number): string {
  const freq = frequencyOptions.find(f => f.value === (frequency || 12))
  if (freq) return freq.label.replace('-', '')
  if ((frequency || 12) === 12) return 'mo'
  if (frequency === 4) return 'qtr'
  return 'period'
}

function calculateTermPayment(loan: { principal: number; apr: number; termMonths: number; frequency?: number }): number {
  const principal = loan.principal
  const apr = loan.apr / 100
  const installments = loan.termMonths
  const periodsPerYear = loan.frequency || 12

  if (installments <= 0) return 0
  if (apr === 0) {
    return principal / installments
  }

  const periodRate = apr / periodsPerYear
  const termPayment = (periodRate * principal) / (1 - Math.pow(1 + periodRate, -installments))
  return Math.round((termPayment + Number.EPSILON) * 100) / 100
}

function calculateTotalInterest(loan: { principal: number; apr: number; termMonths: number; frequency?: number }): number {
  const termPayment = calculateTermPayment(loan)
  const totalPaid = termPayment * loan.termMonths
  return Math.max(0, Math.round((totalPaid - loan.principal + Number.EPSILON) * 100) / 100)
}

function calculateTotalValue(loan: { principal: number; apr: number; termMonths: number; frequency?: number }): number {
  return loan.principal + calculateTotalInterest(loan)
}
</script>

<style scoped>
.loan-calculations {
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.5rem;
  padding: 1rem;
}

.calculations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.75rem;
}

.loan-calc-card {
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.375rem;
  overflow: hidden;
}

.calc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.calc-index {
  font-weight: 700;
  font-size: 0.7rem;
  background: rgba(59, 130, 246, 0.3);
  color: #93c5fd;
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  margin-right: 0.5rem;
}

.calc-asset {
  font-weight: 600;
  color: #e2e8f0;
  font-size: 0.85rem;
}

.calc-principal {
  font-size: 0.75rem;
  color: #94a3b8;
}

.calc-body {
  padding: 0.5rem 0.75rem;
}

.calc-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.2rem 0;
  font-size: 0.8rem;
}

.calc-row.total {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 0.25rem;
  padding-top: 0.35rem;
}

.calc-label {
  color: #94a3b8;
}

.calc-value {
  font-weight: 500;
  color: #e2e8f0;
}

.text-success {
  color: #4ade80;
}

.text-info {
  color: #38bdf8;
}
</style>
