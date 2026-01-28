<template>
  <div class="config-wizard-overlay" v-if="isOpen" @click.self="$emit('close')">
    <div class="config-wizard">
      <!-- Header -->
      <div class="wizard-header">
        <h4 class="mb-0">Test Configuration</h4>
        <button class="btn-close" @click="$emit('close')">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <!-- Tabs -->
      <div class="wizard-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="wizard-tab"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <i :class="tab.icon"></i>
          <span>{{ tab.label }}</span>
        </button>
      </div>

      <!-- Content -->
      <div class="wizard-content">
        <!-- Wallets Tab -->
        <div v-if="activeTab === 'wallets'" class="tab-content">
          <div class="section-header">
            <h5>Wallet Configuration</h5>
            <button class="btn btn-sm btn-outline-primary" @click="addWallet">
              <i class="fas fa-plus mr-1"></i> Add Wallet
            </button>
          </div>

          <div class="wallet-list">
            <div v-for="(wallet, index) in localConfig.wallets" :key="index" class="wallet-item">
              <div class="wallet-role">
                <select v-model="wallet.role" class="form-control form-control-sm">
                  <option value="Originator">Originator</option>
                  <option value="Borrower">Borrower</option>
                  <option value="Analyst">Analyst</option>
                  <option value="Investor">Investor</option>
                </select>
              </div>
              <div class="wallet-name">
                <input
                  v-model="wallet.name"
                  type="text"
                  class="form-control form-control-sm"
                  placeholder="Wallet Name"
                />
              </div>
              <div class="wallet-funding">
                <div class="input-group input-group-sm">
                  <input
                    v-model.number="wallet.initialFunding"
                    type="number"
                    class="form-control"
                    placeholder="Initial ADA"
                  />
                  <span class="input-group-text">ADA</span>
                </div>
              </div>
              <div class="wallet-actions">
                <button class="btn btn-sm btn-outline-danger" @click="removeWallet(index)">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>

          <div class="wallet-summary mt-3">
            <small class="text-muted">
              {{ walletSummary.originators }} Originators |
              {{ walletSummary.borrowers }} Borrowers |
              {{ walletSummary.analysts }} Analysts |
              {{ walletSummary.investors }} Investors
            </small>
          </div>
        </div>

        <!-- Loans Tab -->
        <div v-if="activeTab === 'loans'" class="tab-content">
          <div class="section-header">
            <h5>Loan Configuration</h5>
            <button class="btn btn-sm btn-outline-primary" @click="addLoan">
              <i class="fas fa-plus mr-1"></i> Add Loan
            </button>
          </div>

          <div class="loan-list">
            <div v-for="(loan, index) in localConfig.loans" :key="index" class="loan-item">
              <div class="loan-row">
                <div class="loan-field">
                  <label>Asset</label>
                  <input
                    v-model="loan.asset"
                    type="text"
                    class="form-control form-control-sm"
                    placeholder="Asset Name"
                  />
                </div>
                <div class="loan-field">
                  <label>Qty</label>
                  <input
                    v-model.number="loan.quantity"
                    type="number"
                    class="form-control form-control-sm"
                    min="1"
                  />
                </div>
                <div class="loan-field">
                  <label>Principal (ADA)</label>
                  <input
                    v-model.number="loan.principal"
                    type="number"
                    class="form-control form-control-sm"
                  />
                </div>
                <div class="loan-field">
                  <label>APR %</label>
                  <input
                    v-model.number="loan.apr"
                    type="number"
                    step="0.1"
                    class="form-control form-control-sm"
                  />
                </div>
                <div class="loan-field">
                  <label>Term (months)</label>
                  <input
                    v-model.number="loan.termMonths"
                    type="number"
                    class="form-control form-control-sm"
                  />
                </div>
                <div class="loan-field loan-market">
                  <label>Market Type</label>
                  <select v-model="loan.reservedBuyer" class="form-control form-control-sm">
                    <option :value="true">Reserved</option>
                    <option :value="false">Open</option>
                  </select>
                </div>
                <div class="loan-actions">
                  <button class="btn btn-sm btn-outline-danger" @click="removeLoan(index)">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="loan-summary mt-3">
            <small class="text-muted">
              {{ loanSummary.total }} loans |
              {{ loanSummary.reserved }} reserved |
              {{ loanSummary.open }} open market |
              Total Principal: {{ loanSummary.totalPrincipal.toLocaleString() }} ADA
            </small>
          </div>
        </div>

        <!-- CLO Tab -->
        <div v-if="activeTab === 'clo'" class="tab-content">
          <div class="section-header">
            <h5>CLO Configuration</h5>
          </div>

          <div class="clo-name mb-3">
            <label>CLO Name</label>
            <input
              v-model="localConfig.clo!.name"
              type="text"
              class="form-control"
              placeholder="CLO Series Name"
            />
          </div>

          <h6>Tranche Allocation</h6>
          <div class="tranche-list">
            <div v-for="(tranche, index) in localConfig.clo?.tranches" :key="index" class="tranche-item">
              <div class="tranche-name">
                <input
                  v-model="tranche.name"
                  type="text"
                  class="form-control form-control-sm"
                  placeholder="Tranche Name"
                />
              </div>
              <div class="tranche-allocation">
                <div class="input-group input-group-sm">
                  <input
                    v-model.number="tranche.allocation"
                    type="number"
                    class="form-control"
                    min="0"
                    max="100"
                  />
                  <span class="input-group-text">%</span>
                </div>
              </div>
              <div class="tranche-yield">
                <div class="input-group input-group-sm">
                  <input
                    v-model.number="tranche.yieldModifier"
                    type="number"
                    step="0.1"
                    class="form-control"
                  />
                  <span class="input-group-text">x yield</span>
                </div>
              </div>
              <div class="tranche-bar" :style="{ width: `${tranche.allocation}%` }">
                <span class="tranche-bar-label">{{ tranche.name }}: {{ tranche.allocation }}%</span>
              </div>
            </div>
          </div>

          <div class="allocation-total mt-3" :class="{ 'text-danger': allocationTotal !== 100 }">
            <strong>Total Allocation: {{ allocationTotal }}%</strong>
            <span v-if="allocationTotal !== 100" class="ml-2 text-danger">
              (must equal 100%)
            </span>
          </div>
        </div>

        <!-- Settings Tab -->
        <div v-if="activeTab === 'settings'" class="tab-content">
          <div class="section-header">
            <h5>Pipeline Settings</h5>
          </div>

          <div class="setting-group">
            <label>Network Mode</label>
            <select v-model="localConfig.network" class="form-control">
              <option value="emulator">Emulator (Local)</option>
              <option value="preview">Preview Testnet</option>
            </select>
            <small class="form-text text-muted">
              Emulator runs locally with instant transactions. Preview uses real testnet.
            </small>
          </div>

          <div class="setting-group mt-3">
            <label>Monte Carlo Iterations</label>
            <input
              v-model.number="localConfig.monteCarlo!.iterations"
              type="number"
              class="form-control"
              min="100"
              max="10000"
            />
            <small class="form-text text-muted">
              Number of simulation iterations for risk analysis.
            </small>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="wizard-footer">
        <button class="btn btn-secondary" @click="resetToDefaults">
          <i class="fas fa-undo mr-1"></i> Reset to Defaults
        </button>
        <div class="footer-right">
          <button class="btn btn-outline-secondary mr-2" @click="$emit('close')">
            Cancel
          </button>
          <button class="btn btn-primary" @click="saveConfig" :disabled="!isValid">
            <i class="fas fa-save mr-1"></i> Save Configuration
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { PipelineConfig } from '@/utils/pipeline/types'
import {
  DEFAULT_WALLETS,
  DEFAULT_LOANS,
  DEFAULT_CLO,
  DEFAULT_MONTE_CARLO,
  validateConfig
} from '@/config/testConfig'

