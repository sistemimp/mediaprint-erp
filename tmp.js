const content = >
const fs = require('fs')
const content = \
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CAvatar,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormCheck,
  CFormInput,
  CListGroup,
  CListGroupItem,
  CRow,
  CSpinner,
} from '@coreui/react'
ECHO attivo.
import { useAuth } from '../../context/AuthContext'
import { apiFetch } from '../../services/apiClient'
import { fetchPermissions } from '../../services/permissions'
import { uploadProfileAvatar } from '../../services/profileAvatar'
import avatar8 from './../../assets/images/avatars/8.jpg'
ECHO attivo.
const formatDateTime = (value) =
  if (!value) {
    return 'N/D'
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return String(value)
  }
  return parsed.toLocaleString('it-IT')
}
ECHO attivo.
