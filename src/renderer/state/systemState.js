const { subscribeSystemInfo } = require('../api/systemInfo');

class SystemState {
  constructor() {
    this.data = {
      battery: null,
      charging: false,
      network: '网络',
      cpu: null,
      memory: null,
      ts: null
    };
    this.unsubscribe = null;
  }

  start(onChange) {
    if (this.unsubscribe) this.unsubscribe();
    this.unsubscribe = subscribeSystemInfo((payload) => {
      this.data = { ...this.data, ...payload };
      if (typeof onChange === 'function') onChange(this.data);
    });
  }

  stop() {
    if (this.unsubscribe) this.unsubscribe();
    this.unsubscribe = null;
  }
}

module.exports = { SystemState };

