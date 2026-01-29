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
        <label class="text-muted mb-0">Load Configuration:</label>
        <select v-model="selectedConfigId" class="form-control form-control-sm" style="max-width: 300px;">
          <option :value="null">-- New Configuration --</option>
          <option v-for="cfg in savedConfigs" :key="cfg.id" :value="cfg.id">
            {{ cfg.name }} ({{ cfg.wallets }} wallets, {{ cfg.loans }} loans)
          </option>
        </select>
        <button class="btn btn-sm btn-outline-info" @click="loadSelectedConfig" :disabled="!selectedConfigId">
          <i class="fas fa-download mr-1"></i> Load
        </button>
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
                  <th style="width: 130px;">Role</th>
                  <th style="min-width: 180px;">Name</th>
                  <th style="width: 110px;">Initial ADA</th>
                  <th style="min-width: 220px;">Assets</th>
                  <th style="width: 50px;"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(wallet, index) in localConfig.wallets" :key="index" :class="'role-' + wallet.role.toLowerCase()">
                  <td>
                    <select v-model="wallet.role" class="form-control form-control-sm">
                      <option value="Originator">Originator</option>
                      <option value="Borrower">Borrower</option>
                      <option value="Analyst">Analyst</option>
                      <option value="Investor">Investor</option>
                    </select>
                  </td>
                  <td>
                    <input v-model="wallet.name" type="text" class="form-control form-control-sm" placeholder="Wallet name" />
                  </td>
                  <td>
                    <input v-model.number="wallet.initialFunding" type="number" class="form-control form-control-sm" />
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

          <!-- Testnet Faucet Warning -->
          <div v-if="localConfig.network === 'preview' && totalInitialAda > 9950" class="alert alert-warning faucet-warning mt-3 mb-0">
            <div class="d-flex align-items-start">
              <i class="fas fa-exclamation-triangle mr-3 mt-1"></i>
              <div>
                <strong>Testnet Faucet Limit Exceeded</strong>
                <p class="mb-1">
                  Total initial ADA: <strong>{{ totalInitialAda.toLocaleString() }} ADA</strong> exceeds the faucet limit of ~10,000 ADA.
                </p>
                <small class="text-muted">
                  The Preview testnet faucet provides ~10,000 ADA per request. You'll need to fund one wallet from the faucet,
                  then redistribute to other wallets. Consider reducing initial funding amounts or running multiple faucet requests.
                </small>
              </div>
            </div>
          </div>

          <!-- Testnet Info (when under limit) -->
          <div v-else-if="localConfig.network === 'preview'" class="alert alert-info faucet-info mt-3 mb-0">
            <div class="d-flex align-items-center">
              <i class="fas fa-info-circle mr-2"></i>
              <span>
                Total initial ADA: <strong>{{ totalInitialAda.toLocaleString() }} ADA</strong>
                <span class="text-muted ml-2">(within faucet limit of ~10,000 ADA)</span>
              </span>
            </div>
          </div>

          <div class="panel-footer">
            <div class="stat-chips">
              <span class="stat-chip originator">{{ walletCounts.originators }} Originators</span>
              <span class="stat-chip borrower">{{ walletCounts.borrowers }} Borrowers</span>
              <span class="stat-chip analyst">{{ walletCounts.analysts }} Analysts</span>
              <span class="stat-chip investor">{{ walletCounts.investors }} Investors</span>
              <span class="stat-chip total-ada" :class="{ 'over-limit': localConfig.network === 'preview' && totalInitialAda > 9950 }">
                {{ totalInitialAda.toLocaleString() }} ADA Total
              </span>
            </div>
          </div>
        </div>

        <!-- Loans Tab -->
        <div v-if="activeTab === 'loans'" class="config-panel">
          <div class="panel-header">
            <h4>Loan Configuration</h4>
            <p class="text-muted">Define loan contracts between originators and borrowers</p>
            <button class="btn btn-primary" @click="addLoan">
              <i class="fas fa-plus mr-1"></i> Add Loan
            </button>
          </div>

          <div class="table-responsive">
            <table class="table table-dark config-table">
              <thead>
                <tr>
                  <th style="min-width: 140px;">Originator</th>
                  <th style="min-width: 110px;">Asset</th>
                  <th style="width: 55px;">Qty</th>
                  <th style="width: 90px;">Principal</th>
                  <th style="width: 65px;">APR %</th>
                  <th style="width: 70px;">Term</th>
                  <th style="min-width: 130px;">Borrower</th>
                  <th style="min-width: 130px;">
                    Lifecycle
                    <i class="fas fa-info-circle ml-1 text-info" style="cursor: help;" title="Test scenario to run for this loan"></i>
                  </th>
                  <th style="width: 40px;"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(loan, index) in localConfig.loans" :key="index">
                  <td>
                    <select v-model="loan.originatorId" class="form-control form-control-sm" @change="onOriginatorChange(loan)">
                      <option v-for="w in allWalletOptions" :key="w.id" :value="w.id">{{ w.name }}</option>
                    </select>
                  </td>
                  <td>
                    <select v-model="loan.asset" class="form-control form-control-sm">
                      <option value="">-- Select --</option>
                      <option v-for="asset in getWalletAssets(loan.originatorId)" :key="asset" :value="asset">
                        {{ asset }}
                      </option>
                    </select>
                  </td>
                  <td>
                    <input v-model.number="loan.quantity" type="number" min="1" class="form-control form-control-sm" />
                  </td>
                  <td>
                    <input v-model.number="loan.principal" type="number" class="form-control form-control-sm" />
                  </td>
                  <td>
                    <input v-model.number="loan.apr" type="number" step="0.1" class="form-control form-control-sm" />
                  </td>
                  <td>
                    <input v-model.number="loan.termMonths" type="number" class="form-control form-control-sm" />
                  </td>
                  <td>
                    <select v-model="loan.borrowerId" class="form-control form-control-sm">
                      <option :value="null">Open Market</option>
                      <option v-for="b in borrowerOptions" :key="b.id" :value="b.id">{{ b.name }}</option>
                    </select>
                  </td>
                  <td>
                    <select v-model="loan.lifecycleCase" class="form-control form-control-sm" :class="'lifecycle-' + (loan.lifecycleCase || 'T4')">
                      <option v-for="lc in lifecycleCases" :key="lc.id" :value="lc.id" :title="lc.description">
                        {{ lc.id }}: {{ lc.short }}
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

          <div class="row">
            <div class="col-md-6">
              <div class="form-group">
                <label>CLO Name</label>
                <input v-model="localConfig.clo!.name" type="text" class="form-control" placeholder="CLO Series Name" />
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
          <div class="panel-header d-flex justify-content-between align-items-start">
            <div>
              <h4>Pipeline Lifecycle</h4>
              <p class="text-muted mb-0">Preview and configure the test execution sequence</p>
            </div>
            <!-- Time Display -->
            <div class="time-control-panel">
              <div class="time-display" :class="{ 'preview-mode': localConfig.network === 'preview' }">
                <div class="network-label">
                  {{ localConfig.network === 'emulator' ? 'Simulated Time' : 'Preview Testnet' }}
                </div>
                <div class="time-value">
                  <i class="fas fa-clock mr-2"></i>
                  <span>Slot {{ simulatedSlot }}</span>
                  <span class="time-separator">|</span>
                  <span class="elapsed-time">{{ formatElapsedTime(simulatedSlot) }}</span>
                </div>
              </div>
              <div v-if="localConfig.network === 'emulator'" class="time-controls mt-2">
                <button class="btn btn-sm btn-outline-info" @click="stepTimeForward(1)" title="Advance 1 slot">
                  <i class="fas fa-step-forward"></i> +1
                </button>
                <button class="btn btn-sm btn-outline-info" @click="stepTimeForward(100)" title="Advance 100 slots">
                  <i class="fas fa-forward"></i> +100
                </button>
                <button class="btn btn-sm btn-outline-info" @click="stepTimeForward(43200)" title="Advance 1 day (~43200 slots)">
                  <i class="fas fa-calendar-day"></i> +1 Day
                </button>
                <button class="btn btn-sm btn-outline-secondary" @click="resetTime" title="Reset to slot 0">
                  <i class="fas fa-undo"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- Settings Row -->
          <div class="row mb-4">
            <div class="col-md-4">
              <div class="form-group mb-0">
                <label class="small text-muted">Step Delay</label>
                <div class="input-group input-group-sm">
                  <input v-model.number="localConfig.lifecycle.stepDelay" type="number" min="0" max="5000" class="form-control" />
                  <span class="input-group-text">ms</span>
                </div>
              </div>
            </div>
            <div class="col-md-8">
              <label class="small text-muted d-block">Options</label>
              <div class="d-flex gap-3">
                <div class="form-check form-check-inline">
                  <input type="checkbox" class="form-check-input" id="pausePhase" v-model="localConfig.lifecycle.pauseOnPhase" />
                  <label class="form-check-label small" for="pausePhase">Pause between phases</label>
                </div>
                <div class="form-check form-check-inline">
                  <input type="checkbox" class="form-check-input" id="pauseErr" v-model="localConfig.lifecycle.pauseOnError" />
                  <label class="form-check-label small" for="pauseErr">Pause on error</label>
                </div>
                <div class="form-check form-check-inline">
                  <input type="checkbox" class="form-check-input" id="verbose" v-model="localConfig.lifecycle.verboseLogging" />
                  <label class="form-check-label small" for="verbose">Verbose</label>
                </div>
              </div>
            </div>
          </div>

          <!-- Pipeline Preview -->
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

              <!-- Phase 4: Accept Loans -->
              <div class="phase-block">
                <div class="phase-header d-flex align-items-center justify-content-between">
                  <div class="d-flex align-items-center">
                    <div class="phase-number">4</div>
                    <div class="phase-info">
                      <div class="phase-title">Accept Loan Contracts</div>
                      <div class="phase-description">Buyers accept loans and make first payment to activate</div>
                    </div>
                  </div>
                  <div class="d-flex align-items-center gap-2">
                    <span class="badge badge-secondary">{{ acceptableLoansCount }} accepts</span>
                  </div>
                </div>
                <div class="phase-steps">
                  <div v-for="(loan, li) in acceptableLoans" :key="'accept-' + li" class="phase-step-item" :class="{ 'step-disabled': loan.lifecycleCase === 'T1' }">
                    <div class="d-flex align-items-center">
                      <div class="step-status-icon">
                        <i v-if="loan.lifecycleCase === 'T1'" class="fas fa-ban text-secondary"></i>
                        <i v-else-if="loan.lifecycleCase === 'T6'" class="fas fa-times-circle text-danger" title="Expected rejection"></i>
                        <i v-else class="far fa-circle text-muted"></i>
                      </div>
                      <span class="step-action-bubble action-accept" :class="{ 'action-disabled': loan.lifecycleCase === 'T1' }">Accept</span>
                      <span class="step-entity-text" :class="{ 'text-muted': loan.lifecycleCase === 'T1' }">
                        {{ getBorrowerName(loan.borrowerId) || 'Available Buyer' }} → {{ loan.asset }} Loan
                        <span v-if="loan.lifecycleCase === 'T1'" class="step-disabled-reason">(Skipped - Cancel case)</span>
                        <span v-if="loan.lifecycleCase === 'T6'" class="text-danger ml-1">(Expected rejection)</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Phase 5: CLO -->
              <div class="phase-block">
                <div class="phase-header d-flex align-items-center justify-content-between">
                  <div class="d-flex align-items-center">
                    <div class="phase-number">5</div>
                    <div class="phase-info">
                      <div class="phase-title">CLO Bundle & Distribution</div>
                      <div class="phase-description">Bundle collateral into CLO with tranches</div>
                    </div>
                  </div>
                  <div class="d-flex align-items-center gap-2">
                    <span class="badge badge-secondary">{{ localConfig.clo?.tranches.length }} tranches</span>
                  </div>
                </div>
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
                      <span class="step-entity-text">Collateral Tokens from active loans</span>
                    </div>
                  </div>
                  <div class="phase-step-item">
                    <div class="d-flex align-items-center">
                      <div class="step-status-icon"><i class="far fa-circle text-muted"></i></div>
                      <span class="step-action-bubble action-clo">Mint</span>
                      <span class="step-entity-text">Tranche Tokens (Senior, Mezzanine, Junior)</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Phase 6: Payments -->
              <div class="phase-block">
                <div class="phase-header d-flex align-items-center justify-content-between">
                  <div class="d-flex align-items-center">
                    <div class="phase-number">6</div>
                    <div class="phase-info">
                      <div class="phase-title">Make Loan Payments</div>
                      <div class="phase-description">Borrowers make scheduled payments on their loans</div>
                    </div>
                  </div>
                  <div class="d-flex align-items-center gap-2">
                    <span class="badge badge-secondary">{{ payableLoansCount }} loans</span>
                  </div>
                </div>
                <div class="phase-steps">
                  <div v-for="(loan, li) in payableLoans" :key="'pay-' + li" class="phase-step-item" :class="{ 'step-disabled': ['T1', 'T2', 'T6'].includes(loan.lifecycleCase || 'T4') }">
                    <div class="d-flex align-items-center">
                      <div class="step-status-icon">
                        <i v-if="['T1', 'T2', 'T6'].includes(loan.lifecycleCase || 'T4')" class="fas fa-ban text-secondary"></i>
                        <i v-else class="far fa-circle text-muted"></i>
                      </div>
                      <span class="step-action-bubble action-payment" :class="{ 'action-disabled': ['T1', 'T2', 'T6'].includes(loan.lifecycleCase || 'T4') }">Pay</span>
                      <span class="step-entity-text" :class="{ 'text-muted': ['T1', 'T2', 'T6'].includes(loan.lifecycleCase || 'T4') }">
                        {{ getBorrowerName(loan.borrowerId) || 'Borrower' }} → {{ loan.asset }} Loan
                        <span v-if="loan.lifecycleCase === 'T5'" class="text-warning ml-1">(Late)</span>
                        <span v-if="['T1', 'T2', 'T6'].includes(loan.lifecycleCase || 'T4')" class="step-disabled-reason">(Skipped)</span>
                      </span>
                    </div>
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
                </select>
                <small class="form-text text-muted">
                  Emulator runs locally with instant transactions. Preview uses real testnet.
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
import { ref, computed, onMounted } from 'vue'
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

