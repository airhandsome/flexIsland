const { ipcMain } = require('electron');

function registerIpcHandlers(appCtx) {
  const { mainWindow, services } = appCtx;

  ipcMain.handle('system-info:refresh-now', async () => {
    if (services && services.systemInfo) {
      await services.systemInfo.collectOnce();
      return true;
    }
    return false;
  });

  // 媒体控制
  ipcMain.handle('media:toggle', () => {
    services.media && services.media.playPause();
    return true;
  });
  ipcMain.handle('media:next', () => {
    services.media && services.media.next();
    return true;
  });
  ipcMain.handle('media:prev', () => {
    services.media && services.media.prev();
    return true;
  });

  // 应用内通知
  ipcMain.handle('notify:push', (_e, payload) => {
    services.notifications && services.notifications.push(payload);
    return true;
  });
  ipcMain.handle('notify:clear', () => {
    services.notifications && services.notifications.clear();
    return true;
  });
}

module.exports = { registerIpcHandlers };

