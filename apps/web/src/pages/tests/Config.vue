<template>
  <div class="container-fluid py-4">
    <!-- Toast Notification -->
    <div v-if="showToast" class="toast-notification" :class="'toast-' + toastType">
      <i :class="toastType === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'" class="mr-2"></i>
      {{ toastMessage }}
    </div>

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
        <label class="text-muted mb-0">Configuration:</label>
        <select v-model="selectedConfigId" class="form-control form-control-sm" style="max-width: 300px;" @change="onConfigSelect">
          <option :value="null">-- New Configuration --</option>
          <option v-for="cfg in savedConfigs" :key="cfg.id" :value="cfg.id">
            {{ cfg.name }} ({{ cfg.wallets }} wallets, {{ cfg.loans }} loans)
          </option>
        </select>
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
        <WalletsTab
          v-if="activeTab === 'wallets'"
          :wallets="localConfig.wallets"
          @add-wallet="addWallet"
          @remove-wallet="removeWallet"
          @add-asset="addAsset"
          @remove-asset="removeAsset"
        />

        <!-- Loans Tab -->
        <LoansTab
          v-if="activeTab === 'loans'"
          :loans="localConfig.loans"
          :wallets="localConfig.wallets"
          @add-loan="addLoan"
          @remove-loan="removeLoan"
          @reorder-loans="reorderLoans"
        />

        <!-- CLO Tab -->
        <CLOTab
          v-if="activeTab === 'clo'"
          :clo-config="localConfig.clo!"
          :loans="localConfig.loans"
        />

        <!-- Lifecycle Tab -->
        <LifecycleTab
          v-if="activeTab === 'lifecycle'"
          :wallets="localConfig.wallets"
          :loans="localConfig.loans"
          :clo-config="localConfig.clo"
          :collapsed-sections="collapsedSections"
          :collapsed-loan-schedules="collapsedLoanSchedules"
          @update:collapsed-sections="collapsedSections = $event"
          @update:collapsed-loan-schedules="collapsedLoanSchedules = $event"
          @update:loan-lifecycle="updateLoanLifecycleCase"
          @update:loan-buyer="updateLoanBuyer"
          @update:action-amount="updateActionAmount"
        />

        <!-- Settings Tab -->
        <SettingsTab
          v-if="activeTab === 'settings'"
          :network="localConfig.network"
          :monte-carlo="localConfig.monteCarlo!"
          @update:network="localConfig.network = $event"
          @update:monte-carlo="localConfig.monteCarlo = $event"
        />
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

// Tab Components
import WalletsTab from '@/components/tests/WalletsTab.vue'
import LoansTab from '@/components/tests/LoansTab.vue'
import CLOTab from '@/components/tests/CLOTab.vue'
import LifecycleTab from '@/components/tests/LifecycleTab.vue'
import SettingsTab from '@/components/tests/SettingsTab.vue'

const router = useRouter()
const route = useRoute()

// Saved configs
const savedConfigs = ref<{ id: string; name: string; wallets: number; loans: number }[]>([])
const selectedConfigId = ref<string | null>(null)
const configName = ref('')

const activeTab = ref('wallets')

// Collapsible section states
const collapsedSections = ref({
  phase1: false,
  phase2: false,
  phase3: false,
  phase4: false,
  cloOperations: false,
  contractReference: false,
})

// Collapsed loan schedule cards
const collapsedLoanSchedules = ref<Record<string, boolean>>({})

// Unique ID generator for loans
let loanIdCounter = 0
function generateLoanId(): string {
  return `loan-${++loanIdCounter}-${Date.now()}`
}

// Add unique _uid to each loan
function addLoanIds(loans: any[]): any[] {
  return loans.map(loan => ({
    ...loan,
    _uid: loan._uid || generateLoanId()
  }))
}

// Local config state
const localConfig = ref<PipelineConfig>({
  network: 'emulator',
  wallets: JSON.parse(JSON.stringify(DEFAULT_WALLETS)),
  loans: addLoanIds(JSON.parse(JSON.stringify(DEFAULT_LOANS))),
  clo: JSON.parse(JSON.stringify(DEFAULT_CLO)),
  monteCarlo: JSON.parse(JSON.stringify(DEFAULT_MONTE_CARLO)),
})

