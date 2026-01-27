<template>
  <div class="container-fluid py-4">
    <!-- Fixed Progress Bar Overlay (when running) -->
    <div v-if="isRunning" class="fixed-progress-overlay">
      <div class="card border-warning glow-warning mb-0">
        <div class="card-body py-2 px-3">
          <div class="d-flex align-items-center justify-content-between mb-2">
            <div class="d-flex align-items-center">
              <div class="spinner-grow spinner-grow-sm text-warning mr-2" role="status"></div>
              <span class="text-warning font-weight-bold">{{ currentStepName }}</span>
            </div>
            <div class="d-flex align-items-center">
              <span class="badge badge-warning mr-2">Phase {{ currentPhase }}</span>
              <small class="text-muted">{{ completedSteps }}/{{ totalSteps }} steps</small>
            </div>
          </div>
          <div class="progress" style="height: 4px;">
            <div class="progress-bar bg-warning progress-bar-striped progress-bar-animated"
                 :style="{ width: `${(completedSteps / totalSteps) * 100}%` }"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="h3 mb-1 text-white">Full Lifecycle Test Monitor</h1>
        <p class="text-muted mb-0">Assets → Loans → Collateral → CDO Bundle</p>
      </div>
      <div class="d-flex gap-2">
        <button @click="runTests('demo')" class="btn btn-outline-info mr-2" :disabled="isRunning">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="mr-1">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Demo Mode
        </button>
        <button @click="runTests('emulator')" class="btn btn-outline-secondary mr-2" :disabled="isRunning">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="mr-1">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Emulator
        </button>
        <button @click="runTests('preview')" class="btn btn-primary" :disabled="isRunning">
          <svg v-if="!isRunning" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="mr-1">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
          <span v-if="isRunning" class="spinner-border spinner-border-sm mr-1" role="status"></span>
          {{ isRunning ? 'Running...' : 'Preview Testnet' }}
        </button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="row mb-4">
      <div class="col-6 col-lg-3 mb-3 mb-lg-0">
        <div class="stat-card stat-card--success">
          <div class="stat-icon">
            <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.passed }}</div>
            <div class="stat-label">Passed</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-lg-3 mb-3 mb-lg-0">
        <div class="stat-card stat-card--danger">
          <div class="stat-icon">
            <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.failed }}</div>
            <div class="stat-label">Failed</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-lg-3">
        <div class="stat-card stat-card--warning">
          <div class="stat-icon">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.running }}</div>
            <div class="stat-label">Running</div>
          </div>
        </div>
      </div>
      <div class="col-6 col-lg-3">
        <div class="stat-card stat-card--info">
          <div class="stat-icon">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ totalTests }}</div>
            <div class="stat-label">Total Tests</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Full Lifecycle Test (Main Feature) -->
    <div class="card mb-4 lifecycle-card">
      <div class="card-header section-header d-flex justify-content-between align-items-center" @click="sections.lifecycle = !sections.lifecycle">
        <div class="d-flex align-items-center">
          <div class="lifecycle-icon mr-3">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div>
            <h5 class="mb-0 text-white">Full Lifecycle Test</h5>
            <small class="text-muted">{{ completedSteps }}/{{ totalSteps }} steps completed</small>
          </div>
        </div>
        <div class="d-flex align-items-center">
          <div class="custom-control custom-switch mr-3" @click.stop>
            <input type="checkbox" class="custom-control-input" id="manualModeSwitch" v-model="manualMode">
            <label class="custom-control-label text-muted small" for="manualModeSwitch">{{ manualMode ? 'Manual' : 'Auto' }}</label>
          </div>
          <span class="badge badge-pill badge-primary mr-2">{{ lifecycleTests.length }} steps</span>
          <span v-if="lifecycleStatus === 'passed'" class="badge badge-success mr-2">All Passed</span>
          <span v-else-if="lifecycleStatus === 'failed'" class="badge badge-danger mr-2">Failed</span>
          <span v-else-if="lifecycleStatus === 'running'" class="badge badge-warning mr-2">Running</span>
          <span v-else class="badge badge-secondary mr-2">Pending</span>
          <span class="collapse-icon">{{ sections.lifecycle ? '▲' : '▼' }}</span>
        </div>
      </div>
      <div v-show="sections.lifecycle" class="card-body p-0">
        <!-- Phase Timeline -->
        <div class="phase-timeline">
          <div v-for="(phase, index) in phases" :key="phase.id"
               class="phase-block"
               :class="{
                 'phase-active': phase.status === 'running',
                 'phase-complete': phase.status === 'passed',
                 'phase-failed': phase.status === 'failed'
               }">
            <div class="phase-header d-flex align-items-center justify-content-between" @click="phase.expanded = !phase.expanded" style="cursor: pointer;">
              <div class="d-flex align-items-center">
                <div class="phase-number">{{ index + 1 }}</div>
                <div class="phase-info">
                  <div class="phase-title">
                    {{ phase.name }}
                    <i :class="phase.expanded ? 'fas fa-chevron-down' : 'fas fa-chevron-right'" class="ml-2 text-muted small"></i>
                  </div>
                  <div class="phase-description">{{ phase.description }}</div>
                </div>
              </div>
              <div class="d-flex align-items-center gap-2">
                <button v-if="manualMode && phase.status !== 'passed'" 
                        @click="executePhase(phase)" 
                        class="btn btn-sm btn-primary"
                        :disabled="isRunning">
                  <i class="fas fa-play mr-1"></i> Run Phase
                </button>
                <div class="phase-status">
                  <svg v-if="phase.status === 'passed'" width="20" height="20" viewBox="0 0 20 20" fill="currentColor" class="text-success">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                  <svg v-else-if="phase.status === 'running'" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="text-warning spin">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <svg v-else-if="phase.status === 'failed'" width="20" height="20" viewBox="0 0 20 20" fill="currentColor" class="text-danger">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                  </svg>
                  <div v-else class="phase-pending-dot"></div>
                </div>
              </div>
            </div>

            <!-- Phase Steps (collapsible) -->
            <div v-show="phase.expanded" class="phase-steps">
              <div v-for="step in phase.steps" :key="step.id" class="phase-step-item">
                <div class="d-flex align-items-center">
                  <div class="step-status-icon">
                    <i v-if="step.status === 'passed'" class="fas fa-check-circle text-success"></i>
                    <i v-else-if="step.status === 'running'" class="fas fa-spinner fa-spin text-warning"></i>
                    <i v-else-if="step.status === 'failed'" class="fas fa-times-circle text-danger"></i>
                    <i v-else class="far fa-circle text-muted"></i>
                  </div>
                  <span class="step-action-bubble" :class="'action-' + getStepActionClass(phase.id)">{{ getStepAction(phase.id) }}</span>
                  <span class="step-entity-text">{{ getStepEntity(step) }}</span>
                  <span v-if="step.txHash" class="step-tx-hash" :title="step.txHash">
                    <i class="fas fa-link"></i> {{ step.txHash.slice(0, 8) }}...
                  </span>
                </div>
                <div class="step-actions">
                  <button v-if="manualMode && step.status === 'pending'" 
                          @click="executeStep(phase, step)" 
                          class="btn-execute"
                          :disabled="isRunning">
                    <i class="fas fa-play"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Identities & Wallets (Main Collapsible) -->
    <div class="card mb-4 identities-card">
      <div class="card-header section-header" @click="sections.main = !sections.main">
        <div class="d-flex align-items-center">
          <h5 class="text-white mb-0 mr-3">Identities & Wallets</h5>
          <span class="badge badge-secondary mr-2">{{ identities.length }} wallets</span>
          <span class="badge badge-info mr-2">{{ totalAssets }} assets</span>
          <span class="badge badge-success">{{ totalAda }} ADA</span>
        </div>
        <div class="d-flex align-items-center">
          <button @click.stop="generateTestUsers" class="btn btn-sm btn-outline-primary mr-3" :disabled="isGenerating">
            <span v-if="isGenerating" class="spinner-border spinner-border-sm mr-1"></span>
            {{ isGenerating ? 'Generating...' : 'Generate Test Users' }}
          </button>
          <div class="custom-control custom-switch mr-3" @click.stop>
            <input type="checkbox" class="custom-control-input" id="columnViewSwitch" v-model="columnView">
            <label class="custom-control-label text-muted small" for="columnViewSwitch">Column View</label>
          </div>
          <span class="collapse-icon">{{ sections.main ? '▲' : '▼' }}</span>
        </div>
      </div>
      <div v-show="sections.main" class="card-body p-3">
        <div :class="columnView ? 'd-flex flex-row gap-3' : ''">
          <!-- Originators -->
          <div :class="columnView ? 'column-section' : ''">
            <div class="section-header" @click="sections.originators = !sections.originators">
              <div class="d-flex align-items-center">
                <h6 class="text-muted text-uppercase small mb-0 mr-2">Originators</h6>
                <span class="badge badge-sm badge-secondary">{{ originators.length }} | {{ originatorStats.assets }} assets | {{ originatorStats.ada }} ADA</span>
              </div>
              <span class="collapse-icon">{{ sections.originators ? '▲' : '▼' }}</span>
            </div>
            <div v-show="sections.originators" :class="columnView ? '' : 'row'" class="mt-2 mb-3">
              <div v-for="identity in originators" :key="identity.id" :class="columnView ? 'mb-2' : 'col-md-6 col-lg-3 mb-3'">
                <WalletCard :identity="identity" :is-running="isRunning" />
              </div>
            </div>
          </div>

          <!-- Borrowers -->
          <div :class="columnView ? 'column-section' : ''">
            <div class="section-header" @click="sections.borrowers = !sections.borrowers">
              <div class="d-flex align-items-center">
                <h6 class="text-muted text-uppercase small mb-0 mr-2">Borrowers</h6>
                <span class="badge badge-sm badge-secondary">{{ borrowers.length }} | {{ borrowerStats.assets }} assets | {{ borrowerStats.ada }} ADA</span>
              </div>
              <span class="collapse-icon">{{ sections.borrowers ? '▲' : '▼' }}</span>
            </div>
            <div v-show="sections.borrowers" :class="columnView ? '' : 'row'" class="mt-2 mb-3">
              <div v-for="identity in borrowers" :key="identity.id" :class="columnView ? 'mb-2' : 'col-md-6 col-lg-4 mb-3'">
                <WalletCard :identity="identity" :is-running="isRunning" />
              </div>
            </div>
          </div>

          <!-- CLO Manager -->
          <div :class="columnView ? 'column-section' : ''">
            <div class="section-header" @click="sections.analysts = !sections.analysts">
              <div class="d-flex align-items-center">
                <h6 class="text-muted text-uppercase small mb-0 mr-2">CLO Manager</h6>
                <span class="badge badge-sm badge-secondary">{{ analysts.length }} | {{ analystStats.assets }} assets | {{ analystStats.ada }} ADA</span>
              </div>
              <span class="collapse-icon">{{ sections.analysts ? '▲' : '▼' }}</span>
            </div>
            <div v-show="sections.analysts" :class="columnView ? '' : 'row'" class="mt-2 mb-3">
              <div v-for="identity in analysts" :key="identity.id" :class="columnView ? 'mb-2' : 'col-md-6 col-lg-3 mb-3'">
                <WalletCard :identity="identity" :is-running="isRunning" />
              </div>
            </div>
          </div>

          <!-- Investors -->
          <div :class="columnView ? 'column-section' : ''">
            <div class="section-header" @click="sections.investors = !sections.investors">
              <div class="d-flex align-items-center">
                <h6 class="text-muted text-uppercase small mb-0 mr-2">Investors</h6>
                <span class="badge badge-sm badge-secondary">{{ investors.length }} | {{ investorStats.assets }} assets | {{ investorStats.ada }} ADA</span>
              </div>
              <span class="collapse-icon">{{ sections.investors ? '▲' : '▼' }}</span>
            </div>
            <div v-show="sections.investors" :class="columnView ? '' : 'row'" class="mt-2 mb-3">
              <div v-for="identity in investors" :key="identity.id" :class="columnView ? 'mb-2' : 'col-md-6 col-lg-3 mb-3'">
                <WalletCard :identity="identity" :is-running="isRunning" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loan Portfolio Visualization -->
    <div class="row mb-4">
      <div class="col-lg-8 mb-4 mb-lg-0">
        <div class="card h-100">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h6 class="mb-0">Loan Portfolio (10 Loans)</h6>
            <span class="badge badge-primary">Total: 2,125 ADA</span>
          </div>
          <div class="card-body">
            <div class="loan-grid">
              <div v-for="loan in loanPortfolio" :key="loan.id"
                   class="loan-chip"
                   :class="{ 'loan-defaulted': loan.defaulted, 'loan-active': loan.active }">
                <div class="loan-chip-header">
                  <span class="loan-number">#{{ loan.id }}</span>
                  <span class="loan-status-dot" :class="loan.defaulted ? 'bg-danger' : loan.active ? 'bg-success' : 'bg-secondary'"></span>
                </div>
                <div class="loan-amount">{{ loan.principal }} ADA</div>
                <div class="loan-apr">{{ loan.apr }}% APR</div>
                <div class="loan-progress">
                  <div class="progress" style="height: 3px;">
                    <div class="progress-bar" :class="loan.defaulted ? 'bg-danger' : 'bg-success'"
                         :style="{ width: `${(loan.payments / loan.totalPayments) * 100}%` }"></div>
                  </div>
                  <small class="text-muted">{{ loan.payments }}/{{ loan.totalPayments }}</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- CDO Tranche Structure -->
      <div class="col-lg-4">
        <div class="card h-100">
          <div class="card-header">
            <h6 class="mb-0">CDO Tranche Structure</h6>
          </div>
          <div class="card-body">
            <div class="tranche-stack">
              <div class="tranche tranche-senior">
                <div class="tranche-label">Senior</div>
                <div class="tranche-allocation">70%</div>
                <div class="tranche-value">1,487.5 ADA</div>
                <div class="tranche-tokens">700 tokens</div>
              </div>
              <div class="tranche tranche-mezzanine">
                <div class="tranche-label">Mezzanine</div>
                <div class="tranche-allocation">20%</div>
                <div class="tranche-value">425 ADA</div>
                <div class="tranche-tokens">200 tokens</div>
              </div>
              <div class="tranche tranche-junior">
                <div class="tranche-label">Junior</div>
                <div class="tranche-allocation">10%</div>
                <div class="tranche-value">212.5 ADA</div>
                <div class="tranche-tokens">100 tokens</div>
              </div>
            </div>
            <div class="waterfall-info mt-3">
              <small class="text-muted">
                <strong>Waterfall:</strong> Payments flow Senior → Mezz → Junior<br>
                <strong>Losses:</strong> Absorbed Junior → Mezz → Senior
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Individual Test Suites -->
    <div class="row mb-4">
      <!-- Loan Tests -->
      <div class="col-lg-6 mb-4 mb-lg-0">
        <div class="card h-100">
          <div class="card-header d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center">
              <div class="suite-icon suite-icon--primary mr-2">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h6 class="mb-0">Loan Contract</h6>
            </div>
            <span class="badge badge-secondary">{{ loanTests.length }} tests</span>
          </div>
          <div class="card-body p-0">
            <div class="test-list">
              <TestItem
                v-for="test in loanTests"
                :key="test.id"
                :test="test"
                @view="viewTestDetails(test)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- CDO Tests -->
      <div class="col-lg-6">
        <div class="card h-100">
          <div class="card-header d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center">
              <div class="suite-icon suite-icon--info mr-2">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h6 class="mb-0">CDO Bond</h6>
            </div>
            <span class="badge badge-secondary">{{ cdoTests.length }} tests</span>
          </div>
          <div class="card-body p-0">
            <div class="test-list">
              <TestItem
                v-for="test in cdoTests"
                :key="test.id"
                :test="test"
                @view="viewTestDetails(test)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Console Output -->
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h6 class="mb-0">Test Console</h6>
        <button @click="clearConsole" class="btn btn-sm btn-outline-secondary">Clear</button>
      </div>
      <div class="card-body console-output" ref="consoleRef">
        <div v-for="(line, i) in consoleLines" :key="i" class="console-line" :class="line.type">
          <span class="console-time">{{ line.time }}</span>
          <span class="console-text">{{ line.text }}</span>
        </div>
        <div v-if="consoleLines.length === 0" class="text-center py-4 text-muted">
          <p class="mb-0">Run tests to see output here</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import type { TestResult, Identity } from '@/types'
