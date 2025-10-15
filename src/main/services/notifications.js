class NotificationService {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.history = [];
    this.maxItems = 10;
  }

  push(notification) {
    const item = { id: Date.now() + Math.random(), ts: Date.now(), ...notification };
    this.history.unshift(item);
    if (this.history.length > this.maxItems) this.history.pop();
    if (this.mainWindow && this.mainWindow.webContents) {
      this.mainWindow.webContents.send('notify:new', item);
    }
    return item;
  }

  clear() {
    this.history = [];
    if (this.mainWindow && this.mainWindow.webContents) {
      this.mainWindow.webContents.send('notify:clear');
    }
  }
}

module.exports = { NotificationService };

