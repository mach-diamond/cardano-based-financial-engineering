<template>
  <div class="container py-4">
    <!-- Header -->
    <div class="d-flex align-items-center justify-content-between mb-4">
      <div class="d-flex align-items-center">
        <router-link to="/loan" class="btn btn-link text-muted p-0 mr-3">
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </router-link>
        <div>
          <h1 class="h3 mb-0 text-white">{{ loan?.alias || 'Loan Contract' }}</h1>
          <p class="text-muted mb-0 small" style="font-family: monospace;">{{ loan?.address }}</p>
        </div>
      </div>
      <LoanStatusBadge v-if="loan" :state="loan.state" class="h5 px-3 py-2" />
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="card">
      <div class="card-body text-center py-5">
        <div class="spinner-border text-primary mb-3" role="status">
          <span class="sr-only">Loading...</span>
        </div>
        <p class="text-muted mb-0">Loading contract data...</p>
      </div>
    </div>

    <!-- Contract Data -->
    <template v-else-if="loan">
      <!-- Contract Timeline -->
      <div class="card mb-4">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center small mb-2">
            <div>
              <span class="text-muted">Start:</span>
              <span v-if="loan.state.startTime" class="text-success ml-2">
                {{ formatDate(loan.state.startTime) }}
              </span>
              <span v-else class="text-warning ml-2">Awaiting Acceptance</span>
            </div>
            <div class="text-right">
              <span class="text-muted">{{ loan.state.isPaidOff ? 'Completed:' : 'Est. End:' }}</span>
              <span class="ml-2">{{ estimatedEndDate }}</span>
            </div>
          </div>

          <!-- Active Time Display -->
          <div v-if="loan.state.isActive && !loan.state.isPaidOff" class="text-center my-4">
            <div class="text-info small">Contract Active For</div>
            <div class="h4 mb-0">{{ activeTime }}</div>
          </div>
        </div>
      </div>

      <!-- Progress Section -->
      <div class="card mb-4">
        <div class="card-header">
          <h5 class="mb-0">Payment Progress</h5>
        </div>
        <div class="card-body">
          <div class="d-flex justify-content-between mb-2">
            <span class="text-muted">Principal Paid Off</span>
            <span class="text-muted">Remaining Balance</span>
          </div>
          <div class="d-flex justify-content-between mb-3">
            <span class="h5 mb-0 text-success">
              {{ progressPercent.toFixed(2) }}%
            </span>
            <span class="h5 mb-0 text-warning">
              {{ formatADA(loan.state.balance) }} ADA
            </span>
          </div>

          <!-- Progress Bar -->
          <div class="progress mb-4" style="height: 1rem;">
            <div
              class="progress-bar bg-success"
              role="progressbar"
              :style="{ width: `${progressPercent}%` }"
              :aria-valuenow="progressPercent"
              aria-valuemin="0"
              aria-valuemax="100"
            ></div>
          </div>

          <div class="row small">
            <div class="col-6">
              <span class="text-muted">Principal Paid:</span>
              <span class="text-success ml-2">{{ formatADA(principalPaid) }} ADA</span>
            </div>
            <div class="col-6 text-right" v-if="loan.state.isActive && isLate">
              <span class="text-muted">Late Fees Accrued:</span>
              <span class="text-danger ml-2">+{{ formatADA(lateFeeAccrued) }} ADA</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Payment Cards -->
      <div class="row mb-4">
        <!-- Last Payment -->
        <div class="col-md-6 mb-3 mb-md-0">
          <div class="card h-100">
            <div class="card-header">
              <h5 class="mb-0">Last Payment</h5>
            </div>
            <div class="card-body">
              <template v-if="loan.state.lastPayment">
                <div class="mb-2 d-flex justify-content-between">
                  <span class="text-muted">Amount</span>
                  <span>{{ formatADA(loan.state.lastPayment.amount) }} ADA</span>
                </div>
                <div class="mb-2 d-flex justify-content-between">
                  <span class="text-muted">Date</span>
                  <span>{{ formatDate(loan.state.lastPayment.timestamp) }}</span>
                </div>
                <div class="d-flex justify-content-between">
                  <span class="text-muted">Installment</span>
                  <span>#{{ loan.state.lastPayment.installmentNumber }}</span>
                </div>
              </template>
              <div v-else class="text-center text-muted py-4">
                No payments made yet
              </div>
            </div>
          </div>
        </div>

        <!-- Next Payment -->
        <div v-if="!loan.state.isPaidOff" class="col-md-6">
          <div class="card h-100" :class="{ 'border-danger': isLate }">
            <div class="card-header" :class="{ 'bg-danger text-white': isLate }">
              <h5 class="mb-0">Next Payment Window</h5>
            </div>
            <div class="card-body">
              <div class="mb-3">
                <div class="d-flex justify-content-between mb-2">
                  <span class="text-muted">{{ isDue ? 'Payment Due' : 'Not Due Until' }}</span>
                  <span :class="{ 'text-success': isDue }">{{ nextPaymentDate }}</span>
                </div>
                <div class="d-flex justify-content-between">
                  <span class="text-muted">Late if After</span>
                  <span class="text-danger">{{ latePaymentDate }}</span>
                </div>
              </div>

              <div class="text-center py-3 rounded" :class="paymentStatusClass">
                <template v-if="!isDue">
                  <div class="text-info small">Next Payment Due In</div>
                  <div class="h5 mb-0">{{ timeToPayment }}</div>
                </template>
                <template v-else-if="!isLate">
                  <div class="text-success small">Payment Window Open</div>
                  <div class="small">Late in: <strong>{{ timeToLate }}</strong></div>
                </template>
                <template v-else>
                  <div class="text-danger small font-weight-bold">Payment Overdue!</div>
                  <div class="small">Late by: <strong>{{ timeOverdue }}</strong></div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Contract Actions -->
      <div v-if="canTakeActions" class="card mb-4">
        <div class="card-header">
          <h5 class="mb-0">Contract Actions</h5>
        </div>
        <div class="card-body">
          <div class="row">
            <!-- Cancel (Seller, before acceptance) -->
            <div v-if="isSeller && !loan.state.isActive" class="col-md-6 col-lg-4 mb-3">
              <ActionCard
                title="Cancel Contract"
                description="Terminate the contract and reclaim your asset"
                buttonText="Cancel"
                variant="danger"
                @action="handleCancel"
              />
            </div>

            <!-- Accept (Buyer, before acceptance) -->
            <div v-if="isBuyer && !loan.state.isActive" class="col-md-6 col-lg-4 mb-3">
              <ActionCard
                title="Accept Contract"
                description="Accept the terms and begin the loan"
                buttonText="Accept"
                variant="primary"
                @action="handleAccept"
              />
            </div>

            <!-- Make Payment (Buyer, active) -->
            <div v-if="isBuyer && loan.state.isActive && !loan.state.isPaidOff" class="col-md-6 col-lg-4 mb-3">
              <ActionCard
                title="Make Payment"
                description="Submit your next scheduled payment"
                buttonText="Pay Now"
                variant="primary"
                @action="handlePayment"
              >
                <template #extra>
                  <div class="small mt-2">
                    <span class="text-muted">Due:</span>
                    <span class="text-white ml-2">{{ formatADA(nextPaymentAmount) }} ADA</span>
                  </div>
                </template>
              </ActionCard>
            </div>

            <!-- Collect Payment (Seller, active) -->
            <div v-if="isSeller && loan.state.isActive && !loan.state.isPaidOff" class="col-md-6 col-lg-4 mb-3">
              <ActionCard
                title="Collect Payment"
                description="Withdraw available payments from contract"
                buttonText="Collect"
                variant="secondary"
                @action="handleCollect"
              />
            </div>

            <!-- Mark Default (Seller, late) -->
            <div v-if="isSeller && isLate && !loan.state.isDefaulted" class="col-md-6 col-lg-4 mb-3">
              <ActionCard
                title="Mark Default"
                description="Declare the loan in default and claim collateral"
                buttonText="Default"
                variant="danger"
                @action="handleDefault"
              />
            </div>

            <!-- Complete (Either, paid off) -->
            <div v-if="loan.state.isPaidOff && !loan.state.isActive" class="col-md-6 col-lg-4 mb-3">
              <ActionCard
                title="Complete Transfer"
                description="Finalize the transfer and release asset"
                buttonText="Complete"
                variant="success"
                @action="handleComplete"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Contract Details -->
      <div class="card">
        <div class="card-header">
          <h5 class="mb-0">Contract Details</h5>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6 mb-3 mb-md-0">
              <div class="d-flex justify-content-between mb-2">
                <span class="text-muted">Contract Address</span>
                <a :href="explorerLink" target="_blank" class="text-info small" style="font-family: monospace;">
                  {{ loan.address.slice(0, 20) }}...
                </a>
              </div>
              <div class="d-flex justify-content-between mb-2">
                <span class="text-muted">Policy ID</span>
                <span class="small" style="font-family: monospace;">{{ loan.policyId.slice(0, 20) }}...</span>
              </div>
              <div class="d-flex justify-content-between mb-2">
                <span class="text-muted">Seller</span>
                <span class="small" style="font-family: monospace;">{{ loan.seller.slice(0, 16) }}...</span>
              </div>
              <div class="d-flex justify-content-between">
                <span class="text-muted">Buyer</span>
                <span v-if="loan.buyer" class="small" style="font-family: monospace;">{{ loan.buyer.slice(0, 16) }}...</span>
                <span v-else class="text-warning">Open Market</span>
              </div>
            </div>
            <div class="col-md-6">
              <div class="d-flex justify-content-between mb-2">
                <span class="text-muted">Principal</span>
                <span>{{ formatADA(loan.terms.principal) }} ADA</span>
              </div>
              <div class="d-flex justify-content-between mb-2">
                <span class="text-muted">Interest Rate</span>
                <span>{{ (loan.terms.apr / 100).toFixed(2) }}% APR</span>
              </div>
              <div class="d-flex justify-content-between mb-2">
                <span class="text-muted">Installments</span>
                <span>{{ loan.terms.installments }} payments</span>
              </div>
              <div class="d-flex justify-content-between">
                <span class="text-muted">Late Fee</span>
                <span>{{ formatADA(loan.terms.lateFee) }} ADA</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- No Data -->
    <div v-else class="card">
      <div class="card-body text-center py-5">
        <p class="text-muted mb-0">Contract not found or failed to load.</p>
        <router-link to="/loan" class="btn btn-primary mt-3">Back to Loans</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'
