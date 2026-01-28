import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import autoprefixer from 'autoprefixer'

const isProd = process.env.NODE_ENV === 'production'

export default defineConfig({
  base: isProd ? './' : '/',
  build: {
    outDir: 'dist',
  },
  server: {
    port: 4173,
  },
  css: {
    postcss: {
      plugins: [autoprefixer()],
    },
  },
  esbuild: {
    loader: 'jsx',
    include: [/src\/.*\.jsx?$/],
    exclude: [],
  },
  resolve: {
    alias: [
      {
        find: '@root',
        replacement: path.resolve(__dirname, '../src'),
      },
      {
        find: 'react',
        replacement: path.resolve(__dirname, 'node_modules/react'),
      },
      {
        find: 'react-dom',
        replacement: path.resolve(__dirname, 'node_modules/react-dom'),
      },
    ],
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.scss'],
  },
  optimizeDeps: {
    force: true,
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
  },
  plugins: [react()],
})
