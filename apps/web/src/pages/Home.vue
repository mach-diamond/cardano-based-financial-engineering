<template>
  <div class="space-y-8">
    <!-- Hero Section -->
    <div class="text-center py-12">
      <h1 class="text-4xl font-bold text-white mb-4">
        MintMatrix <span class="text-mint-500">Financial Instruments</span>
      </h1>
      <p class="text-xl text-gray-400 max-w-2xl mx-auto">
        Create and manage sophisticated financial products on Cardano
      </p>
    </div>

    <!-- Contract Cards -->
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- Loan Contract Card -->
      <router-link to="/loan" class="card hover:border-mint-500 transition-colors group">
        <div class="card-body">
          <div class="flex items-center mb-4">
            <div class="p-3 bg-blue-900/30 rounded-lg">
              <svg class="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 class="text-xl font-semibold ml-4 group-hover:text-mint-400 transition-colors">
              Loan Contract
            </h2>
          </div>
          <p class="text-gray-400 mb-4">
            Create asset-backed loans with amortized payment schedules.
            Perfect for real estate, vehicles, and equipment financing.
          </p>
          <div class="flex flex-wrap gap-2">
            <span class="badge badge-info">Collateralized</span>
            <span class="badge badge-info">Amortized</span>
            <span class="badge badge-success">Production Ready</span>
          </div>
        </div>
      </router-link>

      <!-- CDO Bond Card -->
      <router-link to="/cdo" class="card hover:border-mint-500 transition-colors group">
        <div class="card-body">
          <div class="flex items-center mb-4">
            <div class="p-3 bg-purple-900/30 rounded-lg">
              <svg class="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 class="text-xl font-semibold ml-4 group-hover:text-mint-400 transition-colors">
              CDO Bond
            </h2>
          </div>
          <p class="text-gray-400 mb-4">
            Create multi-tranche CDO bonds backed by collateral pools.
            Senior, Mezzanine, and Junior tranches with waterfall distributions.
          </p>
          <div class="flex flex-wrap gap-2">
            <span class="badge badge-info">Multi-Tranche</span>
            <span class="badge badge-info">Waterfall</span>
            <span class="badge badge-success">Production Ready</span>
          </div>
        </div>
      </router-link>

      <!-- Test Monitor Card -->
      <router-link to="/tests" class="card hover:border-mint-500 transition-colors group">
        <div class="card-body">
          <div class="flex items-center mb-4">
            <div class="p-3 bg-green-900/30 rounded-lg">
              <svg class="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 class="text-xl font-semibold ml-4 group-hover:text-mint-400 transition-colors">
              Test Monitor
            </h2>
          </div>
          <p class="text-gray-400 mb-4">
            Monitor integration test results across emulator and testnet.
            Visualize test progress and transaction details.
          </p>
          <div class="flex flex-wrap gap-2">
            <span class="badge badge-warning">Emulator</span>
            <span class="badge badge-warning">Testnet</span>
            <span class="badge badge-info">Real-time</span>
          </div>
        </div>
      </router-link>
    </div>

    <!-- Quick Stats -->
    <div class="card">
      <div class="card-header">
        <h3 class="text-lg font-semibold">Network Status</h3>
      </div>
      <div class="card-body">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center">
            <div class="text-3xl font-bold text-mint-500">
              {{ wallet.isConnected ? wallet.balanceADA.toFixed(2) : '--' }}
            </div>
            <div class="text-sm text-gray-400">ADA Balance</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold text-blue-400">
              {{ wallet.isConnected ? wallet.networkName : '--' }}
            </div>
            <div class="text-sm text-gray-400">Network</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold text-purple-400">2</div>
            <div class="text-sm text-gray-400">Contract Types</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold text-green-400">PlutusV3</div>
            <div class="text-sm text-gray-400">Version</div>
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
