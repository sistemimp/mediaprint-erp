const { existsSync } = require('node:fs')
const { readFileSync } = require('node:fs')
const { spawnSync } = require('node:child_process')
const path = require('node:path')

const args = process.argv.slice(2)
if (args.length === 0) {
  console.error('Usage: node k6/run-k6.cjs <k6-args...>')
  process.exit(1)
}

const candidates = [
  process.env.K6_BIN,
  'k6',
  'k6.exe',
  'C:\\Program Files\\k6\\k6.exe',
  'C:\\ProgramData\\chocolatey\\bin\\k6.exe',
].filter(Boolean)

loadEnvFile(path.resolve(process.cwd(), 'k6/.env.local'))
loadEnvFile(path.resolve(process.cwd(), 'k6/.env'))

const bin = findK6Binary(candidates)
if (!bin) {
  console.error('k6 non trovato. Imposta K6_BIN o aggiungi k6 al PATH.')
  console.error('Percorsi verificati:')
  for (const candidate of candidates) {
    console.error(`- ${candidate}`)
  }
  process.exit(1)
}

const child = spawnSync(bin, args, {
  stdio: 'inherit',
  shell: false,
  env: process.env,
})

if (child.error) {
  console.error(`Errore avviando k6: ${child.error.message}`)
  process.exit(1)
}

process.exit(child.status ?? 1)

function findK6Binary(list) {
  for (const candidate of list) {
    if (candidate.includes(path.sep) || candidate.includes('\\') || candidate.includes('/')) {
      if (existsSync(candidate)) {
        return candidate
      }
      continue
    }

    const probe = spawnSync(candidate, ['version'], {
      stdio: 'ignore',
      shell: false,
    })
    if (!probe.error && (probe.status === 0 || probe.status === 99)) {
      return candidate
    }
  }
  return null
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return
  }

  const content = readFileSync(filePath, 'utf8')
  const lines = content.split(/\r?\n/)
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) {
      continue
    }
    const idx = line.indexOf('=')
    if (idx <= 0) {
      continue
    }
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()
    if (!key) {
      continue
    }
    if (process.env[key] === undefined || process.env[key] === '') {
      process.env[key] = value
    }
  }
}
