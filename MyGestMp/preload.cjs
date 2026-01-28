const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('electronBridge', {
  platform: process.platform,
})
contextBridge.exposeInMainWorld('desktopNotificationDebug', {
  shouldShow: () => {
    console.log('desktop-notif check', {
      hidden: typeof document !== 'undefined' ? document.hidden : undefined,
      hasFocus:
        typeof document !== 'undefined' && typeof document.hasFocus === 'function'
          ? document.hasFocus()
          : undefined,
      permission: Notification.permission,
    })

    return window.__shouldShowDesktopNotification?.()
  },
})
