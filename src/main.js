const { app, BrowserWindow, screen, globalShortcut, ipcMain, Menu } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { SystemInfoService } = require('./main/services/systemInfo');
const { MediaService } = require('./main/services/media');
const { WindowsToastService } = require('./main/services/toasts');
const { NotificationService } = require('./main/services/notifications');
const { registerIpcHandlers } = require('./main/ipc');

// 初始化配置存储
const store = new Store();

class FlexIslandApp {
  constructor() {
    this.mainWindow = null;
    this.isQuitting = false;
    this.config = {
      width: 400,
      height: 100,
      x: 0,
      y: 0,
      alwaysOnTop: true,
      transparent: false,
      frame: false,
      resizable: true,
      skipTaskbar: true,
      opacity: 0.8
    };
  }

  createWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    
    // 位置优先级：config.x/y > 持久化位置 > 默认顶部居中
    const persisted = store.get('windowPosition', null);
    let x = this.config.x;
    let y = this.config.y;
    if ((x === 0 && y === 0) && persisted) {
      x = persisted.x;
      y = persisted.y;
    }
    if (x === 0 && y === 0) {
      x = Math.round((width - this.config.width) / 2);
      y = 20; // 默认顶部 20px
    }
    
    console.log('屏幕尺寸:', width, 'x', height);
    console.log('窗口配置位置:', this.config.x, this.config.y);
    console.log('持久化位置:', persisted);
    console.log('计算后位置:', x, y);

