const fs = require('fs')
const path = require('path')
const filePath = path.join('src', 'views', 'lavorazioni', 'LavorazioneDetail.js')
let text = fs.readFileSync(filePath, 'utf8')
const oldBlock =                 {shippingList.length === 0 ? (
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

const newBlock =                 {shippingList.length === 0 ? (
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

if (!text.includes(oldBlock)) {
  throw new Error('old block not found')
}
text = text.replace(oldBlock, newBlock)
fs.writeFileSync(filePath, text, 'utf8')
console.log('done')
