import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'MintMatrix SDK',
  description: 'Financial Instruments Smart Contract SDK for Cardano',

  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/' },
      { text: 'API', link: '/api/' },
      { text: 'Contracts', link: '/contracts/' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/guide/' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Quick Start', link: '/guide/quickstart' },
            { text: 'Configuration', link: '/guide/configuration' },
          ]
        },
        {
          text: 'CDO Bonds',
          items: [
            { text: 'Overview', link: '/guide/cdo/overview' },
            { text: 'Creating Bonds', link: '/guide/cdo/creating' },
            { text: 'Managing Collateral', link: '/guide/cdo/collateral' },
            { text: 'Distributions', link: '/guide/cdo/distributions' },
            { text: 'Lifecycle', link: '/guide/cdo/lifecycle' },
          ]
        },
        {
          text: 'Loans',
          items: [
            { text: 'Overview', link: '/guide/loan/overview' },
            { text: 'Creating Loans', link: '/guide/loan/creating' },
            { text: 'Payments', link: '/guide/loan/payments' },
            { text: 'Defaults', link: '/guide/loan/defaults' },
          ]
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'MintMatrix Client', link: '/api/' },
            { text: 'CDOClient', link: '/api/cdo' },
            { text: 'LoanClient', link: '/api/loan' },
            { text: 'Types', link: '/api/types' },
          ]
        },
      ],
      '/contracts/': [
        {
          text: 'Smart Contracts',
          items: [
            { text: 'Overview', link: '/contracts/' },
            { text: 'CDO Bond Contract', link: '/contracts/cdo-bond' },
            { text: 'Asset Transfer Contract', link: '/contracts/asset-transfer' },
            { text: 'Deployment', link: '/contracts/deployment' },
          ]
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/MintMatrix' },
    ],

    footer: {
      message: 'MintMatrix Financial Instruments',
      copyright: 'Copyright © 2024 MintMatrix',
    },

    search: {
      provider: 'local'
    },
  },
})
