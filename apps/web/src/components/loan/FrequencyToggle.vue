<template>
  <div class="btn-group" role="group">
    <button
      v-for="option in options"
      :key="option.value"
      @click="$emit('update:modelValue', option.value)"
      type="button"
      class="btn"
      :class="modelValue === option.value ? 'btn-primary' : 'btn-outline-secondary'"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: number
}>()

defineEmits<{
  'update:modelValue': [value: number]
}>()

const options = [
  { label: 'Monthly', value: 12 },
  { label: 'Quarterly', value: 4 },
  { label: 'Weekly', value: 52 },
]
</script>
