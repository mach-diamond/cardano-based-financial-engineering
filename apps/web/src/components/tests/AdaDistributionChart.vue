<template>
  <div class="chart-card">
    <div class="chart-card-header">
      <h5><i class="fas fa-chart-pie mr-2"></i>ADA Distribution</h5>
    </div>
    <div class="chart-card-body">
      <div v-if="hasData" class="chart-wrapper">
        <canvas ref="chartCanvas"></canvas>
      </div>
      <div v-else class="text-muted text-center py-3">
        <i class="fas fa-info-circle mr-1"></i>
        No wallets defined
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { Chart, DoughnutController, ArcElement, Tooltip, Legend } from 'chart.js'
import type { WalletConfig } from '@/utils/pipeline/types'

Chart.register(DoughnutController, ArcElement, Tooltip, Legend)

interface Props {
  wallets: WalletConfig[]
}

const props = defineProps<Props>()

const chartCanvas = ref<HTMLCanvasElement | null>(null)
let chartInstance: Chart | null = null

const ROLE_COLORS: Record<string, string> = {
  Originator: 'rgba(139, 92, 246, 0.8)',
  Borrower: 'rgba(34, 197, 94, 0.8)',
  Analyst: 'rgba(59, 130, 246, 0.8)',
  Investor: 'rgba(251, 191, 36, 0.8)',
  Agent: 'rgba(6, 182, 212, 0.8)',
}

const hasData = computed(() => {
  return props.wallets.some(w => w.initialFunding && w.initialFunding > 0)
})

const chartData = computed(() => {
  const labels: string[] = []
  const data: number[] = []
  const colors: string[] = []

  for (const wallet of props.wallets) {
    if (wallet.initialFunding && wallet.initialFunding > 0) {
      labels.push(wallet.name)
      data.push(wallet.initialFunding)
      colors.push(ROLE_COLORS[wallet.role] || 'rgba(156, 163, 175, 0.8)')
    }
  }

  return {
    labels,
    datasets: [{
      data,
      backgroundColor: colors,
      borderColor: 'rgba(30, 41, 59, 1)',
      borderWidth: 2
    }]
  }
})

function initChart() {
  nextTick(() => {
    if (!chartCanvas.value) return

    if (chartInstance) chartInstance.destroy()

    chartInstance = new Chart(chartCanvas.value, {
      type: 'doughnut',
      data: chartData.value,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: ${ctx.parsed.toLocaleString()} ADA`
            }
          }
        }
      }
    })
  })
}

watch(() => props.wallets, () => {
  initChart()
}, { deep: true })

onMounted(() => {
  initChart()
})
</script>

<style scoped>
.chart-card {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  overflow: hidden;
}

.chart-card-header {
  background: rgba(0, 0, 0, 0.3);
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.chart-card-header h5 {
  margin: 0;
  font-size: 0.9rem;
  color: #e2e8f0;
  font-weight: 600;
}

.chart-card-body {
  padding: 1rem;
}

.chart-wrapper {
  height: 180px;
  position: relative;
}
</style>
