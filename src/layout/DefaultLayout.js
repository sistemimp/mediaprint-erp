import React from 'react'
import { AppContent, AppSidebar, AppFooter, AppHeader } from '../components/index'
import InstantMessagingWidget from '../components/InstantMessagingWidget'
import { BreadcrumbActionsProvider } from '../context/BreadcrumbActionsContext'

const DefaultLayout = () => {
  return (
    <BreadcrumbActionsProvider>
      <div>
        <AppSidebar />
        <div className="wrapper d-flex flex-column min-vh-100">
          <AppHeader />
          <div className="body flex-grow-1">
            <AppContent />
          </div>
          <AppFooter />
        </div>
        <InstantMessagingWidget />
      </div>
    </BreadcrumbActionsProvider>
  )
}

export default DefaultLayout