// Simulated time for emulator
const simulatedSlot = ref(0)

// Default lifecycle config
const DEFAULT_LIFECYCLE = {
  timeScale: 'instant' as 'instant' | 'fast' | 'realistic',
  stepDelay: 400,
  pauseOnPhase: false,
  pauseOnError: true,
  verboseLogging: false,
}

// Local config state
const localConfig = ref<PipelineConfig & { lifecycle: typeof DEFAULT_LIFECYCLE }>({
  network: 'emulator',
  wallets: JSON.parse(JSON.stringify(DEFAULT_WALLETS)),
  loans: JSON.parse(JSON.stringify(DEFAULT_LOANS)),
  clo: JSON.parse(JSON.stringify(DEFAULT_CLO)),
  monteCarlo: JSON.parse(JSON.stringify(DEFAULT_MONTE_CARLO)),
  lifecycle: { ...DEFAULT_LIFECYCLE },
})

// Asset modal
const showAssetModal = ref(false)
const editingWalletIndex = ref<number | null>(null)
const newAsset = ref({ name: '', quantity: 1 })

// Computed
const walletCounts = computed(() => ({
  originators: localConfig.value.wallets.filter(w => w.role === 'Originator').length,
  borrowers: localConfig.value.wallets.filter(w => w.role === 'Borrower').length,
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

const allocationTotal = computed(() => {
  return localConfig.value.clo?.tranches.reduce((sum, t) => sum + t.allocation, 0) || 0
})

const borrowerOptions = computed(() => {
  return localConfig.value.wallets
    .filter(w => w.role === 'Borrower')
    .map(w => ({ id: NAME_TO_ID_MAP[w.name] || `bor-${w.name.toLowerCase().replace(/\s+/g, '-')}`, name: w.name }))
})

// All wallets for originator dropdown (any wallet can originate)
const allWalletOptions = computed(() => {
  return localConfig.value.wallets.map(w => ({
    id: NAME_TO_ID_MAP[w.name] || `wallet-${w.name.toLowerCase().replace(/\s+/g, '-')}`,
    name: w.name,
    role: w.role
  }))
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

const acceptableLoans = computed(() => {
  return localConfig.value.loans
})

const acceptableLoansCount = computed(() => {
  return localConfig.value.loans.filter(l => l.lifecycleCase !== 'T1').length
})

const payableLoans = computed(() => {
  return localConfig.value.loans
})

const payableLoansCount = computed(() => {
  return localConfig.value.loans.filter(l => !['T1', 'T2', 'T6'].includes(l.lifecycleCase || 'T4')).length
})

// Time control functions
function stepTimeForward(slots: number) {
  simulatedSlot.value += slots
}

function resetTime() {
  simulatedSlot.value = 0
}

function formatElapsedTime(slot: number): string {
  // Cardano has ~1 second slots
  const seconds = slot
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (hours < 24) return `${hours}h ${mins}m`
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h`
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

// Get phases for lifecycle case (kept for reference)
function getLifecyclePhases(caseId: string): string[] {
  const phaseMap: Record<string, string[]> = {
    T1: ['Init', 'Update', 'Cancel'],
    T2: ['Init', 'Accept', 'Default'],
    T3: ['Init', 'Accept', 'Pay×N', 'Complete', 'Collect'],
    T4: ['Init', 'Accept', 'Pay×N', 'Complete', 'Collect'],
    T5: ['Init', 'Accept', 'Pay (late)', 'Pay×N', 'Complete', 'Collect'],
    T6: ['Init', 'Accept (reject)', '✗'],
    T7: ['Init', 'Accept', 'Pay×N', 'Complete', 'Collect'],
  }
  return phaseMap[caseId] || []
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
  const firstOriginator = allWalletOptions.value.find(w => w.role === 'Originator')
  const originatorId = firstOriginator?.id || allWalletOptions.value[0]?.id || ''
  const assets = getWalletAssets(originatorId)

  localConfig.value.loans.push({
    borrowerId: '',
    originatorId,
    asset: assets[0] || '',
    quantity: 1,
    principal: 500,
    apr: 5,
    termMonths: 12,
    reservedBuyer: false,
    lifecycleCase: 'T4',
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
    lifecycle: { ...DEFAULT_LIFECYCLE },
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
    // Ensure lifecycle config exists
    if (!localConfig.value.lifecycle) {
      localConfig.value.lifecycle = { ...DEFAULT_LIFECYCLE }
    }
    configName.value = found.name
    console.log('Loaded config:', found.name)
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

  // Check if editing existing config
  if (route.params.id) {
    selectedConfigId.value = route.params.id as string
    loadSelectedConfig()
  }

  // Check if there's an active config from session
  const activeConfig = sessionStorage.getItem('mintmatrix-active-config')
  if (activeConfig) {
    try {
      localConfig.value = JSON.parse(activeConfig)
    } catch (e) {
      console.warn('Failed to load active config:', e)
    }
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

.config-table .form-control-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
  height: auto;
}

.config-table .btn-icon {
  padding: 0.25rem 0.5rem;
  line-height: 1;
}

tr.role-originator { border-left: 3px solid #a78bfa; }
tr.role-borrower { border-left: 3px solid #4ade80; }
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
</style>