const props = defineProps<{
  isOpen: boolean
  config?: PipelineConfig
}>()

const emit = defineEmits<{
  close: []
  save: [config: PipelineConfig]
}>()

const tabs = [
  { id: 'wallets', label: 'Wallets', icon: 'fas fa-wallet' },
  { id: 'loans', label: 'Loans', icon: 'fas fa-file-contract' },
  { id: 'clo', label: 'CLO', icon: 'fas fa-layer-group' },
  { id: 'settings', label: 'Settings', icon: 'fas fa-cog' },
]

const activeTab = ref('wallets')

// Local config that gets edited
const localConfig = ref<PipelineConfig>({
  network: 'emulator',
  wallets: [...DEFAULT_WALLETS],
  loans: [...DEFAULT_LOANS],
  clo: { ...DEFAULT_CLO, tranches: [...DEFAULT_CLO.tranches.map(t => ({ ...t }))] },
  monteCarlo: { ...DEFAULT_MONTE_CARLO },
})

// Sync with props
watch(() => props.config, (newConfig) => {
  if (newConfig) {
    localConfig.value = JSON.parse(JSON.stringify(newConfig))
  }
}, { immediate: true })

// Computed summaries
const walletSummary = computed(() => ({
  originators: localConfig.value.wallets.filter(w => w.role === 'Originator').length,
  borrowers: localConfig.value.wallets.filter(w => w.role === 'Borrower').length,
  analysts: localConfig.value.wallets.filter(w => w.role === 'Analyst').length,
  investors: localConfig.value.wallets.filter(w => w.role === 'Investor').length,
}))

