const { SystemState } = require('../state/systemState');

class SystemInfoWidget {
  constructor() {
    this.state = new SystemState();
    this.elements = {
      batteryLevel: document.getElementById('battery-level'),
      networkName: document.getElementById('network-name')
    };
  }

  mount() {
    this.state.start((data) => {
      // 电池UI不再使用，显示上下行速率
      if (this.elements.batteryLevel && typeof data.downMbps === 'number') {
        this.elements.batteryLevel.textContent = (data.downMbps || 0) + '↓Mbps';
      }
      if (this.elements.networkName && typeof data.upMbps === 'number') {
        this.elements.networkName.textContent = (data.upMbps || 0) + '↑Mbps';
      }
    });
  }

  unmount() {
    this.state.stop();
  }
}

module.exports = { SystemInfoWidget };

