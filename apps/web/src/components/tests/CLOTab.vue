<template>
  <div class="config-panel">
    <div class="panel-header">
      <h4>CLO Configuration</h4>
      <p class="text-muted">Configure collateralized loan obligation tranches</p>
    </div>

    <!-- Loans Reference -->
    <div v-if="loans.length > 0" class="loans-reference-bar mb-4">
      <div class="d-flex align-items-center justify-content-between mb-2">
        <span class="text-muted small"><i class="fas fa-file-contract mr-1"></i> Loans for CLO Collateral ({{ eligibleLoans.length }} eligible):</span>
        <div class="d-flex gap-2">
          <span class="badge badge-secondary">{{ eligibleLoans.reduce((sum, l) => sum + l.principal, 0).toLocaleString() }} ADA Principal</span>
          <span class="badge badge-info">{{ eligibleLoans.reduce((sum, l) => sum + calculateTotalValue(l), 0).toFixed(0) }} ADA Total Value</span>
        </div>
      </div>
      <div class="loan-pills-clo">
        <div
          v-for="(loan, idx) in loans"
          :key="idx"
          class="loan-pill-clo"
          :class="{ 'eligible': !['T1', 'T6'].includes(loan.lifecycleCase || 'T4'), 'ineligible': ['T1', 'T6'].includes(loan.lifecycleCase || 'T4') }"
        >
          <div class="loan-pill-clo-header">
            <span class="loan-pill-index">#{{ idx + 1 }}</span>
            <span class="loan-pill-asset">{{ loan.asset || 'No Asset' }}</span>
            <span class="loan-pill-lifecycle" :class="'lc-' + (loan.lifecycleCase || 'T4')">{{ loan.lifecycleCase || 'T4' }}</span>
          </div>
          <div class="loan-pill-clo-body">
            <div class="loan-pill-row">
              <span class="loan-pill-label">Principal</span>
              <span class="loan-pill-value">{{ loan.principal.toLocaleString() }}</span>
            </div>
            <div class="loan-pill-row">
              <span class="loan-pill-label">Payment</span>
              <span class="loan-pill-value">{{ calculateTermPayment(loan).toFixed(0) }}/{{ getFrequencyLabel(loan.frequency) }}</span>
            </div>
            <div class="loan-pill-row">
              <span class="loan-pill-label">Interest</span>
              <span class="loan-pill-value text-success">+{{ calculateTotalInterest(loan).toFixed(0) }}</span>
            </div>
            <div class="loan-pill-row total">
              <span class="loan-pill-label">Total</span>
              <span class="loan-pill-value text-info">{{ calculateTotalValue(loan).toFixed(0) }}</span>
            </div>
          </div>
        </div>
      </div>
      <small class="text-muted d-block mt-2">
        <i class="fas fa-info-circle mr-1"></i>
        Loans with T1 (Cancel) or T6 (Reject) lifecycle cases won't be included in CLO collateral.
      </small>
    </div>
    <div v-else class="alert alert-info small mb-4">
      <i class="fas fa-info-circle mr-1"></i>
      No loans defined. Add loans in the Loans tab to bundle into CLO.
    </div>

    <div class="row">
      <div class="col-md-6">
        <div class="form-group">
          <label>CLO Name</label>
          <input v-model="cloConfig.name" type="text" class="form-control config-input" placeholder="CLO Series Name" />
        </div>
      </div>
    </div>

    <h5 class="mt-4 mb-3">Tranche Allocation</h5>
    <div class="tranche-config">
      <div v-for="(tranche, index) in cloConfig.tranches" :key="index" class="tranche-row">
        <div class="tranche-inputs">
          <div class="form-group">
            <label>Name</label>
            <input v-model="tranche.name" type="text" class="form-control form-control-sm" />
          </div>
          <div class="form-group">
            <label>Allocation %</label>
            <input v-model.number="tranche.allocation" type="number" min="0" max="100" class="form-control form-control-sm" />
          </div>
          <div class="form-group">
            <label>Yield Modifier</label>
            <div class="input-group input-group-sm">
              <input v-model.number="tranche.yieldModifier" type="number" step="0.1" class="form-control" />
              <span class="input-group-text">x</span>
            </div>
          </div>
        </div>
        <div class="tranche-bar-container">
          <div class="tranche-bar" :style="{ width: `${tranche.allocation}%` }" :class="'tranche-' + tranche.name.toLowerCase()">
            {{ tranche.name }}: {{ tranche.allocation }}%
          </div>
        </div>
      </div>
    </div>

    <div class="allocation-total mt-3" :class="{ 'text-danger': allocationTotal !== 100, 'text-success': allocationTotal === 100 }">
      <strong>Total Allocation: {{ allocationTotal }}%</strong>
      <span v-if="allocationTotal !== 100" class="ml-2">(must equal 100%)</span>
      <span v-else class="ml-2"><i class="fas fa-check"></i></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LoanConfig, CLOConfig } from '@/utils/pipeline/types'

