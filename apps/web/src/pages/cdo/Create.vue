<template>
  <div class="container py-4">
    <!-- Header -->
    <div class="d-flex align-items-center mb-4">
      <router-link to="/cdo" class="btn btn-link text-muted p-0 mr-3">
        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </router-link>
      <div>
        <h1 class="h3 mb-0 text-white">Create CDO Bond</h1>
        <p class="text-muted mb-0 small">Configure a multi-tranche collateralized debt obligation</p>
      </div>
    </div>

    <NotConnectedWarning v-if="!wallet.isConnected" />

    <div v-else class="row">
      <!-- Form -->
      <div class="col-lg-8">
        <!-- Bond Details -->
        <div class="card mb-4">
          <div class="card-header">
            <h5 class="mb-0">Bond Details</h5>
          </div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label small text-muted">Bond Name/Alias (optional)</label>
              <input v-model="form.alias" type="text" class="form-control" placeholder="e.g., Q1 2024 Loan Pool" />
            </div>
            <div class="row">
              <div class="col-md-6">
                <div class="form-group">
                  <label class="form-label small text-muted">Total Principal</label>
                  <div class="input-group">
                    <input v-model.number="form.principal" type="number" min="1000" class="form-control" />
                    <div class="input-group-append">
                      <span class="input-group-text">ADA</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group mb-0">
                  <label class="form-label small text-muted">Term Length</label>
                  <div class="input-group">
                    <input v-model.number="form.termMonths" type="number" min="1" max="120" class="form-control" />
                    <div class="input-group-append">
                      <span class="input-group-text">months</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tranche Configuration -->
        <div class="card mb-4">
          <div class="card-header">
            <h5 class="mb-0">Tranche Configuration</h5>
          </div>
          <div class="card-body">
            <!-- Senior -->
            <div class="mb-3">
              <TrancheConfig
                v-model:percentage="form.seniorPercentage"
                v-model:rate="form.seniorRate"
                label="Senior"
                color="green"
                description="First priority, lowest risk"
              />
            </div>

            <!-- Mezzanine -->
            <div class="mb-3">
              <TrancheConfig
                v-model:percentage="form.mezzPercentage"
                v-model:rate="form.mezzRate"
                label="Mezzanine"
                color="yellow"
                description="Second priority, medium risk"
              />
            </div>

            <!-- Junior -->
            <div class="mb-3">
              <TrancheConfig
                v-model:percentage="form.juniorPercentage"
                v-model:rate="form.juniorRate"
                label="Junior (Equity)"
                color="red"
                description="Last priority, highest risk"
              />
            </div>

            <!-- Validation -->
            <div v-if="totalPercentage !== 100" class="alert alert-danger small mb-0">
              Tranche percentages must sum to 100% (currently {{ totalPercentage }}%)
            </div>
          </div>
        </div>

        <!-- Collateral Selection -->
        <div class="card mb-4">
          <div class="card-header">
            <h5 class="mb-0">Collateral Pool</h5>
          </div>
          <div class="card-body">
            <p class="text-muted small mb-3">
              Select NFTs representing loans or other assets to back this bond.
            </p>

            <div v-if="wallet.assets.length === 0" class="text-center py-4 text-muted">
              No eligible collateral assets found in wallet
            </div>
            <div v-else>
              <div
                v-for="asset in wallet.assets"
                :key="asset.policyId + asset.assetName"
                class="custom-control custom-checkbox p-3 mb-2 rounded"
                style="background-color: rgba(74, 85, 104, 0.5);"
              >
                <input
                  type="checkbox"
                  class="custom-control-input"
                  :id="'asset-' + asset.policyId"
                  :value="asset"
                  v-model="form.collateral"
                />
                <label class="custom-control-label d-block" :for="'asset-' + asset.policyId">
                  <div class="font-weight-bold">{{ asset.assetName || 'Unnamed' }}</div>
                  <div class="small text-muted" style="font-family: monospace;">{{ asset.policyId.slice(0, 16) }}...</div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Summary -->
      <div class="col-lg-4">
        <div class="card sticky-top" style="top: 1.5rem;">
          <div class="card-header">
            <h5 class="mb-0">Bond Summary</h5>
          </div>
          <div class="card-body">
            <div class="mb-3">
              <div class="d-flex justify-content-between small mb-2">
                <span class="text-muted">Principal</span>
                <span>{{ form.principal.toLocaleString() }} ADA</span>
              </div>
              <div class="d-flex justify-content-between small mb-2">
                <span class="text-muted">Term</span>
                <span>{{ form.termMonths }} months</span>
              </div>
              <div class="d-flex justify-content-between small">
                <span class="text-muted">Collateral Count</span>
                <span>{{ form.collateral.length }} assets</span>
              </div>
            </div>

            <div class="border-top pt-3 mt-3">
              <div class="d-flex justify-content-between small mb-2">
                <span class="text-success">Senior</span>
                <span>{{ (form.principal * form.seniorPercentage / 100).toLocaleString() }} ADA @ {{ form.seniorRate }}%</span>
              </div>
              <div class="d-flex justify-content-between small mb-2">
                <span class="text-warning">Mezzanine</span>
                <span>{{ (form.principal * form.mezzPercentage / 100).toLocaleString() }} ADA @ {{ form.mezzRate }}%</span>
              </div>
              <div class="d-flex justify-content-between small">
                <span class="text-danger">Junior</span>
                <span>{{ (form.principal * form.juniorPercentage / 100).toLocaleString() }} ADA @ {{ form.juniorRate }}%</span>
              </div>
            </div>

            <!-- Tranche Bar -->
            <div class="d-flex rounded overflow-hidden my-3" style="height: 12px;">
              <div class="bg-success" :style="{ width: `${form.seniorPercentage}%` }"></div>
              <div class="bg-warning" :style="{ width: `${form.mezzPercentage}%` }"></div>
              <div class="bg-danger" :style="{ width: `${form.juniorPercentage}%` }"></div>
            </div>

            <button
              @click="createBond"
              :disabled="!canCreate || isCreating"
              class="btn btn-primary btn-block mt-3"
            >
              <span v-if="isCreating">
                <span class="spinner-border spinner-border-sm mr-2" role="status"></span>
                Creating Bond...
              </span>
              <span v-else>Create Bond</span>
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
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'
import NotConnectedWarning from '@/components/common/NotConnectedWarning.vue'
import TrancheConfig from '@/components/cdo/TrancheConfig.vue'
import type { Asset, CDOFormData } from '@/types'

const router = useRouter()
const wallet = useWalletStore()

const form = reactive<CDOFormData>({
  alias: '',
  principal: 100000,
  seniorPercentage: 70,
  seniorRate: 6,
  mezzPercentage: 20,
  mezzRate: 12,
  juniorPercentage: 10,
  juniorRate: 20,
  termMonths: 12,
  collateral: [],
})

const isCreating = ref(false)

const totalPercentage = computed(() =>
  form.seniorPercentage + form.mezzPercentage + form.juniorPercentage
)

const canCreate = computed(() =>
  wallet.isConnected &&
  wallet.networkId === 0 && // Preview only for now
  form.principal > 0 &&
  totalPercentage.value === 100 &&
  form.collateral.length > 0
)

async function createBond() {
  if (!canCreate.value) return

  isCreating.value = true
  try {
    // TODO: Implement using SDK
    console.log('Creating bond with form:', form)
    alert('Bond creation would happen here!')

    // Navigate to CDO list
    // router.push('/cdo')
  } catch (error) {
    console.error('Failed to create bond:', error)
    alert('Failed to create bond: ' + (error instanceof Error ? error.message : 'Unknown error'))
  } finally {
    isCreating.value = false
  }
}
</script>
