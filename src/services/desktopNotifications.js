const DESKTOP_NOTIFICATIONS_KEY = 'im.desktopNotifications.enabled'

const getLocalStorage = () => {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    return window.localStorage
  } catch (_error) {
    return null
  }
}

export const isDesktopNotificationSupported = () =>
  typeof window !== 'undefined' && 'Notification' in window

export const getDesktopNotificationsEnabled = () => {
  const storage = getLocalStorage()
  if (!storage) {
    return false
  }
  return storage.getItem(DESKTOP_NOTIFICATIONS_KEY) === 'true'
}

export const setDesktopNotificationsEnabled = (value) => {
  const storage = getLocalStorage()
  if (!storage) {
    return
  }
  storage.setItem(DESKTOP_NOTIFICATIONS_KEY, value ? 'true' : 'false')
}

export const getDesktopNotificationPermission = () => {
  if (!isDesktopNotificationSupported()) {
    return 'unsupported'
  }
  return Notification.permission
}

export const requestDesktopNotificationPermission = async () => {
  if (!isDesktopNotificationSupported()) {
    return 'unsupported'
  }
  if (Notification.permission !== 'default') {
    return Notification.permission
  }
  try {
    return await Notification.requestPermission()
  } catch (_error) {
    return Notification.permission || 'denied'
  }
}

const alwaysShowDesktopNotifications = (import.meta.env.VITE_DESKTOP_NOTIFICATIONS_ALWAYS_SHOW || '').toLowerCase() === 'true'

const shouldShowDesktopNotification = () => {
  if (!isDesktopNotificationSupported()) {
    return false
  }
  if (!getDesktopNotificationsEnabled()) {
    return false
  }
  if (Notification.permission !== 'granted') {
    return false
  }
  if (typeof document !== 'undefined') {
    if (document.hidden) {
      return true
    }
    if (typeof document.hasFocus === 'function') {
      if (!alwaysShowDesktopNotifications) {
        return !document.hasFocus()
      }
      return true
    }
  }
  return true
}

if (typeof window !== 'undefined') {
  window.shouldShowDesktopNotification = shouldShowDesktopNotification
}

export const showDesktopNotification = ({ title, body, tag, icon } = {}) => {
  if (!shouldShowDesktopNotification()) {
    return false
  }
  try {
    const notification = new Notification(title || 'Nuovo messaggio', {
      body,
      tag,
      icon: icon || '/favicon.ico',
    })
    if (typeof window !== 'undefined') {
      notification.onclick = () => {
        window.focus()
      }
      window.setTimeout(() => {
        notification.close()
      }, 6000)
    }
    return true
  } catch (_error) {
    return false
  }
}
