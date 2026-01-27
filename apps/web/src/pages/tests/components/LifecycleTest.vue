<template>
  <div class="card mb-4 lifecycle-card">
    <div class="card-header section-header d-flex justify-content-between align-items-center" @click="$emit('toggle-collapsible', 'lifecycle')">
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
          <input type="checkbox" class="custom-control-input" id="manualModeSwitch" 
                 :checked="manualMode" @change="$emit('update:manualMode', ($event.target as HTMLInputElement).checked)">
          <label class="custom-control-label text-muted small" for="manualModeSwitch">{{ manualMode ? 'Manual' : 'Auto' }}</label>
        </div>
        <span class="badge badge-pill badge-primary mr-2">{{ totalSteps }} steps</span>
        <span v-if="lifecycleStatus === 'passed'" class="badge badge-success mr-2">All Passed</span>
        <span v-else-if="lifecycleStatus === 'failed'" class="badge badge-danger mr-2">Failed</span>
        <span v-else-if="lifecycleStatus === 'running'" class="badge badge-warning mr-2">Running</span>
        <span v-else class="badge badge-secondary mr-2">Pending</span>
        <span class="collapse-icon">{{ expanded ? '▲' : '▼' }}</span>
      </div>
    </div>
    <div v-show="expanded" class="card-body p-0">
      <div class="phase-timeline">
        <div v-for="(phase, index) in phases" :key="phase.id"
             class="phase-block"
             :class="{
               'phase-active': phase.status === 'running',
               'phase-complete': phase.status === 'passed',
               'phase-failed': phase.status === 'failed'
             }">
          <div class="phase-header" @click="phase.expanded = !phase.expanded">
            <div class="phase-number">
              <i v-if="phase.status === 'passed'" class="fas fa-check"></i>
              <span v-else>{{ index + 1 }}</span>
            </div>
            <div class="phase-info">
              <div class="phase-title">{{ phase.name }}</div>
              <div class="phase-description">{{ phase.description }}</div>
            </div>
            
            <div class="d-flex align-items-center gap-2">
              <button v-if="manualMode" 
                      class="btn btn-sm btn-outline-success py-1"
                      :disabled="isRunning || phase.status === 'passed'"
                      @click.stop="$emit('execute-phase', phase)">
                {{ getStepAction(phase.id) }} Phase
              </button>
              
              <div v-if="phase.status === 'running'" class="spinner-border spinner-border-sm text-warning" role="status"></div>
              <div v-else-if="phase.status === 'passed'" class="text-success small"><i class="fas fa-check-circle"></i></div>
              <div v-else-if="phase.status === 'failed'" class="text-danger"><i class="fas fa-times-circle"></i></div>
              <div v-else class="phase-pending-dot"></div>
              <i class="fas ml-2 text-muted small" :class="phase.expanded ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
            </div>
          </div>
          
          <!-- Steps Drill-down -->
          <div v-show="phase.expanded" class="phase-steps">
            <div v-for="step in phase.steps" :key="step.id" class="phase-step-item">
              <div class="d-flex align-items-center flex-1">
                <div class="step-status-icon">
                  <i v-if="step.status === 'passed'" class="fas fa-check text-success"></i>
                  <i v-else-if="step.status === 'failed'" class="fas fa-times text-danger"></i>
                  <i v-else-if="step.status === 'running'" class="fas fa-circle-notch fa-spin text-warning"></i>
                  <i v-else class="far fa-circle text-muted"></i>
                </div>
                
                <div class="step-action-bubble" :class="'action-' + getStepActionClass(phase.id)">
                  {{ getStepAction(phase.id) }}
                </div>
                
                <div class="step-entity-text">
                  {{ getStepEntity(step, identities) }}
                </div>
                
                <div v-if="step.txHash" class="step-tx-hash text-truncate" style="max-width: 150px">
                  <i class="fas fa-link"></i> {{ step.txHash }}
                </div>
              </div>
              
              <div class="step-actions">
                <button v-if="manualMode && step.status !== 'passed'" 
                        @click="$emit('execute-step', phase, step)"
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
</template>

<script setup lang="ts">
import { getStepAction, getStepActionClass, getStepEntity } from '../testRunner'

defineProps<{
  phases: any[]
  identities: any[]
  isRunning: boolean
  manualMode: boolean
  expanded: boolean
  completedSteps: number
  totalSteps: number
  lifecycleStatus: string
}>()

defineEmits<{
  (e: 'update:manualMode', val: boolean): void
  (e: 'toggle-collapsible', key: string): void
  (e: 'execute-phase', phase: any): void
  (e: 'execute-step', phase: any, step: any): void
}>()
</script>
