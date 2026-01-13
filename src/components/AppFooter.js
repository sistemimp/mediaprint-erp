import React from 'react'
import { CFooter } from '@coreui/react'

import InstantMessagingWidget from './InstantMessagingWidget'

const AppFooter = () => {
  return (
    <CFooter className="px-4">
      <div>
        <a href="https://mediaprint.it" target="_blank" rel="noopener noreferrer">
          Mediaprint S.r.l.
        </a>
        <span className="ms-1">&copy; 2025.</span>
      </div>
      <div className="ms-auto d-flex align-items-center">
        <div className="footer-chat-slot">
          <InstantMessagingWidget showLabel />
        </div>
      </div>
    </CFooter>
  )
}

export default React.memo(AppFooter)
