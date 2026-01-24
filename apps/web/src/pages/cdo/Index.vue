<template>
  <div class="container py-4">
    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="h3 mb-1 text-white">CDO Bonds</h1>
        <p class="text-muted mb-0">Create and manage collateralized debt obligations</p>
      </div>
      <router-link to="/cdo/create" class="btn btn-primary">
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="mr-1">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Create Bond
      </router-link>
    </div>

    <!-- Not Connected Warning -->
    <NotConnectedWarning v-if="!wallet.isConnected" class="mb-4" />

    <!-- Bonds List -->
    <template v-else>
      <h5 class="text-muted mb-3">Your Bonds</h5>

      <!-- Empty State -->
      <div v-if="bonds.length === 0" class="card mb-4">
        <div class="card-body text-center py-5">
          <div class="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
               style="width: 48px; height: 48px; background-color: rgba(74, 85, 104, 0.5);">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="text-muted">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h5 class="text-white mb-2">No CDO Bonds Found</h5>
          <p class="text-muted mb-3">You haven't created any CDO bonds yet.</p>
          <router-link to="/cdo/create" class="btn btn-primary">
            Create Your First Bond
          </router-link>
        </div>
      </div>

      <!-- Bond List -->
      <div v-else>
        <CDOCard
          v-for="bond in bonds"
          :key="bond.id"
          :bond="bond"
          class="mb-3"
        />
      </div>
    </template>

    <!-- How CDO Works -->
    <div class="card">
      <div class="card-header">
        <h5 class="mb-0">How CDO Bonds Work</h5>
      </div>
      <div class="card-body">
        <!-- Tranche Diagram -->
        <div class="mb-4">
          <h6 class="text-muted text-center mb-3">Waterfall Distribution Structure</h6>
          <div class="d-flex justify-content-center">
            <div class="text-center mx-2" style="width: 100px;">
              <div class="rounded-top d-flex align-items-center justify-content-center"
                   style="height: 60px; background-color: rgba(40, 167, 69, 0.3); border: 1px solid #28a745;">
                <span class="text-success font-weight-bold small">Senior</span>
              </div>
              <small class="text-muted d-block mt-1">70% • 6% APY</small>
              <small class="text-secondary">Lowest Risk</small>
            </div>
            <div class="text-center mx-2" style="width: 100px;">
              <div class="d-flex align-items-center justify-content-center mt-2"
                   style="height: 48px; background-color: rgba(255, 193, 7, 0.3); border: 1px solid #ffc107;">
                <span class="text-warning font-weight-bold small">Mezzanine</span>
              </div>
              <small class="text-muted d-block mt-1">20% • 12% APY</small>
              <small class="text-secondary">Medium Risk</small>
            </div>
            <div class="text-center mx-2" style="width: 100px;">
              <div class="rounded-bottom d-flex align-items-center justify-content-center mt-4"
                   style="height: 36px; background-color: rgba(220, 53, 69, 0.3); border: 1px solid #dc3545;">
                <span class="text-danger font-weight-bold small">Junior</span>
              </div>
              <small class="text-muted d-block mt-1">10% • 20% APY</small>
              <small class="text-secondary">Highest Risk</small>
            </div>
          </div>
        </div>

        <div class="row">
          <div class="col-md-3 col-6 text-center mb-3 mb-md-0">
            <div class="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-2"
                 style="width: 32px; height: 32px; background-color: rgba(111, 66, 193, 0.2);">
              <span class="font-weight-bold text-info small">1</span>
            </div>
            <h6 class="small mb-1">Create Bond</h6>
            <p class="small text-muted mb-0">Lock collateral and configure tranches</p>
          </div>
          <div class="col-md-3 col-6 text-center mb-3 mb-md-0">
            <div class="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-2"
                 style="width: 32px; height: 32px; background-color: rgba(111, 66, 193, 0.2);">
              <span class="font-weight-bold text-info small">2</span>
            </div>
            <h6 class="small mb-1">Collect</h6>
            <p class="small text-muted mb-0">Record payments from collateral</p>
          </div>
          <div class="col-md-3 col-6 text-center">
            <div class="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-2"
                 style="width: 32px; height: 32px; background-color: rgba(111, 66, 193, 0.2);">
              <span class="font-weight-bold text-info small">3</span>
            </div>
            <h6 class="small mb-1">Distribute</h6>
            <p class="small text-muted mb-0">Waterfall to tranche holders</p>
          </div>
          <div class="col-md-3 col-6 text-center">
            <div class="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-2"
                 style="width: 32px; height: 32px; background-color: rgba(111, 66, 193, 0.2);">
              <span class="font-weight-bold text-info small">4</span>
            </div>
            <h6 class="small mb-1">Mature</h6>
            <p class="small text-muted mb-0">Token holders redeem</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useWalletStore } from '@/stores/wallet'
import NotConnectedWarning from '@/components/common/NotConnectedWarning.vue'
import CDOCard from '@/components/cdo/CDOCard.vue'
import type { CDOBond } from '@/types'

const wallet = useWalletStore()

// TODO: Fetch bonds from blockchain
const bonds = ref<CDOBond[]>([])
</script>
