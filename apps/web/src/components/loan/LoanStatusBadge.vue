<template>
  <span :class="badgeClass">{{ statusText }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LoanState } from '@/types'

const props = defineProps<{
  state: LoanState
}>()

const statusText = computed(() => {
  if (props.state.isPaidOff) return 'Paid Off'
  if (props.state.isDefaulted) return 'Defaulted'
  if (props.state.isCancelled) return 'Cancelled'
  if (!props.state.isActive) return 'Pending'
  return 'Active'
})

const badgeClass = computed(() => {
  if (props.state.isPaidOff) return 'badge badge-success'
  if (props.state.isDefaulted) return 'badge badge-danger'
  if (props.state.isCancelled) return 'badge badge-secondary'
  if (!props.state.isActive) return 'badge badge-warning'
  return 'badge badge-info'
})
</script>
