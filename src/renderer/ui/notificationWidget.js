const { subscribeNotifications, pushNotification, clearNotifications } = require('../api/notifications');

class NotificationWidget {
  constructor() {
    this.unsubscribe = null;
    this.area = document.getElementById('notification-area');
  }

  mount() {
    this.unsubscribe = subscribeNotifications((item) => {
      if (!this.area) return;
      const node = document.createElement('div');
      node.className = 'notification-item slide-in';
      node.innerHTML = `
        <div class="notification-icon">${item.icon || '🔔'}</div>
        <div class="notification-content">
            <div class="notification-title">${item.title || '通知'}</div>
            <div class="notification-text">${item.text || ''}</div>
        </div>`;
      this.area.insertBefore(node, this.area.firstChild);
      const all = this.area.querySelectorAll('.notification-item');
      if (all.length > 5) this.area.removeChild(all[all.length - 1]);
    }, () => {
      if (!this.area) return;
      this.area.innerHTML = '';
    });
  }

  unmount() { if (this.unsubscribe) this.unsubscribe(); }
}

module.exports = { NotificationWidget };

