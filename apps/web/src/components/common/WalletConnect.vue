<template>
  <div class="wallet-connect">
    <button
      v-if="!wallet.isConnected"
      @click="showWalletModal = true"
      class="btn btn-primary"
      :disabled="wallet.isConnecting"
    >
      <span v-if="wallet.isConnecting">
        <span class="spinner-border spinner-border-sm mr-2" role="status"></span>
        Connecting...
      </span>
      <span v-else>Connect Wallet</span>
    </button>

    <div v-else class="d-flex align-items-center">
      <div class="text-right mr-3">
        <div class="text-muted small">{{ wallet.balanceADA.toFixed(2) }} ADA</div>
        <div class="small" style="color: #a0aec0;">{{ wallet.shortAddress }}</div>
      </div>
      <button
        @click="wallet.disconnect()"
        class="btn btn-secondary btn-sm"
      >
        Disconnect
      </button>
    </div>

    <!-- Wallet Selection Modal -->
    <div
      class="modal fade"
      :class="{ show: showWalletModal }"
      :style="{ display: showWalletModal ? 'block' : 'none' }"
      tabindex="-1"
      @click.self="showWalletModal = false"
    >
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Connect Wallet</h5>
            <button
              type="button"
              class="close"
              @click="showWalletModal = false"
            >
              <span>&times;</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="list-group">
              <button
                v-for="walletOption in availableWallets"
                :key="walletOption.id"
                @click="connectWallet(walletOption.id)"
                class="list-group-item list-group-item-action d-flex align-items-center"
              >
                <img
                  :src="walletOption.icon"
                  :alt="walletOption.name"
                  class="rounded mr-3"
                  style="width: 40px; height: 40px;"
                />
                <div>
                  <div class="font-weight-bold">{{ walletOption.name }}</div>
                  <small class="text-muted">{{ walletOption.description }}</small>
                </div>
              </button>
            </div>

            <div v-if="wallet.error" class="alert alert-danger mt-3 mb-0">
              {{ wallet.error }}
            </div>

            <div v-if="availableWallets.length === 0" class="alert alert-warning mt-3 mb-0">
              No Cardano wallets detected. Please install a wallet extension like Eternl, Nami, or Lace.
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="showWalletModal" class="modal-backdrop fade show"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useWalletStore } from '@/stores/wallet'

const wallet = useWalletStore()
const showWalletModal = ref(false)

interface WalletOption {
  id: string
  name: string
  description: string
  icon: string
}

const availableWallets = ref<WalletOption[]>([])

onMounted(() => {
  // Detect available wallets
  const cardano = (window as any).cardano
  if (!cardano) return

  const walletIds = ['nami', 'eternl', 'flint', 'lace', 'typhon', 'vespr', 'gerowallet']

  availableWallets.value = walletIds
    .filter(id => cardano[id])
    .map(id => ({
      id,
      name: cardano[id].name || id.charAt(0).toUpperCase() + id.slice(1),
      description: 'Cardano Wallet',
      icon: cardano[id].icon || `https://via.placeholder.com/40?text=${id[0].toUpperCase()}`,
    }))
})

async function connectWallet(walletId: string) {
  await wallet.connect(walletId)
  if (wallet.isConnected) {
    showWalletModal.value = false
  }
}
</script>

<style scoped>
.wallet-connect .modal {
  background-color: rgba(0, 0, 0, 0.5);
}

.list-group-item {
  background-color: #4a5568;
  border-color: #2d3748;
  color: #f7fafc;
}

.list-group-item:hover {
  background-color: #718096;
  color: white;
}
</style>