const loanSummary = computed(() => ({
  total: localConfig.value.loans.length,
  reserved: localConfig.value.loans.filter(l => l.reservedBuyer).length,
  open: localConfig.value.loans.filter(l => !l.reservedBuyer).length,
  totalPrincipal: localConfig.value.loans.reduce((sum, l) => sum + l.principal, 0),
}))

const allocationTotal = computed(() => {
  return localConfig.value.clo?.tranches.reduce((sum, t) => sum + t.allocation, 0) || 0
})

const isValid = computed(() => {
  const result = validateConfig(localConfig.value)
  return result.valid && allocationTotal.value === 100
})

// Actions
function addWallet() {
  localConfig.value.wallets.push({
    name: '',
    role: 'Borrower',
    initialFunding: 1000,
  })
}

function removeWallet(index: number) {
  localConfig.value.wallets.splice(index, 1)
}

function addLoan() {
  localConfig.value.loans.push({
    borrowerId: '',
    originatorId: '',
    asset: '',
    quantity: 1,
    principal: 500,
    apr: 5,
    termMonths: 12,
    reservedBuyer: false,
  })
}

function removeLoan(index: number) {
  localConfig.value.loans.splice(index, 1)
}

function resetToDefaults() {
  localConfig.value = {
    network: 'emulator',
    wallets: [...DEFAULT_WALLETS],
    loans: [...DEFAULT_LOANS],
    clo: { ...DEFAULT_CLO, tranches: [...DEFAULT_CLO.tranches.map(t => ({ ...t }))] },
    monteCarlo: { ...DEFAULT_MONTE_CARLO },
  }
}

function saveConfig() {
  if (isValid.value) {
    emit('save', localConfig.value)
    emit('close')
  }
}
</script>

<style scoped>
.config-wizard-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.config-wizard {
  background: #1e293b;
  border-radius: 0.5rem;
  width: 90%;
  max-width: 900px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.wizard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.wizard-header h4 {
  color: #f1f5f9;
}

.btn-close {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.25rem;
}

.btn-close:hover {
  color: #f1f5f9;
}

.wizard-tabs {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.wizard-tab {
  flex: 1;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
}

.wizard-tab:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #e2e8f0;
}

.wizard-tab.active {
  background: rgba(14, 165, 233, 0.1);
  color: #38bdf8;
  border-bottom: 2px solid #38bdf8;
}

.wizard-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.tab-content {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-header h5 {
  color: #f1f5f9;
  margin: 0;
}

/* Wallet list */
.wallet-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.wallet-item {
  display: grid;
  grid-template-columns: 130px 1fr 150px 40px;
  gap: 0.5rem;
  align-items: center;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 0.375rem;
}

/* Loan list */
.loan-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.loan-item {
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 0.375rem;
}

.loan-row {
  display: grid;
  grid-template-columns: 1fr 60px 100px 70px 90px 100px 40px;
  gap: 0.5rem;
  align-items: end;
}

.loan-field label {
  display: block;
  font-size: 0.7rem;
  color: #64748b;
  margin-bottom: 0.25rem;
}

/* Tranche list */
.tranche-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.tranche-item {
  display: grid;
  grid-template-columns: 1fr 100px 120px;
  gap: 0.5rem;
  align-items: center;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 0.375rem;
  position: relative;
}

.tranche-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: linear-gradient(90deg, #22c55e, #3b82f6);
  border-radius: 0 0 0.375rem 0.375rem;
  transition: width 0.3s ease;
}

.tranche-bar-label {
  display: none;
}

.setting-group label {
  display: block;
  color: #e2e8f0;
  margin-bottom: 0.5rem;
}

.wizard-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.footer-right {
  display: flex;
  gap: 0.5rem;
}

/* Form controls dark theme */
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

.form-control option {
  background: #1e293b;
  color: #e2e8f0;
}

.input-group-text {
  color: #94a3b8;
}
</style>
