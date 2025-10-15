// Windows Toast 兼容实现：使用 Electron Notification 作为替代，自动镜像到岛内
const { Notification } = require('electron');
let EWN = null;
try { EWN = require('electron-windows-notifications'); } catch(_) {}

class WindowsToastService {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
  }

  init() { return true; }

  showToast({ title = '通知', text = '' } = {}) {
    try {
      // 优先使用 electron-windows-notifications，支持更多原生样式
      if (EWN) {
        const { ToastNotification, Template } = EWN;
        const template = new Template(Template.Text02);
        template.textFields.push(title);
        template.textFields.push(text);
        const toast = new ToastNotification(template);
        toast.on('activated', () => {});
        toast.show();
      } else if (Notification.isSupported()) {
        const n = new Notification({ title, body: text, silent: false });
        n.show();
      }
    } finally {
      if (this.mainWindow && this.mainWindow.webContents) {
        this.mainWindow.webContents.send('notify:new', { icon: '🔔', title, text });
      }
    }
    return true;
  }
}

module.exports = { WindowsToastService };

