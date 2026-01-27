<template>
  <div class="card mb-4 identities-card">
    <div class="card-header section-header" @click="$emit('toggle-collapsible', 'main')">
      <div class="d-flex align-items-center">
        <h5 class="text-white mb-0 mr-3">Identities & Wallets</h5>
        <span class="badge badge-secondary mr-2">{{ identities.length }} wallets</span>
        <span class="badge badge-info mr-2">{{ totalAssets }} assets</span>
        <span class="badge badge-success">{{ totalAda }} ADA</span>
      </div>
      <div class="d-flex align-items-center">
        <button @click.stop="$emit('generate-users')" class="btn btn-sm btn-outline-primary mr-3" :disabled="isGenerating">
          <span v-if="isGenerating" class="spinner-border spinner-border-sm mr-1"></span>
          {{ isGenerating ? 'Generating...' : 'Generate Test Users' }}
        </button>
        <div class="custom-control custom-switch mr-3" @click.stop>
          <input type="checkbox" class="custom-control-input" id="columnViewSwitch" 
                 :checked="columnView" @change="$emit('update:columnView', ($event.target as HTMLInputElement).checked)">
          <label class="custom-control-label text-muted small" for="columnViewSwitch">Column View</label>
        </div>
        <span class="collapse-icon">{{ expanded ? '▲' : '▼' }}</span>
      </div>
    </div>
    <div v-show="expanded" class="card-body p-3">
      <div :class="columnView ? 'd-flex flex-row gap-3' : ''">
        <!-- Originators -->
        <IdentityRoleSection 
          role-name="Originators" 
          :identities="originators" 
          :stats="originatorStats"
          :expanded="sections.originators"
          :column-view="columnView"
          :is-running="isRunning"
          @toggle="$emit('toggle-collapsible', 'originators')"
        />

        <!-- Borrowers -->
        <IdentityRoleSection 
          role-name="Borrowers" 
          :identities="borrowers" 
          :stats="borrowerStats"
          :expanded="sections.borrowers"
          :column-view="columnView"
          :is-running="isRunning"
          @toggle="$emit('toggle-collapsible', 'borrowers')"
        />

        <!-- CLO Manager -->
        <IdentityRoleSection 
          role-name="CLO Manager" 
          :role-key="analysts"
          :identities="analysts" 
          :stats="analystStats"
          :expanded="sections.analysts"
          :column-view="columnView"
          :is-running="isRunning"
          @toggle="$emit('toggle-collapsible', 'analysts')"
        />

        <!-- Investors -->
        <IdentityRoleSection 
          role-name="Investors" 
          :identities="investors" 
          :stats="investorStats"
          :expanded="sections.investors"
          :column-view="columnView"
          :is-running="isRunning"
          @toggle="$emit('toggle-collapsible', 'investors')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import IdentityRoleSection from './IdentityRoleSection.vue'

defineProps<{
  identities: any[]
  totalAssets: number
  totalAda: number
  isGenerating: boolean
  isRunning: boolean
  columnView: boolean
  expanded: boolean
  sections: any
  originators: any[]
  borrowers: any[]
  analysts: any[]
  investors: any[]
  originatorStats: any
  borrowerStats: any
  analystStats: any
  investorStats: any
}>()

defineEmits<{
  (e: 'update:columnView', val: boolean): void
  (e: 'toggle-collapsible', key: string): void
  (e: 'generate-users'): void
}>()
</script>
