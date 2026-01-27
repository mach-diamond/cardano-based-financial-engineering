<template>
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
          <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
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
          <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">Total Tests</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  stats: {
    passed: number
    failed: number
    running: number
    total: number
  }
}>()
</script>
