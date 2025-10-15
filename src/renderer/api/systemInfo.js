const { ipcRenderer } = require('electron');

function subscribeSystemInfo(onUpdate) {
  const handler = (_e, payload) => {
    if (typeof onUpdate === 'function') onUpdate(payload);
  };
  ipcRenderer.on('system-info:update', handler);
  return () => ipcRenderer.removeListener('system-info:update', handler);
}

function requestRefreshNow() {
  return ipcRenderer.invoke('system-info:refresh-now');
}

module.exports = { subscribeSystemInfo, requestRefreshNow };

