const path = require('node:path')
const { app, BrowserWindow } = require('electron')

const isDev = false //process.env.NODE_ENV !== 'production' && !app.isPackaged
const rendererUrl = 'https://gestionale.mediaprint.it/#/login'

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 840,
    minWidth: 840,
    minHeight: 600,
    backgroundColor: '#f8f9fa',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: true, //mariiiiia importantissimo
      contextIsolation: true, //mariiiiia importantissimo
      enableRemoteModule: true, //mariiiiia importantissimo
    },
  })

  if (isDev) {
    mainWindow.loadURL(rendererUrl)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
