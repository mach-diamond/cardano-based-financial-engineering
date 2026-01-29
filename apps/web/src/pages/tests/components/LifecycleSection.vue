<template>
  <div class="card mb-4 lifecycle-card">
    <div class="card-header section-header d-flex justify-content-between align-items-center" @click="toggleSection">
      <div class="d-flex align-items-center">
        <div class="section-icon section-icon--lifecycle mr-3">
          <i class="fas fa-sync-alt"></i>
        </div>
        <div>
          <h5 class="mb-0 text-white">Full Lifecycle Test</h5>
          <small class="text-muted">{{ completedSteps }}/{{ totalSteps }} steps completed</small>
        </div>
      </div>
      <div class="d-flex align-items-center">
        <button
          @click.stop="$emit('runFullTest')"
          class="btn btn-sm btn-primary mr-3"
          :disabled="isRunning"
        >
          <span v-if="isRunning" class="spinner-border spinner-border-sm mr-1" role="status"></span>
          <i v-else class="fas fa-play mr-1"></i>
          {{ isRunning ? 'Running...' : 'Run Full Test' }}
        </button>
        <span class="badge badge-pill badge-primary mr-2">{{ totalSteps }} steps</span>
        <span v-if="lifecycleStatus === 'passed'" class="badge badge-success mr-2">All Passed</span>
        <span v-else-if="lifecycleStatus === 'failed'" class="badge badge-danger mr-2">Failed</span>
        <span v-else-if="lifecycleStatus === 'running'" class="badge badge-warning mr-2">Running</span>
        <span v-else class="badge badge-secondary mr-2">Pending</span>
        <span class="collapse-icon">{{ expanded ? '▲' : '▼' }}</span>
      </div>
    </div>
    <div v-show="expanded" class="card-body p-0">
      <!-- Phase Timeline -->
      <div class="phase-timeline">
        <div v-for="(phase, index) in phases" :key="phase.id"
             class="phase-block"
             :class="{
               'phase-active': phase.status === 'running',
               'phase-complete': phase.status === 'passed',
               'phase-failed': phase.status === 'failed'
             }">
          <div class="phase-header d-flex align-items-center justify-content-between" @click="togglePhase(phase)" style="cursor: pointer;">
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
              <!-- Breakpoint toggle -->
              <button v-if="index < phases.length - 1"
                      @click.stop="toggleBreakpoint(phase.id + 1)"
                      class="btn btn-sm"
                      :class="breakpointPhase === phase.id + 1 ? 'btn-warning' : 'btn-outline-secondary'"
                      :title="breakpointPhase === phase.id + 1 ? 'Remove breakpoint' : 'Set breakpoint after this phase'">
                <i class="fas fa-pause"></i>
              </button>
              <button v-if="phase.status !== 'passed'"
                      @click.stop="$emit('executePhase', phase)"
                      class="btn btn-sm btn-outline-primary"
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
            <div v-for="step in phase.steps" :key="step.id"
                 class="phase-step-item"
                 :class="{ 'step-disabled': step.disabled || step.status === 'disabled' }">
              <div class="d-flex align-items-center">
                <div class="step-status-icon">
                  <i v-if="step.disabled || step.status === 'disabled'" class="fas fa-ban text-secondary" :title="step.disabledReason || 'Disabled'"></i>
                  <i v-else-if="step.status === 'passed'" class="fas fa-check-circle text-success"></i>
                  <i v-else-if="step.status === 'running'" class="fas fa-spinner fa-spin text-warning"></i>
                  <i v-else-if="step.status === 'failed'" class="fas fa-times-circle text-danger"></i>
                  <i v-else class="far fa-circle text-muted"></i>
                </div>
                <span class="step-action-bubble" :class="[
                  'action-' + getStepActionClass(phase.id, step),
                  { 'action-disabled': step.disabled || step.status === 'disabled' }
                ]">{{ getStepAction(phase.id, step) }}</span>
                <span class="step-entity-text" :class="{ 'text-muted': step.disabled || step.status === 'disabled' }">
                  {{ getStepEntity(step) }}
                  <span v-if="step.disabledReason" class="step-disabled-reason">({{ step.disabledReason }})</span>
                  <span v-if="step.isLate" class="step-late-badge"><i class="fas fa-clock"></i> Late</span>
                  <span v-if="step.expectedResult === 'rejection'" class="step-reject-badge"><i class="fas fa-times-circle"></i> Reject</span>
                </span>
                <span v-if="step.timing" class="step-timing">{{ step.timing }}</span>
                <span v-if="step.txHash" class="step-tx-hash" :title="step.txHash">
                  <i class="fas fa-link"></i> {{ step.txHash.slice(0, 8) }}...
                </span>
              </div>
              <div class="step-actions">
                <button v-if="step.status === 'pending' && !step.disabled"
                        @click="$emit('executeStep', phase, step)"
                        class="btn-execute"
                        :disabled="isRunning">
                  <i class="fas fa-play"></i>
                </button>
                <span v-else-if="step.disabled" class="badge badge-secondary">Disabled</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { getStepAction, getStepActionClass, getStepEntity as getStepEntityUtil } from '@/utils/pipeline'
import type { Phase, Identity } from '@/utils/pipeline/types'

const props = defineProps<{
  phases: Phase[]
  identities: Identity[]
  isRunning: boolean
  completedSteps: number
  totalSteps: number
  lifecycleStatus: 'passed' | 'failed' | 'running' | 'pending'
  breakpointPhase: number | null
}>()

const emit = defineEmits<{
  runFullTest: []
  executePhase: [phase: Phase]
  executeStep: [phase: Phase, step: any]
  setBreakpoint: [phaseId: number | null]
}>()

function toggleBreakpoint(phaseId: number) {
  if (props.breakpointPhase === phaseId) {
    emit('setBreakpoint', null)
  } else {
    emit('setBreakpoint', phaseId)
  }
}

const expanded = ref(false)

function toggleSection() {
  expanded.value = !expanded.value
}

function togglePhase(phase: Phase) {
  phase.expanded = !phase.expanded
}

function getStepEntity(step: any): string {
  return getStepEntityUtil(step, props.identities)
}
</script>
