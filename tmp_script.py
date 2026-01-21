from pathlib import Path
path = Path('src/views/lavorazioni/LavorazioneDetail.js')
text = path.read_text(encoding='utf-8')
old_block = '''                {shippingList.length === 0 ? (
                  <CAlert color= light className=mb-0>
                    Nessuna spedizione registrata per questa lavorazione.
                  </CAlert>
                ) : (
                  <CAccordion flush alwaysOpen>
                    {shippingList.map((spedizione, index) => {
                      const statusKey = String(spedizione?.stato ?? 'programmata').toLowerCase()
                      const statusLabel = shippingStateLabels[statusKey] ?? statusKey
                      const badgeColor = shippingStateColors[statusKey] ?? 'secondary'
                      const headerTitle = Operatore:  • Affrancatura: 
                      const itemKey = spedizione-
                      return (
                        <CAccordionItem key={itemKey} itemKey={itemKey}>
                          <CAccordionHeader className=py-3>
                            <div className=d-flex flex-column flex-grow-1 gap-1>
                              <span className=fw-semibold>{headerTitle}</span>
                              {spedizione.data_programmata ? (
                                <span className=text-body-secondary small>
                                  {formatDate(spedizione.data_programmata)}
                                </span>
                              ) : null}
                            </div>
                            <CBadge color={badgeColor} className=text-uppercase ms-3>
                              {statusLabel}
                            </CBadge>
                          </CAccordionHeader>
                          <CAccordionBody className=pt-2 pb-3>
                            {spedizione.note ? (
                              <div className=text-body-secondary small mb-2>{spedizione.note}</div>
                            ) : null}
                            <div className=text-body-secondary small mb-1>
                              Tariffa: {spedizione.tariffa_label || '-'}
                            </div>
                            <div className=text-body-secondary small>
                              Autorizzazione: {spedizione.autorizzazione_label || '-'} • Porto: {spedizione.porto_label || '-'}
                            </div>
                            <div className=mt-3 d-flex flex-wrap gap-2 align-items-center>
                              <CButton
                                size=sm
                                color=secondary
                                variant=outline
                                onClick={() => handleOpenSpedizioneModal(spedizione)}
                                disabled={spedizioneModalSubmitting}
                              >
                                <CIcon icon={cilPen} className=me-2 />
                                Modifica spedizione
                              </CButton>
                              <span className=text-body-secondary small>ID {spedizione.id_spedizione ?? '-'}</span>
                            </div>
                          </CAccordionBody>
                        </CAccordionItem>
                      )
                    })}
                  </CAccordion>
                )}
'''
new_block = '''                {shippingList.length === 0 ? (
                  <CAlert color= light className=mb-0>
                    Nessuna spedizione registrata per questa lavorazione.
                  </CAlert>
                ) : (
                  <CAccordion flush alwaysOpen>
                    {shippingList.map((spedizione, index) => {
                      const statusKey = String(spedizione?.stato ?? 'programmata').toLowerCase()
                      const statusLabel = shippingStateLabels[statusKey] ?? statusKey
                      const badgeColor = shippingStateColors[statusKey] ?? 'secondary'
                      const headerTitle = Operatore:  • Affrancatura: 
                      const itemKey = spedizione-
                      return (
                        <CAccordionItem key={itemKey} itemKey={itemKey}>
                          <CAccordionHeader className=py-3>
                            <div className=d-flex flex-column flex-grow-1 gap-1>
                              <span className=fw-semibold>{headerTitle}</span>
                              {spedizione.data_programmata ? (
                                <span className=text-body-secondary small>
                                  {formatDate(spedizione.data_programmata)}
                                </span>
                              ) : null}
                            </div>
                            <CBadge color={badgeColor} className=text-uppercase ms-3>
                              {statusLabel}
                            </CBadge>
                          </CAccordionHeader>
                          <CAccordionBody className=pt-2 pb-3>
                            {spedizione.note ? (
                              <div className=text-body-secondary small mb-2>{spedizione.note}</div>
                            ) : null}
                            <div className=text-body-secondary small mb-1>
                              Tariffa: {spedizione.tariffa_label || '-'}
                            </div>
                            <div className=text-body-secondary small>
                              Autorizzazione: {spedizione.autorizzazione_label || '-'} • Porto: {spedizione.porto_label || '-'}
                            </div>
                            <div className=mt-3 d-flex flex-wrap gap-2 align-items-center>
                              <CButton
                                size=sm
                                color=secondary
                                variant=outline
                                onClick={() => handleOpenSpedizioneModal(spedizione)}
                                disabled={spedizioneModalSubmitting}
                              >
                                <CIcon icon={cilPen} className=me-2 />
                                Modifica spedizione
                              </CButton>
                              <span className=text-body-secondary small>ID {spedizione.id_spedizione ?? '-'}</span>
                            </div>
                          </CAccordionBody>
                        </CAccordionItem>
                      )
                    })}
                  </CAccordion>
                )}
'''
print('old repr', repr(old_block))
print('new repr', repr(new_block))
if old_block not in text:
    raise SystemExit('old block not found')
text = text.replace(old_block, new_block, 1)
path.write_text(text, encoding='utf-8')
print('done')
