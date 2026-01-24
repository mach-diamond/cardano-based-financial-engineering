<template>
  <div class="card h-100">
    <div class="card-body d-flex flex-column">
      <h5 class="card-title mb-1">{{ title }}</h5>
      <p class="card-text small text-muted mb-3">{{ description }}</p>
      <slot name="extra" />
      <button
        @click="$emit('action')"
        :disabled="disabled"
        class="btn btn-block mt-auto"
        :class="buttonClass"
      >
        {{ buttonText }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  title: string
  description: string
  buttonText: string
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  disabled?: boolean
}>(), {
  variant: 'primary',
  disabled: false,
})

defineEmits<{
  action: []
}>()

const buttonClass = computed(() => {
  const classes: Record<string, string> = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    success: 'btn-success',
  }
  return classes[props.variant]
})
</script>
