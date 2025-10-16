const si = require('systeminformation');

let lastNetworkStats = null;
let lastNetworkTime = null;

async function getSnapshot() {
    const [battery, mem, cpuLoad, network] = await Promise.all([
        si.battery().catch(() => ({})),
        si.mem().catch(() => ({})),
        si.currentLoad().catch(() => ({})),
        si.networkStats().catch(() => ([]))
    ]);

    // 计算网络上下行速率（字节/秒）
    const now = Date.now();
    let speeds = [];
    if (Array.isArray(network) && network.length > 0 && Array.isArray(lastNetworkStats) && lastNetworkTime) {
        const dt = Math.max(1, (now - lastNetworkTime) / 1000);
        const mapPrev = new Map(lastNetworkStats.map(n => [n.iface, n]));
        speeds = network.map(n => {
            const prev = mapPrev.get(n.iface);
            if (!prev) return { iface: n.iface, rxSec: 0, txSec: 0 };
            const rxSec = Math.max(0, (n.rx_bytes - prev.rx_bytes) / dt);
            const txSec = Math.max(0, (n.tx_bytes - prev.tx_bytes) / dt);
            return { iface: n.iface, rxSec, txSec };
        });
    }
    lastNetworkStats = Array.isArray(network) ? network.map(n => ({ iface: n.iface, rx_bytes: n.rx_bytes, tx_bytes: n.tx_bytes })) : null;
    lastNetworkTime = now;

    return {
        ts: now,
        battery: {
            hasBattery: battery.hasbattery,
            percent: battery.percent,
            isCharging: battery.ischarging
        },
        memory: {
            total: mem.total,
            free: mem.free,
            used: mem.used
        },
        cpu: {
            avgLoad: cpuLoad.currentload
        },
        network: Array.isArray(network) ? network.map(n => ({
            iface: n.iface,
            rx: n.rx_bytes,
            tx: n.tx_bytes,
            operstate: n.operstate
        })) : [],
        netSpeed: speeds
    };
}

module.exports = { getSnapshot };

