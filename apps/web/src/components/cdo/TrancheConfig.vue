<template>
  <div class="p-3 rounded" style="background-color: rgba(74, 85, 104, 0.5);">
    <div class="d-flex align-items-center mb-3">
      <div class="rounded-circle mr-2" :class="colorClass" style="width: 12px; height: 12px;"></div>
      <h6 class="mb-0 font-weight-bold">{{ label }}</h6>
      <small class="text-muted ml-2">{{ description }}</small>
    </div>
    <div class="row">
      <div class="col-6">
        <label class="form-label small text-muted">Allocation %</label>
        <input
          :value="percentage"
          @input="$emit('update:percentage', Number(($event.target as HTMLInputElement).value))"
          type="number"
          min="0"
          max="100"
          class="form-control"
        />
      </div>
      <div class="col-6">
        <label class="form-label small text-muted">Interest Rate %</label>
        <input
          :value="rate"
          @input="$emit('update:rate', Number(($event.target as HTMLInputElement).value))"
          type="number"
          min="0"
          step="0.1"
          class="form-control"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  percentage: number
  rate: number
  label: string
  color: 'green' | 'yellow' | 'red'
  description: string
}>()

defineEmits<{
  'update:percentage': [value: number]
  'update:rate': [value: number]
}>()

const colorClass = computed(() => ({
  green: 'bg-success',
  yellow: 'bg-warning',
  red: 'bg-danger',
}[props.color]))
</script>
