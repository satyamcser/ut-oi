import { defineConfig } from 'vitest/config'

// Runs against the Firestore emulator: `npm run test:rules` (needs Java 11+).
export default defineConfig({
  test: {
    include: ['tests/rules/**/*.test.ts'],
    environment: 'node',
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
})
