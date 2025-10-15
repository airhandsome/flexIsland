// Windows 媒体会话状态（基于 windows-media-controller）
const { MediaSession, MediaManager } = require('windows-media-controller');

class WindowsMediaService {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.manager = new MediaManager();
    this.onAnyPlayer = this.onAnyPlayer.bind(this);
  }

  start() {
    this.stop();
    this.manager.on('media', this.onAnyPlayer);
    this.manager.start();
  }

  stop() {
    try { this.manager.stop(); } catch(_) {}
    this.manager.removeAllListeners('media');
  }

  onAnyPlayer(player) {
    // 监听每个播放器的状态
    player.on('status', (status) => {
      const payload = {
        title: status?.title,
        artist: status?.artist,
        album: status?.album,
        isPlaying: status?.playbackStatus === 'Playing'
      };
      if (this.mainWindow && this.mainWindow.webContents) {
        this.mainWindow.webContents.send('media:update', payload);
      }
    });
  }
}

module.exports = { WindowsMediaService };

