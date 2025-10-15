class MediaService {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.playlist = [
      { title: '夜曲', artist: '周杰伦' },
      { title: '青花瓷', artist: '周杰伦' },
      { title: '稻香', artist: '周杰伦' },
      { title: '告白气球', artist: '周杰伦' },
      { title: '晴天', artist: '周杰伦' }
    ];
    this.index = 0;
    this.isPlaying = false;
    this.timer = null;
  }

  current() {
    return { ...this.playlist[this.index], isPlaying: this.isPlaying };
  }

  broadcast() {
    if (this.mainWindow && this.mainWindow.webContents) {
      this.mainWindow.webContents.send('media:update', this.current());
    }
  }

  playPause() {
    this.isPlaying = !this.isPlaying;
    this.broadcast();
  }

  next() {
    this.index = (this.index + 1) % this.playlist.length;
    this.isPlaying = true;
    this.broadcast();
  }

  prev() {
    this.index = (this.index - 1 + this.playlist.length) % this.playlist.length;
    this.isPlaying = true;
    this.broadcast();
  }

  startAutoMock() {
    this.stopAutoMock();
    this.timer = setInterval(() => this.next(), 30000);
  }

  stopAutoMock() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

module.exports = { MediaService };

