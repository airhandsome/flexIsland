const { ipcRenderer } = require('electron');

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
});

// 设置事件监听器
function setupEventListeners() {
    // 取消按钮
    document.getElementById('cancel-btn').addEventListener('click', function() {
        ipcRenderer.invoke('close-confirm-window');
    });
    
    // 确认关闭按钮
    document.getElementById('confirm-btn').addEventListener('click', function() {
        ipcRenderer.invoke('close-app');
    });
    
    // ESC键关闭
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            ipcRenderer.invoke('close-confirm-window');
        }
    });
    
    // 点击背景关闭
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('confirm-container')) {
            ipcRenderer.invoke('close-confirm-window');
        }
    });
}