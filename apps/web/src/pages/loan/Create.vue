<template>
  <div class="container py-4">
    <!-- Header -->
    <div class="d-flex align-items-center mb-4">
      <router-link to="/loan" class="btn btn-link text-muted p-0 mr-3">
        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </router-link>
      <div>
        <h1 class="h3 mb-0 text-white">Create Loan Contract</h1>
        <p class="text-muted mb-0 small">Set up an installment-based asset transfer</p>
      </div>
    </div>

    <!-- Not Connected -->
    <NotConnectedWarning v-if="!wallet.isConnected" />

    <!-- Main Form -->
    <div v-else class="row">
      <!-- Left Column: Form -->
      <div class="col-lg-8">
        <!-- Contract Alias -->
        <div class="card mb-4">
          <div class="card-header">
            <h5 class="mb-0">Contract Details</h5>
          </div>
          <div class="card-body">
            <div class="form-group mb-0">
              <label class="form-label small text-muted">Contract Name/Alias (optional)</label>
              <input
                v-model="form.alias"
                type="text"
                class="form-control"
                placeholder="e.g., Property at 123 Main St"
              />
            </div>
          </div>
        </div>

        <!-- Asset Selection -->
        <div class="card mb-4">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Select Asset</h5>
            <InfoButton @click="showAssetInfo = !showAssetInfo">
              What assets can I use?
            </InfoButton>
          </div>
          <div class="card-body">
            <InfoPanel v-if="showAssetInfo" class="mb-3">
              Select an NFT from your wallet to use as collateral. The asset will be locked
              in the smart contract until the loan is fully paid or cancelled.
            </InfoPanel>

            <AssetSelector
              v-model="form.selectedAsset"
              :assets="wallet.assets"
            />

            <div v-if="form.selectedAsset" class="mt-3">
              <label class="form-label small text-muted">Quantity to Lock</label>
              <div class="d-flex align-items-center">
                <input
                  v-model.number="form.quantity"
                  type="number"
                  min="1"
                  :max="Number(form.selectedAsset.quantity)"
                  class="form-control"
                  style="width: 100px;"
                />
                <span class="text-muted small ml-2">
                  Max: {{ form.selectedAsset.quantity }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Buyer Selection -->
        <div class="card mb-4">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Contract Availability</h5>
            <InfoButton @click="showBuyerInfo = !showBuyerInfo">
              Do I need a buyer?
            </InfoButton>
          </div>
          <div class="card-body">
            <InfoPanel v-if="showBuyerInfo" class="mb-3">
              Specifying a buyer is optional. If no buyer is defined, anyone can accept
              the contract terms. Use a reserved buyer for private sales.
            </InfoPanel>

            <div class="btn-group btn-group-toggle mb-3" data-toggle="buttons">
              <label class="btn" :class="[!form.hasBuyer ? 'btn-primary' : 'btn-outline-secondary']">
                <input
                  type="radio"
                  :value="false"
                  v-model="form.hasBuyer"
                  autocomplete="off"
                />
                Open Market
              </label>
              <label class="btn" :class="[form.hasBuyer ? 'btn-primary' : 'btn-outline-secondary']">
                <input
                  type="radio"
                  :value="true"
                  v-model="form.hasBuyer"
                  autocomplete="off"
                />
                Reserved Buyer
              </label>
            </div>

            <div v-if="form.hasBuyer">
              <label class="form-label small text-muted">Buyer Address</label>
              <input
                v-model="form.buyer"
                type="text"
                class="form-control"
                placeholder="addr_test1..."
              />
            </div>
          </div>
        </div>

        <!-- Payment Terms -->
        <div class="card mb-4">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Payment Terms</h5>
            <InfoButton @click="showTermsInfo = !showTermsInfo">
              How does payment frequency work?
            </InfoButton>
          </div>
          <div class="card-body">
            <InfoPanel v-if="showTermsInfo" class="mb-3">
              <strong>Monthly</strong>: Payments expected every ~30 days.<br/>
              <strong>Quarterly</strong>: Payments expected every ~91 days.<br/>
              Payments are considered <span class="text-warning">late</span> after
              10% of the term length has passed.
            </InfoPanel>

            <!-- Frequency Toggle -->
            <div class="text-center mb-4">
              <FrequencyToggle v-model="form.frequency" />
            </div>

            <!-- Core Terms -->
            <div class="row">
              <div class="col-md-4 mb-3">
                <label class="form-label small text-muted">Annual Interest Rate</label>
                <div class="input-group">
                  <input
                    v-model.number="form.apr"
                    type="number"
                    step="0.01"
                    min="0"
                    class="form-control"
                  />
                  <div class="input-group-append">
                    <span class="input-group-text">%</span>
                  </div>
                </div>
              </div>
              <div class="col-md-4 mb-3">
                <label class="form-label small text-muted">Principal Value</label>
                <div class="input-group">
                  <input
                    v-model.number="form.principal"
                    type="number"
                    min="1"
                    class="form-control"
                  />
                  <div class="input-group-append">
                    <span class="input-group-text">ADA</span>
                  </div>
                </div>
              </div>
              <div class="col-md-4 mb-3">
                <label class="form-label small text-muted">Number of Payments</label>
                <div class="input-group">
                  <input
                    v-model.number="form.installments"
                    type="number"
                    min="1"
                    class="form-control"
                  />
                  <div class="input-group-append">
                    <span class="input-group-text">{{ paymentUnit }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Quick Stats -->
            <div class="row text-center mt-3 p-3 rounded" style="background-color: rgba(74, 85, 104, 0.5);">
              <div class="col-6">
                <div class="small text-muted">Term Payment</div>
                <div class="h5 mb-0 text-success">
                  {{ nominalTermPayment.toLocaleString() }} ADA
                </div>
              </div>
              <div class="col-6">
                <div class="small text-muted">Contract Duration</div>
                <div class="h5 mb-0 text-white">{{ formattedContractLength }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Fees -->
        <div class="card mb-4">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Fees</h5>
            <InfoButton @click="showFeeInfo = !showFeeInfo">
              How do fees work?
            </InfoButton>
          </div>
          <div class="card-body">
            <InfoPanel v-if="showFeeInfo" class="mb-3">
              <strong>Late Fee</strong>: Charged when payment is past the grace period.<br/>
              <strong>Transfer Fee</strong>: Platform fee (1% of principal, min 5 ADA, max 25,000 ADA).
              Can be split between buyer and seller.
            </InfoPanel>

            <div class="row">
              <div class="col-md-6 mb-3">
                <label class="form-label small text-muted">Late Fee</label>
                <div class="input-group">
                  <input
                    v-model.number="form.lateFee"
                    type="number"
                    min="0"
                    class="form-control"
                  />
                  <div class="input-group-append">
                    <span class="input-group-text">ADA</span>
                  </div>
                </div>
              </div>
              <div class="col-md-6 mb-3">
                <label class="form-label small text-muted">Transfer Fee (Platform)</label>
                <div class="input-group">
                  <input
                    :value="calculatedTransferFee.toFixed(2)"
                    type="number"
                    disabled
                    class="form-control"
                  />
                  <div class="input-group-append">
                    <span class="input-group-text">ADA</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Fee Split Slider -->
            <div>
              <label class="form-label small text-muted">Fee Split (Seller / Buyer)</label>
              <FeeSplitSlider
                v-model="form.feeSplit"
                :total-fee="calculatedTransferFee"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Summary -->
      <div class="col-lg-4">
        <div class="card sticky-top" style="top: 1.5rem;">
          <div class="card-header">
            <h5 class="mb-0">Contract Summary</h5>
          </div>
          <div class="card-body">
            <!-- Asset Preview -->
            <div v-if="form.selectedAsset" class="text-center mb-3">
              <AssetPreview :asset="form.selectedAsset" />
              <div class="small text-muted mt-2">
                {{ form.quantity }} {{ form.quantity > 1 ? 'units' : 'unit' }} to be locked
              </div>
            </div>
            <div v-else class="text-center py-4 text-muted">
              Select an asset to continue
            </div>

            <!-- Terms Summary -->
            <div class="border-top pt-3 mt-3">
              <div class="d-flex justify-content-between small mb-2">
                <span class="text-muted">Principal</span>
                <span>{{ form.principal.toLocaleString() }} ADA</span>
              </div>
              <div class="d-flex justify-content-between small mb-2">
                <span class="text-muted">Interest Rate</span>
                <span>{{ form.apr }}% APR</span>
              </div>
              <div class="d-flex justify-content-between small mb-2">
                <span class="text-muted">Term Payment</span>
                <span>{{ nominalTermPayment.toLocaleString() }} ADA</span>
              </div>
              <div class="d-flex justify-content-between small mb-2">
                <span class="text-muted">Total Interest</span>
                <span>{{ totalInterest.toLocaleString() }} ADA</span>
              </div>
              <div class="d-flex justify-content-between small mb-2">
                <span class="text-muted">Contract Duration</span>
                <span>{{ formattedContractLength }}</span>
              </div>
            </div>

            <!-- Totals -->
            <div class="border-top pt-3 mt-3">
              <div class="d-flex justify-content-between mb-2">
                <span class="text-muted">Value to Seller</span>
                <span class="text-success font-weight-bold">
                  {{ totalValueToSeller.toLocaleString() }} ADA
                </span>
              </div>
              <div class="d-flex justify-content-between mb-2">
                <span class="text-muted">Cost to Buyer</span>
                <span class="text-warning font-weight-bold">
                  {{ totalCostToBuyer.toLocaleString() }} ADA
                </span>
              </div>
            </div>

            <!-- Create Button -->
            <button
              @click="createContract"
              :disabled="!canCreate || isCreating"
              class="btn btn-primary btn-block mt-4"
            >
              <span v-if="isCreating">
                <span class="spinner-border spinner-border-sm mr-2" role="status"></span>
                Creating Contract...
              </span>
              <span v-else>Create Contract</span>
            </button>

            <p v-if="wallet.networkId === 1" class="small text-danger text-center mt-2 mb-0">
              Mainnet not yet supported. Please use Preview testnet.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'
import { useLoanCalculations } from '@/composables/useLoanCalculations'
import type { LoanFormData, LoanTerms, Asset } from '@/types'

// Components
import NotConnectedWarning from '@/components/common/NotConnectedWarning.vue'
import InfoButton from '@/components/common/InfoButton.vue'
import InfoPanel from '@/components/common/InfoPanel.vue'
import AssetSelector from '@/components/loan/AssetSelector.vue'
import AssetPreview from '@/components/loan/AssetPreview.vue'
import FrequencyToggle from '@/components/loan/FrequencyToggle.vue'
import FeeSplitSlider from '@/components/loan/FeeSplitSlider.vue'

const router = useRouter()
const wallet = useWalletStore()

// Form state
const form = reactive<LoanFormData>({
  alias: '',
  selectedAsset: null,
  quantity: 1,
  buyer: '',
  hasBuyer: false,
  principal: 500,
  apr: 7,
  frequency: 12,
  installments: 12,
  lateFee: 10,
  feeSplit: 50,
  deferFee: false,
})

// Info panel toggles
const showAssetInfo = ref(false)
const showBuyerInfo = ref(false)
const showTermsInfo = ref(false)
const showFeeInfo = ref(false)

// Loading state
const isCreating = ref(false)

// Calculate transfer fee (1% of principal, min 5, max 25000)
const calculatedTransferFee = computed(() => {
  const fee = form.principal * 0.01
  return Math.min(Math.max(fee, 5), 25000)
})

// Convert form to terms for calculations
const terms = computed<LoanTerms>(() => ({
  principal: BigInt(form.principal * 1_000_000),
  apr: form.apr * 100, // Convert to basis points
  frequency: form.frequency,
  installments: form.installments,
  lateFee: BigInt(form.lateFee * 1_000_000),
  transferFee: BigInt(calculatedTransferFee.value * 1_000_000),
}))

// Use calculations composable
const {
  paymentUnit,
  formattedContractLength,
  nominalTermPayment,
  totalInterest,
  totalCostToBuyer,
  totalValueToSeller,
} = useLoanCalculations(terms)

// Validation
const canCreate = computed(() => {
  return (
    wallet.isConnected &&
    wallet.networkId === 0 && // Preview only for now
    form.selectedAsset !== null &&
    form.principal > 0 &&
    form.installments > 0 &&
    (!form.hasBuyer || form.buyer.length > 0)
  )
})

// Create contract
async function createContract() {
  if (!canCreate.value) return

  isCreating.value = true
  try {
    // TODO: Implement actual contract creation using SDK
    console.log('Creating contract with form:', form)

    // For now, just show success
    alert('Contract creation would happen here!')

    // Navigate to loan list
    // router.push('/loan')
  } catch (error) {
    console.error('Failed to create contract:', error)
    alert('Failed to create contract: ' + (error instanceof Error ? error.message : 'Unknown error'))
  } finally {
    isCreating.value = false
  }
}
</script>
