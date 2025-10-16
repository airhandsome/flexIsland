const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

function startNotificationWatcher(baseDir, onNotification) {
    const dir = path.join(baseDir, 'data', 'notifications');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const watcher = chokidar.watch(dir, { ignoreInitial: true, depth: 1 });
    const tryRead = (p) => {
        fs.readFile(p, 'utf8', (err, text) => {
            if (err) return;
            try {
                const data = JSON.parse(text);
                if (onNotification) onNotification(data);
            } catch (_) {}
        });
    };
    watcher.on('add', tryRead).on('change', tryRead);
    return watcher;
}

module.exports = { startNotificationWatcher };

