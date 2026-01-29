<template>
  <div class="config-panel">
    <!-- Wallet Configuration Card -->
    <div class="panel-header">
      <h4>Wallet Configuration</h4>
      <p class="text-muted">Define participants: originators, borrowers, analysts, and investors</p>
      <button class="btn btn-primary" @click="$emit('add-wallet')">
        <i class="fas fa-plus mr-1"></i> Add Wallet
      </button>
    </div>

    <div class="table-responsive">
      <table class="table table-dark config-table">
        <thead>
          <tr>
            <th style="width: 140px;">Role</th>
            <th style="min-width: 180px;">Name</th>
            <th style="width: 120px;">Initial ADA</th>
            <th style="min-width: 220px;">Assets</th>
            <th style="width: 50px;"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(wallet, index) in wallets" :key="index" :class="'role-' + wallet.role.toLowerCase()">
            <td>
              <select v-model="wallet.role" class="form-control form-control-sm config-input">
                <option value="Originator">Originator</option>
                <option value="Borrower">Borrower</option>
                <option value="Agent">Agent</option>
                <option value="Analyst">Analyst</option>
                <option value="Investor">Investor</option>
              </select>
            </td>
            <td>
              <input v-model="wallet.name" type="text" class="form-control form-control-sm config-input" placeholder="Wallet name" />
            </td>
            <td>
              <input v-model.number="wallet.initialFunding" type="number" class="form-control form-control-sm config-input" />
            </td>
            <td>
              <div v-if="wallet.role === 'Originator'" class="asset-chips">
                <span v-for="(asset, ai) in wallet.assets" :key="ai" class="asset-chip">
                  {{ asset.quantity }}x {{ asset.name }}
                  <button class="btn-chip-remove" @click="$emit('remove-asset', index, ai)">&times;</button>
                </span>
                <button class="btn btn-xs btn-outline-secondary" @click="$emit('add-asset', index)">+ Asset</button>
              </div>
              <span v-else class="text-muted">-</span>
            </td>
            <td>
              <button class="btn btn-sm btn-outline-danger btn-icon" @click="$emit('remove-wallet', index)">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Faucet Limit Warning -->
    <div v-if="totalInitialAda > 10000" class="alert alert-warning faucet-warning mt-3 mb-0">
      <div class="d-flex align-items-start">
        <i class="fas fa-exclamation-triangle mr-3 mt-1"></i>
        <div>
          <strong>Testnet Faucet Limit Warning</strong>
          <p class="mb-1">
            Total initial ADA: <strong>{{ totalInitialAda.toLocaleString() }} ADA</strong> exceeds 10,000 ADA faucet limit.
          </p>
          <small class="text-muted">
            When running on testnet (Preview/Preprod), you'll need to redistribute from a funded wallet.
            The faucet provides ~10,000 ADA per request. Consider reducing initial funding amounts.
          </small>
        </div>
      </div>
    </div>

    <!-- Total ADA info when under limit -->
    <div v-else class="alert alert-info faucet-info mt-3 mb-0">
      <div class="d-flex align-items-center">
        <i class="fas fa-info-circle mr-2"></i>
        <span>
          Total initial ADA: <strong>{{ totalInitialAda.toLocaleString() }} ADA</strong>
          <span class="text-muted ml-2">(within 10,000 ADA testnet faucet limit)</span>
        </span>
      </div>
    </div>

    <div class="panel-footer">
      <div class="stat-chips">
        <span class="stat-chip originator">{{ walletCounts.originators }} Originators</span>
        <span class="stat-chip borrower">{{ walletCounts.borrowers }} Borrowers</span>
        <span class="stat-chip agent">{{ walletCounts.agents }} Agents</span>
        <span class="stat-chip analyst">{{ walletCounts.analysts }} Analysts</span>
        <span class="stat-chip investor">{{ walletCounts.investors }} Investors</span>
        <span class="stat-chip total-ada" :class="{ 'over-limit': totalInitialAda > 10000 }">
          {{ totalInitialAda.toLocaleString() }} ADA Total
        </span>
      </div>
    </div>

    <!-- Distribution Charts -->
    <div class="distribution-charts-row mt-4">
      <div class="row">
        <div class="col-md-6 mb-3">
          <AdaDistributionChart :wallets="wallets" />
        </div>
        <div class="col-md-6 mb-3">
          <RoleDistributionChart :wallets="wallets" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { WalletConfig } from '@/utils/pipeline/types'
