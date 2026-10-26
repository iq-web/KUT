import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const environment = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> }
}).process?.env
const repositoryName = environment?.GITHUB_REPOSITORY?.split('/')[1]
const base = repositoryName && !repositoryName.endsWith('.github.io')
  ? `/${repositoryName}/`
  : '/'

export default defineConfig({
  base,
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5173, strictPort: false },
})
