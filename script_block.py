path = 'src/views/lavorazioni/LavorazioneDetail.js'
with open(path, 'r', encoding='utf-8') as f:
    data = f.read()
start = data.index('                          <div className="mt-3 d-flex flex-wrap gap-2 align-items-center">')
end = data.index('                          <div className="mt-3 text-body-secondary small">Nessuna distinta generata.', start)
print(repr(data[start:end]))
