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

      <!-- Contract Actions (Test Mode) -->
      <div v-if="props.isTestMode" class="card mb-4">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h5 class="mb-0">Contract Actions</h5>
          <div class="d-flex align-items-center">
            <span class="text-muted small mr-2">Sign as:</span>
            <select v-model="selectedSignerWallet" class="form-control form-control-sm wallet-selector">
              <option value="">Select Wallet...</option>
              <optgroup label="Originators">
                <option v-for="w in availableWallets.filter(w => w.role === 'Originator')" :key="w.id" :value="w.address">
                  {{ w.name }}
                </option>
              </optgroup>
              <optgroup label="Borrowers">
                <option v-for="w in availableWallets.filter(w => w.role === 'Borrower')" :key="w.id" :value="w.address">
                  {{ w.name }}
                </option>
              </optgroup>
              <optgroup label="Other">
                <option v-for="w in availableWallets.filter(w => !['Originator', 'Borrower'].includes(w.role))" :key="w.id" :value="w.address">
                  {{ w.name }} ({{ w.role }})
                </option>
              </optgroup>
            </select>
          </div>
        </div>
        <div class="card-body">
          <!-- Action Grid -->
          <div class="row">
            <!-- Cancel (Collateral Token holder only, before acceptance) -->
            <div class="col-md-6 col-lg-4 mb-3">
              <div class="action-card" :class="{ 'state-disabled': !stateAllowsCancel }">
                <div class="action-header">
                  <span class="action-title">Cancel</span>
                  <span class="badge badge-collateral">Collateral Holder</span>
                </div>
                <p class="action-desc">Terminate contract and reclaim asset</p>
                <div class="action-prereq">
                  <i :class="!loan.state.isActive ? 'fas fa-check text-success' : 'fas fa-times text-danger'"></i>
                  <span>Loan not yet accepted</span>
                </div>
                <div class="signer-status" :class="{ 'can-sign': signerCanCancel, 'cannot-sign': selectedSignerWallet && !signerCanCancel }">
                  <i :class="signerCanCancel ? 'fas fa-key text-success' : 'fas fa-lock text-muted'"></i>
                  <span v-if="!selectedSignerWallet">Select a wallet</span>
                  <span v-else-if="signerCanCancel">{{ selectedWalletInfo?.name }} can sign</span>
                  <span v-else>{{ selectedWalletInfo?.name }} cannot sign</span>
                </div>
                <button
                  class="btn btn-outline-danger btn-sm btn-block mt-2"
                  :disabled="!canCancel || isExecuting"
                  @click="executeAction('cancel')"
                >
                  <span v-if="isExecuting && executingAction === 'cancel'" class="spinner-border spinner-border-sm mr-1"></span>
                  Cancel Contract
                </button>
              </div>
            </div>

            <!-- Accept (Anyone for open market, or reserved buyer) -->
            <div class="col-md-6 col-lg-4 mb-3">
              <div class="action-card" :class="{ 'state-disabled': !stateAllowsAccept }">
                <div class="action-header">
                  <span class="action-title">Accept</span>
                  <span v-if="loan.borrower" class="badge badge-reserved">Reserved</span>
                  <span v-else class="badge badge-open">Open Market</span>
                </div>
                <p class="action-desc">Accept terms & make first payment</p>
                <div class="action-prereq">
                  <i :class="!loan.state.isActive ? 'fas fa-check text-success' : 'fas fa-times text-danger'"></i>
                  <span>Loan awaiting acceptance</span>
                </div>
                <div class="action-prereq" v-if="loan.borrower">
                  <i class="fas fa-user-tag text-info"></i>
                  <span>Reserved for: {{ loan.borrower }}</span>
                </div>
                <div class="signer-status" :class="{ 'can-sign': signerCanAccept, 'cannot-sign': selectedSignerWallet && !signerCanAccept }">
                  <i :class="signerCanAccept ? 'fas fa-key text-success' : 'fas fa-lock text-muted'"></i>
                  <span v-if="!selectedSignerWallet">Select a wallet</span>
                  <span v-else-if="signerCanAccept">{{ selectedWalletInfo?.name }} can sign</span>
                  <span v-else>{{ selectedWalletInfo?.name }} cannot sign</span>
                </div>
                <button
                  class="btn btn-primary btn-sm btn-block mt-2"
                  :disabled="!canAccept || isExecuting"
                  @click="executeAction('accept')"
                >
                  <span v-if="isExecuting && executingAction === 'accept'" class="spinner-border spinner-border-sm mr-1"></span>
                  Accept & Pay {{ formatADA(firstPaymentAmount) }} ADA
                </button>
              </div>
            </div>

            <!-- Make Payment (Liability Token holder, active) -->
            <div class="col-md-6 col-lg-4 mb-3">
              <div class="action-card" :class="{ 'state-disabled': !stateAllowsPay }">
                <div class="action-header">
                  <span class="action-title">Pay</span>
                  <span class="badge badge-liability">Liability Holder</span>
                </div>
                <p class="action-desc">Make scheduled payment</p>
                <div class="action-prereq">
                  <i :class="loan.state.isActive ? 'fas fa-check text-success' : 'fas fa-times text-danger'"></i>
                  <span>Loan is active</span>
                </div>
                <div class="action-prereq">
                  <i :class="!loan.state.isPaidOff ? 'fas fa-check text-success' : 'fas fa-times text-danger'"></i>
                  <span>Balance remaining</span>
                </div>
                <div class="signer-status" :class="{ 'can-sign': signerCanPay, 'cannot-sign': selectedSignerWallet && !signerCanPay }">
                  <i :class="signerCanPay ? 'fas fa-key text-success' : 'fas fa-lock text-muted'"></i>
                  <span v-if="!selectedSignerWallet">Select a wallet</span>
                  <span v-else-if="!loan.buyer">No buyer assigned yet</span>
                  <span v-else-if="signerCanPay">{{ selectedWalletInfo?.name }} can sign</span>
                  <span v-else>{{ selectedWalletInfo?.name }} cannot sign</span>
                </div>
                <button
                  class="btn btn-success btn-sm btn-block mt-2"
                  :disabled="!canPay || isExecuting"
                  @click="executeAction('pay')"
                >
                  <span v-if="isExecuting && executingAction === 'pay'" class="spinner-border spinner-border-sm mr-1"></span>
                  Pay {{ formatADA(nextPaymentAmount) }} ADA
                </button>
              </div>
            </div>

            <!-- Collect (Collateral Token holder, active) -->
            <div class="col-md-6 col-lg-4 mb-3">
              <div class="action-card" :class="{ 'state-disabled': !stateAllowsCollect }">
                <div class="action-header">
                  <span class="action-title">Collect</span>
                  <span class="badge badge-collateral">Collateral Holder</span>
                </div>
                <p class="action-desc">Withdraw available payments</p>
                <div class="action-prereq">
                  <i :class="loan.state.isActive ? 'fas fa-check text-success' : 'fas fa-times text-danger'"></i>
                  <span>Loan is active</span>
                </div>
                <div class="signer-status" :class="{ 'can-sign': signerCanCollect, 'cannot-sign': selectedSignerWallet && !signerCanCollect }">
                  <i :class="signerCanCollect ? 'fas fa-key text-success' : 'fas fa-lock text-muted'"></i>
                  <span v-if="!selectedSignerWallet">Select a wallet</span>
                  <span v-else-if="signerCanCollect">{{ selectedWalletInfo?.name }} can sign</span>
                  <span v-else>{{ selectedWalletInfo?.name }} cannot sign</span>
                </div>
                <button
                  class="btn btn-outline-secondary btn-sm btn-block mt-2"
                  :disabled="!canCollect || isExecuting"
                  @click="executeAction('collect')"
                >
                  <span v-if="isExecuting && executingAction === 'collect'" class="spinner-border spinner-border-sm mr-1"></span>
                  Collect Payments
                </button>
              </div>
            </div>

            <!-- Default (Collateral Token holder, late) -->
            <div class="col-md-6 col-lg-4 mb-3">
              <div class="action-card" :class="{ 'state-disabled': !stateAllowsDefault }">
                <div class="action-header">
                  <span class="action-title">Default</span>
                  <span class="badge badge-collateral">Collateral Holder</span>
                </div>
                <p class="action-desc">Declare default & claim collateral</p>
                <div class="action-prereq">
                  <i :class="loan.state.isActive ? 'fas fa-check text-success' : 'fas fa-times text-danger'"></i>
                  <span>Loan is active</span>
                </div>
                <div class="action-prereq">
                  <i :class="isLate ? 'fas fa-check text-success' : 'fas fa-times text-danger'"></i>
                  <span>Payment is late</span>
                </div>
                <div class="action-prereq">
                  <i :class="!loan.state.isDefaulted ? 'fas fa-check text-success' : 'fas fa-times text-danger'"></i>
                  <span>Not already defaulted</span>
                </div>
                <div class="signer-status" :class="{ 'can-sign': signerCanDefault, 'cannot-sign': selectedSignerWallet && !signerCanDefault }">
                  <i :class="signerCanDefault ? 'fas fa-key text-success' : 'fas fa-lock text-muted'"></i>
                  <span v-if="!selectedSignerWallet">Select a wallet</span>
                  <span v-else-if="signerCanDefault">{{ selectedWalletInfo?.name }} can sign</span>
                  <span v-else>{{ selectedWalletInfo?.name }} cannot sign</span>
                </div>
                <button
                  class="btn btn-danger btn-sm btn-block mt-2"
                  :disabled="!canDefault || isExecuting"
                  @click="executeAction('default')"
                >
                  <span v-if="isExecuting && executingAction === 'default'" class="spinner-border spinner-border-sm mr-1"></span>
                  Mark Default
                </button>
              </div>
            </div>

            <!-- Claim (Collateral Token holder, defaulted) -->
            <div class="col-md-6 col-lg-4 mb-3">
              <div class="action-card" :class="{ 'state-disabled': !stateAllowsClaim }">
                <div class="action-header">
                  <span class="action-title">Claim</span>
                  <span class="badge badge-collateral">Collateral Holder</span>
                </div>
                <p class="action-desc">Claim collateral after default</p>
                <div class="action-prereq">
                  <i :class="loan.state.isDefaulted ? 'fas fa-check text-success' : 'fas fa-times text-danger'"></i>
                  <span>Loan is in default</span>
                </div>
                <div class="signer-status" :class="{ 'can-sign': signerCanClaim, 'cannot-sign': selectedSignerWallet && !signerCanClaim }">
                  <i :class="signerCanClaim ? 'fas fa-key text-success' : 'fas fa-lock text-muted'"></i>
                  <span v-if="!selectedSignerWallet">Select a wallet</span>
                  <span v-else-if="signerCanClaim">{{ selectedWalletInfo?.name }} can sign</span>
                  <span v-else>{{ selectedWalletInfo?.name }} cannot sign</span>
                </div>
                <button
                  class="btn btn-warning btn-sm btn-block mt-2"
                  :disabled="!canClaim || isExecuting"
                  @click="executeAction('claim')"
                >
                  <span v-if="isExecuting && executingAction === 'claim'" class="spinner-border spinner-border-sm mr-1"></span>
                  Claim Collateral
                </button>
              </div>
            </div>

            <!-- Complete (Liability Token holder, paid off) -->
            <div class="col-md-6 col-lg-4 mb-3">
              <div class="action-card" :class="{ 'state-disabled': !stateAllowsComplete }">
                <div class="action-header">
                  <span class="action-title">Complete</span>
                  <span class="badge badge-liability">Liability Holder</span>
                </div>
                <p class="action-desc">Finalize transfer & release asset</p>
                <div class="action-prereq">
                  <i :class="loan.state.isPaidOff ? 'fas fa-check text-success' : 'fas fa-times text-danger'"></i>
                  <span>Loan is fully paid</span>
                </div>
                <div class="signer-status" :class="{ 'can-sign': signerCanComplete, 'cannot-sign': selectedSignerWallet && !signerCanComplete }">
                  <i :class="signerCanComplete ? 'fas fa-key text-success' : 'fas fa-lock text-muted'"></i>
                  <span v-if="!selectedSignerWallet">Select a wallet</span>
                  <span v-else-if="signerCanComplete">{{ selectedWalletInfo?.name }} can sign</span>
                  <span v-else>{{ selectedWalletInfo?.name }} cannot sign</span>
                </div>
                <button
                  class="btn btn-success btn-sm btn-block mt-2"
                  :disabled="!canComplete || isExecuting"
                  @click="executeAction('complete')"
                >
                  <span v-if="isExecuting && executingAction === 'complete'" class="spinner-border spinner-border-sm mr-1"></span>
                  Complete Transfer
                </button>
              </div>
            </div>
          </div>

          <!-- Execution Log -->
          <div v-if="executionLog.length > 0" class="mt-4">
            <h6 class="text-muted">Execution Log</h6>
            <div class="execution-log">
              <div v-for="(entry, i) in executionLog" :key="i" class="log-entry" :class="entry.type">
                <span class="log-time">{{ entry.time }}</span>
                <span class="log-text">{{ entry.text }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Contract Actions (Production Mode - original) -->
      <div v-else-if="canTakeActions" class="card mb-4">
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
import { getContract, getTestContract, getWallets, type WalletFromDB } from '@/services/api'
import type { LoanContract } from '@/types'

// Components
import LoanStatusBadge from '@/components/loan/LoanStatusBadge.vue'
import ActionCard from '@/components/loan/ActionCard.vue'

// Props
const props = defineProps<{
  isTestMode?: boolean
}>()

const route = useRoute()
const wallet = useWalletStore()

// State
const loan = ref<LoanContract | null>(null)
const isLoading = ref(true)
const now = ref(Date.now())

// Test mode state
const availableWallets = ref<WalletFromDB[]>([])
const selectedSignerWallet = ref('')
const isExecuting = ref(false)
const executingAction = ref<string | null>(null)
const executionLog = ref<{ time: string; text: string; type: 'info' | 'success' | 'error' }[]>([])

// Load available wallets for test mode
async function loadAvailableWallets() {
  if (props.isTestMode) {
    try {
      availableWallets.value = await getWallets()
    } catch (err) {
      console.warn('Could not load wallets:', err)
    }
  }
}

// Get selected wallet info
const selectedWalletInfo = computed(() => {
  return availableWallets.value.find(w => w.address === selectedSignerWallet.value)
})

// Check if selected wallet is the buyer
const isSelectedWalletBuyer = computed(() => {
  if (!loan.value || !selectedWalletInfo.value) return false
  // For reserved loans, check if selected wallet matches reserved buyer
  if (loan.value.buyer) {
    return selectedWalletInfo.value.name === loan.value.buyer
  }
  // For open market, any borrower can accept
  return selectedWalletInfo.value.role === 'Borrower'
})

// Check if selected wallet is the seller/originator
const isSelectedWalletSeller = computed(() => {
  if (!loan.value || !selectedWalletInfo.value) return false
  return selectedWalletInfo.value.name === loan.value.seller ||
         selectedWalletInfo.value.role === 'Originator'
})

// Calculate first payment amount (for accept action)
const firstPaymentAmount = computed(() => {
  if (!loan.value) return 0n
  const installments = loan.value.terms.installments || 12
  const monthlyPrincipal = loan.value.terms.principal / BigInt(installments)
  const monthlyInterest = (loan.value.terms.principal * BigInt(loan.value.terms.apr)) / 100n / 12n
  return monthlyPrincipal + monthlyInterest
})

// ============================================
// Contract State Conditions (greyed out cards)
// These determine if the action is possible based on contract state
// ============================================
const stateAllowsCancel = computed(() => {
  if (!loan.value) return false
  return !loan.value.state.isActive // Can only cancel before acceptance
})

const stateAllowsAccept = computed(() => {
  if (!loan.value) return false
  return !loan.value.state.isActive // Can only accept if not yet active
})

const stateAllowsPay = computed(() => {
  if (!loan.value) return false
  return loan.value.state.isActive && !loan.value.state.isPaidOff
})

const stateAllowsCollect = computed(() => {
  if (!loan.value) return false
  return loan.value.state.isActive // Can collect while loan is active
})

const stateAllowsDefault = computed(() => {
  if (!loan.value) return false
  return loan.value.state.isActive && isLate.value && !loan.value.state.isDefaulted
})

const stateAllowsClaim = computed(() => {
  if (!loan.value) return false
  return loan.value.state.isDefaulted // Can only claim after default
})

const stateAllowsComplete = computed(() => {
  if (!loan.value) return false
  return loan.value.state.isPaidOff // Can only complete when paid off
})

// ============================================
// Signer Permissions (who can execute)
// These determine if the selected wallet can execute the action
// ============================================

// Check if selected wallet is the Collateral Token holder (Originator/Seller)
const isCollateralHolder = computed(() => {
  if (!loan.value || !selectedWalletInfo.value) return false
  // The originator/seller holds the collateral token
  return selectedWalletInfo.value.name === loan.value.seller
})

// Check if selected wallet is the Liability Token holder (Buyer/Borrower)
const isLiabilityHolder = computed(() => {
  if (!loan.value || !selectedWalletInfo.value) return false
  // The buyer holds the liability token (once accepted)
  return selectedWalletInfo.value.name === loan.value.buyer
})

// Signer can Cancel: Only Collateral Token holder
const signerCanCancel = computed(() => isCollateralHolder.value)

// Signer can Accept: Anyone if open market, or reserved buyer only
const signerCanAccept = computed(() => {
  if (!loan.value || !selectedWalletInfo.value) return false
  if (loan.value.buyer) {
    // Reserved loan - only the reserved buyer can accept
    return selectedWalletInfo.value.name === loan.value.buyer
  }
  // Open market - any borrower can accept
  return selectedWalletInfo.value.role === 'Borrower'
})

// Signer can Pay: Only Liability Token holder (buyer)
const signerCanPay = computed(() => isLiabilityHolder.value)

// Signer can Collect: Only Collateral Token holder
const signerCanCollect = computed(() => isCollateralHolder.value)

// Signer can Default: Only Collateral Token holder
const signerCanDefault = computed(() => isCollateralHolder.value)

// Signer can Claim: Only Collateral Token holder
const signerCanClaim = computed(() => isCollateralHolder.value)

// Signer can Complete: Only Liability Token holder (buyer gets the asset)
const signerCanComplete = computed(() => isLiabilityHolder.value)

// ============================================
// Combined Permissions (state + signer)
// Button is disabled if either condition fails
// ============================================
const canCancel = computed(() => stateAllowsCancel.value && signerCanCancel.value)
const canAccept = computed(() => stateAllowsAccept.value && signerCanAccept.value)
const canPay = computed(() => stateAllowsPay.value && signerCanPay.value)
const canCollect = computed(() => stateAllowsCollect.value && signerCanCollect.value)
const canDefault = computed(() => stateAllowsDefault.value && signerCanDefault.value)
const canClaim = computed(() => stateAllowsClaim.value && signerCanClaim.value)
const canComplete = computed(() => stateAllowsComplete.value && signerCanComplete.value)

// Log helper
function logAction(text: string, type: 'info' | 'success' | 'error' = 'info') {
  const time = new Date().toLocaleTimeString('en-US', { hour12: false })
  executionLog.value.push({ time, text, type })
}

// Execute action
async function executeAction(action: string) {
  if (!loan.value || !selectedSignerWallet.value) return

  isExecuting.value = true
  executingAction.value = action

  const signerName = selectedWalletInfo.value?.name || 'Unknown'
  logAction(`Executing ${action.toUpperCase()} as ${signerName}...`, 'info')

  try {
    // Simulate action execution
    await new Promise(resolve => setTimeout(resolve, 1000))

    switch (action) {
      case 'cancel':
        logAction('Contract cancelled. Asset returned to originator.', 'success')
        // Update local state
        loan.value.state.isActive = false
        break

      case 'accept':
        logAction(`First payment of ${formatADA(firstPaymentAmount.value)} ADA submitted`, 'info')
        loan.value.state.isActive = true
        loan.value.state.startTime = Date.now()
        loan.value.state.balance = loan.value.terms.principal - firstPaymentAmount.value
        loan.value.buyer = signerName
        logAction('Loan accepted and activated!', 'success')
        break

      case 'pay':
        const paymentAmt = nextPaymentAmount.value
        loan.value.state.balance = loan.value.state.balance - paymentAmt
        if (loan.value.state.balance <= 0n) {
          loan.value.state.isPaidOff = true
          logAction('Final payment made. Loan fully paid off!', 'success')
        } else {
          logAction(`Payment of ${formatADA(paymentAmt)} ADA processed. Remaining: ${formatADA(loan.value.state.balance)} ADA`, 'success')
        }
        break

      case 'collect':
        logAction('Available payments collected to originator wallet', 'success')
        break

      case 'default':
        loan.value.state.isDefaulted = true
        logAction('Loan marked as defaulted. Collateral can now be claimed.', 'success')
        break

      case 'claim':
        logAction('Collateral claimed by originator', 'success')
        loan.value.state.isActive = false
        break

      case 'complete':
        loan.value.state.isActive = false
        logAction('Transfer completed. Asset released to buyer.', 'success')
        break
    }
  } catch (err) {
    logAction(`Error: ${(err as Error).message}`, 'error')
  } finally {
    isExecuting.value = false
    executingAction.value = null
  }
}

// Update time every second
let timeInterval: number
onMounted(() => {
  loadLoan()
  loadAvailableWallets()
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
    const loanId = route.params.id as string

    // First, check if contract data was passed via route state (from test suite)
    const routeState = window.history.state
    if (routeState?.contract) {
      loan.value = convertTestContract(routeState.contract, loanId)
      return
    }

    if (props.isTestMode) {
      // In test mode, fetch from process_smart_contract table
      const contract = await getTestContract(loanId)

      if (contract) {
        // Convert process_smart_contract format to frontend LoanContract type
        loan.value = convertProcessContract(contract, loanId)
      } else {
        // No contract found in database
        loan.value = null
      }
    } else {
      // In production mode, fetch from blockchain using SDK
      // TODO: Implement blockchain fetch
      // loan.value = await sdk.loan.getLoan(loanId)
      loan.value = null
    }
  } catch (error) {
    console.error('Failed to load loan:', error)
    loan.value = null
  } finally {
    isLoading.value = false
  }
}

// Convert test contract format (from test suite) to frontend LoanContract type
function convertTestContract(testContract: any, id: string): LoanContract {
  const principal = BigInt(testContract.principal || 0)
  const balance = testContract.state?.balance
    ? BigInt(testContract.state.balance)
    : principal

  return {
    id,
    address: testContract.contractAddress || `test_addr_${id}`,
    policyId: testContract.policyId || `test_policy_${id}`,
    alias: testContract.alias || `Loan ${id}`,
    seller: testContract.originator || 'Unknown Seller',
    buyer: testContract.borrower || null,
    baseAsset: {
      policyId: testContract.collateral?.policyId || '',
      assetName: testContract.collateral?.assetName || '',
      quantity: BigInt(testContract.collateral?.quantity || 1),
    },
    terms: {
      principal,
      apr: testContract.apr || 500, // Default 5%
      frequency: testContract.frequency || 12, // Monthly
      installments: testContract.installments || 12,
      lateFee: BigInt((testContract.lateFee || 0) * 1_000_000),
      transferFee: 0n,
    },
    state: {
      balance,
      lastPayment: testContract.state?.lastPayment ? {
        amount: BigInt(testContract.state.lastPayment.amount || 0),
        timestamp: testContract.state.lastPayment.timestamp || Date.now(),
        installmentNumber: testContract.state.lastPayment.installmentNumber || 1,
      } : null,
      startTime: testContract.state?.startTime || null,
      isActive: testContract.state?.isActive ?? !!testContract.borrower,
      isDefaulted: testContract.state?.isDefaulted ?? false,
      isPaidOff: testContract.state?.isPaidOff ?? false,
    },
    createdAt: new Date(),
  }
}

// Convert process_smart_contract record to frontend LoanContract type
function convertProcessContract(contract: any, id: string): LoanContract {
  const data = contract.contractData || {}
  const datum = contract.contractDatum || {}

  const principal = BigInt((data.principal || 0))
  const balance = datum.balance ? BigInt(datum.balance) : principal

  return {
    id,
    address: contract.contractAddress || `test_addr_${id}`,
    policyId: contract.policyId || `test_policy_${id}`,
    alias: contract.alias || `Loan ${id}`,
    seller: data.originator || 'Unknown Seller',
    buyer: data.borrower || null,
    baseAsset: {
      policyId: data.collateral?.policyId || '',
      assetName: data.collateral?.assetName || '',
      quantity: BigInt(data.collateral?.quantity || 1),
    },
    terms: {
      principal,
      apr: data.apr || 500,
      frequency: data.frequency || 12,
      installments: data.installments || 12,
      lateFee: BigInt((data.lateFee || 0) * 1_000_000),
      transferFee: 0n,
    },
    state: {
      balance,
      lastPayment: datum.lastPayment ? {
        amount: BigInt(datum.lastPayment.amount || 0),
        timestamp: datum.lastPayment.timestamp || Date.now(),
        installmentNumber: datum.lastPayment.installmentNumber || 1,
      } : null,
      startTime: datum.startTime || null,
      isActive: datum.isActive ?? !!data.borrower,
      isDefaulted: datum.isDefaulted ?? false,
      isPaidOff: datum.isPaidOff ?? false,
    },
    createdAt: new Date(contract.instantiated || Date.now()),
  }
}

// Convert backend contract format to frontend LoanContract type
function convertBackendContract(contract: any, id: string): LoanContract {
  const state = contract.state || {}
  const terms = state.terms || {}
  const fees = terms.fees || {}

  // Parse balance, handling both BigInt strings and numbers
  const balance = typeof state.balance === 'string'
    ? BigInt(state.balance)
    : BigInt(state.balance || terms.principal || 0)

  const principal = typeof terms.principal === 'string'
    ? BigInt(terms.principal)
    : BigInt(terms.principal || 0)

  return {
    id,
    address: contract.address || id,
    policyId: contract.policyId || contract.script?.hash || '',
    alias: contract.metadata?.name || `Loan ${id}`,
    seller: state.originator || 'Unknown', // The seller who originated the loan
    buyer: state.buyer || null, // The buyer (null = open to market)
    baseAsset: {
      policyId: state.base_asset?.policy || '',
      assetName: state.base_asset?.asset_name || '',
      quantity: BigInt(state.base_asset?.quantity || 1),
    },
    terms: {
      principal,
      apr: Number(terms.apr || 0),
      frequency: Number(terms.frequency || 12),
      installments: Number(terms.installments || 12),
      lateFee: BigInt(fees.late_fee || 0),
      transferFee: BigInt(fees.transfer_fee_seller || 0) + BigInt(fees.transfer_fee_buyer || 0),
    },
    state: {
      balance,
      lastPayment: state.last_payment ? {
        amount: BigInt(state.last_payment.amount || 0),
        timestamp: Number(state.last_payment.time || Date.now()),
        installmentNumber: state.last_payment.installmentNumber || 1,
      } : null,
      startTime: terms.time ? Number(terms.time) : null,
      isActive: !!state.buyer && balance > 0n,
      isDefaulted: false, // TODO: Calculate based on payment schedule
      isPaidOff: balance <= 0n,
    },
    createdAt: new Date(),
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
const nextPaymentAmount = computed(() => {
  if (!loan.value) return 0n
  const installments = loan.value.terms.installments || 12
  const monthlyPrincipal = loan.value.terms.principal / BigInt(installments)
  const monthlyInterest = (loan.value.terms.principal * BigInt(loan.value.terms.apr)) / 100n / 12n
  return monthlyPrincipal + monthlyInterest
})
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

<style scoped>
/* Wallet Selector */
.wallet-selector {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #e2e8f0;
  min-width: 200px;
}

.wallet-selector:focus {
  background: rgba(255, 255, 255, 0.15);
  border-color: #0ea5e9;
  outline: none;
  box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.3);
}

.wallet-selector option,
.wallet-selector optgroup {
  background: #1e293b;
  color: #e2e8f0;
}

/* Action Cards */
.action-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  padding: 1rem;
  height: 100%;
  transition: all 0.2s ease;
}

.action-card:hover:not(.state-disabled) {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

/* Greyed out when contract state doesn't allow action */
.action-card.state-disabled {
  opacity: 0.4;
  filter: grayscale(50%);
}

.action-card.state-disabled .action-title {
  text-decoration: line-through;
  text-decoration-color: rgba(255, 255, 255, 0.3);
}

.action-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.action-title {
  font-weight: 600;
  font-size: 1rem;
  color: #f1f5f9;
}

.action-desc {
  font-size: 0.8rem;
  color: #94a3b8;
  margin-bottom: 0.75rem;
}

.action-prereq {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #94a3b8;
  margin-bottom: 0.25rem;
}

.action-prereq i {
  font-size: 0.65rem;
}

/* Token Holder Badges */
.badge-collateral {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: white;
  font-size: 0.6rem;
  padding: 0.2rem 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.badge-liability {
  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
  color: white;
  font-size: 0.6rem;
  padding: 0.2rem 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.badge-reserved {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  font-size: 0.6rem;
  padding: 0.2rem 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.badge-open {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: white;
  font-size: 0.6rem;
  padding: 0.2rem 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

/* Legacy badges for compatibility */
.badge-originator {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: white;
  font-size: 0.65rem;
  padding: 0.2rem 0.5rem;
}

.badge-borrower {
  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
  color: white;
  font-size: 0.65rem;
  padding: 0.2rem 0.5rem;
}

/* Signer Status Indicator */
.signer-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  padding: 0.4rem 0.6rem;
  border-radius: 0.25rem;
  margin-top: 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.signer-status i {
  font-size: 0.7rem;
}

.signer-status span {
  color: #94a3b8;
}

.signer-status.can-sign {
  background: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.3);
}

.signer-status.can-sign span {
  color: #4ade80;
}

.signer-status.cannot-sign {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.2);
}

.signer-status.cannot-sign span {
  color: #f87171;
}

/* Execution Log */
.execution-log {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.375rem;
  padding: 0.75rem;
  max-height: 200px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 0.8rem;
}

.log-entry {
  display: flex;
  gap: 0.75rem;
  padding: 0.25rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.log-entry:last-child {
  border-bottom: none;
}

.log-time {
  color: #64748b;
  flex-shrink: 0;
}

.log-text {
  color: #94a3b8;
}

.log-entry.success .log-text {
  color: #22c55e;
}

.log-entry.error .log-text {
  color: #ef4444;
}

.log-entry.info .log-text {
  color: #94a3b8;
}
</style>