// Asset modal
const showAssetModal = ref(false)
const editingWalletIndex = ref<number | null>(null)
const newAsset = ref({ name: '', quantity: 1 })

// Tab definitions
const tabs = computed(() => [
  { id: 'wallets', label: 'Wallets', icon: 'fas fa-wallet', count: localConfig.value.wallets.length },
  { id: 'loans', label: 'Loans', icon: 'fas fa-file-contract', count: localConfig.value.loans.length },
  { id: 'clo', label: 'CLO', icon: 'fas fa-layer-group', count: localConfig.value.clo?.tranches.length },
  { id: 'lifecycle', label: 'Lifecycle', icon: 'fas fa-clock', count: null },
  { id: 'settings', label: 'Settings', icon: 'fas fa-cog', count: null },
])

const allocationTotal = computed(() => {
  return localConfig.value.clo?.tranches.reduce((sum, t) => sum + t.allocation, 0) || 0
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

// Originators with assets (for loan dropdown)
const originatorsWithAssets = computed(() => {
  return localConfig.value.wallets
    .filter(w => w.role === 'Originator' && w.assets && w.assets.length > 0)
    .map(w => ({
      id: NAME_TO_ID_MAP[w.name] || `wallet-${w.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: w.name,
      assetCount: w.assets?.length || 0
    }))
})

// Get assets for a specific wallet
function getWalletAssets(walletId: string): string[] {
  if (!walletId) return []

  const wallet = localConfig.value.wallets.find(w => {
    const wid = NAME_TO_ID_MAP[w.name] || `wallet-${w.name.toLowerCase().replace(/\s+/g, '-')}`
    return wid === walletId
  })

  if (!wallet || !wallet.assets) return []
  return wallet.assets.map(a => a.name)
}

// Wallet actions
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

// Loan actions
function addLoan() {
  const firstOriginator = originatorsWithAssets.value[0]
  const originatorId = firstOriginator?.id || ''
  const assets = getWalletAssets(originatorId)

  localConfig.value.loans.push({
    _uid: generateLoanId(),
    borrowerId: '',
    originatorId,
    agentId: null,
    asset: assets[0] || '',
    quantity: 1,
    principal: 500,
    apr: 5,
    frequency: 12,
    termMonths: 12,
    reservedBuyer: false,
    lifecycleCase: 'T4',
    agentFee: 0,
    transferFeeBuyerPercent: 50,
    deferFee: false,
    lateFee: 10,
  } as any)
}

function removeLoan(index: number) {
  localConfig.value.loans.splice(index, 1)
}

function reorderLoans(fromIndex: number, toIndex: number) {
  const [movedLoan] = localConfig.value.loans.splice(fromIndex, 1)
  localConfig.value.loans.splice(toIndex, 0, movedLoan)
}

// Lifecycle tab updates
function updateLoanLifecycleCase(loanIndex: number, newCase: string) {
  if (loanIndex >= 0 && loanIndex < localConfig.value.loans.length) {
    localConfig.value.loans[loanIndex].lifecycleCase = newCase as any
  }
}

function updateLoanBuyer(loanIndex: number, newBuyerId: string | null) {
  if (loanIndex >= 0 && loanIndex < localConfig.value.loans.length) {
    localConfig.value.loans[loanIndex].borrowerId = newBuyerId as any
    localConfig.value.loans[loanIndex].reservedBuyer = !!newBuyerId
  }
}

function updateActionAmount(_loanIndex: number, _actionId: string, _newAmount: number) {
  // Action amounts are display-only calculated values
  // This handler is available for future customization
}

// Config management
function resetToDefaults() {
  localConfig.value = {
    network: 'emulator',
    wallets: JSON.parse(JSON.stringify(DEFAULT_WALLETS)),
    loans: addLoanIds(JSON.parse(JSON.stringify(DEFAULT_LOANS))),
    clo: JSON.parse(JSON.stringify(DEFAULT_CLO)),
    monteCarlo: JSON.parse(JSON.stringify(DEFAULT_MONTE_CARLO)),
  }
  configName.value = ''
  selectedConfigId.value = null
}

function loadSelectedConfig() {
  if (!selectedConfigId.value) return

  if (selectedConfigId.value === 'default') {
    resetToDefaults()
    configName.value = 'Default MintMatrix Config'
    return
  }

  const configs = JSON.parse(localStorage.getItem('mintmatrix-test-configs') || '[]')
  const found = configs.find((cfg: any) => cfg.id === selectedConfigId.value)
  if (found && found.config) {
    localConfig.value = JSON.parse(JSON.stringify(found.config))
    configName.value = found.name
  }
}

const CONFIG_STORAGE_KEY = 'mintmatrix-selected-config-id'
function onConfigSelect() {
  if (selectedConfigId.value) {
    localStorage.setItem(CONFIG_STORAGE_KEY, selectedConfigId.value)
  } else {
    localStorage.removeItem(CONFIG_STORAGE_KEY)
  }
  if (selectedConfigId.value) {
    loadSelectedConfig()
  }
}

// Toast notification
const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')
const showToast = ref(false)

function showNotification(message: string, type: 'success' | 'error' = 'success') {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 3000)
}

function saveConfig() {
  if (!configName.value) {
    showNotification('Please enter a configuration name', 'error')
    return
  }

  if (!isValid.value) {
    showNotification('Please fix validation errors before saving', 'error')
    return
  }

  try {
    const configs = JSON.parse(localStorage.getItem('mintmatrix-test-configs') || '[]')
    const existingIndex = configs.findIndex((cfg: any) => cfg.id === selectedConfigId.value)

    const configData = {
      id: existingIndex >= 0 ? selectedConfigId.value : `config-${Date.now()}`,
      name: configName.value,
      wallets: localConfig.value.wallets.length,
      loans: localConfig.value.loans.length,
      config: JSON.parse(JSON.stringify(localConfig.value)),
      updatedAt: new Date().toISOString(),
    }

    if (existingIndex >= 0) {
      configs[existingIndex] = configData
    } else {
      configs.push(configData)
    }

    localStorage.setItem('mintmatrix-test-configs', JSON.stringify(configs))
    loadSavedConfigsList()
    selectedConfigId.value = configData.id
    showNotification(`Configuration "${configName.value}" saved!`, 'success')
  } catch (err) {
    console.error('Error saving config:', err)
    showNotification('Failed to save configuration', 'error')
  }
}

function loadSavedConfigsList() {
  const configs = JSON.parse(localStorage.getItem('mintmatrix-test-configs') || '[]')
  savedConfigs.value = [
    { id: 'default', name: 'Default MintMatrix Config', wallets: DEFAULT_WALLETS.length, loans: DEFAULT_LOANS.length },
    ...configs.map((cfg: any) => ({
      id: cfg.id,
      name: cfg.name,
      wallets: cfg.wallets,
      loans: cfg.loans,
    }))
  ]
}

function saveAndRun() {
  if (!isValid.value) return
  sessionStorage.setItem('mintmatrix-active-config', JSON.stringify(localConfig.value))
  router.push('/tests')
}

onMounted(() => {
  loadSavedConfigsList()

  if (route.params.id) {
    selectedConfigId.value = route.params.id as string
    loadSelectedConfig()
    return
  }

  const activeConfig = sessionStorage.getItem('mintmatrix-active-config')
  if (activeConfig) {
    try {
      localConfig.value = JSON.parse(activeConfig)
      return
    } catch (e) {
      console.warn('Failed to load active config:', e)
    }
  }

  const savedConfigId = localStorage.getItem(CONFIG_STORAGE_KEY)
  if (savedConfigId) {
    selectedConfigId.value = savedConfigId
    loadSelectedConfig()
  }
})
</script>

<style scoped>
/* Toast Notification */
.toast-notification {
  position: fixed;
  top: 1rem;
  right: 1rem;
  padding: 0.75rem 1.25rem;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  z-index: 9999;
  animation: slideIn 0.3s ease-out;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.toast-success {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  color: white;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.toast-error {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: white;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

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
  padding: 0.75rem 0.5rem;
  margin-bottom: 0.25rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.config-nav .nav-link i {
  flex-shrink: 0;
  margin-right: 0.35rem;
}

.config-nav .nav-link .badge {
  margin-left: auto;
  flex-shrink: 0;
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
