import { defineConfig } from 'vitest/config'

// Fast unit tests (game logic, content, validation). Firestore rules tests use vitest.rules.config.ts.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['tests/rules/**', 'node_modules/**'],
    environment: 'node',
    testTimeout: 30_000,
  },
})
