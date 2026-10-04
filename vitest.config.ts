import { defineConfig } from 'vitest/config'
import { WxtVitest } from 'wxt/testing/vitest-plugin'
import { PRODUCTION_SERVER } from './lib/server'

export default defineConfig({
  plugins: [WxtVitest()],
  define: { __STASHMINE_SERVER__: JSON.stringify(PRODUCTION_SERVER) },
  test: { environment: 'happy-dom' },
})
