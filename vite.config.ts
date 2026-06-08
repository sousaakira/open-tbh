import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import electron from 'vite-plugin-electron/simple'
import renderer from 'vite-plugin-electron-renderer'

function serveAssetsPlugin(): Plugin {
  const assetsDir = path.resolve(__dirname, 'assets')

  return {
    name: 'serve-and-copy-assets',
    configureServer(server) {
      server.middlewares.use('/game-assets', (req, res, next) => {
        const filePath = path.join(assetsDir, req.url ?? '')
        if (!filePath.startsWith(assetsDir) || !fs.existsSync(filePath)) {
          next()
          return
        }
        const ext = path.extname(filePath)
        const types: Record<string, string> = {
          '.png': 'image/png',
          '.json': 'application/json',
        }
        res.setHeader('Content-Type', types[ext] ?? 'application/octet-stream')
        fs.createReadStream(filePath).pipe(res)
      })
    },
    closeBundle() {
      const outDir = path.resolve(__dirname, 'dist/game-assets')
      fs.cpSync(assetsDir, outDir, { recursive: true })
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [
    electron({
      main: {
        entry: 'electron/main.ts',
      },
      preload: {
        input: 'electron/preload.ts',
      },
    }),
    renderer(),
    serveAssetsPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  },
})
