const { ipcRenderer } = require('electron');

function subscribeMedia(onUpdate) {
  const handler = (_e, payload) => {
    if (typeof onUpdate === 'function') onUpdate(payload);
  };
  ipcRenderer.on('media:update', handler);
  return () => ipcRenderer.removeListener('media:update', handler);
}

function mediaToggle() { return ipcRenderer.invoke('media:toggle'); }
function mediaNext() { return ipcRenderer.invoke('media:next'); }
function mediaPrev() { return ipcRenderer.invoke('media:prev'); }

module.exports = { subscribeMedia, mediaToggle, mediaNext, mediaPrev };

