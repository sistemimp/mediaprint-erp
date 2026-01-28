import React from 'react'

const REMOTE_URL = 'https://gestionale.mediaprint.it'

const App = () => (
  <div className="app-wrapper">
    <iframe
      src={REMOTE_URL}
      title="Mediaprint ERP"
      className="app-iframe"
      allowFullScreen
      loading="lazy"
    />
  </div>
)

export default App