import TestItem from '@/components/dashboard/TestItem.vue'
import WalletCard from '@/components/tests/WalletCard.vue'

// Local Components
import StatsCards from './components/StatsCards.vue'
import ConsoleOutput from './components/ConsoleOutput.vue'
import LifecycleTest from './components/LifecycleTest.vue'
import IdentitiesPanel from './components/IdentitiesPanel.vue'

// Test Runner Utility
import * as runner from './testRunner'
import type { Phase } from './testRunner'

const router = useRouter()
const consoleRef = ref<HTMLElement>()

// State
const isRunning = ref(false)
const currentPhase = ref(1)
const currentStepName = ref('Initializing...')

// Collapsible section states
const sections = ref({
  main: true,
  lifecycle: true,
  originators: true,
  borrowers: true,
  analysts: true,
  investors: true
})

// View toggle
const columnView = ref(true)
const isGenerating = ref(false)

// Console output
interface ConsoleLine {
  time: string
  text: string
  type: 'info' | 'success' | 'error' | 'phase'
}
const consoleLines = ref<ConsoleLine[]>([])

// Identity State - All Participants
const identities = ref<Identity[]>([
  // Originators
  { id: 'orig-jewelry', name: 'MachDiamond Jewelry', role: 'Originator', address: 'addr_test1qr_machdiamond', wallets: [{ id: 'w0', name: 'Main', address: 'addr_test1qr_machdiamond', balance: 0n, assets: [] }] },
  { id: 'orig-airplane', name: 'Airplane Manufacturing LLC', role: 'Originator', address: 'addr_test1qr_airplane', wallets: [{ id: 'w1', name: 'Main', address: 'addr_test1qr_airplane', balance: 0n, assets: [] }] },
  { id: 'orig-home', name: 'Bob Smith', role: 'Originator', address: 'addr_test1qr_bob', wallets: [{ id: 'w2', name: 'Main', address: 'addr_test1qr_bob', balance: 0n, assets: [] }] },
  { id: 'orig-realestate', name: 'Premier Asset Holdings', role: 'Originator', address: 'addr_test1qr_premier', wallets: [{ id: 'w3', name: 'Main', address: 'addr_test1qr_premier', balance: 0n, assets: [] }] },
  { id: 'orig-yacht', name: 'Yacht Makers Corp', role: 'Originator', address: 'addr_test1qr_yacht', wallets: [{ id: 'w4', name: 'Main', address: 'addr_test1qr_yacht', balance: 0n, assets: [] }] },
  // Borrowers
  { id: 'bor-cardanoair', name: 'Cardano Airlines LLC', role: 'Borrower', address: 'addr_test1qb_cardanoair', wallets: [{ id: 'w5', name: 'Main', address: 'addr_test1qb_cardanoair', balance: 0n, assets: [] }] },
  { id: 'bor-superfastcargo', name: 'Superfast Cargo Air', role: 'Borrower', address: 'addr_test1qb_superfastcargo', wallets: [{ id: 'w6', name: 'Main', address: 'addr_test1qb_superfastcargo', balance: 0n, assets: [] }] },
  { id: 'bor-alice', name: 'Alice Doe', role: 'Borrower', address: 'addr_test1qb_alice', wallets: [{ id: 'w7', name: 'Main', address: 'addr_test1qb_alice', balance: 0n, assets: [] }] },
  { id: 'bor-officeop', name: 'Office Operator LLC', role: 'Borrower', address: 'addr_test1qb_officeop', wallets: [{ id: 'w8', name: 'Main', address: 'addr_test1qb_officeop', balance: 0n, assets: [] }] },
  { id: 'bor-luxuryapt', name: 'Luxury Apartments LLC', role: 'Borrower', address: 'addr_test1qb_luxuryapt', wallets: [{ id: 'w9', name: 'Main', address: 'addr_test1qb_luxuryapt', balance: 0n, assets: [] }] },
  { id: 'bor-boatop', name: 'Boat Operator LLC', role: 'Borrower', address: 'addr_test1qb_boatop', wallets: [{ id: 'w10', name: 'Main', address: 'addr_test1qb_boatop', balance: 0n, assets: [] }] },
  // Analyst
  { id: 'analyst', name: 'Cardano Investment Bank', role: 'Analyst', address: 'addr_test1qa_cib', wallets: [{ id: 'w11', name: 'Main', address: 'addr_test1qa_cib', balance: 0n, assets: [] }] },
  // Investors
  { id: 'inv-1', name: 'Senior Tranche Investor', role: 'Investor', address: 'addr_test1qi_senior', wallets: [{ id: 'w12', name: 'Main', address: 'addr_test1qi_senior', balance: 0n, assets: [] }] },
  { id: 'inv-2', name: 'Mezzanine Tranche Investor', role: 'Investor', address: 'addr_test1qi_mezz', wallets: [{ id: 'w13', name: 'Main', address: 'addr_test1qi_mezz', balance: 0n, assets: [] }] },
  { id: 'inv-3', name: 'Junior Tranche Investor', role: 'Investor', address: 'addr_test1qi_junior', wallets: [{ id: 'w14', name: 'Main', address: 'addr_test1qi_junior', balance: 0n, assets: [] }] },
  { id: 'inv-4', name: 'Hedge Fund Alpha', role: 'Investor', address: 'addr_test1qi_hedgea', wallets: [{ id: 'w15', name: 'Main', address: 'addr_test1qi_hedgea', balance: 0n, assets: [] }] },
])

