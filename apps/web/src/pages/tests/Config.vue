<template>
  <div class="container-fluid py-4">
    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <router-link to="/tests" class="btn btn-sm btn-outline-secondary mb-2">
          <i class="fas fa-arrow-left mr-1"></i> Back to Tests
        </router-link>
        <h2 class="text-white mb-1">Test Configuration</h2>
        <p class="text-muted mb-0">Configure wallets, loans, CLO settings, and pipeline parameters</p>
      </div>
      <div class="d-flex align-items-center gap-3">
        <button class="btn btn-outline-secondary" @click="resetToDefaults">
          <i class="fas fa-undo mr-1"></i> Reset Defaults
        </button>
        <button class="btn btn-primary" @click="saveAndRun" :disabled="!isValid">
          <i class="fas fa-play mr-1"></i> Save & Run Tests
        </button>
      </div>
    </div>

    <!-- Config Selector -->
    <div class="card config-selector mb-4">
      <div class="card-body d-flex align-items-center gap-3">
        <label class="text-muted mb-0">Load Configuration:</label>
        <select v-model="selectedConfigId" class="form-control form-control-sm" style="max-width: 300px;">
          <option :value="null">-- New Configuration --</option>
          <option v-for="cfg in savedConfigs" :key="cfg.id" :value="cfg.id">
            {{ cfg.name }} ({{ cfg.wallets }} wallets, {{ cfg.loans }} loans)
          </option>
        </select>
        <button class="btn btn-sm btn-outline-info" @click="loadSelectedConfig" :disabled="!selectedConfigId">
          <i class="fas fa-download mr-1"></i> Load
        </button>
        <div class="ml-auto d-flex gap-2">
          <input
            v-model="configName"
            type="text"
            class="form-control form-control-sm"
            placeholder="Configuration name..."
            style="width: 200px;"
          />
          <button class="btn btn-sm btn-success" @click="saveConfig" :disabled="!configName || !isValid">
            <i class="fas fa-save mr-1"></i> Save
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content - Tabs -->
    <div class="row">
      <!-- Sidebar Navigation -->
      <div class="col-md-3 col-lg-2">
        <div class="nav flex-column nav-pills config-nav">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="nav-link text-left"
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            <i :class="tab.icon" class="mr-2"></i>
            {{ tab.label }}
            <span v-if="tab.count" class="badge badge-secondary ml-2">{{ tab.count }}</span>
          </button>
        </div>

        <!-- Validation Summary -->
        <div v-if="validationErrors.length > 0" class="validation-summary mt-4">
          <h6 class="text-danger"><i class="fas fa-exclamation-triangle mr-1"></i> Issues</h6>
          <ul class="list-unstyled mb-0">
            <li v-for="(error, i) in validationErrors" :key="i" class="text-danger small">
              {{ error }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Tab Content -->
      <div class="col-md-9 col-lg-10">
        <!-- Wallets Tab -->
        <div v-if="activeTab === 'wallets'" class="config-panel">
          <div class="panel-header">
            <h4>Wallet Configuration</h4>
            <p class="text-muted">Define participants: originators, borrowers, analysts, and investors</p>
            <button class="btn btn-primary" @click="addWallet">
              <i class="fas fa-plus mr-1"></i> Add Wallet
            </button>
          </div>

          <div class="table-responsive">
            <table class="table table-dark config-table">
              <thead>
                <tr>
                  <th style="width: 130px;">Role</th>
                  <th style="min-width: 180px;">Name</th>
                  <th style="width: 110px;">Initial ADA</th>
                  <th style="min-width: 220px;">Assets</th>
                  <th style="width: 50px;"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(wallet, index) in localConfig.wallets" :key="index" :class="'role-' + wallet.role.toLowerCase()">
                  <td>
                    <select v-model="wallet.role" class="form-control form-control-sm">
                      <option value="Originator">Originator</option>
                      <option value="Borrower">Borrower</option>
                      <option value="Analyst">Analyst</option>
                      <option value="Investor">Investor</option>
                    </select>
                  </td>
                  <td>
                    <input v-model="wallet.name" type="text" class="form-control form-control-sm" placeholder="Wallet name" />
                  </td>
                  <td>
                    <input v-model.number="wallet.initialFunding" type="number" class="form-control form-control-sm" />
                  </td>
                  <td>
                    <div v-if="wallet.role === 'Originator'" class="asset-chips">
                      <span v-for="(asset, ai) in wallet.assets" :key="ai" class="asset-chip">
                        {{ asset.quantity }}x {{ asset.name }}
                        <button class="btn-chip-remove" @click="removeAsset(index, ai)">&times;</button>
                      </span>
                      <button class="btn btn-xs btn-outline-secondary" @click="addAsset(index)">+ Asset</button>
                    </div>
                    <span v-else class="text-muted">-</span>
                  </td>
                  <td>
                    <button class="btn btn-sm btn-outline-danger btn-icon" @click="removeWallet(index)">
                      <i class="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="panel-footer">
            <div class="stat-chips">
              <span class="stat-chip originator">{{ walletCounts.originators }} Originators</span>
              <span class="stat-chip borrower">{{ walletCounts.borrowers }} Borrowers</span>
              <span class="stat-chip analyst">{{ walletCounts.analysts }} Analysts</span>
              <span class="stat-chip investor">{{ walletCounts.investors }} Investors</span>
            </div>
          </div>
        </div>

        <!-- Loans Tab -->
        <div v-if="activeTab === 'loans'" class="config-panel">
          <div class="panel-header">
            <h4>Loan Configuration</h4>
            <p class="text-muted">Define loan contracts between originators and borrowers</p>
            <button class="btn btn-primary" @click="addLoan">
              <i class="fas fa-plus mr-1"></i> Add Loan
            </button>
          </div>

          <div class="table-responsive">
            <table class="table table-dark config-table">
              <thead>
                <tr>
                  <th style="min-width: 120px;">Asset</th>
                  <th style="width: 60px;">Qty</th>
                  <th style="width: 100px;">Principal</th>
                  <th style="width: 70px;">APR %</th>
                  <th style="width: 70px;">Term</th>
                  <th style="min-width: 140px;">Originator</th>
                  <th style="min-width: 140px;">Borrower</th>
                  <th style="width: 90px;">Market</th>
                  <th style="width: 50px;"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(loan, index) in localConfig.loans" :key="index">
                  <td>
                    <input v-model="loan.asset" type="text" class="form-control form-control-sm" placeholder="Asset" />
                  </td>
                  <td>
                    <input v-model.number="loan.quantity" type="number" min="1" class="form-control form-control-sm" />
                  </td>
                  <td>
                    <input v-model.number="loan.principal" type="number" class="form-control form-control-sm" />
                  </td>
                  <td>
                    <input v-model.number="loan.apr" type="number" step="0.1" class="form-control form-control-sm" />
                  </td>
                  <td>
                    <input v-model.number="loan.termMonths" type="number" class="form-control form-control-sm" />
                  </td>
                  <td>
                    <select v-model="loan.originatorId" class="form-control form-control-sm">
                      <option v-for="o in originatorOptions" :key="o.id" :value="o.id">{{ o.name }}</option>
                    </select>
                  </td>
                  <td>
                    <select v-model="loan.borrowerId" class="form-control form-control-sm" :disabled="!loan.reservedBuyer">
                      <option :value="null">Any (Open)</option>
                      <option v-for="b in borrowerOptions" :key="b.id" :value="b.id">{{ b.name }}</option>
                    </select>
                  </td>
                  <td>
                    <select v-model="loan.reservedBuyer" class="form-control form-control-sm">
                      <option :value="true">Reserved</option>
                      <option :value="false">Open</option>
                    </select>
                  </td>
                  <td>
                    <button class="btn btn-sm btn-outline-danger btn-icon" @click="removeLoan(index)">
                      <i class="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="panel-footer">
            <div class="stat-chips">
              <span class="stat-chip">{{ localConfig.loans.length }} Total Loans</span>
              <span class="stat-chip reserved">{{ loanCounts.reserved }} Reserved</span>
              <span class="stat-chip open">{{ loanCounts.open }} Open Market</span>
              <span class="stat-chip">{{ loanCounts.totalPrincipal.toLocaleString() }} ADA Principal</span>
            </div>
          </div>
        </div>

        <!-- CLO Tab -->
        <div v-if="activeTab === 'clo'" class="config-panel">
          <div class="panel-header">
            <h4>CLO Configuration</h4>
            <p class="text-muted">Configure collateralized loan obligation tranches</p>
          </div>

          <div class="row">
            <div class="col-md-6">
              <div class="form-group">
                <label>CLO Name</label>
                <input v-model="localConfig.clo!.name" type="text" class="form-control" placeholder="CLO Series Name" />
              </div>
            </div>
          </div>

          <h5 class="mt-4 mb-3">Tranche Allocation</h5>
          <div class="tranche-config">
            <div v-for="(tranche, index) in localConfig.clo?.tranches" :key="index" class="tranche-row">
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

        <!-- Settings Tab -->
        <div v-if="activeTab === 'settings'" class="config-panel">
          <div class="panel-header">
            <h4>Pipeline Settings</h4>
            <p class="text-muted">Configure test execution parameters</p>
          </div>

          <div class="row">
            <div class="col-md-6">
              <div class="form-group">
                <label>Network Mode</label>
                <select v-model="localConfig.network" class="form-control">
                  <option value="emulator">Emulator (Local)</option>
                  <option value="preview">Preview Testnet</option>
                </select>
                <small class="form-text text-muted">
                  Emulator runs locally with instant transactions. Preview uses real testnet.
                </small>
              </div>
            </div>
          </div>

          <div class="row mt-4">
            <div class="col-md-6">
              <div class="form-group">
                <label>Monte Carlo Iterations</label>
                <input
                  v-model.number="localConfig.monteCarlo!.iterations"
                  type="number"
                  min="100"
                  max="10000"
                  class="form-control"
                />
                <small class="form-text text-muted">
                  Number of simulation iterations for risk analysis (100-10,000).
                </small>
              </div>
            </div>
          </div>

          <h5 class="mt-4 mb-3">Monte Carlo Parameters</h5>
          <div class="row">
            <div class="col-md-4">
              <div class="form-group">
                <label>Default Probability Range</label>
                <div class="d-flex gap-2">
                  <input v-model.number="localConfig.monteCarlo!.parameters.defaultProbability.min" type="number" step="0.01" class="form-control form-control-sm" placeholder="Min" />
                  <span class="text-muted align-self-center">to</span>
                  <input v-model.number="localConfig.monteCarlo!.parameters.defaultProbability.max" type="number" step="0.01" class="form-control form-control-sm" placeholder="Max" />
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="form-group">
                <label>Interest Rate Shock Range</label>
                <div class="d-flex gap-2">
                  <input v-model.number="localConfig.monteCarlo!.parameters.interestRateShock.min" type="number" step="0.01" class="form-control form-control-sm" placeholder="Min" />
                  <span class="text-muted align-self-center">to</span>
                  <input v-model.number="localConfig.monteCarlo!.parameters.interestRateShock.max" type="number" step="0.01" class="form-control form-control-sm" placeholder="Max" />
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="form-group">
                <label>Prepayment Rate Range</label>
                <div class="d-flex gap-2">
                  <input v-model.number="localConfig.monteCarlo!.parameters.prepaymentRate.min" type="number" step="0.01" class="form-control form-control-sm" placeholder="Min" />
                  <span class="text-muted align-self-center">to</span>
                  <input v-model.number="localConfig.monteCarlo!.parameters.prepaymentRate.max" type="number" step="0.01" class="form-control form-control-sm" placeholder="Max" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Asset Add Modal -->
    <div v-if="showAssetModal" class="modal-overlay" @click.self="showAssetModal = false">
      <div class="modal-content">
        <h5>Add Asset</h5>
        <div class="form-group">
          <label>Asset Name</label>
          <input v-model="newAsset.name" type="text" class="form-control" placeholder="e.g., Diamond, Airplane" />
        </div>
        <div class="form-group">
          <label>Quantity</label>
          <input v-model.number="newAsset.quantity" type="number" min="1" class="form-control" />
        </div>
        <div class="d-flex justify-content-end gap-2 mt-3">
          <button class="btn btn-secondary" @click="showAssetModal = false">Cancel</button>
          <button class="btn btn-primary" @click="confirmAddAsset" :disabled="!newAsset.name">Add</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { PipelineConfig, WalletConfig } from '@/utils/pipeline/types'
import { NAME_TO_ID_MAP } from '@/utils/pipeline/types'
import {
  DEFAULT_WALLETS,
  DEFAULT_LOANS,
  DEFAULT_CLO,
  DEFAULT_MONTE_CARLO,
  validateConfig
} from '@/config/testConfig'

const router = useRouter()
const route = useRoute()

// Saved configs (would come from API in production)
const savedConfigs = ref([
  { id: 'default', name: 'Default MintMatrix Config', wallets: 16, loans: 6 },
])

const selectedConfigId = ref<string | null>(null)
const configName = ref('')

const activeTab = ref('wallets')

const tabs = computed(() => [
  { id: 'wallets', label: 'Wallets', icon: 'fas fa-wallet', count: localConfig.value.wallets.length },
  { id: 'loans', label: 'Loans', icon: 'fas fa-file-contract', count: localConfig.value.loans.length },
  { id: 'clo', label: 'CLO', icon: 'fas fa-layer-group', count: localConfig.value.clo?.tranches.length },
  { id: 'settings', label: 'Settings', icon: 'fas fa-cog', count: null },
])

// Local config state
const localConfig = ref<PipelineConfig>({
  network: 'emulator',
  wallets: JSON.parse(JSON.stringify(DEFAULT_WALLETS)),
  loans: JSON.parse(JSON.stringify(DEFAULT_LOANS)),
  clo: JSON.parse(JSON.stringify(DEFAULT_CLO)),
  monteCarlo: JSON.parse(JSON.stringify(DEFAULT_MONTE_CARLO)),
})

// Asset modal
const showAssetModal = ref(false)
const editingWalletIndex = ref<number | null>(null)
const newAsset = ref({ name: '', quantity: 1 })

// Computed
const walletCounts = computed(() => ({
  originators: localConfig.value.wallets.filter(w => w.role === 'Originator').length,
  borrowers: localConfig.value.wallets.filter(w => w.role === 'Borrower').length,
  analysts: localConfig.value.wallets.filter(w => w.role === 'Analyst').length,
  investors: localConfig.value.wallets.filter(w => w.role === 'Investor').length,
}))

const loanCounts = computed(() => ({
  reserved: localConfig.value.loans.filter(l => l.reservedBuyer).length,
  open: localConfig.value.loans.filter(l => !l.reservedBuyer).length,
  totalPrincipal: localConfig.value.loans.reduce((sum, l) => sum + l.principal, 0),
}))

const allocationTotal = computed(() => {
  return localConfig.value.clo?.tranches.reduce((sum, t) => sum + t.allocation, 0) || 0
})

const originatorOptions = computed(() => {
  return localConfig.value.wallets
    .filter(w => w.role === 'Originator')
    .map(w => ({ id: NAME_TO_ID_MAP[w.name] || `orig-${w.name.toLowerCase().replace(/\s+/g, '-')}`, name: w.name }))
})

const borrowerOptions = computed(() => {
  return localConfig.value.wallets
    .filter(w => w.role === 'Borrower')
    .map(w => ({ id: NAME_TO_ID_MAP[w.name] || `bor-${w.name.toLowerCase().replace(/\s+/g, '-')}`, name: w.name }))
})

const validationErrors = computed(() => {
  const result = validateConfig(localConfig.value)
  const errors = [...result.errors]
  if (allocationTotal.value !== 100) {
    errors.push(`CLO tranches must sum to 100% (currently ${allocationTotal.value}%)`)
  }
  return errors
})

const isValid = computed(() => validationErrors.value.length === 0)

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

function addAsset(walletIndex: number) {
  editingWalletIndex.value = walletIndex
  newAsset.value = { name: '', quantity: 1 }
  showAssetModal.value = true
}

function removeAsset(walletIndex: number, assetIndex: number) {
  const wallet = localConfig.value.wallets[walletIndex] as WalletConfig
  if (wallet.assets) {
    wallet.assets.splice(assetIndex, 1)
  }
}

function confirmAddAsset() {
  if (editingWalletIndex.value !== null && newAsset.value.name) {
    const wallet = localConfig.value.wallets[editingWalletIndex.value] as WalletConfig
    if (!wallet.assets) {
      wallet.assets = []
    }
    wallet.assets.push({ ...newAsset.value })
    showAssetModal.value = false
  }
}

function addLoan() {
  localConfig.value.loans.push({
    borrowerId: '',
    originatorId: originatorOptions.value[0]?.id || '',
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
    wallets: JSON.parse(JSON.stringify(DEFAULT_WALLETS)),
    loans: JSON.parse(JSON.stringify(DEFAULT_LOANS)),
    clo: JSON.parse(JSON.stringify(DEFAULT_CLO)),
    monteCarlo: JSON.parse(JSON.stringify(DEFAULT_MONTE_CARLO)),
  }
  configName.value = ''
  selectedConfigId.value = null
}

function loadSelectedConfig() {
  if (selectedConfigId.value === 'default') {
    resetToDefaults()
    configName.value = 'Default MintMatrix Config'
  }
  // In production, load from API
}

function saveConfig() {
  if (!configName.value || !isValid.value) return

  // Save to localStorage for now (would be API in production)
  const configs = JSON.parse(localStorage.getItem('mintmatrix-test-configs') || '[]')
  const newConfig = {
    id: `config-${Date.now()}`,
    name: configName.value,
    wallets: localConfig.value.wallets.length,
    loans: localConfig.value.loans.length,
    config: localConfig.value,
  }
  configs.push(newConfig)
  localStorage.setItem('mintmatrix-test-configs', JSON.stringify(configs))

  // Add to dropdown
  savedConfigs.value.push({
    id: newConfig.id,
    name: newConfig.name,
    wallets: newConfig.wallets,
    loans: newConfig.loans,
  })

  selectedConfigId.value = newConfig.id
  alert(`Configuration "${configName.value}" saved!`)
}

function saveAndRun() {
  if (!isValid.value) return

  // Store config in sessionStorage for the test page to pick up
  sessionStorage.setItem('mintmatrix-active-config', JSON.stringify(localConfig.value))

  // Navigate to tests page
  router.push('/tests')
}

// Load saved configs on mount
onMounted(() => {
  const stored = JSON.parse(localStorage.getItem('mintmatrix-test-configs') || '[]')
  for (const cfg of stored) {
    savedConfigs.value.push({
      id: cfg.id,
      name: cfg.name,
      wallets: cfg.wallets,
      loans: cfg.loans,
    })
  }

  // Check if editing existing config
  if (route.params.id) {
    selectedConfigId.value = route.params.id as string
    loadSelectedConfig()
  }

  // Check if there's an active config from session
  const activeConfig = sessionStorage.getItem('mintmatrix-active-config')
  if (activeConfig) {
    try {
      localConfig.value = JSON.parse(activeConfig)
    } catch (e) {
      console.warn('Failed to load active config:', e)
    }
  }
})
</script>

<style scoped>
.config-selector {
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.config-nav .nav-link {
  color: #94a3b8;
  background: transparent;
  border: none;
  border-left: 3px solid transparent;
  border-radius: 0;
  padding: 0.75rem 1rem;
  margin-bottom: 0.25rem;
  transition: all 0.2s ease;
}

.config-nav .nav-link:hover {
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.05);
}

.config-nav .nav-link.active {
  color: #38bdf8;
  background: rgba(14, 165, 233, 0.1);
  border-left-color: #38bdf8;
}

.config-panel {
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  padding: 1.5rem;
}

.panel-header {
  margin-bottom: 1.5rem;
}

.panel-header h4 {
  color: #f1f5f9;
  margin-bottom: 0.25rem;
}

.panel-footer {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.stat-chips {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.stat-chip {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.8rem;
  background: rgba(255, 255, 255, 0.1);
  color: #94a3b8;
}

.stat-chip.originator { background: rgba(139, 92, 246, 0.2); color: #a78bfa; }
.stat-chip.borrower { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
.stat-chip.analyst { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
.stat-chip.investor { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
.stat-chip.reserved { background: rgba(14, 165, 233, 0.2); color: #38bdf8; }
.stat-chip.open { background: rgba(249, 115, 22, 0.2); color: #fb923c; }

/* Config Table Styles */
.config-table {
  background: transparent;
  margin-bottom: 0;
}

.config-table thead th {
  background: rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  font-weight: 500;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0.6rem 0.5rem;
  white-space: nowrap;
}

.config-table tbody tr {
  background: rgba(0, 0, 0, 0.15);
}

.config-table tbody tr:hover {
  background: rgba(0, 0, 0, 0.25);
}

.config-table td {
  border-color: rgba(255, 255, 255, 0.05);
  vertical-align: middle;
  padding: 0.4rem 0.5rem;
}

.config-table .form-control-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
  height: auto;
}

.config-table .btn-icon {
  padding: 0.25rem 0.5rem;
  line-height: 1;
}

tr.role-originator { border-left: 3px solid #a78bfa; }
tr.role-borrower { border-left: 3px solid #4ade80; }
tr.role-analyst { border-left: 3px solid #60a5fa; }
tr.role-investor { border-left: 3px solid #fbbf24; }

.asset-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.asset-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.5rem;
  background: rgba(139, 92, 246, 0.2);
  color: #a78bfa;
  border-radius: 0.25rem;
  font-size: 0.75rem;
}

.btn-chip-remove {
  background: none;
  border: none;
  color: inherit;
  padding: 0 0.25rem;
  margin-left: 0.25rem;
  cursor: pointer;
  opacity: 0.7;
}

.btn-chip-remove:hover {
  opacity: 1;
}

.btn-xs {
  padding: 0.1rem 0.4rem;
  font-size: 0.7rem;
}

/* Tranche styling */
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

.validation-summary {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 0.5rem;
  padding: 1rem;
}

/* Form controls */
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
  color: #64748b;
}

/* Modal */
.modal-overlay {
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

.modal-content {
  background: #1e293b;
  border-radius: 0.5rem;
  padding: 1.5rem;
  width: 100%;
  max-width: 400px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-content h5 {
  color: #f1f5f9;
  margin-bottom: 1rem;
}

.gap-2 { gap: 0.5rem; }
.gap-3 { gap: 1rem; }
</style>
