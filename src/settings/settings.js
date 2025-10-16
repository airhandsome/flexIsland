const { ipcRenderer } = require('electron');

// 设置数据
let settings = {
    rotationInterval: 10,
    notificationType: 'all',
    autoRotation: true,
    soundNotifications: false,
    theme: 'gradient',
    opacity: 0.8,
    blurIntensity: 20,
    borderRadius: 25,
    borderWidth: 1,
    position: 'top-center',
    alwaysOnTop: true,
    showInTaskbar: false,
    startMinimized: false,
    backgroundImage: '',
    backgroundColor: '',
    borderColor: '',
    fontColor: '#ffffff',
    fontSize: 14
};

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    setupEventListeners();
    updateUI();
});

// 设置事件监听器
function setupEventListeners() {
    // 实时应用的轻量函数（避免频繁保存，仅推送到主窗口应用）
    let liveTimer = null;
    function sendLiveApply() {
        if (liveTimer) clearTimeout(liveTimer);
        liveTimer = setTimeout(() => {
            ipcRenderer.invoke('apply-settings', settings);
        }, 80);
    }

    // 关闭按钮
    document.getElementById('close-settings').addEventListener('click', function() {
        ipcRenderer.invoke('close-settings-window');
    });
    
    // 轮播间隔
    const rotationInterval = document.getElementById('rotation-interval');
    const intervalValue = document.getElementById('interval-value');
    
    rotationInterval.addEventListener('input', function() {
        settings.rotationInterval = parseInt(this.value);
        intervalValue.textContent = this.value;
    });
    
    // 通知类型
    document.getElementById('notification-type').addEventListener('change', function() {
        settings.notificationType = this.value;
    });
    
    // 自动轮播
    document.getElementById('auto-rotation').addEventListener('change', function() {
        settings.autoRotation = this.checked;
    });
    
    // 声音通知
    document.getElementById('sound-notifications').addEventListener('change', function() {
        settings.soundNotifications = this.checked;
    });
    
    // 预设主题选择
    document.querySelectorAll('.preset-theme').forEach(theme => {
        theme.addEventListener('click', function() {
            document.querySelectorAll('.preset-theme').forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            applyPresetTheme(this.dataset.preset);
        });
    });
    
    // 自定义主题选择
    document.querySelectorAll('.theme-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            settings.theme = this.dataset.theme;
            settings.preset = null; // 清除预设主题
        });
    });
    
    // 透明度
    const opacitySlider = document.getElementById('opacity');
    const opacityValue = document.getElementById('opacity-value');
    
    opacitySlider.addEventListener('input', function() {
        settings.opacity = parseFloat(this.value);
        opacityValue.textContent = Math.round(settings.opacity * 100) + '%';
    });
    
    // 毛玻璃强度
    const blurSlider = document.getElementById('blur-intensity');
    const blurValue = document.getElementById('blur-value');
    
    blurSlider.addEventListener('input', function() {
        settings.blurIntensity = parseInt(this.value);
        blurValue.textContent = this.value + 'px';
    });
    
    // 圆角大小
    const radiusSlider = document.getElementById('border-radius');
    const radiusValue = document.getElementById('radius-value');
    
    radiusSlider.addEventListener('input', function() {
        settings.borderRadius = parseInt(this.value);
        radiusValue.textContent = this.value + 'px';
    });

    // 边框粗细
    const borderWidthSlider = document.getElementById('border-width');
    const borderWidthValue = document.getElementById('border-width-value');
    borderWidthSlider.addEventListener('input', function() {
        settings.borderWidth = parseInt(this.value);
        borderWidthValue.textContent = this.value + 'px';
    });
    
    // 显示位置
    document.getElementById('position').addEventListener('change', function() {
        settings.position = this.value;
    });
    
    // 始终置顶
    document.getElementById('always-on-top').addEventListener('change', function() {
        settings.alwaysOnTop = this.checked;
    });
    
    // 任务栏显示
    document.getElementById('show-in-taskbar').addEventListener('change', function() {
        settings.showInTaskbar = this.checked;
    });
    
    // 启动最小化
    document.getElementById('start-minimized').addEventListener('change', function() {
        settings.startMinimized = this.checked;
    });

    // 自定义背景图
    const bgInput = document.getElementById('bg-image');
    const clearBgBtn = document.getElementById('clear-bg');
    if (bgInput) {
        bgInput.addEventListener('change', function(e) {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(evt) {
                settings.backgroundImage = evt.target.result;
            };
            reader.readAsDataURL(file);
        });
    }
    if (clearBgBtn) {
        clearBgBtn.addEventListener('click', function() {
            settings.backgroundImage = '';
            const input = document.getElementById('bg-image');
            if (input) input.value = '';
        });
    }

    // 颜色取色器
    const bgColor = document.getElementById('bg-color');
    const borderColor = document.getElementById('border-color');
    const fontColor = document.getElementById('font-color');
    const fontSize = document.getElementById('font-size');
    const fontSizeValue = document.getElementById('font-size-value');
    if (bgColor) {
        bgColor.addEventListener('input', function() {
            settings.backgroundColor = this.value;
        });
    }
    if (borderColor) {
        borderColor.addEventListener('input', function() {
            settings.borderColor = this.value;
        });
    }
    if (fontColor) {
        fontColor.addEventListener('input', function() {
            settings.fontColor = this.value;
            // 实时生效
            sendLiveApply();
        });
    }
    if (fontSize) {
        fontSize.addEventListener('input', function() {
            settings.fontSize = parseInt(this.value);
            if (fontSizeValue) fontSizeValue.textContent = this.value + 'px';
            // 实时生效
            sendLiveApply();
        });
    }
    
    // 重置设置
    document.getElementById('reset-settings').addEventListener('click', function() {
        if (confirm('确定要重置所有设置吗？')) {
            resetSettings();
        }
    });
    
    // 保存设置
    document.getElementById('save-settings').addEventListener('click', function() {
        saveSettings();
        showNotification('设置已保存！', 'success');
    });
}

