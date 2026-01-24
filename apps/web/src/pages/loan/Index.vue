<template>
  <div class="container py-4">
    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="h3 mb-1 text-white">Loan Contracts</h1>
        <p class="text-muted mb-0">Create and manage asset-backed loans</p>
      </div>
      <router-link to="/loan/create" class="btn btn-primary">
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="mr-1">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Create Loan
      </router-link>
    </div>

    <!-- Not Connected Warning -->
    <div v-if="!wallet.isConnected" class="card mb-4 border-warning">
      <div class="card-body d-flex align-items-center">
        <div class="rounded-circle d-flex align-items-center justify-content-center mr-3"
             style="width: 40px; height: 40px; background-color: rgba(255, 193, 7, 0.2);">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="text-warning">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h6 class="mb-0 text-warning">Wallet Not Connected</h6>
          <small class="text-muted">Connect your wallet to view and manage your loans</small>
        </div>
      </div>
    </div>

    <!-- Active Loans -->
    <template v-else>
      <h5 class="text-muted mb-3">Your Loans</h5>

      <!-- Empty State -->
      <div v-if="loans.length === 0" class="card mb-4">
        <div class="card-body text-center py-5">
          <div class="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
               style="width: 48px; height: 48px; background-color: rgba(74, 85, 104, 0.5);">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="text-muted">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h5 class="text-white mb-2">No Loans Found</h5>
          <p class="text-muted mb-3">You haven't created any loan contracts yet.</p>
          <router-link to="/loan/create" class="btn btn-primary">
            Create Your First Loan
          </router-link>
        </div>
      </div>

      <!-- Loan List -->
      <div v-else>
        <LoanCard
          v-for="loan in loans"
          :key="loan.id"
          :loan="loan"
          class="mb-3"
        />
      </div>
    </template>

    <!-- How It Works -->
    <div class="card">
      <div class="card-header">
        <h5 class="mb-0">How Loan Contracts Work</h5>
      </div>
      <div class="card-body">
        <div class="row">
          <div class="col-md-4 text-center mb-4 mb-md-0">
            <div class="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                 style="width: 40px; height: 40px; background-color: rgba(0, 123, 255, 0.2);">
              <span class="font-weight-bold text-primary">1</span>
            </div>
            <h6 class="mb-2">Create Contract</h6>
            <p class="small text-muted mb-0">
              Lock your asset as collateral and define payment terms (principal, APR, installments).
            </p>
          </div>
          <div class="col-md-4 text-center mb-4 mb-md-0">
            <div class="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                 style="width: 40px; height: 40px; background-color: rgba(0, 123, 255, 0.2);">
              <span class="font-weight-bold text-primary">2</span>
            </div>
            <h6 class="mb-2">Accept & Pay</h6>
            <p class="small text-muted mb-0">
              Buyer accepts the contract and makes scheduled payments over time.
            </p>
          </div>
          <div class="col-md-4 text-center">
            <div class="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                 style="width: 40px; height: 40px; background-color: rgba(0, 123, 255, 0.2);">
              <span class="font-weight-bold text-primary">3</span>
            </div>
            <h6 class="mb-2">Complete Transfer</h6>
            <p class="small text-muted mb-0">
              Once fully paid, ownership of the asset transfers to the buyer automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useWalletStore } from '@/stores/wallet'
import LoanCard from '@/components/loan/LoanCard.vue'
import type { LoanContract } from '@/types'

const wallet = useWalletStore()

// TODO: Fetch loans from blockchain/backend
const loans = ref<LoanContract[]>([])
</script>
