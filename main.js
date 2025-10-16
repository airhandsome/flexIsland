const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const url = require('url');
const { getSnapshot } = require(path.join(__dirname, 'src', 'main', 'system-data.js'));
const { startNotificationWatcher } = require(path.join(__dirname, 'src', 'main', 'notification-watcher.js'));

let mainWindow;
let settingsWindow;
let closeConfirmWindow;
let apiServer;

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 400,
    height: 120,
    minHeight: 120,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true, // 允许调整大小以支持高度变化
    show: true, // 确保窗口始终显示
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // 加载应用的index.html
  console.log('📝 主进程开始加载 index.html');
  mainWindow.loadFile('index.html');
  console.log('📝 主进程完成加载 index.html');

  // 设置窗口位置到屏幕顶部中央
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;
  
  const windowWidth = 400;
  const x = Math.round((screenWidth - windowWidth) / 2);
  const y = 20;
  
  mainWindow.setPosition(x, y);
  
  // 添加窗口大小变化监听器
  mainWindow.on('resize', () => {
    const [width, height] = mainWindow.getSize();
  });
  
  mainWindow.on('move', () => {
    const [x, y] = mainWindow.getPosition();
    const [width, height] = mainWindow.getSize();
  });

  // 开发模式下打开开发者工具
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // 每秒推送系统时间到渲染进程
  setInterval(() => {
    try {
      const now = new Date();
      const timePayload = {
        iso: now.toISOString(),
        localeTime: now.toLocaleTimeString(),
        localeDate: now.toLocaleDateString()
      };
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('tick-time', timePayload);
      }
    } catch (e) {
      // ignore
    }
  }, 1000);

  // 每5秒推送一次系统状态快照
  setInterval(async () => {
    try {
      const snap = await getSnapshot();
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('system-snapshot', snap);
      }
    } catch (e) {
      // ignore
    }
  }, 5000);

  // 启动通知文件夹监听 data/notifications
  startNotificationWatcher(__dirname, (n) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('new-notification', n);
    }
  });

  // 启动内置本地 API，供渲染进程通过 fetch 获取数据
  startLocalApi();
}

// 当Electron完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(createWindow);

// 当所有窗口都被关闭时退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 处理来自渲染进程的消息
ipcMain.handle('hide-window', () => {
  // 不再隐藏窗口，保持始终显示
  // if (mainWindow) {
  //   mainWindow.hide();
  // }
});

ipcMain.handle('show-window', () => {
  if (mainWindow) {
    mainWindow.show();
  }
});

ipcMain.handle('close-app', () => {
  app.quit();
});

// 打开关闭确认窗口
ipcMain.handle('open-close-confirm', () => {
  if (closeConfirmWindow) {
    closeConfirmWindow.focus();
    return;
  }
  
  closeConfirmWindow = new BrowserWindow({
    width: 400,
    height: 300,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  
  closeConfirmWindow.loadFile('src/close-confirm/close-confirm.html');
  
  closeConfirmWindow.on('closed', () => {
    closeConfirmWindow = null;
  });
});

// 关闭确认窗口
ipcMain.handle('close-confirm-window', () => {
  if (closeConfirmWindow) {
    closeConfirmWindow.close();
  }
});

// 处理窗口高度变化
ipcMain.handle('resize-window', (event, height) => {
  if (mainWindow) {
    const [currentWidth, currentHeight] = mainWindow.getSize();
    mainWindow.setSize(currentWidth, height);
    const [newWidth, newHeight] = mainWindow.getSize();
  }
});

// 获取窗口位置
ipcMain.handle('get-window-position', () => {
  if (mainWindow) {
    return mainWindow.getPosition();
  }
  return [0, 0];
});

// 移动窗口
ipcMain.handle('move-window', (event, x, y) => {
  if (mainWindow) {
    // 确保只移动位置，不改变大小
    const [currentWidth, currentHeight] = mainWindow.getSize();
    mainWindow.setBounds({
      x: Math.round(x),
      y: Math.round(y),
      width: currentWidth,
      height: currentHeight
    });
  }
});

// 打开设置窗口
ipcMain.handle('open-settings', () => {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }
  
  settingsWindow = new BrowserWindow({
    width: 500,
    height: 600,
    minWidth: 400,
    minHeight: 500,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  
  settingsWindow.loadFile('src/settings/settings.html');
  
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
});

// 关闭设置窗口
ipcMain.handle('close-settings-window', () => {
  if (settingsWindow) {
    settingsWindow.close();
  }
});

// 应用设置
ipcMain.handle('apply-settings', (event, settings) => {
  // 应用设置到主窗口
  if (mainWindow) {
    // 发送设置到主窗口
    mainWindow.webContents.send('apply-theme-settings', settings);
    
    // 应用窗口设置
    if (settings.alwaysOnTop !== undefined) {
      mainWindow.setAlwaysOnTop(settings.alwaysOnTop);
    }
    
    if (settings.showInTaskbar !== undefined) {
      mainWindow.setSkipTaskbar(!settings.showInTaskbar);
    }
    
    // 应用位置设置
    if (settings.position) {
      const { screen } = require('electron');
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
      const [currentWidth, currentHeight] = mainWindow.getSize();
      
      let x, y;
      switch (settings.position) {
        case 'top-left':
          x = 20;
          y = 20;
          break;
        case 'top-right':
          x = screenWidth - currentWidth - 20;
          y = 20;
          break;
        case 'bottom-center':
          x = Math.round((screenWidth - currentWidth) / 2);
          y = screenHeight - currentHeight - 20;
          break;
        case 'top-center':
        default:
          x = Math.round((screenWidth - currentWidth) / 2);
          y = 20;
          break;
      }
      
      mainWindow.setPosition(x, y);
    }
  }
  
  console.log('应用设置:', settings);
});

// 接收外部真实通知并转发给渲染进程
ipcMain.handle('push-notification', (event, notification) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('new-notification', notification);
  }
});

function startLocalApi() {
  if (apiServer) return;
  apiServer = http.createServer(async (req, res) => {
    const parsed = url.parse(req.url, true);
    const send = (code, obj) => {
      res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(obj !== undefined ? JSON.stringify(obj) : '');
    };
    try {
      if (parsed.pathname === '/api/time') {
        const now = new Date();
        return send(200, { iso: now.toISOString(), localeTime: now.toLocaleTimeString(), localeDate: now.toLocaleDateString() });
      }
      if (parsed.pathname === '/api/system') {
        const snap = await getSnapshot();
        return send(200, snap);
      }
      if (parsed.pathname === '/api/notification/latest') {
        const latest = getLatestNotification();
        if (latest) return send(200, latest);
        return send(204);
      }
      send(404, { error: 'not_found' });
    } catch (e) {
      send(500, { error: 'server_error', message: String(e) });
    }
  });
  apiServer.listen(0, '127.0.0.1', () => {
    const address = apiServer.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('api-ready', { baseUrl });
    }
  });
}

function getLatestNotification() {
  try {
    const dir = path.join(__dirname, 'data', 'notifications');
    if (!fs.existsSync(dir)) return null;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => path.join(dir, f));
    if (files.length === 0) return null;
    const latestFile = files.map(f => ({ f, m: fs.statSync(f).mtimeMs })).sort((a, b) => b.m - a.m)[0].f;
    const text = fs.readFileSync(latestFile, 'utf8');
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}