import { formatDuration, formatTimeSince, formatTimeUntil } from '@/composables/useLoanCalculations'
import type { LoanContract } from '@/types'

// Components
import LoanStatusBadge from '@/components/loan/LoanStatusBadge.vue'
import ActionCard from '@/components/loan/ActionCard.vue'

const route = useRoute()
const wallet = useWalletStore()

// State
const loan = ref<LoanContract | null>(null)
const isLoading = ref(true)
const now = ref(Date.now())

// Update time every second
let timeInterval: number
onMounted(() => {
  loadLoan()
  timeInterval = window.setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  clearInterval(timeInterval)
})

// Load loan data
async function loadLoan() {
  isLoading.value = true
  try {
    // TODO: Fetch from blockchain using SDK
    // const loanId = route.params.id as string
    // loan.value = await sdk.loan.getLoan(loanId)

    // Mock data for now
    loan.value = null
  } catch (error) {
    console.error('Failed to load loan:', error)
  } finally {
    isLoading.value = false
  }
}

// Computed properties
const isSeller = computed(() => loan.value?.seller === wallet.address)
const isBuyer = computed(() => loan.value?.buyer === wallet.address || !loan.value?.buyer)
const canTakeActions = computed(() => wallet.isConnected && (isSeller.value || isBuyer.value))