// 加载设置
function loadSettings() {
    // 从本地存储加载设置，如果没有则使用默认值
    const savedSettings = localStorage.getItem('dynamicIslandSettings');
    if (savedSettings) {
        settings = { ...settings, ...JSON.parse(savedSettings) };
    }
}

// 保存设置
function saveSettings() {
    localStorage.setItem('dynamicIslandSettings', JSON.stringify(settings));
    
    // 发送设置到主窗口
    ipcRenderer.invoke('apply-settings', settings);
}

// 重置设置
function resetSettings() {
    settings = {
        rotationInterval: 10,
        notificationType: 'all',
        autoRotation: true,
        soundNotifications: false,
        theme: 'dark',
        opacity: 0.8,
        blurIntensity: 20,
        borderRadius: 25,
        position: 'top-center',
        alwaysOnTop: true,
        showInTaskbar: false,
        startMinimized: false
    };
    
    updateUI();
    showNotification('设置已重置！', 'info');
}

// 更新UI
function updateUI() {
    // 轮播间隔
    document.getElementById('rotation-interval').value = settings.rotationInterval;
    document.getElementById('interval-value').textContent = settings.rotationInterval;
    
    // 通知类型
    document.getElementById('notification-type').value = settings.notificationType;
    
    // 自动轮播
    document.getElementById('auto-rotation').checked = settings.autoRotation;
    
    // 声音通知
    document.getElementById('sound-notifications').checked = settings.soundNotifications;
    
    // 主题
    document.querySelectorAll('.theme-option').forEach(option => {
        option.classList.remove('active');
        if (option.dataset.theme === settings.theme) {
            option.classList.add('active');
        }
    });
    
    // 透明度
    document.getElementById('opacity').value = settings.opacity;
    document.getElementById('opacity-value').textContent = Math.round(settings.opacity * 100) + '%';
    
    // 毛玻璃强度
    document.getElementById('blur-intensity').value = settings.blurIntensity;
    document.getElementById('blur-value').textContent = settings.blurIntensity + 'px';
    
    // 圆角大小
    document.getElementById('border-radius').value = settings.borderRadius;
    document.getElementById('radius-value').textContent = settings.borderRadius + 'px';
    
    // 显示位置
    document.getElementById('position').value = settings.position;
    
    // 始终置顶
    document.getElementById('always-on-top').checked = settings.alwaysOnTop;
    
    // 任务栏显示
    document.getElementById('show-in-taskbar').checked = settings.showInTaskbar;
    
    // 启动最小化
    document.getElementById('start-minimized').checked = settings.startMinimized;
    // 字体
    const fontColorInput = document.getElementById('font-color');
    const fontSizeInput = document.getElementById('font-size');
    const fontSizeVal = document.getElementById('font-size-value');
    if (fontColorInput) fontColorInput.value = settings.fontColor || '#ffffff';
    if (fontSizeInput) fontSizeInput.value = settings.fontSize || 14;
    if (fontSizeVal) fontSizeVal.textContent = (settings.fontSize || 14) + 'px';
}

