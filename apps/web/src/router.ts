import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/pages/Home.vue'),
    },
    // Loan Contract Routes
    {
      path: '/loan',
      name: 'loan',
      component: () => import('@/pages/loan/Index.vue'),
    },
    {
      path: '/loan/create',
      name: 'loan-create',
      component: () => import('@/pages/loan/Create.vue'),
    },
    {
      path: '/loan/:id',
      name: 'loan-view',
      component: () => import('@/pages/loan/View.vue'),
    },
    // CDO Bond Routes
    {
      path: '/cdo',
      name: 'cdo',
      component: () => import('@/pages/cdo/Index.vue'),
    },
    {
      path: '/cdo/create',
      name: 'cdo-create',
      component: () => import('@/pages/cdo/Create.vue'),
    },
    {
      path: '/cdo/:id',
      name: 'cdo-view',
      component: () => import('@/pages/cdo/View.vue'),
    },
    // Test Monitor Routes
    {
      path: '/tests',
      name: 'tests',
      component: () => import('@/pages/tests/Index.vue'),
    },
    {
      path: '/tests/config',
      name: 'test-config',
      component: () => import('@/pages/tests/Config.vue'),
    },
    {
      path: '/tests/config/:id',
      name: 'test-config-edit',
      component: () => import('@/pages/tests/Config.vue'),
    },
    {
      path: '/tests/loan/:id',
      name: 'test-loan-view',
      component: () => import('@/pages/loan/View.vue'),
      props: { isTestMode: true },
    },
    {
      path: '/tests/clo/:id',
      name: 'test-clo-view',
      component: () => import('@/pages/cdo/View.vue'),
      props: { isTestMode: true },
    },
    {
      path: '/tests/:suite',
      name: 'test-suite',
      component: () => import('@/pages/tests/Suite.vue'),
    },
  ],
})

export default router
