# Stress test API con k6

Script disponibile: `k6/stress-api.js`

Flusso coperto per ogni VU:
1. `setup`: login su `login.php` (una volta, token condiviso)
2. `preventiviList.php`
3. `preventiviDetail.php` su un ID estratto dalla lista
4. `acquistiRichiesteList.php`

## Prerequisiti

- k6 installato localmente
- backend raggiungibile (`K6_BASE_URL`)
- utente con permessi per `preventivi` e `acquisti richieste`

## Configurazione

1. Copia `k6/.env.example` in `k6/.env.local`
2. Imposta almeno:
   - `K6_BASE_URL`
   - `K6_LOGIN_IDENTIFIER`
   - `K6_LOGIN_PASSWORD`

## Esecuzione (PowerShell)

Carica variabili da file e lancia:

```powershell
Get-Content k6/.env.local | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
  $name, $value = $_ -split '=', 2
  [System.Environment]::SetEnvironmentVariable($name.Trim(), $value.Trim())
}
npm run k6:stress
```

Export summary JSON:

```powershell
npm run k6:stress:summary
```

## Parametri principali

- `K6_START_VUS`, `K6_STAGE_*`: profilo di carico
- `K6_TIMEOUT_MS`: timeout per richiesta HTTP
- `K6_SLEEP_SECONDS`: think time tra iterazioni
- `K6_THRESHOLD_FAILED_RATE`: soglia errori (`http_req_failed`)
- `K6_THRESHOLD_P95_MS`: soglia latenza p95
- `K6_THRESHOLD_CHECKS_RATE`: soglia successo check funzionali

## Note operative

- Il login in `setup` fallisce se l'account richiede MFA (`mfa_required=true`), quindi usa un account tecnico senza MFA per i test automatici.
- Evita produzione per test aggressivi: preferisci ambiente locale/staging.
