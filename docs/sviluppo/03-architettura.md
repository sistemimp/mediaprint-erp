# Architettura

## Separazione FE/BE
- Frontend React in `src/`
- Backend PHP in `backend/`
- Endpoints pubblici in `backend/pubblica`
- Schema DB e dump in `sql/`

## Flusso principale
1. Il frontend usa i client in `src/services/` per chiamare gli endpoint.
2. Gli endpoint PHP caricano `backend/bootstrap.php`, validano input e
   delegano a Service/Repository.
3. Il Repository usa PDO per accedere a MySQL, restituisce dati normalizzati.
4. Il frontend aggiorna lo stato UI e mostra le viste CoreUI.

## Struttura cartelle chiave
- `src/services` - client API FE
- `src/views` - viste per moduli ERP
- `src/context/AuthContext.js` - gestione auth e token
- `src/components/RequireAuth.js` - protezione route
- `backend/src/Repositories` - accesso dati con PDO
- `backend/src/Service` - logica applicativa
- `backend/pubblica` - endpoint HTTP

## Convenzioni
- Risposte JSON con codici HTTP significativi
- Error handling con `message` e codici `4xx/5xx`
- JWT come bearer token per autenticazione
