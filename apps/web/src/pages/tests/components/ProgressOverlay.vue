<template>
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
</template>

<script setup lang="ts">
defineProps<{
  isRunning: boolean
  currentStepName: string
  currentPhase: number
  completedSteps: number
  totalSteps: number
}>()
</script>
