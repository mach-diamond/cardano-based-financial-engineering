/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NETWORK: 'mainnet' | 'preprod' | 'preview'
  readonly VITE_BLOCKFROST_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
