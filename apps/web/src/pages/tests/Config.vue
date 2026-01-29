<template>
  <div class="container-fluid py-4">
    <!-- Toast Notification -->
    <div v-if="showToast" class="toast-notification" :class="'toast-' + toastType">
      <i :class="toastType === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'" class="mr-2"></i>
      {{ toastMessage }}
    </div>

    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <router-link to="/tests" class="btn btn-sm btn-outline-secondary mb-2">
          <i class="fas fa-arrow-left mr-1"></i> Back to Tests
        </router-link>
        <h2 class="text-white mb-1">Test Configuration</h2>
        <p class="text-muted mb-0">Configure wallets, loans, CLO settings, and pipeline parameters</p>
      </div>
      <div class="d-flex align-items-center gap-3">
        <button class="btn btn-outline-secondary" @click="resetToDefaults">
          <i class="fas fa-undo mr-1"></i> Reset Defaults
        </button>
        <button class="btn btn-primary" @click="saveAndRun" :disabled="!isValid">
          <i class="fas fa-play mr-1"></i> Save & Run Tests
        </button>
      </div>
    </div>

    <!-- Config Selector -->
    <div class="card config-selector mb-4">
      <div class="card-body d-flex align-items-center gap-3">
        <label class="text-muted mb-0">Configuration:</label>
        <select v-model="selectedConfigId" class="form-control form-control-sm" style="max-width: 300px;" @change="onConfigSelect">
          <option :value="null">-- New Configuration --</option>
          <option v-for="cfg in savedConfigs" :key="cfg.id" :value="cfg.id">
            {{ cfg.name }} ({{ cfg.wallets }} wallets, {{ cfg.loans }} loans)
          </option>
        </select>
        <div class="ml-auto d-flex gap-2">
          <input
            v-model="configName"
            type="text"
            class="form-control form-control-sm"
            placeholder="Configuration name..."
            style="width: 200px;"
          />
          <button class="btn btn-sm btn-success" @click="saveConfig" :disabled="!configName || !isValid">
            <i class="fas fa-save mr-1"></i> Save
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content - Tabs -->
    <div class="row">
      <!-- Sidebar Navigation -->
      <div class="col-md-3 col-lg-2">
        <div class="nav flex-column nav-pills config-nav">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="nav-link text-left"
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            <i :class="tab.icon" class="mr-2"></i>
            {{ tab.label }}
            <span v-if="tab.count" class="badge badge-secondary ml-2">{{ tab.count }}</span>
          </button>
        </div>

        <!-- Validation Summary -->
        <div v-if="validationErrors.length > 0" class="validation-summary mt-4">
          <h6 class="text-danger"><i class="fas fa-exclamation-triangle mr-1"></i> Issues</h6>
          <ul class="list-unstyled mb-0">
            <li v-for="(error, i) in validationErrors" :key="i" class="text-danger small">
              {{ error }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Tab Content -->
      <div class="col-md-9 col-lg-10">
        <!-- Wallets Tab -->
        <div v-if="activeTab === 'wallets'" class="config-panel">
          <!-- Wallet Configuration Card -->
          <div class="panel-header">
            <h4>Wallet Configuration</h4>
            <p class="text-muted">Define participants: originators, borrowers, analysts, and investors</p>
            <button class="btn btn-primary" @click="addWallet">
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
                <tr v-for="(wallet, index) in localConfig.wallets" :key="index" :class="'role-' + wallet.role.toLowerCase()">
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
                        <button class="btn-chip-remove" @click="removeAsset(index, ai)">&times;</button>
                      </span>
                      <button class="btn btn-xs btn-outline-secondary" @click="addAsset(index)">+ Asset</button>
                    </div>
                    <span v-else class="text-muted">-</span>
                  </td>
                  <td>
                    <button class="btn btn-sm btn-outline-danger btn-icon" @click="removeWallet(index)">
                      <i class="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Faucet Limit Warning - ALWAYS show when over 10k -->
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

          <!-- Distribution Charts - Outside the card, side by side -->
          <div class="distribution-charts-row mt-4">
            <div class="row">
              <!-- ADA Distribution Chart -->
              <div class="col-md-6 mb-3">
                <div class="chart-card">
                  <div class="chart-card-header">
                    <h5><i class="fas fa-chart-pie mr-2"></i>ADA Distribution</h5>
                  </div>
                  <div class="chart-card-body">
                    <div v-if="adaDistributionData.datasets[0].data.length > 0" class="chart-wrapper">
                      <canvas ref="adaDistributionChart"></canvas>
                    </div>
                    <div v-else class="text-muted text-center py-3">
                      <i class="fas fa-info-circle mr-1"></i>
                      No wallets defined
                    </div>
                  </div>
                </div>
              </div>

              <!-- Role Distribution Chart -->
              <div class="col-md-6 mb-3">
                <div class="chart-card">
                  <div class="chart-card-header">
                    <h5><i class="fas fa-chart-bar mr-2"></i>Wallets by Role</h5>
                  </div>
                  <div class="chart-card-body">
                    <div v-if="localConfig.wallets.length > 0" class="chart-wrapper">
                      <canvas ref="roleDistributionChart"></canvas>
                    </div>
                    <div v-else class="text-muted text-center py-3">
                      <i class="fas fa-info-circle mr-1"></i>
                      No wallets defined
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Loans Tab -->
        <div v-if="activeTab === 'loans'" class="config-panel">
          <div class="panel-header d-flex justify-content-between align-items-start">
            <div>
              <h4>Loan Configuration</h4>
              <p class="text-muted">Define loan contracts between originators and borrowers</p>
            </div>
            <button class="btn btn-primary" @click="addLoan">
              <i class="fas fa-plus mr-1"></i> Add Loan
            </button>
          </div>

          <!-- Assets to Mint Reference - shows allocation status -->
          <div v-if="totalAssetsToMint.length > 0" class="assets-reference-bar mb-3">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <span class="text-muted small"><i class="fas fa-coins mr-1"></i> Assets Available for Loans:</span>
            </div>
            <div class="asset-pills">
              <span v-for="(asset, idx) in totalAssetsToMint" :key="idx" class="asset-pill" :class="{ 'fully-allocated': asset.unallocated === 0 && !asset.overAllocated, 'partially-allocated': asset.unallocated > 0 && asset.allocated > 0, 'over-allocated': asset.overAllocated }">
                <span class="asset-pill-originator">{{ asset.originator }}</span>
                <strong>{{ asset.name }}</strong>
                <span class="asset-pill-count" :class="{ 'over': asset.overAllocated }">{{ asset.allocated }}/{{ asset.total }}</span>
                <span v-if="asset.overAllocated" class="asset-pill-warning"><i class="fas fa-exclamation-triangle"></i> Over!</span>
                <span v-else-if="asset.unallocated > 0" class="asset-pill-remaining">({{ asset.unallocated }} left)</span>
              </span>
            </div>
          </div>
          <div v-else class="alert alert-info small mb-3">
            <i class="fas fa-info-circle mr-1"></i>
            No assets defined. Add assets to Originator wallets in the Wallets tab.
          </div>

          <div class="table-responsive loans-table-wide">
            <table class="table table-dark config-table loans-table">
              <thead>
                <tr>
                  <th style="width: 30px;"></th>
                  <th style="width: 40px;" class="sortable-header" @click="sortLoans('index')" title="Loan #">
                    # <i v-if="sortColumn === 'index'" :class="sortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down'"></i>
                  </th>
                  <th style="min-width: 120px;" class="sortable-header" @click="sortLoans('originator')">
                    Originator <i v-if="sortColumn === 'originator'" :class="sortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down'"></i>
                  </th>
                  <th style="min-width: 90px;">Asset</th>
                  <th style="width: 55px;">Qty</th>
                  <th style="width: 90px;" class="sortable-header" @click="sortLoans('principal')">
                    Principal <i v-if="sortColumn === 'principal'" :class="sortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down'"></i>
                  </th>
                  <th style="width: 70px;" class="sortable-header" @click="sortLoans('apr')">
                    APR % <i v-if="sortColumn === 'apr'" :class="sortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down'"></i>
                  </th>
                  <th style="width: 100px;">Frequency</th>
                  <th style="width: 65px;">Term</th>
                  <th style="min-width: 120px;">Borrower</th>
                  <th style="width: 100px;" title="Transfer fee split (Buyer% / Seller%)">Fee Split</th>
                  <th style="width: 50px;" title="Defer seller fee">Defer</th>
                  <th style="width: 70px;" title="Late payment fee in ADA">Late Fee</th>
                  <th style="min-width: 95px;">Lifecycle</th>
                  <th style="width: 35px;"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(loan, index) in sortedLoans" :key="index"
                    draggable="true"
                    @dragstart="dragStart($event, index)"
                    @dragover.prevent="dragOver($event, index)"
                    @drop="drop($event, index)"
                    @dragend="dragEnd"
                    :class="{ 'drag-over': dragOverIndex === index }">
                  <td class="drag-handle" title="Drag to reorder">
                    <i class="fas fa-grip-vertical"></i>
                  </td>
                  <td class="loan-index">{{ index + 1 }}</td>
                  <td>
                    <select v-model="loan.originatorId" class="form-control form-control-sm config-input" @change="onOriginatorChange(loan)">
                      <option v-for="w in originatorsWithAssets" :key="w.id" :value="w.id">{{ w.name }}</option>
                    </select>
                  </td>
                  <td>
                    <select v-model="loan.asset" class="form-control form-control-sm config-input">
                      <option value="">--</option>
                      <option v-for="asset in getWalletAssets(loan.originatorId)" :key="asset" :value="asset">
                        {{ asset }}
                      </option>
                    </select>
                  </td>
                  <td>
                    <input v-model.number="loan.quantity" type="number" min="1" class="form-control form-control-sm config-input input-narrow" />
                  </td>
                  <td>
                    <input v-model.number="loan.principal" type="number" class="form-control form-control-sm config-input" />
                  </td>
                  <td>
                    <input v-model.number="loan.apr" type="number" step="0.1" class="form-control form-control-sm config-input input-narrow" />
                  </td>
                  <td>
                    <select v-model="loan.frequency" class="form-control form-control-sm config-input frequency-select">
                      <option v-for="freq in frequencyOptions" :key="freq.value" :value="freq.value" :class="{ 'text-danger': freq.isTest }">
                        {{ freq.label }}
                      </option>
                    </select>
                  </td>
                  <td>
                    <input v-model.number="loan.termMonths" type="number" class="form-control form-control-sm config-input input-narrow" />
                  </td>
                  <td>
                    <select v-model="loan.borrowerId" class="form-control form-control-sm config-input">
                      <option :value="null">Open</option>
                      <option v-for="b in borrowerOptions" :key="b.id" :value="b.id">
                        {{ b.name }}
                      </option>
                    </select>
                  </td>
                  <td>
                    <div class="fee-split-compact">
                      <input v-model.number="loan.transferFeeBuyerPercent" type="number" min="0" max="100" class="form-control form-control-sm config-input fee-input" title="Buyer %" />
                      <span class="fee-divider">/</span>
                      <span class="fee-seller" title="Seller %">{{ 100 - (loan.transferFeeBuyerPercent || 50) }}</span>
                    </div>
                  </td>
                  <td class="text-center">
                    <input type="checkbox" v-model="loan.deferFee" class="form-check-input" :disabled="loan.principal < 10000" :title="loan.principal < 10000 ? 'Requires principal ≥ 10k' : 'Defer seller fee'" />
                  </td>
                  <td>
                    <input v-model.number="loan.lateFee" type="number" min="0" step="1" class="form-control form-control-sm config-input input-narrow" placeholder="10" />
                  </td>
                  <td>
                    <select v-model="loan.lifecycleCase" class="form-control form-control-sm config-input" :class="'lifecycle-' + (loan.lifecycleCase || 'T4')">
                      <option v-for="lc in lifecycleCases" :key="lc.id" :value="lc.id" :title="lc.description">
                        {{ lc.id }}
                      </option>
                    </select>
                  </td>
                  <td>
                    <button class="btn btn-sm btn-outline-danger btn-icon" @click="removeLoan(index)">
                      <i class="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Loan Calculations Summary -->
          <div class="loan-calculations mt-4">
            <h6 class="text-muted mb-2"><i class="fas fa-calculator mr-1"></i> Loan Analysis</h6>
            <div class="calculations-grid">
              <div v-for="(loan, index) in localConfig.loans" :key="'calc-' + index" class="loan-calc-card">
                <div class="calc-header">
                  <span class="calc-index">#{{ index + 1 }}</span>
                  <span class="calc-asset">{{ loan.asset || 'Unnamed' }}</span>
                  <span class="calc-principal">{{ loan.principal.toLocaleString() }} ADA</span>
                </div>
                <div class="calc-body">
                  <div class="calc-row">
                    <span class="calc-label">Payment</span>
                    <span class="calc-value">{{ calculateTermPayment(loan).toFixed(2) }} / {{ getFrequencyLabel(loan.frequency) }}</span>
                  </div>
                  <div class="calc-row">
                    <span class="calc-label">Interest</span>
                    <span class="calc-value" :class="{ 'text-success': loan.apr > 0 }">+{{ calculateTotalInterest(loan).toFixed(2) }}</span>
                  </div>
                  <div class="calc-row total">
                    <span class="calc-label">Total</span>
                    <span class="calc-value text-info">{{ calculateTotalValue(loan).toFixed(2) }} ADA</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Lifecycle Case Legend -->
          <div class="lifecycle-legend mt-3">
            <small class="text-muted">Lifecycle Cases:</small>
            <div class="legend-items">
              <span v-for="lc in lifecycleCases" :key="lc.id" class="legend-item" :class="'lifecycle-' + lc.id" :title="lc.description">
                <strong>{{ lc.id }}</strong>: {{ lc.short }}
              </span>
            </div>
          </div>

          <div class="panel-footer">
            <div class="stat-chips">
              <span class="stat-chip">{{ localConfig.loans.length }} Total Loans</span>
              <span class="stat-chip reserved">{{ loanCounts.reserved }} Reserved</span>
              <span class="stat-chip open">{{ loanCounts.open }} Open Market</span>
              <span class="stat-chip">{{ loanCounts.totalPrincipal.toLocaleString() }} ADA Principal</span>
            </div>
          </div>
        </div>

        <!-- CLO Tab -->
        <div v-if="activeTab === 'clo'" class="config-panel">
          <div class="panel-header">
            <h4>CLO Configuration</h4>
            <p class="text-muted">Configure collateralized loan obligation tranches</p>
          </div>

          <!-- Loans Reference - shows loans that will be bundled into CLO -->
          <div v-if="localConfig.loans.length > 0" class="loans-reference-bar mb-4">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <span class="text-muted small"><i class="fas fa-file-contract mr-1"></i> Loans for CLO Collateral ({{ cloEligibleLoans.length }} eligible):</span>
              <div class="d-flex gap-2">
                <span class="badge badge-secondary">{{ cloEligibleLoans.reduce((sum, l) => sum + l.principal, 0).toLocaleString() }} ADA Principal</span>
                <span class="badge badge-info">{{ cloEligibleLoans.reduce((sum, l) => sum + calculateTotalValue(l), 0).toFixed(0) }} ADA Total Value</span>
              </div>
            </div>
            <div class="loan-pills-clo">
              <div v-for="(loan, idx) in localConfig.loans" :key="idx" class="loan-pill-clo" :class="{ 'eligible': !['T1', 'T6'].includes(loan.lifecycleCase || 'T4'), 'ineligible': ['T1', 'T6'].includes(loan.lifecycleCase || 'T4') }">
                <div class="loan-pill-clo-header">
                  <span class="loan-pill-index">#{{ idx + 1 }}</span>
                  <span class="loan-pill-asset">{{ loan.asset || 'No Asset' }}</span>
                  <span class="loan-pill-lifecycle" :class="'lc-' + (loan.lifecycleCase || 'T4')">{{ loan.lifecycleCase || 'T4' }}</span>
                </div>
                <div class="loan-pill-clo-body">
                  <div class="loan-pill-row">
                    <span class="loan-pill-label">Principal</span>
                    <span class="loan-pill-value">{{ loan.principal.toLocaleString() }}</span>
                  </div>
                  <div class="loan-pill-row">
                    <span class="loan-pill-label">Payment</span>
                    <span class="loan-pill-value">{{ calculateTermPayment(loan).toFixed(0) }}/{{ getFrequencyLabel(loan.frequency) }}</span>
                  </div>
                  <div class="loan-pill-row">
                    <span class="loan-pill-label">Interest</span>
                    <span class="loan-pill-value text-success">+{{ calculateTotalInterest(loan).toFixed(0) }}</span>
                  </div>
                  <div class="loan-pill-row total">
                    <span class="loan-pill-label">Total</span>
                    <span class="loan-pill-value text-info">{{ calculateTotalValue(loan).toFixed(0) }}</span>
                  </div>
                </div>
              </div>
            </div>
            <small class="text-muted d-block mt-2">
              <i class="fas fa-info-circle mr-1"></i>
              Loans with T1 (Cancel) or T6 (Reject) lifecycle cases won't be included in CLO collateral.
            </small>
          </div>
          <div v-else class="alert alert-info small mb-4">
            <i class="fas fa-info-circle mr-1"></i>
            No loans defined. Add loans in the Loans tab to bundle into CLO.
          </div>

          <div class="row">
            <div class="col-md-6">
              <div class="form-group">
                <label>CLO Name</label>
                <input v-model="localConfig.clo!.name" type="text" class="form-control config-input" placeholder="CLO Series Name" />
              </div>
            </div>
          </div>

          <h5 class="mt-4 mb-3">Tranche Allocation</h5>
          <div class="tranche-config">
            <div v-for="(tranche, index) in localConfig.clo?.tranches" :key="index" class="tranche-row">
              <div class="tranche-inputs">
                <div class="form-group">
                  <label>Name</label>
                  <input v-model="tranche.name" type="text" class="form-control form-control-sm" />
                </div>
                <div class="form-group">
                  <label>Allocation %</label>
                  <input v-model.number="tranche.allocation" type="number" min="0" max="100" class="form-control form-control-sm" />
                </div>
                <div class="form-group">
                  <label>Yield Modifier</label>
                  <div class="input-group input-group-sm">
                    <input v-model.number="tranche.yieldModifier" type="number" step="0.1" class="form-control" />
                    <span class="input-group-text">x</span>
                  </div>
                </div>
              </div>
              <div class="tranche-bar-container">
                <div class="tranche-bar" :style="{ width: `${tranche.allocation}%` }" :class="'tranche-' + tranche.name.toLowerCase()">
                  {{ tranche.name }}: {{ tranche.allocation }}%
                </div>
              </div>
            </div>
          </div>

          <div class="allocation-total mt-3" :class="{ 'text-danger': allocationTotal !== 100, 'text-success': allocationTotal === 100 }">
            <strong>Total Allocation: {{ allocationTotal }}%</strong>
            <span v-if="allocationTotal !== 100" class="ml-2">(must equal 100%)</span>
            <span v-else class="ml-2"><i class="fas fa-check"></i></span>
          </div>
        </div>

        <!-- Lifecycle Tab -->
        <div v-if="activeTab === 'lifecycle'" class="config-panel lifecycle-tab">
          <div class="panel-header">
            <h4>Pipeline Lifecycle</h4>
            <p class="text-muted mb-0">Configure the execution sequence and scheduled actions for each loan</p>
          </div>

          <!-- Pipeline Overview -->
          <div class="pipeline-preview">
            <div class="phase-timeline">
              <!-- Phase 1: Setup & Identities -->
              <div class="phase-block">
                <div class="phase-header d-flex align-items-center justify-content-between">
                  <div class="d-flex align-items-center">
                    <div class="phase-number">1</div>
                    <div class="phase-info">
                      <div class="phase-title">Setup & Identities</div>
                      <div class="phase-description">Create and fund wallets for all participants</div>
                    </div>
                  </div>
                  <div class="d-flex align-items-center gap-2">
                    <span class="badge badge-secondary">{{ localConfig.wallets.length }} wallets</span>
                  </div>
                </div>
                <div class="phase-steps">
                  <div class="phase-step-item">
                    <div class="d-flex align-items-center">
                      <div class="step-status-icon"><i class="far fa-circle text-muted"></i></div>
                      <span class="step-action-bubble action-create">Create</span>
                      <span class="step-entity-text">{{ localConfig.wallets.length }} wallets ({{ walletRoleSummary }})</span>
                    </div>
                  </div>
                  <div class="phase-step-item">
                    <div class="d-flex align-items-center">
                      <div class="step-status-icon"><i class="far fa-circle text-muted"></i></div>
                      <span class="step-action-bubble action-fund">Fund</span>
                      <span class="step-entity-text">{{ localConfig.wallets.length }} wallets with initial ADA</span>
                    </div>
                  </div>
                  <div class="phase-step-item step-disabled">
                    <div class="d-flex align-items-center">
                      <div class="step-status-icon"><i class="fas fa-ban text-secondary"></i></div>
                      <span class="step-action-bubble action-mint action-disabled">Mint</span>
                      <span class="step-entity-text text-muted">Credentials <span class="step-disabled-reason">(Coming soon)</span></span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Phase 2: Asset Tokenization -->
              <div class="phase-block">
                <div class="phase-header d-flex align-items-center justify-content-between">
                  <div class="d-flex align-items-center">
                    <div class="phase-number">2</div>
                    <div class="phase-info">
                      <div class="phase-title">Asset Tokenization</div>
                      <div class="phase-description">Originators mint tokenized real-world assets</div>
                    </div>
                  </div>
                  <div class="d-flex align-items-center gap-2">
                    <span class="badge badge-secondary">{{ totalAssets }} assets</span>
                  </div>
                </div>
                <div class="phase-steps">
                  <div v-for="(wallet, wi) in originatorWallets" :key="'mint-' + wi" class="phase-step-item">
                    <div class="d-flex align-items-center">
                      <div class="step-status-icon"><i class="far fa-circle text-muted"></i></div>
                      <span class="step-action-bubble action-mint">Mint</span>
                      <span class="step-entity-text">
                        <span v-for="(asset, ai) in wallet.assets" :key="ai">
                          {{ asset.quantity }}x {{ asset.name }}<span v-if="ai < (wallet.assets?.length || 0) - 1">, </span>
                        </span>
                        <span class="text-muted ml-1">({{ wallet.name }})</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Phase 3: Initialize Loans -->
              <div class="phase-block">
                <div class="phase-header d-flex align-items-center justify-content-between">
                  <div class="d-flex align-items-center">
                    <div class="phase-number">3</div>
                    <div class="phase-info">
                      <div class="phase-title">Initialize Loan Contracts</div>
                      <div class="phase-description">Create loans using tokenized assets as collateral</div>
                    </div>
                  </div>
                  <div class="d-flex align-items-center gap-2">
                    <span class="badge badge-secondary">{{ localConfig.loans.length }} loans</span>
                  </div>
                </div>
                <div class="phase-steps">
                  <div v-for="(loan, li) in localConfig.loans" :key="'init-' + li" class="phase-step-item">
                    <div class="d-flex align-items-center">
                      <div class="step-status-icon"><i class="far fa-circle text-muted"></i></div>
                      <span class="step-action-bubble action-loan">Create</span>
                      <span class="step-entity-text">
                        {{ getBorrowerName(loan.borrowerId) || 'Open Market' }} ← {{ loan.asset }}
                        <span class="text-muted">({{ loan.reservedBuyer ? 'Reserved' : 'Open' }})</span>
                        <span class="lifecycle-badge ml-2" :class="'lc-' + (loan.lifecycleCase || 'T4')">{{ loan.lifecycleCase || 'T4' }}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <!-- Loan Action Schedules -->
          <div class="loan-action-schedules mt-4">
            <h5 class="mb-3">
              <i class="fas fa-calendar-alt mr-2"></i>
              Loan Action Schedules
              <small class="text-muted ml-2">(T+0 = Acceptance)</small>
            </h5>

            <div class="loan-schedules-grid">
              <div v-for="schedule in loanActionSchedules" :key="schedule.loanIndex" class="loan-schedule-card" :class="'lc-border-' + (schedule.loan.lifecycleCase || 'T4')">
                <!-- Loan Header -->
                <div class="loan-schedule-header">
                  <div class="loan-schedule-index">#{{ schedule.loanIndex + 1 }}</div>
                  <div class="loan-schedule-info">
                    <span class="loan-schedule-asset">{{ schedule.loan.asset }}</span>
                    <span class="loan-schedule-principal">{{ schedule.loan.principal.toLocaleString() }} ADA</span>
                  </div>
                  <div class="lifecycle-badge" :class="'lc-' + (schedule.loan.lifecycleCase || 'T4')">
                    {{ schedule.loan.lifecycleCase || 'T4' }}
                  </div>
                </div>

                <!-- Action Timeline -->
                <div class="loan-action-timeline">
                  <div v-for="action in schedule.actions" :key="action.id"
                       class="action-item"
                       :class="{
                         'action-pre-t0': action.timingPeriod < 0,
                         'action-t0': action.timingPeriod === 0,
                         'action-post-t0': action.timingPeriod > 0,
                         'action-late': action.isLate,
                         'action-rejection': action.expectedResult === 'rejection'
                       }">
                    <div class="action-timing">{{ action.timing }}</div>
                    <div class="action-content">
                      <span class="action-type-badge" :class="'action-' + action.actionType">
                        {{ action.label }}
                      </span>
                      <span v-if="action.amount !== undefined" class="action-amount">
                        <input
                          type="number"
                          :value="action.amount"
                          @change="updateActionAmount(schedule.loanIndex, action.id, parseFloat(($event.target as HTMLInputElement).value))"
                          class="action-amount-input"
                          :title="action.description || ''"
                        /> ADA
                      </span>
                      <span v-if="action.isLate" class="action-late-badge">
                        <i class="fas fa-clock"></i> Late
                      </span>
                      <span v-if="action.expectedResult === 'rejection'" class="action-rejection-badge">
                        <i class="fas fa-times-circle"></i> Expected Rejection
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Summary -->
                <div class="loan-schedule-summary">
                  <span class="summary-item">
                    <i class="fas fa-list-ol"></i>
                    {{ schedule.actions.length }} actions
                  </span>
                  <span class="summary-item">
                    <i class="fas fa-coins"></i>
                    {{ calculateTotalValue(schedule.loan).toFixed(0) }} ADA total
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- CLO Phase (kept separate) -->
          <div class="clo-phase-preview mt-4">
            <h5 class="mb-3"><i class="fas fa-layer-group mr-2"></i> CLO Operations</h5>
            <div class="phase-block">
              <div class="phase-steps">
                <div class="phase-step-item">
                  <div class="d-flex align-items-center">
                    <div class="step-status-icon"><i class="far fa-circle text-muted"></i></div>
                    <span class="step-action-bubble action-clo">Init</span>
                    <span class="step-entity-text">{{ localConfig.clo?.name }} ({{ localConfig.clo?.tranches.length }} Tranches)</span>
                  </div>
                </div>
                <div class="phase-step-item">
                  <div class="d-flex align-items-center">
                    <div class="step-status-icon"><i class="far fa-circle text-muted"></i></div>
                    <span class="step-action-bubble action-clo">Bundle</span>
                    <span class="step-entity-text">Collateral Tokens from {{ cloEligibleLoans.length }} active loans</span>
                  </div>
                </div>
                <div class="phase-step-item">
                  <div class="d-flex align-items-center">
                    <div class="step-status-icon"><i class="far fa-circle text-muted"></i></div>
                    <span class="step-action-bubble action-clo">Mint</span>
                    <span class="step-entity-text">Tranche Tokens (Senior, Mezzanine, Junior)</span>
                  </div>
                </div>
                <div class="phase-step-item">
                  <div class="d-flex align-items-center">
                    <div class="step-status-icon"><i class="far fa-circle text-muted"></i></div>
                    <span class="step-action-bubble action-clo">Distribute</span>
                    <span class="step-entity-text">Waterfall payments to tranche holders</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Lifecycle Case References -->
          <div class="row mt-4">
            <div class="col-md-6">
              <h6 class="text-muted mb-2"><i class="fas fa-file-contract mr-1"></i> Loan Lifecycle Cases</h6>
              <div class="lifecycle-cases-compact">
                <div v-for="lc in lifecycleCases" :key="lc.id" class="lc-compact" :class="'lc-' + lc.id" :title="lc.description">
                  <span class="lc-id">{{ lc.id }}</span>
                  <span class="lc-short">{{ lc.short }}</span>
                </div>
              </div>
            </div>
            <div class="col-md-6">
              <h6 class="text-muted mb-2"><i class="fas fa-layer-group mr-1"></i> CLO Lifecycle Cases</h6>
              <div class="lifecycle-cases-compact">
                <div v-for="lc in cloLifecycleCases" :key="lc.id" class="lc-compact" :class="'lc-' + lc.id" :title="lc.description">
                  <span class="lc-id">{{ lc.id }}</span>
                  <span class="lc-short">{{ lc.short }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Settings Tab -->
        <div v-if="activeTab === 'settings'" class="config-panel">
          <div class="panel-header">
            <h4>Pipeline Settings</h4>
            <p class="text-muted">Configure test execution parameters</p>
          </div>

          <div class="row">
            <div class="col-md-6">
              <div class="form-group">
                <label>Network Mode</label>
                <select v-model="localConfig.network" class="form-control">
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
                  v-model.number="localConfig.monteCarlo!.iterations"
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
                  <input v-model.number="localConfig.monteCarlo!.parameters.defaultProbability.min" type="number" step="0.01" class="form-control form-control-sm" placeholder="Min" />
                  <span class="text-muted align-self-center">to</span>
                  <input v-model.number="localConfig.monteCarlo!.parameters.defaultProbability.max" type="number" step="0.01" class="form-control form-control-sm" placeholder="Max" />
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="form-group">
                <label>Interest Rate Shock Range</label>
                <div class="d-flex gap-2">
                  <input v-model.number="localConfig.monteCarlo!.parameters.interestRateShock.min" type="number" step="0.01" class="form-control form-control-sm" placeholder="Min" />
                  <span class="text-muted align-self-center">to</span>
                  <input v-model.number="localConfig.monteCarlo!.parameters.interestRateShock.max" type="number" step="0.01" class="form-control form-control-sm" placeholder="Max" />
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="form-group">
                <label>Prepayment Rate Range</label>
                <div class="d-flex gap-2">
                  <input v-model.number="localConfig.monteCarlo!.parameters.prepaymentRate.min" type="number" step="0.01" class="form-control form-control-sm" placeholder="Min" />
                  <span class="text-muted align-self-center">to</span>
                  <input v-model.number="localConfig.monteCarlo!.parameters.prepaymentRate.max" type="number" step="0.01" class="form-control form-control-sm" placeholder="Max" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Asset Add Modal -->
    <div v-if="showAssetModal" class="modal-overlay" @click.self="showAssetModal = false">
      <div class="modal-content">
        <h5>Add Asset</h5>
        <div class="form-group">
          <label>Asset Name</label>
          <input v-model="newAsset.name" type="text" class="form-control" placeholder="e.g., Diamond, Airplane" />
        </div>
        <div class="form-group">
          <label>Quantity</label>
          <input v-model.number="newAsset.quantity" type="number" min="1" class="form-control" />
        </div>
        <div class="d-flex justify-content-end gap-2 mt-3">
          <button class="btn btn-secondary" @click="showAssetModal = false">Cancel</button>
          <button class="btn btn-primary" @click="confirmAddAsset" :disabled="!newAsset.name">Add</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { PipelineConfig, WalletConfig } from '@/utils/pipeline/types'
import { NAME_TO_ID_MAP } from '@/utils/pipeline/types'
import {
  DEFAULT_WALLETS,
  DEFAULT_LOANS,
  DEFAULT_CLO,
  DEFAULT_MONTE_CARLO,
  validateConfig
} from '@/config/testConfig'
import { Chart, DoughnutController, BarController, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'

// Register Chart.js components
Chart.register(DoughnutController, BarController, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const router = useRouter()
const route = useRoute()

// Saved configs (would come from API in production)
const savedConfigs = ref<{ id: string; name: string; wallets: number; loans: number }[]>([])

const selectedConfigId = ref<string | null>(null)
const configName = ref('')

const activeTab = ref('wallets')

const tabs = computed(() => [
  { id: 'wallets', label: 'Wallets', icon: 'fas fa-wallet', count: localConfig.value.wallets.length },
  { id: 'loans', label: 'Loans', icon: 'fas fa-file-contract', count: localConfig.value.loans.length },
  { id: 'clo', label: 'CLO', icon: 'fas fa-layer-group', count: localConfig.value.clo?.tranches.length },
  { id: 'lifecycle', label: 'Lifecycle', icon: 'fas fa-clock', count: null },
  { id: 'settings', label: 'Settings', icon: 'fas fa-cog', count: null },
])

// Lifecycle test cases from Tx_Tests.md - Loan specific
const lifecycleCases = [
  { id: 'T1', short: 'Cancel', description: 'Init, Update, Cancel - Seller manages contract before buyer acceptance' },
  { id: 'T2', short: 'Default', description: 'Init, Accept, Default - Buyer accepts, misses payments, seller claims default' },
  { id: 'T3', short: 'Nominal (0%)', description: 'Complete Payment (0% Interest) - Full payment lifecycle, no interest' },
  { id: 'T4', short: 'Nominal', description: 'Complete Payment (w/ Interest) - Standard full lifecycle with interest' },
  { id: 'T5', short: 'Late Fee', description: 'Complete Payment (w/ Late Fee) - Missed payment window, late fee applied' },
  { id: 'T6', short: 'Reserved (Reject)', description: 'Buyer Reservation Guard - Wrong buyer attempts acceptance (expected rejection)' },
  { id: 'T7', short: 'Reserved + Fees', description: 'Buyer Reservation with Fees - Reserved buyer with transfer fees' },
]

// CLO lifecycle cases
const cloLifecycleCases = [
  { id: 'C1', short: 'Nominal', description: 'Create, Bundle, Distribute, Mature - Standard CLO lifecycle' },
  { id: 'C2', short: 'Partial Default', description: 'Some underlying loans default, waterfall distribution' },
  { id: 'C3', short: 'Liquidation', description: 'Major default triggers early liquidation' },
  { id: 'C4', short: 'Redemption', description: 'Early redemption by tranche holders' },
]

// Payment frequency options (periods per year)
const frequencyOptions = [
  { value: 12, label: 'Monthly', isTest: false },
  { value: 4, label: 'Quarterly', isTest: false },
  { value: 2, label: 'Bi-Annual', isTest: false },
  { value: 52, label: 'Weekly', isTest: false },
  { value: 365, label: 'Daily', isTest: true },
  { value: 8760, label: 'Hourly', isTest: true },
  { value: 17531, label: '30-min', isTest: true },
  { value: 35063, label: '15-min', isTest: true },
  { value: 52594, label: '10-min', isTest: true },
  { value: 105189, label: '5-min', isTest: true },
]

// Get frequency label from value
function getFrequencyLabel(frequency?: number): string {
  const freq = frequencyOptions.find(f => f.value === (frequency || 12))
  if (freq) return freq.label.replace('-', '')
  if ((frequency || 12) === 12) return 'mo'
  if (frequency === 4) return 'qtr'
  return 'period'
}

// Sorting state
const sortColumn = ref<string | null>(null)
const sortDirection = ref<'asc' | 'desc'>('asc')

// Drag and drop state
const dragIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

// Sorted loans computed
const sortedLoans = computed(() => {
  // If no sort column, return original order
  if (!sortColumn.value) return localConfig.value.loans

  const sorted = [...localConfig.value.loans]
  sorted.sort((a, b) => {
    let aVal: any, bVal: any

    switch (sortColumn.value) {
      case 'index':
        return 0 // Keep original order
      case 'originator':
        aVal = a.originatorId || ''
        bVal = b.originatorId || ''
        break
      case 'principal':
        aVal = a.principal
        bVal = b.principal
        break
      case 'apr':
        aVal = a.apr
        bVal = b.apr
        break
      default:
        return 0
    }

    if (aVal < bVal) return sortDirection.value === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDirection.value === 'asc' ? 1 : -1
    return 0
  })

  return sorted
})

// Sort loans by column
function sortLoans(column: string) {
  if (sortColumn.value === column) {
    // Toggle direction or clear
    if (sortDirection.value === 'asc') {
      sortDirection.value = 'desc'
    } else {
      sortColumn.value = null
      sortDirection.value = 'asc'
    }
  } else {
    sortColumn.value = column
    sortDirection.value = 'asc'
  }
}

// Drag and drop handlers
function dragStart(event: DragEvent, index: number) {
  dragIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

function dragOver(_event: DragEvent, index: number) {
  dragOverIndex.value = index
}

function drop(_event: DragEvent, targetIndex: number) {
  if (dragIndex.value === null || dragIndex.value === targetIndex) return

  // Clear sorting when manually reordering
  sortColumn.value = null

  const loans = localConfig.value.loans
  const [movedLoan] = loans.splice(dragIndex.value, 1)
  loans.splice(targetIndex, 0, movedLoan)

  dragIndex.value = null
  dragOverIndex.value = null
}

function dragEnd() {
  dragIndex.value = null
  dragOverIndex.value = null
}

// Local config state
const localConfig = ref<PipelineConfig>({
  network: 'emulator',
  wallets: JSON.parse(JSON.stringify(DEFAULT_WALLETS)),
  loans: JSON.parse(JSON.stringify(DEFAULT_LOANS)),
  clo: JSON.parse(JSON.stringify(DEFAULT_CLO)),
  monteCarlo: JSON.parse(JSON.stringify(DEFAULT_MONTE_CARLO)),
})

// Asset modal
const showAssetModal = ref(false)
const editingWalletIndex = ref<number | null>(null)
const newAsset = ref({ name: '', quantity: 1 })

// Loan calculation functions
function calculateTermPayment(loan: { principal: number; apr: number; termMonths: number; frequency?: number }): number {
  const principal = loan.principal
  const apr = loan.apr / 100 // Convert percentage to decimal
  const installments = loan.termMonths
  const periodsPerYear = loan.frequency || 12 // Default to monthly

  if (installments <= 0) return 0
  if (apr === 0) {
    // For 0% APR, simply divide principal by number of installments
    return principal / installments
  }

  // Standard loan payment formula using frequency-adjusted rate
  const periodRate = apr / periodsPerYear
  const termPayment = (periodRate * principal) / (1 - Math.pow(1 + periodRate, -installments))
  return Math.round((termPayment + Number.EPSILON) * 100) / 100
}

function calculateTotalInterest(loan: { principal: number; apr: number; termMonths: number; frequency?: number }): number {
  const termPayment = calculateTermPayment(loan)
  const totalPaid = termPayment * loan.termMonths
  return Math.max(0, Math.round((totalPaid - loan.principal + Number.EPSILON) * 100) / 100)
}

function calculateTotalValue(loan: { principal: number; apr: number; termMonths: number; frequency?: number }): number {
  return loan.principal + calculateTotalInterest(loan)
}

// Computed
const walletCounts = computed(() => ({
  originators: localConfig.value.wallets.filter(w => w.role === 'Originator').length,
  borrowers: localConfig.value.wallets.filter(w => w.role === 'Borrower').length,
  agents: localConfig.value.wallets.filter(w => w.role === 'Agent').length,
  analysts: localConfig.value.wallets.filter(w => w.role === 'Analyst').length,
  investors: localConfig.value.wallets.filter(w => w.role === 'Investor').length,
}))

// Total initial ADA across all wallets (for testnet faucet warning)
const totalInitialAda = computed(() => {
  return localConfig.value.wallets.reduce((sum, w) => sum + (w.initialFunding || 0), 0)
})

const loanCounts = computed(() => ({
  reserved: localConfig.value.loans.filter(l => l.reservedBuyer).length,
  open: localConfig.value.loans.filter(l => !l.reservedBuyer).length,
  totalPrincipal: localConfig.value.loans.reduce((sum, l) => sum + l.principal, 0),
}))

// Loans eligible for CLO (excludes T1 Cancel and T6 Reject cases)
const cloEligibleLoans = computed(() => {
  return localConfig.value.loans.filter(l => !['T1', 'T6'].includes(l.lifecycleCase || 'T4'))
})

const allocationTotal = computed(() => {
  return localConfig.value.clo?.tranches.reduce((sum, t) => sum + t.allocation, 0) || 0
})

const borrowerOptions = computed(() => {
  return localConfig.value.wallets
    .filter(w => w.role === 'Borrower')
    .map(w => ({
      id: NAME_TO_ID_MAP[w.name] || `bor-${w.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: w.name,
      initialFunding: w.initialFunding || 0
    }))
})

// Originators that have assets to mint (filtered for loan originator dropdown)
const originatorsWithAssets = computed(() => {
  return localConfig.value.wallets
    .filter(w => w.role === 'Originator' && w.assets && w.assets.length > 0)
    .map(w => ({
      id: NAME_TO_ID_MAP[w.name] || `wallet-${w.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: w.name,
      assetCount: w.assets?.length || 0
    }))
})

// Chart refs
const adaDistributionChart = ref<HTMLCanvasElement | null>(null)
const roleDistributionChart = ref<HTMLCanvasElement | null>(null)
let adaChartInstance: Chart | null = null
let roleChartInstance: Chart | null = null

// Compute total assets to mint and their allocation to loans
const totalAssetsToMint = computed(() => {
  const assetMap = new Map<string, { total: number; allocated: number; originator: string }>()

  // Collect all assets from originators
  for (const wallet of localConfig.value.wallets) {
    if (wallet.role === 'Originator' && wallet.assets) {
      for (const asset of wallet.assets) {
        const existing = assetMap.get(asset.name) || { total: 0, allocated: 0, originator: wallet.name }
        existing.total += asset.quantity
        // Keep track of originator (use first one if multiple)
        if (!existing.originator) existing.originator = wallet.name
        assetMap.set(asset.name, existing)
      }
    }
  }

  // Calculate allocation from loans
  for (const loan of localConfig.value.loans) {
    if (loan.asset && assetMap.has(loan.asset)) {
      const asset = assetMap.get(loan.asset)!
      asset.allocated += loan.quantity || 0
    }
  }

  // Convert to array with percentages
  return Array.from(assetMap.entries()).map(([name, data]) => ({
    name,
    total: data.total,
    allocated: data.allocated,
    unallocated: data.total - data.allocated,
    overAllocated: data.allocated > data.total,
    allocatedPercent: data.total > 0 ? Math.min(100, Math.round((data.allocated / data.total) * 100)) : 0,
    originator: data.originator,
  }))
})

// Role colors - consistent across UI (matching stat-chips in CSS)
const ROLE_COLORS: Record<string, string> = {
  Originator: 'rgba(139, 92, 246, 0.8)',   // Purple - #a78bfa
  Borrower: 'rgba(34, 197, 94, 0.8)',      // Green - #4ade80
  Analyst: 'rgba(59, 130, 246, 0.8)',      // Blue - #60a5fa
  Investor: 'rgba(251, 191, 36, 0.8)',     // Yellow/Amber - #fbbf24
  Agent: 'rgba(6, 182, 212, 0.8)',         // Cyan - #22d3ee
}

// ADA distribution data for pie chart
const adaDistributionData = computed(() => {
  const labels: string[] = []
  const data: number[] = []
  const colors: string[] = []

  for (const wallet of localConfig.value.wallets) {
    if (wallet.initialFunding && wallet.initialFunding > 0) {
      labels.push(wallet.name)
      data.push(wallet.initialFunding)
      colors.push(ROLE_COLORS[wallet.role] || 'rgba(156, 163, 175, 0.8)')
    }
  }

  return {
    labels,
    datasets: [{
      data,
      backgroundColor: colors,
      borderColor: 'rgba(30, 41, 59, 1)',
      borderWidth: 2
    }]
  }
})

// Role distribution data for bar chart
const roleDistributionData = computed(() => {
  const counts = walletCounts.value
  return {
    labels: ['Originators', 'Borrowers', 'Agents', 'Analysts', 'Investors'],
    datasets: [{
      label: 'Wallets',
      data: [counts.originators, counts.borrowers, counts.agents, counts.analysts, counts.investors],
      backgroundColor: [
        ROLE_COLORS.Originator,
        ROLE_COLORS.Borrower,
        ROLE_COLORS.Agent,
        ROLE_COLORS.Analyst,
        ROLE_COLORS.Investor,
      ],
      borderColor: 'rgba(30, 41, 59, 1)',
      borderWidth: 1
    }]
  }
})

// Initialize charts
function initCharts() {
  nextTick(() => {
    // ADA Distribution Doughnut Chart
    if (adaDistributionChart.value) {
      if (adaChartInstance) adaChartInstance.destroy()
      adaChartInstance = new Chart(adaDistributionChart.value, {
        type: 'doughnut',
        data: adaDistributionData.value,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.label}: ${ctx.parsed.toLocaleString()} ADA`
              }
            }
          }
        }
      })
    }

    // Role Distribution Bar Chart
    if (roleDistributionChart.value) {
      if (roleChartInstance) roleChartInstance.destroy()
      roleChartInstance = new Chart(roleDistributionChart.value, {
        type: 'bar',
        data: roleDistributionData.value,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { color: '#94a3b8', stepSize: 1 },
              grid: { color: 'rgba(148, 163, 184, 0.1)' }
            },
            x: {
              ticks: { color: '#94a3b8', font: { size: 10 } },
              grid: { display: false }
            }
          }
        }
      })
    }

  })
}

// Watch for wallet changes to update charts
watch(() => localConfig.value.wallets, () => {
  if (activeTab.value === 'wallets') {
    initCharts()
  }
}, { deep: true })

// Watch for tab change to init charts
watch(activeTab, (newTab) => {
  if (newTab === 'wallets') {
    initCharts()
  }
})

// Get assets for a specific wallet by ID
function getWalletAssets(walletId: string): string[] {
  if (!walletId) return []

  // Find wallet by ID
  const wallet = localConfig.value.wallets.find(w => {
    const wid = NAME_TO_ID_MAP[w.name] || `wallet-${w.name.toLowerCase().replace(/\s+/g, '-')}`
    return wid === walletId
  })

  if (!wallet || !wallet.assets) return []
  return wallet.assets.map(a => a.name)
}

// Clear asset when originator changes
function onOriginatorChange(loan: any) {
  const assets = getWalletAssets(loan.originatorId)
  if (!assets.includes(loan.asset)) {
    loan.asset = assets.length > 0 ? assets[0] : ''
  }
}

// Pipeline preview computed properties
const walletRoleSummary = computed(() => {
  const counts = walletCounts.value
  const parts = []
  if (counts.originators > 0) parts.push(`${counts.originators} Originator${counts.originators > 1 ? 's' : ''}`)
  if (counts.borrowers > 0) parts.push(`${counts.borrowers} Borrower${counts.borrowers > 1 ? 's' : ''}`)
  if (counts.agents > 0) parts.push(`${counts.agents} Agent${counts.agents > 1 ? 's' : ''}`)
  if (counts.analysts > 0) parts.push(`${counts.analysts} Analyst${counts.analysts > 1 ? 's' : ''}`)
  if (counts.investors > 0) parts.push(`${counts.investors} Investor${counts.investors > 1 ? 's' : ''}`)
  return parts.join(', ')
})

const originatorWallets = computed(() => {
  return localConfig.value.wallets.filter(w => w.role === 'Originator' && w.assets && w.assets.length > 0)
})

const totalAssets = computed(() => {
  return originatorWallets.value.reduce((sum, w) => sum + (w.assets?.length || 0), 0)
})

// Loan action schedule - generates scheduled actions per loan based on lifecycle case
interface LoanAction {
  id: string
  loanIndex: number
  actionType: 'init' | 'update' | 'cancel' | 'accept' | 'pay' | 'complete' | 'collect' | 'default'
  label: string
  timing: string // e.g., "T-0", "T+0", "T+1mo", "T+30d"
  timingPeriod: number // period number (0 = acceptance, negative = before, positive = after)
  amount?: number // payment amount in ADA
  expectedResult: 'success' | 'failure' | 'rejection'
  isLate?: boolean
  description?: string
}

// Generate action schedule for a loan based on its lifecycle case
function generateLoanActions(loan: any, loanIndex: number): LoanAction[] {
  const actions: LoanAction[] = []
  const lifecycleCase = loan.lifecycleCase || 'T4'
  const termPayment = calculateTermPayment(loan)
  const totalPayments = loan.termMonths
  const freqLabel = getFrequencyLabel(loan.frequency)

  // All loans start with Init (pipeline T0)
  actions.push({
    id: `${loanIndex}-init`,
    loanIndex,
    actionType: 'init',
    label: 'Initialize',
    timing: 'T-0',
    timingPeriod: -1,
    expectedResult: 'success',
    description: `Create loan contract with ${loan.asset} as collateral`
  })

  switch (lifecycleCase) {
    case 'T1': // Cancel
      actions.push({
        id: `${loanIndex}-update`,
        loanIndex,
        actionType: 'update',
        label: 'Update Terms',
        timing: 'T-0',
        timingPeriod: -1,
        expectedResult: 'success',
        description: 'Seller updates contract terms'
      })
      actions.push({
        id: `${loanIndex}-cancel`,
        loanIndex,
        actionType: 'cancel',
        label: 'Cancel',
        timing: 'T-0',
        timingPeriod: -1,
        expectedResult: 'success',
        description: 'Seller cancels contract, reclaims collateral'
      })
      break

    case 'T2': // Default
      actions.push({
        id: `${loanIndex}-accept`,
        loanIndex,
        actionType: 'accept',
        label: 'Accept',
        timing: 'T+0',
        timingPeriod: 0,
        amount: termPayment,
        expectedResult: 'success',
        description: `Buyer accepts and pays first installment`
      })
      actions.push({
        id: `${loanIndex}-default`,
        loanIndex,
        actionType: 'default',
        label: 'Claim Default',
        timing: `T+2${freqLabel}`,
        timingPeriod: 2,
        expectedResult: 'success',
        description: 'Seller claims default after missed payments'
      })
      break

    case 'T3': // Nominal (0% APR)
    case 'T4': // Nominal (with interest)
    case 'T7': // Reserved + Fees
      actions.push({
        id: `${loanIndex}-accept`,
        loanIndex,
        actionType: 'accept',
        label: 'Accept',
        timing: 'T+0',
        timingPeriod: 0,
        amount: termPayment,
        expectedResult: 'success',
        description: `Buyer accepts and pays 1st of ${totalPayments} installments`
      })
      // Add payment actions for remaining installments
      for (let i = 2; i <= totalPayments; i++) {
        actions.push({
          id: `${loanIndex}-pay-${i}`,
          loanIndex,
          actionType: 'pay',
          label: `Pay #${i}`,
          timing: `T+${i-1}${freqLabel}`,
          timingPeriod: i - 1,
          amount: termPayment,
          expectedResult: 'success',
          description: `Installment ${i} of ${totalPayments}`
        })
      }
      actions.push({
        id: `${loanIndex}-complete`,
        loanIndex,
        actionType: 'complete',
        label: 'Complete',
        timing: `T+${totalPayments}${freqLabel}`,
        timingPeriod: totalPayments,
        expectedResult: 'success',
        description: 'Transfer asset ownership to buyer'
      })
      actions.push({
        id: `${loanIndex}-collect`,
        loanIndex,
        actionType: 'collect',
        label: 'Collect',
        timing: `T+${totalPayments}${freqLabel}`,
        timingPeriod: totalPayments,
        expectedResult: 'success',
        description: 'Seller collects accumulated payments'
      })
      break

    case 'T5': // Late Fee
      actions.push({
        id: `${loanIndex}-accept`,
        loanIndex,
        actionType: 'accept',
        label: 'Accept',
        timing: 'T+0',
        timingPeriod: 0,
        amount: termPayment,
        expectedResult: 'success',
        description: `Buyer accepts and pays 1st installment`
      })
      // First payment is late
      actions.push({
        id: `${loanIndex}-pay-2-late`,
        loanIndex,
        actionType: 'pay',
        label: 'Pay #2 (Late)',
        timing: `T+1${freqLabel}+`,
        timingPeriod: 1.5,
        amount: termPayment + (loan.lateFee || 10),
        expectedResult: 'success',
        isLate: true,
        description: `Late payment with ${loan.lateFee || 10} ADA fee`
      })
      // Remaining payments
      for (let i = 3; i <= totalPayments; i++) {
        actions.push({
          id: `${loanIndex}-pay-${i}`,
          loanIndex,
          actionType: 'pay',
          label: `Pay #${i}`,
          timing: `T+${i-1}${freqLabel}`,
          timingPeriod: i - 1,
          amount: termPayment,
          expectedResult: 'success'
        })
      }
      actions.push({
        id: `${loanIndex}-complete`,
        loanIndex,
        actionType: 'complete',
        label: 'Complete',
        timing: `T+${totalPayments}${freqLabel}`,
        timingPeriod: totalPayments,
        expectedResult: 'success',
        description: 'Transfer asset ownership to buyer'
      })
      actions.push({
        id: `${loanIndex}-collect`,
        loanIndex,
        actionType: 'collect',
        label: 'Collect',
        timing: `T+${totalPayments}${freqLabel}`,
        timingPeriod: totalPayments,
        expectedResult: 'success',
        description: 'Seller collects accumulated payments'
      })
      break

    case 'T6': // Reserved (Reject)
      actions.push({
        id: `${loanIndex}-accept-reject`,
        loanIndex,
        actionType: 'accept',
        label: 'Accept (Wrong Buyer)',
        timing: 'T+0',
        timingPeriod: 0,
        amount: termPayment,
        expectedResult: 'rejection',
        description: 'Non-reserved buyer attempts acceptance (expected rejection)'
      })
      break
  }

  return actions
}

// Computed: All loan action schedules
const loanActionSchedules = computed(() => {
  return localConfig.value.loans.map((loan, index) => ({
    loanIndex: index,
    loan,
    actions: generateLoanActions(loan, index)
  }))
})

// Update a loan action amount
function updateActionAmount(loanIndex: number, actionId: string, newAmount: number) {
  const schedule = loanActionSchedules.value.find(s => s.loanIndex === loanIndex)
  if (schedule) {
    const action = schedule.actions.find(a => a.id === actionId)
    if (action) {
      action.amount = newAmount
    }
  }
}

// Get borrower name from ID
function getBorrowerName(borrowerId: string | null): string | null {
  if (!borrowerId) return null
  const wallet = localConfig.value.wallets.find(w => {
    const wid = NAME_TO_ID_MAP[w.name] || `bor-${w.name.toLowerCase().replace(/\s+/g, '-')}`
    return wid === borrowerId
  })
  return wallet?.name || borrowerId
}

const validationErrors = computed(() => {
  const result = validateConfig(localConfig.value)
  const errors = [...result.errors]
  if (allocationTotal.value !== 100) {
    errors.push(`CLO tranches must sum to 100% (currently ${allocationTotal.value}%)`)
  }
  return errors
})

const isValid = computed(() => validationErrors.value.length === 0)

// Actions
function addWallet() {
  localConfig.value.wallets.push({
    name: '',
    role: 'Borrower',
    initialFunding: 1000,
  })
}

function removeWallet(index: number) {
  localConfig.value.wallets.splice(index, 1)
}

function addAsset(walletIndex: number) {
  editingWalletIndex.value = walletIndex
  newAsset.value = { name: '', quantity: 1 }
  showAssetModal.value = true
}

function removeAsset(walletIndex: number, assetIndex: number) {
  const wallet = localConfig.value.wallets[walletIndex] as WalletConfig
  if (wallet.assets) {
    wallet.assets.splice(assetIndex, 1)
  }
}

function confirmAddAsset() {
  if (editingWalletIndex.value !== null && newAsset.value.name) {
    const wallet = localConfig.value.wallets[editingWalletIndex.value] as WalletConfig
    if (!wallet.assets) {
      wallet.assets = []
    }
    wallet.assets.push({ ...newAsset.value })
    showAssetModal.value = false
  }
}

function addLoan() {
  const firstOriginator = originatorsWithAssets.value[0]
  const originatorId = firstOriginator?.id || ''
  const assets = getWalletAssets(originatorId)

  localConfig.value.loans.push({
    borrowerId: '',
    originatorId,
    agentId: null,           // Agent wallet (none by default)
    asset: assets[0] || '',
    quantity: 1,
    principal: 500,
    apr: 5,
    frequency: 12,           // Payment frequency (periods/year): 12=Monthly, 4=Quarterly
    termMonths: 12,
    reservedBuyer: false,
    lifecycleCase: 'T4',
    agentFee: 0,             // Agent referral fee in ADA
    transferFeeBuyerPercent: 50,  // Transfer fee split (buyer %)
    deferFee: false,         // Defer seller fee until end
    lateFee: 10,             // Late payment fee in ADA
  })
}

function removeLoan(index: number) {
  localConfig.value.loans.splice(index, 1)
}

function resetToDefaults() {
  localConfig.value = {
    network: 'emulator',
    wallets: JSON.parse(JSON.stringify(DEFAULT_WALLETS)),
    loans: JSON.parse(JSON.stringify(DEFAULT_LOANS)),
    clo: JSON.parse(JSON.stringify(DEFAULT_CLO)),
    monteCarlo: JSON.parse(JSON.stringify(DEFAULT_MONTE_CARLO)),
  }
  configName.value = ''
  selectedConfigId.value = null
}

function loadSelectedConfig() {
  if (!selectedConfigId.value) return

  if (selectedConfigId.value === 'default') {
    resetToDefaults()
    configName.value = 'Default MintMatrix Config'
    return
  }

  // Load from localStorage
  const configs = JSON.parse(localStorage.getItem('mintmatrix-test-configs') || '[]')
  const found = configs.find((cfg: any) => cfg.id === selectedConfigId.value)
  if (found && found.config) {
    localConfig.value = JSON.parse(JSON.stringify(found.config))
    configName.value = found.name
    console.log('Loaded config:', found.name)
  }
}

// Handle config selection change - auto-loads and persists selection
const CONFIG_STORAGE_KEY = 'mintmatrix-selected-config-id'
function onConfigSelect() {
  // Persist selection to localStorage
  if (selectedConfigId.value) {
    localStorage.setItem(CONFIG_STORAGE_KEY, selectedConfigId.value)
  } else {
    localStorage.removeItem(CONFIG_STORAGE_KEY)
  }
  // Auto-load the selected config
  if (selectedConfigId.value) {
    loadSelectedConfig()
  }
}

// Toast notification state
const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')
const showToast = ref(false)

function showNotification(message: string, type: 'success' | 'error' = 'success') {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 3000)
}

function saveConfig() {
  if (!configName.value) {
    showNotification('Please enter a configuration name', 'error')
    return
  }

  if (!isValid.value) {
    showNotification('Please fix validation errors before saving', 'error')
    return
  }

  try {
    // Save to localStorage for now (would be API in production)
    const configs = JSON.parse(localStorage.getItem('mintmatrix-test-configs') || '[]')

    // Check if updating existing config
    const existingIndex = configs.findIndex((cfg: any) => cfg.id === selectedConfigId.value)

    const configData = {
      id: existingIndex >= 0 ? selectedConfigId.value : `config-${Date.now()}`,
      name: configName.value,
      wallets: localConfig.value.wallets.length,
      loans: localConfig.value.loans.length,
      config: JSON.parse(JSON.stringify(localConfig.value)),
      updatedAt: new Date().toISOString(),
    }

    if (existingIndex >= 0) {
      // Update existing
      configs[existingIndex] = configData
    } else {
      // Add new
      configs.push(configData)
    }

    localStorage.setItem('mintmatrix-test-configs', JSON.stringify(configs))

    // Update dropdown list
    loadSavedConfigsList()

    selectedConfigId.value = configData.id
    showNotification(`Configuration "${configName.value}" saved!`, 'success')
    console.log('Config saved:', configData)
  } catch (err) {
    console.error('Error saving config:', err)
    showNotification('Failed to save configuration', 'error')
  }
}

function loadSavedConfigsList() {
  const configs = JSON.parse(localStorage.getItem('mintmatrix-test-configs') || '[]')
  savedConfigs.value = [
    { id: 'default', name: 'Default MintMatrix Config', wallets: DEFAULT_WALLETS.length, loans: DEFAULT_LOANS.length },
    ...configs.map((cfg: any) => ({
      id: cfg.id,
      name: cfg.name,
      wallets: cfg.wallets,
      loans: cfg.loans,
    }))
  ]
}

function saveAndRun() {
  if (!isValid.value) return

  // Store config in sessionStorage for the test page to pick up
  sessionStorage.setItem('mintmatrix-active-config', JSON.stringify(localConfig.value))

  // Navigate to tests page
  router.push('/tests')
}

// Load saved configs on mount
onMounted(() => {
  // Load saved configs list
  loadSavedConfigsList()

  // Initialize charts if on wallets tab
  if (activeTab.value === 'wallets') {
    initCharts()
  }

  // Check if editing existing config from route
  if (route.params.id) {
    selectedConfigId.value = route.params.id as string
    loadSelectedConfig()
    return
  }

  // Check if there's an active config from session (e.g., after Save & Run)
  const activeConfig = sessionStorage.getItem('mintmatrix-active-config')
  if (activeConfig) {
    try {
      localConfig.value = JSON.parse(activeConfig)
      return
    } catch (e) {
      console.warn('Failed to load active config:', e)
    }
  }

  // Load persisted config selection from localStorage
  const savedConfigId = localStorage.getItem(CONFIG_STORAGE_KEY)
  if (savedConfigId) {
    selectedConfigId.value = savedConfigId
    loadSelectedConfig()
  }
})
</script>

<style scoped>
/* Toast Notification */
.toast-notification {
  position: fixed;
  top: 1rem;
  right: 1rem;
  padding: 0.75rem 1.25rem;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  z-index: 9999;
  animation: slideIn 0.3s ease-out;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.toast-success {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  color: white;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.toast-error {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: white;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.config-selector {
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.config-nav .nav-link {
  color: #94a3b8;
  background: transparent;
  border: none;
  border-left: 3px solid transparent;
  border-radius: 0;
  padding: 0.75rem 1rem;
  margin-bottom: 0.25rem;
  transition: all 0.2s ease;
}

.config-nav .nav-link:hover {
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.05);
}

.config-nav .nav-link.active {
  color: #38bdf8;
  background: rgba(14, 165, 233, 0.1);
  border-left-color: #38bdf8;
}

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
.stat-chip.reserved { background: rgba(14, 165, 233, 0.2); color: #38bdf8; }
.stat-chip.open { background: rgba(249, 115, 22, 0.2); color: #fb923c; }
.stat-chip.total-ada { background: rgba(16, 185, 129, 0.2); color: #34d399; font-weight: 600; }
.stat-chip.total-ada.over-limit { background: rgba(245, 158, 11, 0.3); color: #fbbf24; }

/* Faucet Warning Styles */
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

/* Config Table Styles */
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

/* Config Input - Proper padding for visibility */
.config-input.form-control-sm,
.config-table .form-control-sm.config-input {
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
  height: auto;
  min-height: 32px;
}

/* Override for regular form-control-sm without config-input class */
.config-table .form-control-sm {
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
  height: auto;
  min-height: 32px;
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

/* Tranche styling */
.tranche-config {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tranche-row {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 0.5rem;
  padding: 1rem;
}

.tranche-inputs {
  display: grid;
  grid-template-columns: 1fr 120px 120px;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.tranche-bar-container {
  height: 24px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 0.25rem;
  overflow: hidden;
}

.tranche-bar {
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  transition: width 0.3s ease;
}

.tranche-bar.tranche-senior { background: linear-gradient(90deg, #22c55e, #16a34a); color: white; }
.tranche-bar.tranche-mezzanine { background: linear-gradient(90deg, #3b82f6, #2563eb); color: white; }
.tranche-bar.tranche-junior { background: linear-gradient(90deg, #f59e0b, #d97706); color: white; }

.validation-summary {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 0.5rem;
  padding: 1rem;
}

/* Form controls */
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

.input-group-text {
  color: #64748b;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #1e293b;
  border-radius: 0.5rem;
  padding: 1.5rem;
  width: 100%;
  max-width: 400px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-content h5 {
  color: #f1f5f9;
  margin-bottom: 1rem;
}

.gap-2 { gap: 0.5rem; }
.gap-3 { gap: 1rem; }

/* Lifecycle Case Colors */
.lifecycle-T1, select.lifecycle-T1 { background: rgba(107, 114, 128, 0.3) !important; border-left: 3px solid #6b7280; }
.lifecycle-T2, select.lifecycle-T2 { background: rgba(239, 68, 68, 0.3) !important; border-left: 3px solid #ef4444; }
.lifecycle-T3, select.lifecycle-T3 { background: rgba(34, 197, 94, 0.3) !important; border-left: 3px solid #22c55e; }
.lifecycle-T4, select.lifecycle-T4 { background: rgba(59, 130, 246, 0.3) !important; border-left: 3px solid #3b82f6; }
.lifecycle-T5, select.lifecycle-T5 { background: rgba(251, 191, 36, 0.3) !important; border-left: 3px solid #fbbf24; }
.lifecycle-T6, select.lifecycle-T6 { background: rgba(239, 68, 68, 0.2) !important; border-left: 3px solid #dc2626; }
.lifecycle-T7, select.lifecycle-T7 { background: rgba(139, 92, 246, 0.3) !important; border-left: 3px solid #8b5cf6; }

/* Lifecycle Legend */
.lifecycle-legend {
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 0.5rem;
}

.legend-items {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.legend-item {
  padding: 0.2rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  cursor: help;
}

.legend-item.lifecycle-T1 { background: rgba(107, 114, 128, 0.4); color: #d1d5db; }
.legend-item.lifecycle-T2 { background: rgba(239, 68, 68, 0.4); color: #fca5a5; }
.legend-item.lifecycle-T3 { background: rgba(34, 197, 94, 0.4); color: #86efac; }
.legend-item.lifecycle-T4 { background: rgba(59, 130, 246, 0.4); color: #93c5fd; }
.legend-item.lifecycle-T5 { background: rgba(251, 191, 36, 0.4); color: #fde047; }
.legend-item.lifecycle-T6 { background: rgba(239, 68, 68, 0.3); color: #f87171; }
.legend-item.lifecycle-T7 { background: rgba(139, 92, 246, 0.4); color: #c4b5fd; }

/* Lifecycle Cases Grid */
.lifecycle-cases-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.lifecycle-case-card {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 0.5rem;
  padding: 1rem;
  border-left: 4px solid #475569;
}

.lifecycle-case-card.lc-T1 { border-left-color: #6b7280; }
.lifecycle-case-card.lc-T2 { border-left-color: #ef4444; }
.lifecycle-case-card.lc-T3 { border-left-color: #22c55e; }
.lifecycle-case-card.lc-T4 { border-left-color: #3b82f6; }
.lifecycle-case-card.lc-T5 { border-left-color: #fbbf24; }
.lifecycle-case-card.lc-T6 { border-left-color: #dc2626; }
.lifecycle-case-card.lc-T7 { border-left-color: #8b5cf6; }

.lc-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.lc-id {
  font-weight: 700;
  font-size: 0.9rem;
  padding: 0.2rem 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 0.25rem;
}

.lc-short {
  font-weight: 600;
  color: #e2e8f0;
}

.lc-description {
  font-size: 0.8rem;
  color: #94a3b8;
  margin-bottom: 0.75rem;
}

.lc-phases {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.phase-chip {
  font-size: 0.7rem;
  padding: 0.15rem 0.4rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 0.2rem;
  color: #94a3b8;
}

/* Dark card override */
.card.bg-dark {
  background: rgba(0, 0, 0, 0.3) !important;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.card.bg-dark .card-header {
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.card.bg-dark .card-header h6 {
  color: #e2e8f0;
}

/* Form check styling */
.form-check-input {
  background-color: rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.2);
}

.form-check-input:checked {
  background-color: #3b82f6;
  border-color: #3b82f6;
}

.form-check-label {
  color: #e2e8f0;
}

/* Lifecycle Tab Styles */
.lifecycle-tab .panel-header {
  margin-bottom: 1rem;
}

.time-control-panel {
  text-align: right;
}

.time-display {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  display: inline-block;
}

.time-display.preview-mode {
  border-color: rgba(34, 197, 94, 0.3);
}

.network-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #64748b;
  margin-bottom: 0.25rem;
}

.time-value {
  font-family: 'SF Mono', monospace;
  font-size: 0.9rem;
  color: #e2e8f0;
}

.time-separator {
  margin: 0 0.5rem;
  color: #475569;
}

.elapsed-time {
  color: #38bdf8;
}

.time-controls {
  display: flex;
  gap: 0.25rem;
  justify-content: flex-end;
}

.time-controls .btn {
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
}

/* Pipeline Preview */
.pipeline-preview {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  overflow: hidden;
}

.pipeline-preview .phase-timeline {
  display: flex;
  flex-direction: column;
}

.pipeline-preview .phase-block {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.pipeline-preview .phase-block:last-child {
  border-bottom: none;
}

.pipeline-preview .phase-header {
  padding: 0.75rem 1rem;
  cursor: default;
}

.pipeline-preview .phase-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.8rem;
  flex-shrink: 0;
  margin-right: 0.75rem;
}

.pipeline-preview .phase-title {
  font-weight: 600;
  color: #e2e8f0;
  font-size: 0.9rem;
}

.pipeline-preview .phase-description {
  font-size: 0.75rem;
  color: #64748b;
}

.pipeline-preview .phase-steps {
  padding: 0.25rem 1rem 0.75rem 3.5rem;
  background: rgba(0, 0, 0, 0.1);
}

.pipeline-preview .phase-step-item {
  display: flex;
  align-items: center;
  padding: 0.35rem 0.5rem;
  margin-bottom: 0.25rem;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 4px;
  font-size: 0.8rem;
}

.pipeline-preview .phase-step-item:last-child {
  margin-bottom: 0;
}

.pipeline-preview .step-status-icon {
  width: 20px;
  margin-right: 0.5rem;
  text-align: center;
}

.pipeline-preview .step-action-bubble {
  display: inline-block;
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-right: 0.5rem;
}

.pipeline-preview .step-entity-text {
  color: #cbd5e1;
  font-size: 0.8rem;
}

/* Lifecycle badge in steps */
.lifecycle-badge {
  font-size: 0.6rem;
  font-weight: 700;
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
  background: rgba(59, 130, 246, 0.3);
  color: #93c5fd;
}

.lifecycle-badge.lc-T1 { background: rgba(107, 114, 128, 0.3); color: #d1d5db; }
.lifecycle-badge.lc-T2 { background: rgba(239, 68, 68, 0.3); color: #fca5a5; }
.lifecycle-badge.lc-T3 { background: rgba(34, 197, 94, 0.3); color: #86efac; }
.lifecycle-badge.lc-T4 { background: rgba(59, 130, 246, 0.3); color: #93c5fd; }
.lifecycle-badge.lc-T5 { background: rgba(251, 191, 36, 0.3); color: #fde047; }
.lifecycle-badge.lc-T6 { background: rgba(239, 68, 68, 0.2); color: #f87171; }
.lifecycle-badge.lc-T7 { background: rgba(139, 92, 246, 0.3); color: #c4b5fd; }

/* Action colors (matching tests.css) */
.action-create { background: rgba(168, 85, 247, 0.2); color: #c084fc; }
.action-fund { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
.action-mint { background: rgba(16, 185, 129, 0.2); color: #34d399; }
.action-loan { background: rgba(6, 182, 212, 0.2); color: #22d3ee; }
.action-accept { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
.action-clo { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
.action-payment { background: rgba(139, 92, 246, 0.2); color: #a78bfa; }
.action-disabled { opacity: 0.5; background: rgba(108, 117, 125, 0.15) !important; color: #6c757d !important; }

.step-disabled { opacity: 0.6; }
.step-disabled .step-entity-text { text-decoration: line-through; }
.step-disabled-reason { font-size: 0.7rem; color: #6c757d; font-style: italic; }

/* Compact lifecycle cases */
.lifecycle-cases-compact {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.lc-compact {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-left: 3px solid #475569;
  cursor: help;
}

.lc-compact .lc-id {
  font-weight: 700;
  padding: 0.1rem 0.25rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.lc-compact .lc-short {
  color: #94a3b8;
}

.lc-compact.lc-T1 { border-left-color: #6b7280; }
.lc-compact.lc-T2 { border-left-color: #ef4444; }
.lc-compact.lc-T3 { border-left-color: #22c55e; }
.lc-compact.lc-T4 { border-left-color: #3b82f6; }
.lc-compact.lc-T5 { border-left-color: #fbbf24; }
.lc-compact.lc-T6 { border-left-color: #dc2626; }
.lc-compact.lc-T7 { border-left-color: #8b5cf6; }

.lc-compact.lc-C1 { border-left-color: #3b82f6; }
.lc-compact.lc-C2 { border-left-color: #f59e0b; }
.lc-compact.lc-C3 { border-left-color: #ef4444; }
.lc-compact.lc-C4 { border-left-color: #8b5cf6; }

/* Floating Charts Container */
.floating-charts-container {
  position: sticky;
  top: 1rem;
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
}

.chart-card {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  overflow: hidden;
}

.chart-card-header {
  background: rgba(0, 0, 0, 0.3);
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.chart-card-header h5 {
  margin: 0;
  font-size: 0.9rem;
  color: #e2e8f0;
  font-weight: 600;
}

.chart-card-body {
  padding: 1rem;
}

.chart-wrapper {
  height: 180px;
  position: relative;
}

/* Asset Mint Items */
.asset-mint-item {
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.asset-mint-item:last-child {
  border-bottom: none;
}

.asset-name {
  font-weight: 600;
  color: #e2e8f0;
  font-size: 0.85rem;
}

.asset-qty {
  color: #94a3b8;
  font-size: 0.8rem;
}

.asset-allocation-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  margin: 0.35rem 0;
  overflow: hidden;
}

.allocation-used {
  height: 100%;
  background: linear-gradient(90deg, #22c55e, #16a34a);
  border-radius: 3px;
  transition: width 0.3s ease;
}

/* Loans Table Wide - for scrolling */
.loans-table-wide {
  overflow-x: auto;
}

.loans-table-wide table {
  min-width: 1200px;
}

/* Transfer Fee Split Input */
.transfer-fee-split {
  display: flex;
  align-items: center;
  gap: 2px;
}

.fee-split-input {
  width: 38px !important;
  padding: 0.2rem 0.25rem;
  text-align: center;
  font-size: 0.75rem;
}

.fee-split-divider {
  color: #64748b;
  font-size: 0.8rem;
}

/* Responsive adjustments */
@media (max-width: 991px) {
  .floating-charts-container {
    position: relative;
    top: 0;
  }
}

/* Config panel takes available width */
.config-panel {
  max-width: 100%;
}

/* Assets Reference Bar (Loans Tab) */
.assets-reference-bar {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
}

.asset-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.asset-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.8rem;
  background: rgba(139, 92, 246, 0.2);
  border: 1px solid rgba(139, 92, 246, 0.3);
  color: #c4b5fd;
}

.asset-pill.fully-allocated {
  background: rgba(34, 197, 94, 0.2);
  border-color: rgba(34, 197, 94, 0.3);
  color: #86efac;
}

.asset-pill.partially-allocated {
  background: rgba(245, 158, 11, 0.2);
  border-color: rgba(245, 158, 11, 0.3);
  color: #fcd34d;
}

.asset-pill.over-allocated {
  background: rgba(239, 68, 68, 0.25);
  border-color: rgba(239, 68, 68, 0.5);
  color: #fca5a5;
}

.asset-pill-originator {
  font-size: 0.7rem;
  color: #94a3b8;
  padding-right: 0.25rem;
  border-right: 1px solid rgba(255, 255, 255, 0.15);
  margin-right: 0.25rem;
}

.asset-pill-count {
  font-weight: 600;
  background: rgba(255, 255, 255, 0.1);
  padding: 0.1rem 0.4rem;
  border-radius: 0.25rem;
}

.asset-pill-count.over {
  background: rgba(239, 68, 68, 0.3);
  color: #f87171;
}

.asset-pill-remaining {
  font-size: 0.7rem;
  opacity: 0.8;
}

.asset-pill-warning {
  font-size: 0.7rem;
  color: #f87171;
  font-weight: 600;
}

/* Loans Reference Bar (CLO Tab) */
.loans-reference-bar {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
}

.loan-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.loan-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.6rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  background: rgba(59, 130, 246, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.loan-pill.eligible {
  color: #93c5fd;
}

.loan-pill.ineligible {
  background: rgba(107, 114, 128, 0.2);
  border-color: rgba(107, 114, 128, 0.3);
  color: #9ca3af;
  opacity: 0.7;
  text-decoration: line-through;
}

.loan-pill-asset {
  font-weight: 600;
}

.loan-pill-amount {
  color: #94a3b8;
}

.loan-pill-lifecycle {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.1rem 0.3rem;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.1);
}

.loan-pill-lifecycle.lc-T1 { background: rgba(107, 114, 128, 0.3); color: #d1d5db; }
.loan-pill-lifecycle.lc-T2 { background: rgba(239, 68, 68, 0.3); color: #fca5a5; }
.loan-pill-lifecycle.lc-T3 { background: rgba(34, 197, 94, 0.3); color: #86efac; }
.loan-pill-lifecycle.lc-T4 { background: rgba(59, 130, 246, 0.3); color: #93c5fd; }
.loan-pill-lifecycle.lc-T5 { background: rgba(251, 191, 36, 0.3); color: #fde047; }
.loan-pill-lifecycle.lc-T6 { background: rgba(239, 68, 68, 0.2); color: #f87171; }
.loan-pill-lifecycle.lc-T7 { background: rgba(139, 92, 246, 0.3); color: #c4b5fd; }

/* Distribution Charts Row */
.distribution-charts-row {
  margin-top: 1.5rem;
}

/* Narrow inputs for numeric fields */
.input-narrow {
  width: 70px !important;
  min-width: 70px;
  text-align: center;
}

/* Transfer Fee Configuration */
.transfer-fee-config {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
}

.fee-display {
  font-size: 0.85rem;
}

.buyer-label {
  color: #60a5fa;
}

.seller-label {
  color: #a78bfa;
}

.fee-slider-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.fee-slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 8px;
  background: linear-gradient(to right, rgba(96, 165, 250, 0.4), rgba(167, 139, 250, 0.4));
  border-radius: 4px;
  outline: none;
}

.fee-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  background: #e2e8f0;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.fee-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: #e2e8f0;
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.slider-label {
  font-size: 0.75rem;
  font-weight: 600;
  min-width: 40px;
}

.deferment-option {
  padding-top: 0.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

/* Loan Calculations */
.loan-calculations {
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.5rem;
  padding: 1rem;
}

.calculations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.75rem;
}

.loan-calc-card {
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.375rem;
  overflow: hidden;
}

.calc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.calc-asset {
  font-weight: 600;
  color: #e2e8f0;
  font-size: 0.85rem;
}

.calc-principal {
  font-size: 0.75rem;
  color: #94a3b8;
}

.calc-body {
  padding: 0.5rem 0.75rem;
}

.calc-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.2rem 0;
  font-size: 0.8rem;
}

.calc-row.total {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 0.25rem;
  padding-top: 0.35rem;
}

.calc-label {
  color: #94a3b8;
}

.calc-value {
  font-weight: 500;
  color: #e2e8f0;
}

/* CLO Loan Pills with Calculations */
.loan-pills-clo {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.5rem;
}

.loan-pill-clo {
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 0.375rem;
  overflow: hidden;
  font-size: 0.75rem;
}

.loan-pill-clo.eligible {
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.3);
}

.loan-pill-clo.ineligible {
  background: rgba(107, 114, 128, 0.15);
  border-color: rgba(107, 114, 128, 0.3);
  opacity: 0.6;
}

.loan-pill-clo.ineligible .loan-pill-clo-body {
  text-decoration: line-through;
}

.loan-pill-clo-header {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.loan-pill-index {
  font-weight: 700;
  font-size: 0.7rem;
  background: rgba(59, 130, 246, 0.3);
  color: #93c5fd;
  padding: 0.1rem 0.3rem;
  border-radius: 2px;
}

.loan-pill-asset {
  flex: 1;
}

.loan-pill-clo-body {
  padding: 0.35rem 0.5rem;
}

.loan-pill-row {
  display: flex;
  justify-content: space-between;
  padding: 0.1rem 0;
}

.loan-pill-row.total {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 0.15rem;
  padding-top: 0.2rem;
  font-weight: 600;
}

.loan-pill-label {
  color: #94a3b8;
  font-size: 0.7rem;
}

.loan-pill-value {
  color: #e2e8f0;
}

/* Drag Handle */
.drag-handle {
  cursor: grab;
  color: #475569;
  text-align: center;
  width: 30px;
  padding: 0.4rem 0.25rem !important;
}

.drag-handle:hover {
  color: #94a3b8;
}

.drag-handle:active {
  cursor: grabbing;
}

/* Drag-over state for reordering */
tr.drag-over {
  background: rgba(59, 130, 246, 0.15) !important;
  border-top: 2px solid #3b82f6;
}

/* Loan Index Column */
.loan-index {
  font-weight: 700;
  color: #94a3b8;
  text-align: center;
  font-size: 0.85rem;
}

/* Loan Index in Calc Cards */
.calc-index {
  font-weight: 700;
  font-size: 0.7rem;
  background: rgba(59, 130, 246, 0.3);
  color: #93c5fd;
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  margin-right: 0.5rem;
}

/* Sortable Headers */
.sortable-header {
  cursor: pointer;
  user-select: none;
  transition: background 0.15s ease;
}

.sortable-header:hover {
  background: rgba(255, 255, 255, 0.05);
}

.sortable-header i {
  margin-left: 0.25rem;
  font-size: 0.65rem;
  opacity: 0.8;
}

/* Compact Fee Split in Row */
.fee-split-compact {
  display: flex;
  align-items: center;
  gap: 2px;
}

.fee-split-compact .fee-input {
  width: 42px !important;
  min-width: 42px;
  text-align: center;
  padding: 0.25rem 0.3rem;
  font-size: 0.8rem;
}

.fee-divider {
  color: #64748b;
  font-size: 0.75rem;
}

.fee-seller {
  color: #a78bfa;
  font-size: 0.8rem;
  font-weight: 500;
  min-width: 28px;
  text-align: center;
}

/* Frequency Select */
.frequency-select {
  font-size: 0.75rem !important;
  padding: 0.25rem 0.4rem !important;
}

.frequency-select option.text-danger {
  color: #ef4444 !important;
  background: rgba(239, 68, 68, 0.1);
}

/* Defer checkbox styling */
.loans-table .form-check-input {
  margin: 0;
  position: relative;
}

.loans-table .form-check-input:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Loan Action Schedules */
.loan-action-schedules h5 {
  color: #e2e8f0;
  font-weight: 600;
}

.loan-schedules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
}

.loan-schedule-card {
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  overflow: hidden;
  border-left: 4px solid #3b82f6;
}

/* Lifecycle border colors */
.loan-schedule-card.lc-border-T1 { border-left-color: #6b7280; }
.loan-schedule-card.lc-border-T2 { border-left-color: #ef4444; }
.loan-schedule-card.lc-border-T3 { border-left-color: #22c55e; }
.loan-schedule-card.lc-border-T4 { border-left-color: #3b82f6; }
.loan-schedule-card.lc-border-T5 { border-left-color: #fbbf24; }
.loan-schedule-card.lc-border-T6 { border-left-color: #dc2626; }
.loan-schedule-card.lc-border-T7 { border-left-color: #8b5cf6; }

.loan-schedule-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.loan-schedule-index {
  font-weight: 700;
  font-size: 1rem;
  color: #94a3b8;
  min-width: 32px;
}

.loan-schedule-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.loan-schedule-asset {
  font-weight: 600;
  color: #e2e8f0;
  font-size: 0.9rem;
}

.loan-schedule-principal {
  font-size: 0.75rem;
  color: #94a3b8;
}

/* Action Timeline */
.loan-action-timeline {
  padding: 0.5rem 0;
  max-height: 300px;
  overflow-y: auto;
}

.action-item {
  display: flex;
  align-items: center;
  padding: 0.35rem 1rem;
  gap: 0.5rem;
  border-left: 2px solid transparent;
  margin-left: 0.5rem;
  transition: background 0.15s ease;
}

.action-item:hover {
  background: rgba(255, 255, 255, 0.03);
}

.action-item.action-pre-t0 {
  border-left-color: #6b7280;
}

.action-item.action-t0 {
  border-left-color: #22c55e;
  background: rgba(34, 197, 94, 0.05);
}

.action-item.action-post-t0 {
  border-left-color: #3b82f6;
}

.action-item.action-late {
  border-left-color: #fbbf24;
  background: rgba(251, 191, 36, 0.05);
}

.action-item.action-rejection {
  border-left-color: #ef4444;
  background: rgba(239, 68, 68, 0.05);
}

.action-timing {
  font-family: 'SF Mono', monospace;
  font-size: 0.7rem;
  color: #64748b;
  min-width: 50px;
  text-align: right;
}

.action-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.action-type-badge {
  display: inline-block;
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
}

.action-type-badge.action-init { background: rgba(139, 92, 246, 0.2); color: #c4b5fd; }
.action-type-badge.action-update { background: rgba(14, 165, 233, 0.2); color: #7dd3fc; }
.action-type-badge.action-cancel { background: rgba(107, 114, 128, 0.3); color: #d1d5db; }
.action-type-badge.action-accept { background: rgba(34, 197, 94, 0.2); color: #86efac; }
.action-type-badge.action-pay { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }
.action-type-badge.action-complete { background: rgba(16, 185, 129, 0.2); color: #6ee7b7; }
.action-type-badge.action-collect { background: rgba(245, 158, 11, 0.2); color: #fcd34d; }
.action-type-badge.action-default { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }

.action-amount {
  font-size: 0.75rem;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.action-amount-input {
  width: 60px;
  padding: 0.15rem 0.3rem;
  font-size: 0.75rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 3px;
  color: #e2e8f0;
  text-align: right;
}

.action-amount-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.action-late-badge {
  font-size: 0.65rem;
  padding: 0.1rem 0.3rem;
  background: rgba(251, 191, 36, 0.2);
  color: #fcd34d;
  border-radius: 2px;
}

.action-rejection-badge {
  font-size: 0.65rem;
  padding: 0.1rem 0.3rem;
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  border-radius: 2px;
}

/* Loan Schedule Summary */
.loan-schedule-summary {
  display: flex;
  gap: 1rem;
  padding: 0.5rem 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.summary-item {
  font-size: 0.7rem;
  color: #64748b;
}

.summary-item i {
  margin-right: 0.25rem;
}

/* CLO Phase Preview */
.clo-phase-preview h5 {
  color: #e2e8f0;
  font-weight: 600;
}

.clo-phase-preview .phase-block {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  padding: 0.5rem;
}

.clo-phase-preview .phase-steps {
  padding: 0;
}
</style>