const progressPercent = computed(() => {
  if (!loan.value) return 0
  const principal = Number(loan.value.terms.principal)
  const balance = Number(loan.value.state.balance)
  return ((principal - balance) / principal) * 100
})

const principalPaid = computed(() => {
  if (!loan.value) return 0n
  return loan.value.terms.principal - loan.value.state.balance
})

// Time calculations (simplified - would use actual blockchain time)
const isDue = computed(() => true) // Placeholder
const isLate = computed(() => false) // Placeholder
const lateFeeAccrued = computed(() => 0n) // Placeholder
const nextPaymentAmount = computed(() => loan.value?.terms.principal || 0n)
const nextPaymentDate = computed(() => '--')
const latePaymentDate = computed(() => '--')
const estimatedEndDate = computed(() => '--')
const activeTime = computed(() => '--')
const timeToPayment = computed(() => '--')
const timeToLate = computed(() => '--')
const timeOverdue = computed(() => '--')

const paymentStatusClass = computed(() => {
  if (!isDue.value) return 'bg-secondary'
  if (!isLate.value) return 'bg-success text-white'
  return 'bg-danger text-white'
})

const explorerLink = computed(() => {
  if (!loan.value) return '#'
  const prefix = wallet.networkId === 0 ? 'preview.' : ''
  return `https://${prefix}cardanoscan.io/address/${loan.value.address}`
})

// Helpers
function formatADA(lovelace: bigint): string {
  return (Number(lovelace) / 1_000_000).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString()
}

// Action handlers
async function handleCancel() {
  // TODO: Implement
  alert('Cancel action')
}

async function handleAccept() {
  // TODO: Implement
  alert('Accept action')
}

async function handlePayment() {
  // TODO: Implement
  alert('Payment action')
}

async function handleCollect() {
  // TODO: Implement
  alert('Collect action')
}

async function handleDefault() {
  // TODO: Implement
  alert('Default action')
}

async function handleComplete() {
  // TODO: Implement
  alert('Complete action')
}
</script>
