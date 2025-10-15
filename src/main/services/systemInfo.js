const si = require('systeminformation');

class SystemInfoService {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.timer = null;
    this.intervalMs = 5000;
  }

  async collectOnce() {
    try {
      const [networkStats, currentLoad, mem, latency, nics] = await Promise.all([
        si.networkStats().catch(() => ([])),
        si.currentLoad().catch(() => ({})),
        si.mem().catch(() => ({})),
        si.inetLatency().catch(() => null),
        si.networkInterfaces().catch(() => ([]))
      ]);

      const statsArray = Array.isArray(networkStats) ? networkStats : [networkStats];
      const upBytes = statsArray.reduce((sum, n) => sum + (n.tx_sec || 0), 0);
      const downBytes = statsArray.reduce((sum, n) => sum + (n.rx_sec || 0), 0);
      const upMbps = Math.round((upBytes * 8) / 1_000_000);
      const downMbps = Math.round((downBytes * 8) / 1_000_000);

      const activeNic = (nics || []).find((n) => n.operstate === 'up') || null;
      const payload = {
        upMbps,
        downMbps,
        iface: activeNic ? (activeNic.ifaceName || activeNic.iface || activeNic.ssid || '网络') : '网络',
        latencyMs: typeof latency === 'number' ? Math.round(latency) : null,
        cpu: currentLoad && typeof currentLoad.currentload === 'number' ? Math.round(currentLoad.currentload) : null,
        memory: mem && mem.active && mem.total ? Math.round((mem.active / mem.total) * 100) : null,
        ts: Date.now()
      };

      if (this.mainWindow && this.mainWindow.webContents) {
        this.mainWindow.webContents.send('system-info:update', payload);
      }
    } catch (e) {
      // 忽略采集异常，避免打扰用户
    }
  }

  start() {
    this.stop();
    this.collectOnce();
    this.timer = setInterval(() => this.collectOnce(), this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

module.exports = { SystemInfoService };

