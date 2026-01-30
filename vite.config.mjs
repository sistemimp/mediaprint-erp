import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import autoprefixer from 'autoprefixer'

const resolveWebauthnConfig = (fallbackOrigin) => {
  const originFromEnv = process.env.VITE_WEB_AUTHN_ORIGIN
  const rpIdFromEnv = process.env.VITE_WEB_AUTHN_RP_ID
  const origin = originFromEnv && originFromEnv.trim() !== '' ? originFromEnv.trim() : fallbackOrigin
  let rpId = rpIdFromEnv && rpIdFromEnv.trim() !== '' ? rpIdFromEnv.trim() : ''
  if (!rpId) {
    try {
      rpId = new URL(origin).hostname
    } catch (_error) {
      rpId = 'localhost'
    }
  }
  return { origin, rpId }
}

const webauthnWellKnownPlugin = () => ({
  name: 'webauthn-well-known',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (!req.url || !req.url.startsWith('/.well-known/webauthn')) {
        return next()
      }
      const protocol = server.config.server.https ? 'https' : 'http'
      const host = req.headers.host || `localhost:${server.config.server.port || 3000}`
      const { origin, rpId } = resolveWebauthnConfig(`${protocol}://${host}`)
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ origin, rpId }, null, 2))
      return undefined
    })
  },
  generateBundle() {
    const { origin, rpId } = resolveWebauthnConfig(
      process.env.VITE_WEB_AUTHN_ORIGIN || 'http://localhost:3000',
    )
    this.emitFile({
      type: 'asset',
      fileName: '.well-known/webauthn',
      source: JSON.stringify({ origin, rpId }, null, 2),
    })
  },
})

export default defineConfig(() => {
  const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
  const apiProxyTarget =
    process.env.VITE_API_PROXY_TARGET && process.env.VITE_API_PROXY_TARGET.trim() !== ''
      ? process.env.VITE_API_PROXY_TARGET.trim()
      : 'https://gestionale.mediaprint.it/pubblica'
  return {
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    base: './',
    build: {
      outDir: 'build',
    },
    css: {
      postcss: {
        plugins: [
          autoprefixer({}), // add options if needed
        ],
      },
    },
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.jsx?$/,
      exclude: [],
    },
    optimizeDeps: {
      force: true,
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },
    plugins: [react(), webauthnWellKnownPlugin()],
    resolve: {
      alias: [
        {
          find: 'src/',
          replacement: `${path.resolve(__dirname, 'src')}/`,
        },
      ],
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.scss'],
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
