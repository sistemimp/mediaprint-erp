# Roadmap suggerita

## Priorita alta
- Allineare `docs/API.md` a tutti gli endpoint in `backend/pubblica/`
- Introdurre matrice permessi completa (permesso -> route FE -> endpoint BE)
- Aggiungere smoke test automatici per login, liste principali e permessi

## Priorita media
- Documentare in modo operativo MFA (OTP/passkey) e policy reset password
- Formalizzare runbook WS (deploy, healthcheck, troubleshooting)
- Coprire con test i flussi critici:
  - preventivi -> DDT/fatture
  - import pagamenti
  - import/export XML
  - upload file contratti/lavorazioni

## Priorita bassa
- Consolidare naming endpoint legacy (es. `pachettiDetail.php`)
- Migliorare tracciamento changelog tecnico per ticket/release notes
- Mantenere aggiornato `docs/sviluppo/11-schema-er-sintetico.md` ad ogni evoluzione DB

## Processo manutentivo documentazione
- Aggiornare `docs/sviluppo` ad ogni rilascio backend o frontend rilevante
- Inserire data di allineamento nei documenti principali
- Verificare riferimenti file/path durante le PR