    this.mainWindow = new BrowserWindow({
      width: this.config.width,
      height: this.config.height,
      x: x,
      y: y,
      alwaysOnTop: this.config.alwaysOnTop,
      transparent: this.config.transparent,
      backgroundColor: '#000000',
      frame: this.config.frame,
      resizable: this.config.resizable,
      skipTaskbar: this.config.skipTaskbar,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true
      },
      show: false // 先不显示，等加载完成后再显示
    });

    // 加载HTML文件
    if (process.argv.includes('--test')) {
      this.mainWindow.loadFile('test.html');
    } else {
      this.mainWindow.loadFile('src/renderer/index.html');
    }

    // 窗口加载完成后显示并强制位置与不透明度
    this.mainWindow.once('ready-to-show', () => {
      console.log('窗口准备显示...');
      // 透明模式下保证最低不透明度可见（调高到 0.9 以更明显）
      const minOpacity = this.config.transparent ? 0.9 : this.config.opacity;
      const appliedOpacity = this.config.transparent ? Math.max(this.config.opacity, minOpacity) : this.config.opacity;
      this.mainWindow.setOpacity(appliedOpacity);
      this.mainWindow.show();
      this.mainWindow.focus();
      this.mainWindow.setPosition(x, y);
      // 告知渲染进程当前透明模式，便于应用可见样式
      this.mainWindow.webContents.send('transparent-mode', this.config.transparent);
      const [px, py] = this.mainWindow.getPosition();
      const [w, h] = this.mainWindow.getSize();
      console.log('窗口已显示，位置:', [px, py], '大小:', [w, h]);
    });

    // 窗口显示事件
    this.mainWindow.on('show', () => {
      console.log('窗口已显示');
    });

    // 窗口隐藏事件
    this.mainWindow.on('hide', () => {
      console.log('窗口已隐藏');
    });

    // 窗口关闭事件
    this.mainWindow.on('close', (event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        this.mainWindow.hide();
      }
    });

    // 窗口移动事件
    this.mainWindow.on('moved', () => {
      const [x, y] = this.mainWindow.getPosition();
      store.set('windowPosition', { x, y });
    });

    // 开发模式下打开开发者工具（独立窗口，避免透明窗口看不到）
    if (process.argv.includes('--dev')) {
      this.mainWindow.webContents.openDevTools({ mode: 'detach' });
    }

    // 添加调试工具切换快捷键
    this.mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.control && input.shift && input.key.toLowerCase() === 'i') {
        if (this.mainWindow.webContents.isDevToolsOpened()) {
          this.mainWindow.webContents.closeDevTools();
        } else {
          this.mainWindow.webContents.openDevTools();
        }
      }
    });

    // 添加右键菜单
    this.mainWindow.webContents.on('context-menu', (event, params) => {
      const menu = Menu.buildFromTemplate([
        {
          label: '开发者工具',
          click: () => {
            if (this.mainWindow.webContents.isDevToolsOpened()) {
              this.mainWindow.webContents.closeDevTools();
            } else {
              this.mainWindow.webContents.openDevTools();
            }
          }
        },
        {
          label: '重新加载',
          click: () => {
            this.mainWindow.webContents.reload();
          }
        },
        {
          label: '隐藏窗口',
          click: () => {
            this.mainWindow.hide();
          }
        },
        {
          label: '退出应用',
          click: () => {
            this.isQuitting = true;
            app.quit();
          }
        }
      ]);
      menu.popup();
    });
  }

  setupGlobalShortcuts() {
    // 注册全局快捷键
    globalShortcut.register('CommandOrControl+Shift+I', () => {
      if (this.mainWindow) {
        this.mainWindow.isVisible() ? this.mainWindow.hide() : this.mainWindow.show();
      }
    });

    globalShortcut.register('CommandOrControl+Shift+H', () => {
      if (this.mainWindow) {
        this.mainWindow.hide();
      }
    });
  }

  setupIpcHandlers() {
    // 处理渲染进程的IPC消息
    ipcMain.handle('get-config', () => {
      return store.get('config', this.config);
    });

    ipcMain.handle('set-config', (event, newConfig) => {
      store.set('config', { ...this.config, ...newConfig });
      this.config = { ...this.config, ...newConfig };
      // 立即应用到窗口
      if (this.mainWindow) {
        if (typeof this.config.opacity === 'number') {
          this.mainWindow.setOpacity(this.config.opacity);
        }
        if (typeof this.config.alwaysOnTop === 'boolean') {
          this.mainWindow.setAlwaysOnTop(this.config.alwaysOnTop, 'screen-saver');
        }
      }
      // 通知渲染进程更新
      if (this.mainWindow && this.mainWindow.webContents) {
        this.mainWindow.webContents.send('config-updated', this.config);
      }
      return true;
    });

    ipcMain.handle('get-window-position', () => {
      const position = store.get('windowPosition', { x: 0, y: 0 });
      return position;
    });

    ipcMain.handle('set-window-position', (event, position) => {
      if (this.mainWindow) {
        this.mainWindow.setPosition(position.x, position.y);
        store.set('windowPosition', position);
      }
    });

    // 获取与调整窗口尺寸（内容区域）
    ipcMain.handle('get-window-size', () => {
      if (this.mainWindow) {
        const [cw, ch] = this.mainWindow.getContentSize();
        return { width: cw, height: ch };
      }
      return { width: this.config.width, height: this.config.height };
    });
    ipcMain.handle('set-window-size', (event, size) => {
      if (this.mainWindow && size && size.width && size.height) {
        this.mainWindow.setContentSize(Math.round(size.width), Math.round(size.height), true);
      }
    });

    // 渲染层报告不可见时，自动降级为非透明兼容模式
    ipcMain.handle('report-invisible', () => {
      if (this.config.transparent) {
        console.warn('[兼容] 渲染层报告不可见，重建为非透明窗口');
        try {
          const [cx, cy] = this.mainWindow.getPosition();
          store.set('windowPosition', { x: cx, y: cy });
          this.config.transparent = false;
          store.set('config', this.config);
          this.mainWindow.destroy();
          this.mainWindow = null;
          this.createWindow();
          this.mainWindow.show();
        } catch (e) {
          console.error('降级失败:', e);
        }
      }
      return true;
    });

    ipcMain.handle('toggle-window', () => {
      if (this.mainWindow) {
        this.mainWindow.isVisible() ? this.mainWindow.hide() : this.mainWindow.show();
      }
    });

    // 打开设置独立窗口
    ipcMain.handle('open-settings-window', () => {
      if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
        this.settingsWindow.focus();
        return true;
      }
      this.settingsWindow = new BrowserWindow({
        width: 520,
        height: 520,
        resizable: false,
        title: 'FlexIsland 设置',
        frame: true,
        transparent: false,
        alwaysOnTop: false,
        backgroundColor: '#1f1f1f',
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false
        }
      });
      this.settingsWindow.loadFile('src/renderer/settings.html');
      this.settingsWindow.on('closed', () => {
        this.settingsWindow = null;
      });
      return true;
    });

    ipcMain.handle('close-app', () => {
      this.isQuitting = true;
      app.quit();
    });
  }

  initialize() {
    // 创建窗口
    this.createWindow();

    // 设置全局快捷键
    this.setupGlobalShortcuts();

    // 设置IPC处理器
    this.setupIpcHandlers();

    // 启动系统信息服务
    this.services = this.services || {};
    this.services.systemInfo = new SystemInfoService(this.mainWindow);
    this.services.systemInfo.start();

    // 使用模拟媒体服务（真实来源依赖后续可选安装）
    this.services.media = new MediaService(this.mainWindow);
    this.services.media.startAutoMock();

    // 启动通知服务
    this.services.notifications = new NotificationService(this.mainWindow);
    // 原生Windows Toast（可用则镜像到系统通知）
    try {
      this.services.winToast = new WindowsToastService(this.mainWindow);
      this.services.winToast.init();
    } catch (_) {}

    // 注册阶段二 IPC
    registerIpcHandlers({ mainWindow: this.mainWindow, services: this.services });

    // 从存储中恢复窗口位置
    const savedPosition = store.get('windowPosition');
    if (savedPosition) {
      this.mainWindow.setPosition(savedPosition.x, savedPosition.y);
    }

    // 从存储中恢复配置
    const savedConfig = store.get('config');
    if (savedConfig) {
      this.config = { ...this.config, ...savedConfig };
    }
  }
}