interface Props {
  cloConfig: CLOConfig
  loans: LoanConfig[]
}

const props = defineProps<Props>()

const frequencyOptions = [
  { value: 12, label: 'Monthly' },
  { value: 4, label: 'Quarterly' },
  { value: 2, label: 'Bi-Annual' },
  { value: 52, label: 'Weekly' },
  { value: 365, label: 'Daily' },
  { value: 8760, label: 'Hourly' },
]

const eligibleLoans = computed(() => {
  return props.loans.filter(l => !['T1', 'T6'].includes(l.lifecycleCase || 'T4'))
})

const allocationTotal = computed(() => {
  return props.cloConfig.tranches.reduce((sum, t) => sum + t.allocation, 0)
})

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
  if (apr === 0) return principal / installments

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
.config-panel {
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  padding: 1.5rem;
}

.panel-header h4 {
  color: #f1f5f9;
  margin-bottom: 0.25rem;
}

.config-input {
  background: rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
}

.config-input:focus {
  background: rgba(0, 0, 0, 0.4);
  border-color: #38bdf8;
  color: #f1f5f9;
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
}

.form-control,
.input-group-text {
  background: rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
}

.form-control:focus {
  background: rgba(0, 0, 0, 0.4);
  border-color: #38bdf8;
  color: #f1f5f9;
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
}

.input-group-text {
  color: #64748b;
}

.tranche-config {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tranche-row {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 0.5rem;
  padding: 1rem;
}

.tranche-inputs {
  display: grid;
  grid-template-columns: 1fr 120px 120px;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.tranche-bar-container {
  height: 24px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 0.25rem;
  overflow: hidden;
}

.tranche-bar {
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  transition: width 0.3s ease;
}

.tranche-bar.tranche-senior { background: linear-gradient(90deg, #22c55e, #16a34a); color: white; }
.tranche-bar.tranche-mezzanine { background: linear-gradient(90deg, #3b82f6, #2563eb); color: white; }
.tranche-bar.tranche-junior { background: linear-gradient(90deg, #f59e0b, #d97706); color: white; }

.loans-reference-bar {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
}

.loan-pills-clo {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.5rem;
}

.loan-pill-clo {
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 0.375rem;
  overflow: hidden;
  font-size: 0.75rem;
}

.loan-pill-clo.eligible {
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.3);
}

.loan-pill-clo.ineligible {
  background: rgba(107, 114, 128, 0.15);
  border-color: rgba(107, 114, 128, 0.3);
  opacity: 0.6;
}

.loan-pill-clo.ineligible .loan-pill-clo-body {
  text-decoration: line-through;
}

.loan-pill-clo-header {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.loan-pill-index {
  font-weight: 700;
  font-size: 0.7rem;
  background: rgba(59, 130, 246, 0.3);
  color: #93c5fd;
  padding: 0.1rem 0.3rem;
  border-radius: 2px;
}

.loan-pill-asset {
  flex: 1;
}

.loan-pill-lifecycle {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.1rem 0.3rem;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.1);
}

.loan-pill-lifecycle.lc-T1 { background: rgba(107, 114, 128, 0.3); color: #d1d5db; }
.loan-pill-lifecycle.lc-T2 { background: rgba(239, 68, 68, 0.3); color: #fca5a5; }
.loan-pill-lifecycle.lc-T3 { background: rgba(34, 197, 94, 0.3); color: #86efac; }
.loan-pill-lifecycle.lc-T4 { background: rgba(59, 130, 246, 0.3); color: #93c5fd; }
.loan-pill-lifecycle.lc-T5 { background: rgba(251, 191, 36, 0.3); color: #fde047; }
.loan-pill-lifecycle.lc-T6 { background: rgba(239, 68, 68, 0.2); color: #f87171; }
.loan-pill-lifecycle.lc-T7 { background: rgba(139, 92, 246, 0.3); color: #c4b5fd; }

.loan-pill-clo-body {
  padding: 0.35rem 0.5rem;
}

.loan-pill-row {
  display: flex;
  justify-content: space-between;
  padding: 0.1rem 0;
}

.loan-pill-row.total {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 0.15rem;
  padding-top: 0.2rem;
  font-weight: 600;
}

.loan-pill-label {
  color: #94a3b8;
  font-size: 0.7rem;
}

.loan-pill-value {
  color: #e2e8f0;
}

.text-success {
  color: #4ade80 !important;
}

.text-info {
  color: #38bdf8 !important;
}
</style>
