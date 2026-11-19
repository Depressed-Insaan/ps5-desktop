/// <reference types="vite-plugin-electron/electron-env" />

import type { Api } from '../src/types'

declare global {
  interface Window {
    /** Bridge exposed by electron/preload.ts. Optional when opened in a browser. */
    api: Api
  }

  namespace NodeJS {
    interface ProcessEnv {
      /**
       * The built directory structure
       *
       * ```tree
       * ├─┬─┬ dist
       * │ │ └── index.html
       * │ │
       * │ ├─┬ dist-electron
       * │ │ ├── main.js
       * │ │ └── preload.js
       * │
       * ```
       */
      APP_ROOT: string
      /** /dist/ or /public/ */
      VITE_PUBLIC: string
    }
  }
}

export {}
