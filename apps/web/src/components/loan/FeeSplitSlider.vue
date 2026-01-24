<template>
  <div>
    <div class="d-flex justify-content-between small mb-2">
      <span class="text-success">Seller: {{ sellerFee.toFixed(2) }} ADA</span>
      <span class="text-warning">Buyer: {{ buyerFee.toFixed(2) }} ADA</span>
    </div>
    <input
      type="range"
      :value="modelValue"
      @input="$emit('update:modelValue', Number(($event.target as HTMLInputElement).value))"
      min="0"
      max="100"
      class="custom-range"
    />
    <div class="d-flex justify-content-between small text-muted">
      <span>100% Seller</span>
      <span>50/50</span>
      <span>100% Buyer</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue: number
  totalFee: number
}>()

defineEmits<{
  'update:modelValue': [value: number]
}>()

const sellerFee = computed(() => props.totalFee * (props.modelValue / 100))
const buyerFee = computed(() => props.totalFee * ((100 - props.modelValue) / 100))
</script>
