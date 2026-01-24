<template>
  <div class="app-wrapper">
    <!-- Navigation -->
    <nav class="navbar navbar-expand-lg navbar-dark">
      <div class="container">
        <router-link to="/" class="navbar-brand">
          MintMatrix
        </router-link>

        <button
          class="navbar-toggler"
          type="button"
          data-toggle="collapse"
          data-target="#navbarNav"
        >
          <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav mr-auto">
            <li class="nav-item">
              <router-link to="/loan" class="nav-link" active-class="active">
                Loan Contract
              </router-link>
            </li>
            <li class="nav-item">
              <router-link to="/cdo" class="nav-link" active-class="active">
                CDO Bond
              </router-link>
            </li>
            <li class="nav-item">
              <router-link to="/tests" class="nav-link" active-class="active">
                Test Monitor
              </router-link>
            </li>
          </ul>

          <div class="d-flex align-items-center">
            <WalletConnect class="mr-3" />
            <NetworkBadge />
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="container py-4">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import WalletConnect from '@/components/common/WalletConnect.vue'
import NetworkBadge from '@/components/common/NetworkBadge.vue'
</script>

<style scoped>
.app-wrapper {
  min-height: 100vh;
}
</style>
