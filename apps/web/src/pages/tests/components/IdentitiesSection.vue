<template>
  <div class="card mb-4 identities-card identities-card--bordered" :class="{ 'identities-card--expanded': sections.main }">
    <div class="card-header section-header" @click="sections.main = !sections.main">
      <div class="d-flex align-items-center">
        <div class="section-icon section-icon--identity mr-3">
          <i class="fas fa-users"></i>
        </div>
        <div>
          <h5 class="text-white mb-0">Identities & Wallets</h5>
          <small class="text-muted">{{ identities.length }} wallets | {{ totalAssets }} assets | {{ totalAda }} ADA</small>
        </div>
      </div>
      <div class="d-flex align-items-center">
        <div class="custom-control custom-switch mr-3" @click.stop>
          <input type="checkbox" class="custom-control-input" id="columnViewSwitch" v-model="columnView">
          <label class="custom-control-label text-muted small" for="columnViewSwitch">Column View</label>
        </div>
        <button @click.stop="$emit('generateTestUsers')" class="btn btn-sm btn-outline-primary mr-3" :disabled="isGenerating">
          <span v-if="isGenerating" class="spinner-border spinner-border-sm mr-1"></span>
          {{ isGenerating ? 'Generating...' : 'Generate Test Users' }}
        </button>
        <span class="collapse-icon">{{ sections.main ? '▲' : '▼' }}</span>
      </div>
    </div>
    <div v-show="sections.main" class="card-body p-3">
      <div :class="columnView ? 'd-flex flex-row gap-3' : ''">
        <!-- Originators -->
        <div :class="columnView ? 'column-section' : ''">
          <div class="section-header" @click="sections.originators = !sections.originators">
            <div class="d-flex align-items-center">
              <h6 class="text-muted text-uppercase small mb-0 mr-2">Originators</h6>
              <span class="badge badge-sm badge-secondary">{{ originators.length }} | {{ originatorStats.assets }} assets | {{ originatorStats.ada }} ADA</span>
            </div>
            <span class="collapse-icon">{{ sections.originators ? '▲' : '▼' }}</span>
          </div>
          <div v-show="sections.originators" :class="columnView ? '' : 'row'" class="mt-2 mb-3">
            <div v-for="identity in originators" :key="identity.id" :class="columnView ? 'mb-2' : 'col-md-6 col-lg-3 mb-3'">
              <WalletCard :identity="identity" :is-running="isRunning" />
            </div>
          </div>
        </div>

        <!-- Borrowers -->
        <div :class="columnView ? 'column-section' : ''">
          <div class="section-header" @click="sections.borrowers = !sections.borrowers">
            <div class="d-flex align-items-center">
              <h6 class="text-muted text-uppercase small mb-0 mr-2">Borrowers</h6>
              <span class="badge badge-sm badge-secondary">{{ borrowers.length }} | {{ borrowerStats.assets }} assets | {{ borrowerStats.ada }} ADA</span>
            </div>
            <span class="collapse-icon">{{ sections.borrowers ? '▲' : '▼' }}</span>
          </div>
          <div v-show="sections.borrowers" :class="columnView ? '' : 'row'" class="mt-2 mb-3">
            <div v-for="identity in borrowers" :key="identity.id" :class="columnView ? 'mb-2' : 'col-md-6 col-lg-4 mb-3'">
              <WalletCard :identity="identity" :is-running="isRunning" />
            </div>
          </div>
        </div>

        <!-- CLO Manager -->
        <div :class="columnView ? 'column-section' : ''">
          <div class="section-header" @click="sections.analysts = !sections.analysts">
            <div class="d-flex align-items-center">
              <h6 class="text-muted text-uppercase small mb-0 mr-2">CLO Manager</h6>
              <span class="badge badge-sm badge-secondary">{{ analysts.length }} | {{ analystStats.assets }} assets | {{ analystStats.ada }} ADA</span>
            </div>
            <span class="collapse-icon">{{ sections.analysts ? '▲' : '▼' }}</span>
          </div>
          <div v-show="sections.analysts" :class="columnView ? '' : 'row'" class="mt-2 mb-3">
            <div v-for="identity in analysts" :key="identity.id" :class="columnView ? 'mb-2' : 'col-md-6 col-lg-3 mb-3'">
              <WalletCard :identity="identity" :is-running="isRunning" />
            </div>
          </div>
        </div>

        <!-- Investors -->
        <div :class="columnView ? 'column-section' : ''">
          <div class="section-header" @click="sections.investors = !sections.investors">
            <div class="d-flex align-items-center">
              <h6 class="text-muted text-uppercase small mb-0 mr-2">Investors</h6>
              <span class="badge badge-sm badge-secondary">{{ investors.length }} | {{ investorStats.assets }} assets | {{ investorStats.ada }} ADA</span>
            </div>
            <span class="collapse-icon">{{ sections.investors ? '▲' : '▼' }}</span>
          </div>
          <div v-show="sections.investors" :class="columnView ? '' : 'row'" class="mt-2 mb-3">
            <div v-for="identity in investors" :key="identity.id" :class="columnView ? 'mb-2' : 'col-md-6 col-lg-3 mb-3'">
              <WalletCard :identity="identity" :is-running="isRunning" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import WalletCard from '@/components/tests/WalletCard.vue'
import type { Identity } from '../testRunner'

const props = defineProps<{
  identities: Identity[]
  isRunning: boolean
  isGenerating: boolean
}>()

defineEmits<{
  generateTestUsers: []
}>()

const columnView = ref(true)

const sections = ref({
  main: false,
  originators: true,
  borrowers: true,
  analysts: true,
  investors: true
})

// Computed role-based filters
const originators = computed(() => props.identities.filter(i => i.role === 'Originator'))
const borrowers = computed(() => props.identities.filter(i => i.role === 'Borrower'))
const analysts = computed(() => props.identities.filter(i => i.role === 'Analyst'))
const investors = computed(() => props.identities.filter(i => i.role === 'Investor'))

// Stats helper
function computeStats(ids: Identity[]) {
  const assets = ids.reduce((sum, i) => sum + i.wallets[0].assets.reduce((s, a) => s + Number(a.quantity), 0), 0)
  const ada = ids.reduce((sum, i) => sum + Number(i.wallets[0].balance) / 1_000_000, 0)
  return { assets, ada: Math.round(ada) }
}

const originatorStats = computed(() => computeStats(originators.value))
const borrowerStats = computed(() => computeStats(borrowers.value))
const analystStats = computed(() => computeStats(analysts.value))
const investorStats = computed(() => computeStats(investors.value))

const totalAssets = computed(() => originatorStats.value.assets + borrowerStats.value.assets + analystStats.value.assets + investorStats.value.assets)
const totalAda = computed(() => originatorStats.value.ada + borrowerStats.value.ada + analystStats.value.ada + investorStats.value.ada)
</script>
