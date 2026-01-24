<template>
  <button
    @click="$emit('click')"
    type="button"
    class="btn btn-link btn-sm text-info p-0 d-inline-flex align-items-center"
  >
    <svg class="mr-1" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <span><slot /></span>
  </button>
</template>

<script setup lang="ts">
defineEmits(['click'])
</script>
