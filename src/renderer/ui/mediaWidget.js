const { subscribeMedia, mediaToggle, mediaNext, mediaPrev } = require('../api/media');

class MediaWidget {
  constructor() {
    this.unsubscribe = null;
    this.elements = {
      title: document.querySelector('.media-title'),
      artist: document.querySelector('.media-artist'),
      prev: document.getElementById('prev-btn'),
      toggle: document.getElementById('play-pause-btn'),
      next: document.getElementById('next-btn')
    };
  }

  mount() {
    this.unsubscribe = subscribeMedia((payload) => {
      if (this.elements.title) this.elements.title.textContent = payload.title || '—';
      if (this.elements.artist) this.elements.artist.textContent = payload.artist || '—';
      if (this.elements.toggle) this.elements.toggle.textContent = payload.isPlaying ? '⏸' : '⏯';
    });

    if (this.elements.prev) this.elements.prev.addEventListener('click', () => mediaPrev());
    if (this.elements.toggle) this.elements.toggle.addEventListener('click', () => mediaToggle());
    if (this.elements.next) this.elements.next.addEventListener('click', () => mediaNext());
  }

  unmount() {
    if (this.unsubscribe) this.unsubscribe();
  }
}

module.exports = { MediaWidget };

