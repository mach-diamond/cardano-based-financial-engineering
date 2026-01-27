<template>
  <div class="container pb-5">
    <!-- Hero Section -->
    <div class="text-center py-5 mb-4">
      <h1 class="display-4 font-weight-bold text-white mb-3">
        MintMatrix <span class="text-mint">Financial Instruments</span>
      </h1>
      <p class="lead text-muted max-w-2xl mx-auto">
        Create and manage sophisticated financial products on Cardano
      </p>
    </div>

    <!-- Contract Cards -->
    <div class="row">
      <!-- Loan Contract Card -->
      <div class="col-md-6 col-lg-4 mb-4">
        <router-link to="/loan" class="card h-100 card-hover text-decoration-none group">
          <div class="card-body">
            <div class="d-flex align-items-center mb-4">
              <div class="icon-container icon-md bg-primary-subtle" style="background-color: rgba(0, 51, 173, 0.1);">
                <svg class="icon-svg text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h2 class="h5 font-weight-bold mb-0 ml-3 text-white">
                Loan Contract
              </h2>
            </div>
            <p class="text-muted mb-4">
              Create asset-backed loans with amortized payment schedules.
              Perfect for real estate, vehicles, and equipment financing.
            </p>
            <div class="d-flex flex-wrap" style="gap: 0.5rem;">
              <span class="badge badge-info">Collateralized</span>
              <span class="badge badge-info">Amortized</span>
              <span class="badge badge-success">Production Ready</span>
            </div>
          </div>
        </router-link>
      </div>

      <!-- CDO Bond Card -->
      <div class="col-md-6 col-lg-4 mb-4">
        <router-link to="/cdo" class="card h-100 card-hover text-decoration-none group">
          <div class="card-body">
            <div class="d-flex align-items-center mb-4">
              <div class="icon-container icon-md bg-purple-subtle" style="background-color: rgba(109, 0, 255, 0.1);">
                <svg class="icon-svg text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 class="h5 font-weight-bold mb-0 ml-3 text-white">
                CDO Bond
              </h2>
            </div>
            <p class="text-muted mb-4">
              Create multi-tranche CDO bonds backed by collateral pools.
              Senior, Mezzanine, and Junior tranches with waterfall distributions.
            </p>
            <div class="d-flex flex-wrap" style="gap: 0.5rem;">
              <span class="badge badge-info">Multi-Tranche</span>
              <span class="badge badge-info">Waterfall</span>
              <span class="badge badge-success">Production Ready</span>
            </div>
          </div>
        </router-link>
      </div>

      <!-- Test Monitor Card -->
      <div class="col-md-6 col-lg-4 mb-4">
        <router-link to="/tests" class="card h-100 card-hover text-decoration-none group">
          <div class="card-body">
            <div class="d-flex align-items-center mb-4">
              <div class="icon-container icon-md bg-green-subtle" style="background-color: rgba(0, 255, 114, 0.1);">
                <svg class="icon-svg text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 class="h5 font-weight-bold mb-0 ml-3 text-white">
                Test Monitor
              </h2>
            </div>
            <p class="text-muted mb-4">
              Monitor integration test results across emulator and testnet.
              Visualize test progress and transaction details.
            </p>
            <div class="d-flex flex-wrap" style="gap: 0.5rem;">
              <span class="badge badge-warning">Emulator</span>
              <span class="badge badge-warning">Testnet</span>
              <span class="badge badge-info">Real-time</span>
            </div>
          </div>
        </router-link>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="card mt-4">
      <div class="card-header border-0 bg-transparent pt-4 px-4 pb-0">
        <h3 class="h6 font-weight-bold text-uppercase text-muted letter-spacing-wider">Network Status</h3>
      </div>
      <div class="card-body p-4">
        <div class="row text-center">
          <div class="col-6 col-md-3 mb-3 mb-md-0 border-right border-dark">
            <div class="h3 font-weight-bold text-mint mb-1">
              {{ wallet.isConnected ? wallet.balanceADA.toFixed(2) : '--' }}
            </div>
            <div class="small text-muted text-uppercase">ADA Balance</div>
          </div>
          <div class="col-6 col-md-3 mb-3 mb-md-0 border-right border-dark">
            <div class="h3 font-weight-bold text-blue-400 mb-1">
              {{ wallet.isConnected ? wallet.networkName : '--' }}
            </div>
            <div class="small text-muted text-uppercase">Network</div>
          </div>
          <div class="col-6 col-md-3 mb-3 mb-md-0 border-right border-dark">
            <div class="h3 font-weight-bold text-purple-400 mb-1">2</div>
            <div class="small text-muted text-uppercase">Contract Types</div>
          </div>
          <div class="col-6 col-md-3">
            <div class="h3 font-weight-bold text-green-400 mb-1">PlutusV3</div>
            <div class="small text-muted text-uppercase">Version</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useWalletStore } from '@/stores/wallet'

const wallet = useWalletStore()
</script>