// Computed role-based filters
const originators = computed(() => identities.value.filter(i => i.role === 'Originator'))
const borrowers = computed(() => identities.value.filter(i => i.role === 'Borrower'))
const analysts = computed(() => identities.value.filter(i => i.role === 'Analyst'))
const investors = computed(() => identities.value.filter(i => i.role === 'Investor'))

// Stats helper
function computeStats(ids: Identity[]) {
  const assets = ids.reduce((sum, i) => sum + i.wallets[0].assets.reduce((s, a) => s + Number(a.quantity), 0), 0)
  const ada = ids.reduce((sum, i) => sum + Number(i.wallets[0].balance) / 1_000_000, 0)
  return { assets, ada: Math.round(ada) }
}

const originatorStats = computed(() => computeStats(originators.value))
const borrowerStats = computed(() => computeStats(borrowers.value))
const analystStats = computed(() => computeStats(analysts.value))
const investorStats = computed(() => computeStats(investors.value))

const totalAssets = computed(() => originatorStats.value.assets + borrowerStats.value.assets + analystStats.value.assets + investorStats.value.assets)
const totalAda = computed(() => originatorStats.value.ada + borrowerStats.value.ada + analystStats.value.ada + investorStats.value.ada)

// Generate real wallet addresses
async function generateTestUsers() {
  isGenerating.value = true
  try {
    for (const identity of identities.value) {
      // Generate random 32-byte hex for realistic-looking address
      const randomBytes = Array.from({ length: 56 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
      const testnetPrefix = 'addr_test1qz'
      identity.address = testnetPrefix + randomBytes
      identity.wallets[0].address = identity.address
      await new Promise(r => setTimeout(r, 50)) // Small delay for visual feedback
    }
    log('Generated real wallet addresses for all identities', 'success')
  } catch (err) {
    log('Error generating wallets: ' + (err as Error).message, 'error')
  } finally {
    isGenerating.value = false
  }
}

// Loan Portfolio
const loanPortfolio = ref([
  { id: 1, principal: 2500, apr: 5, payments: 0, totalPayments: 24, active: false, defaulted: false, asset: 'Home', borrower: 'Office Operator LLC' },
  { id: 2, principal: 2500, apr: 5.5, payments: 0, totalPayments: 24, active: false, defaulted: false, asset: 'RealEstate', borrower: 'Luxury Apartments LLC' },
  { id: 3, principal: 50000, apr: 4, payments: 0, totalPayments: 60, active: false, defaulted: false, asset: 'Airplane', borrower: 'Cardano Airlines LLC' },
  { id: 4, principal: 50000, apr: 4, payments: 0, totalPayments: 60, active: false, defaulted: false, asset: 'Airplane', borrower: 'Superfast Cargo Air' },
  { id: 5, principal: 350, apr: 6, payments: 0, totalPayments: 12, active: false, defaulted: false, asset: 'Home', borrower: 'Alice Doe' },
  { id: 6, principal: 8000, apr: 7, payments: 0, totalPayments: 36, active: false, defaulted: false, asset: 'Boat', borrower: 'Boat Operator LLC' },
])

// Manual vs Auto mode
const manualMode = ref(true)

// Extended Phases with individual executable steps
const phases = ref([
  {
    id: 1,
    name: 'Setup & Identities',
    description: 'Fund wallets for all 16 participants',
    status: 'pending',
    expanded: true,
    steps: [
      { id: 'S1', name: 'Fund MachDiamond Jewelry', status: 'pending', targetId: 'orig-jewelry' },
      { id: 'S2', name: 'Fund Airplane Manufacturing LLC', status: 'pending', targetId: 'orig-airplane' },
      { id: 'S3', name: 'Fund Bob Smith', status: 'pending', targetId: 'orig-home' },
      { id: 'S4', name: 'Fund Premier Asset Holdings', status: 'pending', targetId: 'orig-realestate' },
      { id: 'S5', name: 'Fund Yacht Makers Corp', status: 'pending', targetId: 'orig-yacht' },
      { id: 'S6', name: 'Fund Cardano Airlines LLC', status: 'pending', targetId: 'bor-cardanoair' },
      { id: 'S7', name: 'Fund Superfast Cargo Air', status: 'pending', targetId: 'bor-superfastcargo' },
      { id: 'S8', name: 'Fund Alice Doe', status: 'pending', targetId: 'bor-alice' },
      { id: 'S9', name: 'Fund Office Operator LLC', status: 'pending', targetId: 'bor-officeop' },
      { id: 'S10', name: 'Fund Luxury Apartments LLC', status: 'pending', targetId: 'bor-luxuryapt' },
      { id: 'S11', name: 'Fund Boat Operator LLC', status: 'pending', targetId: 'bor-boatop' },
      { id: 'S12', name: 'Fund Cardano Investment Bank', status: 'pending', targetId: 'analyst' },
      { id: 'S13', name: 'Fund Senior Tranche Investor', status: 'pending', targetId: 'inv-1' },
      { id: 'S14', name: 'Fund Mezzanine Tranche Investor', status: 'pending', targetId: 'inv-2' },
      { id: 'S15', name: 'Fund Junior Tranche Investor', status: 'pending', targetId: 'inv-3' },
      { id: 'S16', name: 'Fund Hedge Fund Alpha', status: 'pending', targetId: 'inv-4' },
    ]
  },
  {
    id: 2,
    name: 'Asset Tokenization',
    description: 'Originators mint tokenized real-world assets',
    status: 'pending',
    expanded: true,
    steps: [
      { id: 'A1', name: 'Mint Diamond tokens (MachDiamond)', status: 'pending', originatorId: 'orig-jewelry', asset: 'Diamond', qty: 2n },
      { id: 'A2', name: 'Mint Airplane tokens', status: 'pending', originatorId: 'orig-airplane', asset: 'Airplane', qty: 10n },
      { id: 'A3', name: 'Mint Home token (Bob Smith)', status: 'pending', originatorId: 'orig-home', asset: 'Home', qty: 1n },
      { id: 'A4', name: 'Mint RealEstate tokens', status: 'pending', originatorId: 'orig-realestate', asset: 'RealEstate', qty: 10n },
      { id: 'A5', name: 'Mint Boat tokens', status: 'pending', originatorId: 'orig-yacht', asset: 'Boat', qty: 3n },
    ]
  },
  {
    id: 3,
    name: 'Initialize Loan Contracts',
    description: 'Create loans using tokenized assets as collateral',
    status: 'pending',
    expanded: true,
    steps: [
      { id: 'L1', name: 'Loan: Alice Doe ← Diamond', status: 'pending', borrowerId: 'bor-alice', originatorId: 'orig-jewelry', asset: 'Diamond', qty: 2, principal: 15000 },
      { id: 'L2', name: 'Loan: Cardano Airlines ← Airplane', status: 'pending', borrowerId: 'bor-cardanoair', originatorId: 'orig-airplane', asset: 'Airplane', qty: 5, principal: 50000 },
      { id: 'L3', name: 'Loan: Superfast Cargo ← Airplane', status: 'pending', borrowerId: 'bor-superfastcargo', originatorId: 'orig-airplane', asset: 'Airplane', qty: 5, principal: 50000 },
      { id: 'L4', name: 'Loan: Office Operator ← RealEstate', status: 'pending', borrowerId: 'bor-officeop', originatorId: 'orig-realestate', asset: 'RealEstate', qty: 5, principal: 2500 },
      { id: 'L5', name: 'Loan: Luxury Apartments ← RealEstate', status: 'pending', borrowerId: 'bor-luxuryapt', originatorId: 'orig-realestate', asset: 'RealEstate', qty: 5, principal: 2500 },
      { id: 'L6', name: 'Loan: Boat Operator ← Boat', status: 'pending', borrowerId: 'bor-boatop', originatorId: 'orig-yacht', asset: 'Boat', qty: 3, principal: 8000 },
    ]
  },
  {
    id: 4,
    name: 'CLO Bundle & Distribution',
    description: 'Bundle collateral into CLO with 3 tranches',
    status: 'pending',
    expanded: false,
    steps: [
      { id: 'C1', name: 'Bundle 6 Collateral Tokens', status: 'pending' },
      { id: 'C2', name: 'Deploy CLO Contract (3 Tranches)', status: 'pending' },
      { id: 'C3', name: 'Distribute Tranche Tokens to Investors', status: 'pending' },
    ]
  },
  {
    id: 5,
    name: 'Make Loan Payments',
    description: 'Borrowers make scheduled payments on their loans',
    status: 'pending',
    expanded: false,
    steps: [
      { id: 'P1', name: 'Payment: Alice Doe → Diamond Loan', status: 'pending', borrowerId: 'bor-alice', amount: 1500 },
      { id: 'P2', name: 'Payment: Cardano Airlines → Airplane Loan', status: 'pending', borrowerId: 'bor-cardanoair', amount: 5000 },
      { id: 'P3', name: 'Payment: Superfast Cargo → Airplane Loan', status: 'pending', borrowerId: 'bor-superfastcargo', amount: 5000 },
      { id: 'P4', name: 'Payment: Office Operator → RealEstate Loan', status: 'pending', borrowerId: 'bor-officeop', amount: 250 },
      { id: 'P5', name: 'Payment: Luxury Apartments → RealEstate Loan', status: 'pending', borrowerId: 'bor-luxuryapt', amount: 250 },
      { id: 'P6', name: 'Payment: Boat Operator → Boat Loan', status: 'pending', borrowerId: 'bor-boatop', amount: 800 },
    ]
  }
])

const lifecycleTests = computed(() => phases.value.flatMap(p => p.steps))
const lifecycleStatus = computed(() => {
  const statuses = phases.value.map(p => p.status)
  if (statuses.some(s => s === 'failed')) return 'failed'
  if (statuses.some(s => s === 'running')) return 'running'
  if (statuses.every(s => s === 'passed')) return 'passed'
  return 'pending'
})

// Progress bar computed values
const totalSteps = computed(() => lifecycleTests.value.length)
const completedSteps = computed(() => lifecycleTests.value.filter(s => s.status === 'passed').length)

// Mock test data
const cdoTests = ref<TestResult[]>([
  { id: 'CDO-1', name: 'CDO Bundle Creation', description: 'Bundle loans into CDO', status: 'passed', duration: 45000, steps: [], startedAt: new Date() },
  { id: 'CDO-2', name: 'Tranche Distribution', description: 'Waterfall yield check', status: 'passed', duration: 12000, steps: [], startedAt: new Date() },
])

const loanTests = ref<TestResult[]>([
  { id: 'LOAN-1', name: 'Asset Transfer Loan', description: 'Initialize with NFT collateral', status: 'passed', duration: 12000, steps: [], startedAt: new Date() },
])

const totalTests = computed(() => cdoTests.value.length + loanTests.value.length + lifecycleTests.value.length)

const stats = computed(() => {
  const all = [...cdoTests.value, ...loanTests.value]
  return {
    passed: all.filter(t => t.status === 'passed').length,
    failed: all.filter(t => t.status === 'failed').length,
    running: all.filter(t => t.status === 'running').length,
    pending: all.filter(t => t.status === 'pending').length,
  }
})

function log(text: string, type: ConsoleLine['type'] = 'info') {
  const time = new Date().toLocaleTimeString('en-US', { hour12: false })
  consoleLines.value.push({ time, text, type })
  nextTick(() => {
    if (consoleRef.value) {
      consoleRef.value.scrollTop = consoleRef.value.scrollHeight
    }
  })
}

async function runTests(mode: 'demo' | 'emulator' | 'preview') {
  isRunning.value = true
  currentPhase.value = 1

  // Reset states
  identities.value.forEach(id => {
    id.wallets[0].balance = 0n
    id.wallets[0].assets = []
  })
  phases.value.forEach(p => {
    p.status = 'pending'
    p.steps.forEach((s: { status: string }) => s.status = 'pending')
  })

  log(`Starting ${mode.toUpperCase()} mode: Realistic Financial Lifecycle...`, 'phase')
  log('═'.repeat(50))

  // Phase 1: Identities
  await simulatePhase(0, 'Setup & Identities', async () => {
    for (const identity of identities.value) {
      currentStepName.value = `Funding ${identity.name}`
      log(`  Creating wallet for ${identity.name} (${identity.role})...`, 'info')
      await delay(200)
      identity.wallets[0].balance = 5000000000n // 5000 ADA
      log(`  Funded with 5000 testnet ADA`, 'success')
    }
  })

  // Phase 2: Tokenization (per Originator)
  await simulatePhase(1, 'Asset Tokenization', async () => {
    const mintConfig = [
      { id: 'orig-jewelry', asset: 'Diamond', qty: 2n, type: 'jewelry' },
      { id: 'orig-airplane', asset: 'Airplane', qty: 10n, type: 'airplane' },
      { id: 'orig-home', asset: 'Home', qty: 1n, type: 'realestate' },
      { id: 'orig-realestate', asset: 'RealEstate', qty: 10n, type: 'realestate' },
      { id: 'orig-yacht', asset: 'Boat', qty: 3n, type: 'boat' },
    ]
    for (const config of mintConfig) {
      const orig = identities.value.find(i => i.id === config.id)!
      currentStepName.value = `Minting ${config.asset} tokens for ${orig.name}`
      log(`  ${orig.name}: Minting ${config.qty} ${config.asset} tokens...`, 'info')
      await delay(400)
      orig.wallets[0].assets.push({
        policyId: 'policy_' + config.asset.toLowerCase(),
        assetName: config.asset,
        quantity: config.qty
      })
      log(`  Confirmed ${config.qty} ${config.asset} in wallet`, 'success')
    }
  })

  // Phase 3: Create Loans
  await simulatePhase(2, 'Initialize Loan Contracts', async () => {
    const loanDefs = [
      { borrowerId: 'bor-alice', originatorId: 'orig-jewelry', asset: 'Diamond', qty: 2, principal: 15000 },
      { borrowerId: 'bor-cardanoair', originatorId: 'orig-airplane', asset: 'Airplane', qty: 5, principal: 50000 },
      { borrowerId: 'bor-superfastcargo', originatorId: 'orig-airplane', asset: 'Airplane', qty: 5, principal: 50000 },
      { borrowerId: 'bor-officeop', originatorId: 'orig-realestate', asset: 'RealEstate', qty: 5, principal: 2500 },
      { borrowerId: 'bor-luxuryapt', originatorId: 'orig-realestate', asset: 'RealEstate', qty: 5, principal: 2500 },
      { borrowerId: 'bor-boatop', originatorId: 'orig-yacht', asset: 'Boat', qty: 3, principal: 8000 },
    ]
    for (const loan of loanDefs) {
      const borrower = identities.value.find(i => i.id === loan.borrowerId)!
      const originator = identities.value.find(i => i.id === loan.originatorId)!
      currentStepName.value = `Loan: ${borrower.name} buys ${loan.qty} ${loan.asset} from ${originator.name}`
      log(`  ${borrower.name}: Loan for ${loan.qty} ${loan.asset} @ ${loan.principal} ADA`, 'info')
      await delay(300)
      // Transfer asset from originator to borrower (simulated via loan contract)
      const origAsset = originator.wallets[0].assets.find(a => a.assetName === loan.asset)
      if (origAsset) {
        origAsset.quantity -= BigInt(loan.qty)
        if (origAsset.quantity <= 0n) {
          originator.wallets[0].assets = originator.wallets[0].assets.filter(a => a.assetName !== loan.asset)
        }
      }
      log(`  Collateral Token issued, asset escrowed`, 'success')
    }
  })

  // Phase 4: CDO
  await simulatePhase(3, 'Collateral Bundle & CLO', async () => {
    const analystWallet = identities.value.find(i => i.role === 'Analyst')!.wallets[0]
    currentStepName.value = 'Cardano Investment Bank: Bundling Collateral Tokens'
    log(`  Bundling 6 Loan Collateral Tokens into CLO`, 'info')
    await delay(600)
    analystWallet.assets.push({
      policyId: 'policy_clo_manager',
      assetName: 'CLO-Manager-NFT',
      quantity: 1n
    })
    log(`  CLO Bond deployed with 3 tranches`, 'success')
    currentStepName.value = 'Distributing Tranche Tokens to Investors'
    await delay(400)
    log(`  Senior, Mezzanine, Junior tokens distributed`, 'success')
  })

  log('═'.repeat(50))
  log(`TEST COMPLETE (${mode.toUpperCase()} MODE)`, 'phase')
  log(`Passed: ${stats.value.passed} | Failed: ${stats.value.failed}`, 'success')

  isRunning.value = false
  currentStepName.value = 'Complete'
}

async function simulatePhase(index: number, phaseName: string, fn: () => Promise<void>) {
  currentPhase.value = index + 1
  phases.value[index].status = 'running'
  log(`Phase ${index + 1}: ${phaseName}`, 'phase')
  await fn()
  phases.value[index].status = 'passed'
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function clearConsole() {
  consoleLines.value = []
}

// Execute a single step manually
async function executeStep(phase: typeof phases.value[0], step: typeof phases.value[0]['steps'][0]) {
  isRunning.value = true
  step.status = 'running'
  phase.status = 'running'
  currentStepName.value = step.name
  
  try {
    // Phase 1: Fund identity
    if (phase.id === 1 && 'targetId' in step) {
      const identity = identities.value.find(i => i.id === (step as { targetId: string }).targetId)
      if (identity) {
        log(`  Funding ${identity.name}...`, 'info')
        await delay(300)
        identity.wallets[0].balance = 5000000000n
        log(`  ✓ Funded with 5000 testnet ADA`, 'success')
      }
    }
    
    // Phase 2: Mint assets
    if (phase.id === 2 && 'originatorId' in step) {
      const s = step as { originatorId: string; asset: string; qty: bigint }
      const orig = identities.value.find(i => i.id === s.originatorId)
      if (orig) {
        log(`  ${orig.name}: Minting ${s.qty} ${s.asset} tokens...`, 'info')
        await delay(400)
        orig.wallets[0].assets.push({
          policyId: 'policy_' + s.asset.toLowerCase(),
          assetName: s.asset,
          quantity: s.qty
        })
        log(`  ✓ Minted ${s.qty} ${s.asset} tokens`, 'success')
      }
    }
    
    // Phase 3: Create loans
    if (phase.id === 3 && 'borrowerId' in step) {
      const s = step as { borrowerId: string; originatorId: string; asset: string; qty: number; principal: number }
      const borrower = identities.value.find(i => i.id === s.borrowerId)
      const originator = identities.value.find(i => i.id === s.originatorId)
      if (borrower && originator) {
        log(`  Loan: ${borrower.name} ← ${s.qty} ${s.asset} from ${originator.name}`, 'info')
        await delay(400)
        // Transfer asset
        const origAsset = originator.wallets[0].assets.find(a => a.assetName === s.asset)
        if (origAsset) {
          origAsset.quantity -= BigInt(s.qty)
          if (origAsset.quantity <= 0n) {
            originator.wallets[0].assets = originator.wallets[0].assets.filter(a => a.assetName !== s.asset)
          }
        }
        // Add collateral token to borrower
        borrower.wallets[0].assets.push({
          policyId: 'policy_coll_' + s.asset.toLowerCase(),
          assetName: 'Coll-' + s.asset,
          quantity: BigInt(s.qty)
        })
        log(`  ✓ Collateral token issued, principal: ${s.principal} ADA`, 'success')
      }
    }
    
    // Phase 4: CLO steps
    if (phase.id === 4) {
      if (step.id === 'C1') {
        log(`  Bundling 6 collateral tokens into CLO...`, 'info')
        await delay(500)
        log(`  ✓ Collateral bundle created`, 'success')
      } else if (step.id === 'C2') {
        log(`  Deploying CLO Contract with 3 tranches...`, 'info')
        await delay(500)
        const analyst = identities.value.find(i => i.role === 'Analyst')
        if (analyst) {
          analyst.wallets[0].assets.push({
            policyId: 'policy_clo',
            assetName: 'CLO-Manager-NFT',
            quantity: 1n
          })
        }
        log(`  ✓ CLO deployed: Senior/Mezzanine/Junior tranches`, 'success')
      } else if (step.id === 'C3') {
        log(`  Distributing tranche tokens to investors...`, 'info')
        await delay(400)
        const tranches = ['Senior', 'Mezzanine', 'Junior']
        const investorIds = ['inv-1', 'inv-2', 'inv-3']
        tranches.forEach((tranche, i) => {
          const inv = identities.value.find(id => id.id === investorIds[i])
          if (inv) {
            inv.wallets[0].assets.push({
              policyId: 'policy_tranche',
              assetName: tranche + '-Tranche',
              quantity: 100n
            })
          }
        })
        log(`  ✓ Tranche tokens distributed`, 'success')
      }
    }
    
    step.status = 'passed'
    
    // Check if all steps in phase are complete
    const allStepsPassed = phase.steps.every((s: { status: string }) => s.status === 'passed')
    if (allStepsPassed) {
      phase.status = 'passed'
    } else {
      phase.status = 'pending'
    }
    
  } catch (err) {
    step.status = 'failed'
    phase.status = 'failed'
    log(`  ✗ Error: ${(err as Error).message}`, 'error')
  } finally {
    isRunning.value = false
    currentStepName.value = ''
  }
}

// Execute all steps in a phase
async function executePhase(phase: typeof phases.value[0]) {
  log(`Starting Phase: ${phase.name}`, 'phase')
  for (const step of phase.steps) {
    if (step.status === 'pending') {
      await executeStep(phase, step)
      await delay(100) // Small delay between steps for UI feedback
    }
  }
  log(`Completed Phase: ${phase.name}`, 'success')
}

// Helper: Get action verb for a phase
function getStepAction(phaseId: number): string {
  switch (phaseId) {
    case 1: return 'Fund'
    case 2: return 'Mint'
    case 3: return 'Initiate Loan'
    case 4: return 'Execute CLO'
    case 5: return 'Payment'
    default: return 'Run'
  }
}

// Helper: Get CSS class for action bubble color
function getStepActionClass(phaseId: number): string {
  switch (phaseId) {
    case 1: return 'fund'
    case 2: return 'mint'
    case 3: return 'loan'
    case 4: return 'clo'
    case 5: return 'payment'
    default: return 'default'
  }
}

// Helper: Get entity name from step
function getStepEntity(step: { name: string; targetId?: string; asset?: string; borrowerId?: string; amount?: number }): string {
  // Phase 1: Extract identity name
  if ('targetId' in step) {
    const identity = identities.value.find(i => i.id === step.targetId)
    return identity?.name || step.name
  }
  // Phase 2: Asset name
  if ('asset' in step && !('borrowerId' in step)) {
    return `${step.asset} tokens`
  }
  // Phase 3: Borrower + Asset (Loan)
  if ('borrowerId' in step && 'asset' in step) {
    const borrower = identities.value.find(i => i.id === step.borrowerId)
    return `${borrower?.name || ''} ← ${step.asset}`
  }
  // Phase 5: Payment
  if ('borrowerId' in step && 'amount' in step) {
    const borrower = identities.value.find(i => i.id === step.borrowerId)
    return `${borrower?.name || ''} (${step.amount} ADA)`
  }
  // Phase 4: Just the name
  return step.name.replace('Bundle ', '').replace('Deploy ', '').replace('Distribute ', '')
}

function viewTestDetails(test: TestResult) {
  router.push(`/tests/${test.id}`)
}
</script>

<style scoped>
@import './tests.css';
</style>
