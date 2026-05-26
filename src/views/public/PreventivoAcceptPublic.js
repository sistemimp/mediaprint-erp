import React, { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CContainer,
  CForm,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CRow,
} from '@coreui/react'
import {
  fetchPreventivoPublicDetail,
  sendPreventivoPublicOtp,
  verifyPreventivoPublicOtp,
} from '../../services/preventiviPublic'

const useQuery = () => new URLSearchParams(useLocation().search)

const PreventivoAcceptPublic = () => {
  const query = useQuery()
  const token = String(query.get('token') || '')
  const [detail, setDetail] = useState(null)
  const [pdfUrl, setPdfUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const [form, setForm] = useState({
    consenso: false,
    nome: '',
    cognome: '',
    email: '',
    cf_piva: '',
    otp: '',
  })

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const payload = await fetchPreventivoPublicDetail({ token })
        setDetail(payload?.data || null)
        setPdfUrl(String(payload?.pdf_url || ''))
      } catch (e) {
        setError(e?.message || 'Impossibile caricare il preventivo.')
      } finally {
        setLoading(false)
      }
    }
    if (token) {
      run()
    } else {
      setLoading(false)
      setError('Token mancante.')
    }
  }, [token])

  const canSendOtp = useMemo(() => {
    return form.consenso && form.nome.trim() && form.cognome.trim() && form.email.trim()
  }, [form])

  const handleSendOtp = async (e) => {
    e.preventDefault()
    setError('')
    setSendingOtp(true)
    try {
      await sendPreventivoPublicOtp({ body: { token, ...form } })
      setOtpSent(true)
    } catch (err) {
      setError(err?.message || 'Invio OTP fallito.')
    } finally {
      setSendingOtp(false)
    }
  }

  const handleVerify = async () => {
    setError('')
    setVerifying(true)
    try {
      const result = await verifyPreventivoPublicOtp({ body: { token, ...form } })
      setReceipt(result?.receipt || null)
    } catch (err) {
      setError(err?.message || 'Verifica OTP fallita.')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <CContainer className="py-4">
      <CRow>
        <CCol lg={8}>
          <CCard>
            <CCardHeader>Accettazione preventivo online</CCardHeader>
            <CCardBody>
              {loading ? <p>Caricamento...</p> : null}
              {error ? <CAlert color="danger">{error}</CAlert> : null}
              {detail ? (
                <p className="mb-2">
                  Preventivo #{detail?.numero_documento || detail?.id_preventivo}
                </p>
              ) : null}
              {pdfUrl ? (
                <iframe
                  title="PDF preventivo"
                  src={pdfUrl}
                  style={{ width: '100%', height: '70vh', border: '1px solid #ddd' }}
                />
              ) : null}
            </CCardBody>
          </CCard>
        </CCol>
        <CCol lg={4}>
          <CCard>
            <CCardHeader>Conferma cliente</CCardHeader>
            <CCardBody>
              {receipt ? (
                <CAlert color="success">
                  Accettazione registrata. Ricevuta #{receipt?.id_receipt} del{' '}
                  {receipt?.accepted_at}.
                </CAlert>
              ) : (
                <CForm onSubmit={handleSendOtp}>
                  <div className="mb-2">
                    <CFormCheck
                      id="consenso"
                      checked={form.consenso}
                      onChange={(e) => setForm((prev) => ({ ...prev, consenso: e.target.checked }))}
                      label="Confermo di aver letto il preventivo e di volerlo accettare."
                    />
                  </div>
                  <div className="mb-2">
                    <CFormLabel>Nome</CFormLabel>
                    <CFormInput
                      value={form.nome}
                      onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))}
                    />
                  </div>
                  <div className="mb-2">
                    <CFormLabel>Cognome</CFormLabel>
                    <CFormInput
                      value={form.cognome}
                      onChange={(e) => setForm((prev) => ({ ...prev, cognome: e.target.value }))}
                    />
                  </div>
                  <div className="mb-2">
                    <CFormLabel>Email</CFormLabel>
                    <CFormInput
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div className="mb-3">
                    <CFormLabel>Codice fiscale / P.IVA (opzionale)</CFormLabel>
                    <CFormInput
                      value={form.cf_piva}
                      onChange={(e) => setForm((prev) => ({ ...prev, cf_piva: e.target.value }))}
                    />
                  </div>
                  {!otpSent ? (
                    <CButton type="submit" color="primary" disabled={!canSendOtp || sendingOtp}>
                      {sendingOtp ? 'Invio OTP...' : 'Invia OTP'}
                    </CButton>
                  ) : (
                    <>
                      <div className="mb-2">
                        <CFormLabel>OTP</CFormLabel>
                        <CFormInput
                          value={form.otp}
                          onChange={(e) => setForm((prev) => ({ ...prev, otp: e.target.value }))}
                        />
                      </div>
                      <CButton
                        type="button"
                        color="success"
                        onClick={handleVerify}
                        disabled={verifying || !form.otp.trim()}
                      >
                        {verifying ? 'Verifica...' : 'Conferma accettazione'}
                      </CButton>
                    </>
                  )}
                </CForm>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </CContainer>
  )
}

export default PreventivoAcceptPublic
