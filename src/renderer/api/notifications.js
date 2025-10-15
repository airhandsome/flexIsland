const { ipcRenderer } = require('electron');

function subscribeNotifications(onNew, onClear) {
  const n = (_e, payload) => { if (typeof onNew === 'function') onNew(payload); };
  const c = () => { if (typeof onClear === 'function') onClear(); };
  ipcRenderer.on('notify:new', n);
  ipcRenderer.on('notify:clear', c);
  return () => {
    ipcRenderer.removeListener('notify:new', n);
    ipcRenderer.removeListener('notify:clear', c);
  };
}

function pushNotification(payload) { return ipcRenderer.invoke('notify:push', payload); }
function clearNotifications() { return ipcRenderer.invoke('notify:clear'); }

module.exports = { subscribeNotifications, pushNotification, clearNotifications };