import AdaDistributionChart from './AdaDistributionChart.vue'
import RoleDistributionChart from './RoleDistributionChart.vue'

interface Props {
  wallets: WalletConfig[]
}

const props = defineProps<Props>()

defineEmits<{
  'add-wallet': []
  'remove-wallet': [index: number]
  'add-asset': [walletIndex: number]
  'remove-asset': [walletIndex: number, assetIndex: number]
}>()

const walletCounts = computed(() => ({
  originators: props.wallets.filter(w => w.role === 'Originator').length,
  borrowers: props.wallets.filter(w => w.role === 'Borrower').length,
  agents: props.wallets.filter(w => w.role === 'Agent').length,
  analysts: props.wallets.filter(w => w.role === 'Analyst').length,
  investors: props.wallets.filter(w => w.role === 'Investor').length,
}))

const totalInitialAda = computed(() => {
  return props.wallets.reduce((sum, w) => sum + (w.initialFunding || 0), 0)
})
</script>

<style scoped>
.config-panel {
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  padding: 1.5rem;
}

.panel-header {
  margin-bottom: 1.5rem;
}

.panel-header h4 {
  color: #f1f5f9;
  margin-bottom: 0.25rem;
}

.panel-footer {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.stat-chips {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.stat-chip {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.8rem;
  background: rgba(255, 255, 255, 0.1);
  color: #94a3b8;
}

.stat-chip.originator { background: rgba(139, 92, 246, 0.2); color: #a78bfa; }
.stat-chip.borrower { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
.stat-chip.agent { background: rgba(6, 182, 212, 0.2); color: #22d3ee; }
.stat-chip.analyst { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
.stat-chip.investor { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
.stat-chip.total-ada { background: rgba(16, 185, 129, 0.2); color: #34d399; font-weight: 600; }
.stat-chip.total-ada.over-limit { background: rgba(245, 158, 11, 0.3); color: #fbbf24; }

.config-table {
  background: transparent;
  margin-bottom: 0;
}

.config-table thead th {
  background: rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  font-weight: 500;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0.6rem 0.5rem;
  white-space: nowrap;
}

.config-table tbody tr {
  background: rgba(0, 0, 0, 0.15);
}

.config-table tbody tr:hover {
  background: rgba(0, 0, 0, 0.25);
}

.config-table td {
  border-color: rgba(255, 255, 255, 0.05);
  vertical-align: middle;
  padding: 0.4rem 0.5rem;
}

.config-input.form-control-sm {
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
  height: auto;
  min-height: 32px;
  background: rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
}

.config-input.form-control-sm:focus {
  background: rgba(0, 0, 0, 0.4);
  border-color: #38bdf8;
  color: #f1f5f9;
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
}

.config-table .btn-icon {
  padding: 0.25rem 0.5rem;
  line-height: 1;
}

tr.role-originator { border-left: 3px solid #a78bfa; }
tr.role-borrower { border-left: 3px solid #4ade80; }
tr.role-agent { border-left: 3px solid #22d3ee; }
tr.role-analyst { border-left: 3px solid #60a5fa; }
tr.role-investor { border-left: 3px solid #fbbf24; }

.asset-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.asset-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.5rem;
  background: rgba(139, 92, 246, 0.2);
  color: #a78bfa;
  border-radius: 0.25rem;
  font-size: 0.75rem;
}

.btn-chip-remove {
  background: none;
  border: none;
  color: inherit;
  padding: 0 0.25rem;
  margin-left: 0.25rem;
  cursor: pointer;
  opacity: 0.7;
}

.btn-chip-remove:hover {
  opacity: 1;
}

.btn-xs {
  padding: 0.1rem 0.4rem;
  font-size: 0.7rem;
}

.faucet-warning {
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #fbbf24;
  border-radius: 0.5rem;
}

.faucet-warning i {
  color: #f59e0b;
  font-size: 1.2rem;
}

.faucet-warning strong {
  color: #fde68a;
}

.faucet-warning p {
  color: #fcd34d;
}

.faucet-info {
  background: rgba(14, 165, 233, 0.1);
  border: 1px solid rgba(14, 165, 233, 0.2);
  color: #7dd3fc;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
}

.faucet-info strong {
  color: #38bdf8;
}

.distribution-charts-row {
  margin-top: 1.5rem;
}
</style>
