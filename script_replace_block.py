path = 'src/views/lavorazioni/LavorazioneDetail.js'
with open(path, 'r', encoding='utf-8') as f:
    data = f.read()
start_str = '                          <div className="mt-3 d-flex flex-wrap gap-2 align-items-center">'
start = data.index(start_str)
end_marker = '                          )}\n'
end = data.index(end_marker, start) + len(end_marker)
old = data[start:end]
new = '''                          <div className="mt-3 d-flex flex-wrap gap-2 align-items-center">
                            <CButton
                              size="sm"
                              color="secondary"
                              variant="outline"
                              onClick={() => handleOpenSpedizioneModal(spedizione)}
                              disabled={spedizioneModalSubmitting}
                            >
                              <CIcon icon={cilPen} className="me-2" />
                              Modifica spedizione
                            </CButton>
                            <span className="text-body-secondary small">ID {spedizione.id_spedizione ?? '-'}</span>
                          </div>
'''
data = data[:start] + new + data[end:]
with open(path, 'w', encoding='utf-8') as f:
    f.write(data)
