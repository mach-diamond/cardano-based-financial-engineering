<template>
  <div class="config-panel">
    <div class="panel-header">
      <h4>Pipeline Settings</h4>
      <p class="text-muted">Configure test execution parameters</p>
    </div>

    <div class="row">
      <div class="col-md-6">
        <div class="form-group">
          <label>Network Mode</label>
          <select v-model="localNetwork" class="form-control">
            <option value="emulator">Emulator (Local)</option>
            <option value="preview">Preview Testnet</option>
            <option value="preprod">Preprod Testnet</option>
          </select>
          <small class="form-text text-muted">
            Emulator runs locally with instant transactions. Preview/Preprod use real testnet.
          </small>
        </div>
      </div>
    </div>

    <div class="row mt-4">
      <div class="col-md-6">
        <div class="form-group">
          <label>Monte Carlo Iterations</label>
          <input
            v-model.number="localMonteCarlo.iterations"
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
            <input v-model.number="localMonteCarlo.parameters.defaultProbability.min" type="number" step="0.01" class="form-control form-control-sm" placeholder="Min" />
            <span class="text-muted align-self-center">to</span>
            <input v-model.number="localMonteCarlo.parameters.defaultProbability.max" type="number" step="0.01" class="form-control form-control-sm" placeholder="Max" />
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="form-group">
          <label>Interest Rate Shock Range</label>
          <div class="d-flex gap-2">
            <input v-model.number="localMonteCarlo.parameters.interestRateShock.min" type="number" step="0.01" class="form-control form-control-sm" placeholder="Min" />
            <span class="text-muted align-self-center">to</span>
            <input v-model.number="localMonteCarlo.parameters.interestRateShock.max" type="number" step="0.01" class="form-control form-control-sm" placeholder="Max" />
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="form-group">
          <label>Prepayment Rate Range</label>
          <div class="d-flex gap-2">
            <input v-model.number="localMonteCarlo.parameters.prepaymentRate.min" type="number" step="0.01" class="form-control form-control-sm" placeholder="Min" />
            <span class="text-muted align-self-center">to</span>
            <input v-model.number="localMonteCarlo.parameters.prepaymentRate.max" type="number" step="0.01" class="form-control form-control-sm" placeholder="Max" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { TestNetwork, MonteCarloConfig } from '@/utils/pipeline/types'

interface Props {
  network: TestNetwork
  monteCarlo: MonteCarloConfig
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:network': [value: TestNetwork]
  'update:monte-carlo': [value: MonteCarloConfig]
}>()

const localNetwork = ref(props.network)
const localMonteCarlo = ref(JSON.parse(JSON.stringify(props.monteCarlo)))

watch(() => props.network, (val) => {
  localNetwork.value = val
})

watch(() => props.monteCarlo, (val) => {
  localMonteCarlo.value = JSON.parse(JSON.stringify(val))
}, { deep: true })

watch(localNetwork, (val) => {
  emit('update:network', val)
})

watch(localMonteCarlo, (val) => {
  emit('update:monte-carlo', JSON.parse(JSON.stringify(val)))
}, { deep: true })
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

.gap-2 { gap: 0.5rem; }
</style>