// 创建应用实例
const flexIslandApp = new FlexIslandApp();

// 确保启用硬件加速以支持透明窗口（默认启用，这里留空即可）

// 应用准备就绪
app.whenReady().then(() => {
  // Windows Toast 需要 AppUserModelID 才能显示到系统通知中心
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.flexisland.app');
  }
  flexIslandApp.initialize();
  // GPU子进程崩溃自动降级
  app.on('child-process-gone', (_event, details) => {
    if (details && details.type === 'GPU') {
      console.warn('[兼容] 检测到GPU进程崩溃，自动降级为非透明窗口');
      try {
        if (flexIslandApp && flexIslandApp.config.transparent) {
          const [cx, cy] = flexIslandApp.mainWindow.getPosition();
          store.set('windowPosition', { x: cx, y: cy });
          flexIslandApp.config.transparent = false;
          store.set('config', flexIslandApp.config);
          flexIslandApp.mainWindow.destroy();
          flexIslandApp.mainWindow = null;
          flexIslandApp.createWindow();
          flexIslandApp.mainWindow.show();
        }
      } catch (e) {
        console.error('降级失败:', e);
      }
    }
  });
});

// 所有窗口关闭时退出应用（Windows和Linux）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 应用激活时重新创建窗口（macOS）
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    flexIslandApp.createWindow();
  }
});

// 应用即将退出
app.on('will-quit', () => {
  // 注销所有全局快捷键
  globalShortcut.unregisterAll();
});

// 防止多实例运行
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // 当尝试运行第二个实例时，聚焦到现有窗口
    if (flexIslandApp.mainWindow) {
      if (flexIslandApp.mainWindow.isMinimized()) {
        flexIslandApp.mainWindow.restore();
      }
      flexIslandApp.mainWindow.focus();
    }
  });
}