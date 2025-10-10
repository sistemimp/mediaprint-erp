import React from 'react'

const BottomToast = ({ open, message, type = 'success' }) => {
  if (!open) return null

  const bg = type === 'error' ? '#dc3545' : '#198754' // danger / success

  const style = {
    position: 'fixed',
    left: '50%',
    bottom: '24px',
    transform: 'translateX(-50%)',
    backgroundColor: bg,
    color: '#fff',
    padding: '10px 16px',
    borderRadius: 8,
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    zIndex: 1050,
    maxWidth: '80vw',
    textAlign: 'center',
    fontSize: 14,
  }

  return <div style={style}>{message}</div>
}

export default BottomToast

