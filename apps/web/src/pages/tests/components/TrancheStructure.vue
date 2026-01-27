<template>
  <div class="card h-100">
    <div class="card-header">
      <h6 class="mb-0">CDO Tranche Structure</h6>
    </div>
    <div class="card-body">
      <div class="tranche-stack">
        <div class="tranche tranche-senior">
          <div class="tranche-label">Senior</div>
          <div class="tranche-allocation">70%</div>
          <div class="tranche-value">{{ seniorValue.toFixed(1) }} ADA</div>
          <div class="tranche-tokens">700 tokens</div>
        </div>
        <div class="tranche tranche-mezzanine">
          <div class="tranche-label">Mezzanine</div>
          <div class="tranche-allocation">20%</div>
          <div class="tranche-value">{{ mezzValue.toFixed(1) }} ADA</div>
          <div class="tranche-tokens">200 tokens</div>
        </div>
        <div class="tranche tranche-junior">
          <div class="tranche-label">Junior</div>
          <div class="tranche-allocation">10%</div>
          <div class="tranche-value">{{ juniorValue.toFixed(1) }} ADA</div>
          <div class="tranche-tokens">100 tokens</div>
        </div>
      </div>
      <div class="waterfall-info mt-3">
        <small class="text-muted">
          <strong>Waterfall:</strong> Payments flow Senior → Mezz → Junior<br>
          <strong>Losses:</strong> Absorbed Junior → Mezz → Senior
        </small>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  totalValue: number
}>()

const seniorValue = computed(() => props.totalValue * 0.7)
const mezzValue = computed(() => props.totalValue * 0.2)
const juniorValue = computed(() => props.totalValue * 0.1)
</script>
