import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

/** GitHub Pages project sites live at /<repo>/; user sites and custom domains at /. */
function basePath(repoName: string): string {
  const name = repoName.trim().replace(/^\/+|\/+$/g, '')
  if (!name || name.toLowerCase().endsWith('.github.io')) return '/'
  return `/${name}/`
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    base: env.VITE_BASE_PATH?.trim() || basePath(env.VITE_GITHUB_REPO_NAME ?? 'ut-oi'),
    plugins: [react()],
    build: { target: 'es2022', chunkSizeWarningLimit: 1600 },
  }
})