// 应用预设主题
function applyPresetTheme(preset) {
    settings.preset = preset;
    // 选择预设时，清空自定义项，确保预设具有最高优先级
    settings.backgroundImage = '';
    settings.backgroundColor = '';
    settings.borderColor = '';
    
    switch(preset) {
        case 'instagram':
            settings.theme = 'instagram';
            settings.opacity = 0.9;
            settings.blurIntensity = 25;
            settings.borderRadius = 30;
            settings.borderWidth = 2;
            settings.borderColor = '#ffffff';
            break;
        case 'apple':
            settings.theme = 'apple';
            settings.opacity = 0.85;
            settings.blurIntensity = 30;
            settings.borderRadius = 20;
            settings.borderWidth = 2;
            settings.borderColor = '#ffffff';
            break;
        case 'xiaomi':
            settings.theme = 'xiaomi';
            settings.opacity = 0.8;
            settings.blurIntensity = 20;
            settings.borderRadius = 25;
            settings.borderWidth = 2;
            settings.borderColor = '#ffffff';
            break;
        case 'google':
            settings.theme = 'google';
            settings.opacity = 0.9;
            settings.blurIntensity = 20;
            settings.borderRadius = 25;
            settings.borderWidth = 2;
            settings.borderColor = '#ffffff';
            break;
        case 'microsoft':
            settings.theme = 'microsoft';
            settings.opacity = 0.85;
            settings.blurIntensity = 25;
            settings.borderRadius = 22;
            settings.borderWidth = 2;
            settings.borderColor = '#ffffff';
            break;
        case 'huawei':
            settings.theme = 'huawei';
            settings.opacity = 0.88;
            settings.blurIntensity = 24;
            settings.borderRadius = 22;
            settings.borderWidth = 2;
            settings.borderColor = '#ffffff';
            break;
        case 'neon':
            settings.theme = 'neon';
            settings.opacity = 0.7;
            settings.blurIntensity = 15;
            settings.borderRadius = 35;
            settings.borderWidth = 2;
            settings.borderColor = '#ff00ff';
            break;
        case 'gradient':
            settings.theme = 'gradient';
            settings.opacity = 0.8;
            settings.blurIntensity = 20;
            settings.borderRadius = 25;
            settings.borderWidth = 2;
            settings.borderColor = '#ffffff';
            break;
        case 'vivo':
            settings.theme = 'vivo';
            settings.opacity = 0.88;
            settings.blurIntensity = 24;
            settings.borderRadius = 22;
            settings.borderWidth = 2;
            settings.borderColor = '#ffffff';
            break;
        case 'oppo':
            settings.theme = 'oppo';
            settings.opacity = 0.88;
            settings.blurIntensity = 24;
            settings.borderRadius = 22;
            settings.borderWidth = 2;
            settings.borderColor = '#ffffff';
            break;
    }
    
    // 更新UI显示
    updateUI();
}

// 显示通知
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // 添加通知样式
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: #ffffff;
        font-size: 14px;
        font-weight: 500;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    if (type === 'success') {
        notification.style.background = 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)';
    } else if (type === 'error') {
        notification.style.background = 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)';
    } else {
        notification.style.background = 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)';
    }
    
    document.body.appendChild(notification);
    
    // 3秒后自动移除
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);