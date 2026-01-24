<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center space-x-4">
      <router-link to="/tests" class="text-gray-400 hover:text-white">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </router-link>
      <div>
        <h1 class="text-2xl font-bold text-white">Test Suite Details</h1>
        <p class="text-gray-400">Suite ID: {{ $route.params.suite }}</p>
      </div>
    </div>

    <!-- Suite Overview -->
    <div class="card">
      <div class="card-header">
        <h3 class="font-semibold">Test Results</h3>
      </div>
      <div class="card-body">
        <div class="text-center py-8 text-gray-500">
          Detailed test view - Implementation pending
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>
