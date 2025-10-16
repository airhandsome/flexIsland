console.log('📝 script.js 文件开始加载');
const { ipcRenderer } = require('electron');
console.log('📝 ipcRenderer 加载完成:', ipcRenderer);

// 已移除 MOCK 数据，全部来源于主进程事件与本地 API

let currentNotificationIndex = 0;
let isExpanded = false;
let autoHideTimer = null;
let isDragging = false; // 添加拖拽状态变量

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 JavaScript 开始初始化');
    
    try {
        // 启动时应用本地设置（若无则使用多彩渐变作为默认）
        applyInitialSettings();
        
        // 初始不再显示 mock，等待真实通知或API数据
        
        setupEventListeners();
        console.log('✅ 事件监听器设置完成');
        
        // 取消自动轮播（依赖mock）
        
        setupThemeListener();
        console.log('✅ 主题监听器设置完成');

        setupRealtimeTime();
        setupNotificationChannel();
        
        console.log('🎉 所有初始化完成');
    } catch (error) {
        console.error('❌ 初始化出错:', error);
    }
});

// 设置主题监听器
function setupThemeListener() {
    ipcRenderer.on('apply-theme-settings', (event, settings) => {
        applyThemeSettings(settings);
    });
}

// 启动时应用设置：本地优先；否则应用默认多彩渐变
function applyInitialSettings() {
    try {
        const saved = localStorage.getItem('dynamicIslandSettings');
        if (saved) {
            const parsed = JSON.parse(saved);
            applyThemeSettings(parsed);
        } else {
            const defaultSettings = {
                theme: 'gradient',
                opacity: 0.8,
                blurIntensity: 20,
                borderRadius: 25,
                borderWidth: 2,
                backgroundImage: '',
                backgroundColor: '',
                borderColor: '#ffffff'
            };
            applyThemeSettings(defaultSettings);
        }
    } catch (e) {
        console.warn('读取本地主题设置失败，使用默认多彩渐变:', e);
        applyThemeSettings({ theme: 'gradient' });
    }
}

// 应用主题设置
function applyThemeSettings(settings) {
    const dynamicIsland = document.querySelector('.dynamic-island');
    const bodyEl = document.body;
    
    // 应用主题颜色（给 body 加类以驱动 CSS 变量）
    if (settings.theme) {
        applyTheme(settings.theme);
        bodyEl.classList.remove('theme-gradient','theme-blue','theme-green','theme-glass','theme-neon');
        if (['gradient','blue','green','glass','neon'].includes(settings.theme)) {
            bodyEl.classList.add(`theme-${settings.theme}`);
        }
    }
    
    // 应用透明度
    if (settings.opacity !== undefined) {
        dynamicIsland.style.opacity = settings.opacity;
    }
    
    // 应用毛玻璃强度
    if (settings.blurIntensity !== undefined) {
        dynamicIsland.style.backdropFilter = `blur(${settings.blurIntensity}px)`;
    }
    
    // 应用圆角大小
    if (settings.borderRadius !== undefined) {
        dynamicIsland.style.borderRadius = `${settings.borderRadius}px`;
    }

    // 应用边框粗细（通过 CSS 变量传递给 .dynamic-island）
    if (settings.borderWidth !== undefined) {
        bodyEl.style.setProperty('--borderWidth', `${settings.borderWidth}px`);
    }

    // 应用背景：预设>自定义。上传图片 > 背景颜色
    if (settings.backgroundImage) {
        dynamicIsland.style.backgroundImage = `url(${settings.backgroundImage})`;
        dynamicIsland.style.backgroundSize = 'cover';
        dynamicIsland.style.backgroundPosition = 'center';
    } else {
        dynamicIsland.style.backgroundImage = '';
        if (settings.backgroundColor) {
            dynamicIsland.style.background = settings.backgroundColor;
        } else {
            dynamicIsland.style.background = '';
        }
    }
    // 边框颜色由变量控制，自定义存在时覆盖
    if (settings.borderColor) {
        document.body.style.setProperty('--border', settings.borderColor);
    }

    // 字体颜色与大小（通过变量传递，子元素统一继承）
    if (settings.fontColor) {
        document.body.style.setProperty('--fontColor', settings.fontColor);
    } else {
        document.body.style.removeProperty('--fontColor');
    }
    if (settings.fontSize !== undefined) {
        document.body.style.setProperty('--fontSize', `${settings.fontSize}px`);
    }
}

// 应用主题
function applyTheme(theme) {
    const dynamicIsland = document.querySelector('.dynamic-island');
    const iconCircles = document.querySelectorAll('.icon-circle');
    
    // 移除所有主题类（包含新增的品牌主题）
    dynamicIsland.classList.remove(
        'theme-dark', 'theme-light', 'theme-purple', 'theme-blue', 'theme-green', 'theme-orange', 'theme-pink', 'theme-red',
        'theme-instagram', 'theme-apple', 'theme-xiaomi', 'theme-google', 'theme-microsoft', 'theme-spotify', 'theme-discord', 'theme-github', 'theme-neon',
        'theme-huawei', 'theme-vivo', 'theme-oppo'
    );
    
    // 添加新主题类
    dynamicIsland.classList.add(`theme-${theme}`);
    
    // 应用主题颜色到图标
    const themeColors = {
        dark: '#667eea',
        light: '#4A90E2',
        purple: '#8B5CF6',
        blue: '#3B82F6',
        green: '#10B981',
        orange: '#F59E0B',
        pink: '#EC4899',
        red: '#EF4444',
        instagram: '#E6683C',
        apple: '#FFFFFF',
        xiaomi: '#FF6900',
        google: '#4285F4',
        microsoft: '#F25022',
        spotify: '#1DB954',
        discord: '#5865F2',
        github: '#24292e',
        neon: '#ff00ff'
    };
    
    const color = themeColors[theme] || themeColors.dark;
    iconCircles.forEach(circle => {
        circle.style.background = `linear-gradient(135deg, ${color} 0%, ${color}88 100%)`;
    });
}

// 更精致的 SVG 图标
function getAppIconSVG(app, size = 20) {
    const sz = size;
    switch (app) {
        case '电话':
            return `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12.9.3 1.77.57 2.61a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.47-1.09a2 2 0 0 1 2.11-.45c.84.27 1.71.45 2.61.57A2 2 0 0 1 22 16.92z" fill="currentColor"/></svg>`;
        case '邮件':
            return `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" stroke="currentColor" stroke-width="1.6" fill="none"/>
<path d="M22 6l-10 7L2 6" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>`;
        case '音乐':
            return `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M9 18V5l10-2v13" stroke="currentColor" stroke-width="1.6" fill="none"/>
<circle cx="7" cy="18" r="3" stroke="currentColor" stroke-width="1.6" fill="none"/>
<circle cx="17" cy="16" r="3" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>`;
        case '微信':
        default:
            return `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M16 11c0-3.314-3.134-6-7-6S2 7.686 2 11c0 1.302.51 2.5 1.374 3.48L3 18l3.02-1.26C7.047 17.56 8.46 18 10 18c3.866 0 7-2.686 7-6z" fill="currentColor" opacity=".9"/>
<circle cx="8.5" cy="11" r="1" fill="#fff"/>
<circle cx="12" cy="11" r="1" fill="#fff"/></svg>`;
    }
}

// 设置事件监听器
function setupEventListeners() {
    console.log('🔧 开始设置事件监听器');
    
    const notification = document.getElementById('notification');
    const expandedContent = document.getElementById('expandedContent');
    
    console.log('🔧 获取元素:', { notification, expandedContent });
    
    // 点击通知项展开
    if (notification) {
        notification.addEventListener('click', function(e) {
            console.log(`[点击] 通知点击事件`);
            // 如果正在拖拽，不触发展开
            if (isDragging) {
                console.log(`[点击] 拖拽中，忽略点击事件`);
                return;
            }
            if (!isExpanded) {
                expandNotification();
            }
        });
        console.log('✅ 通知点击事件监听器设置完成');
    } else {
        console.error('❌ 找不到notification元素');
    }
    
    // 点击空白区域收起
    document.addEventListener('click', function(e) {
        if (isExpanded && !expandedContent.contains(e.target) && !notification.contains(e.target)) {
            hideExpanded();
        }
    });
    console.log('✅ 空白区域点击事件监听器设置完成');
    
    // 控制按钮事件监听器
    setupControlButtons();
    
    // 拖拽功能
    setupDragFunctionality();
    
    console.log('✅ 所有事件监听器设置完成');
}

// 移除旧的 showNotification（mock）

// 实时系统时间订阅
function setupRealtimeTime() {
    const timeEl = document.querySelector('.notification-time');
    ipcRenderer.on('tick-time', (event, payload) => {
        if (timeEl) {
            timeEl.textContent = payload.localeTime;
        }
    });

    // 同时监听系统快照并渲染到扩展面板
    ipcRenderer.on('system-snapshot', (event, snap) => {
        renderSystemInfo(snap);
    });
}

// 真实通知通道（示例：收到后替换当前展示）
function setupNotificationChannel() {
    ipcRenderer.on('new-notification', (event, n) => {
        const iconCircle = document.querySelector('.icon-circle');
        const iconElement = document.querySelector('.icon');
        const titleEl = document.querySelector('.notification-title');
        const msgEl = document.querySelector('.notification-message');
        const appIcon = document.querySelector('.app-icon');
        const appName = document.querySelector('.app-name');
        const senderEl = document.querySelector('.sender');
        const contentEl = document.querySelector('.message');

        if (n.color && iconCircle) {
            iconCircle.style.background = `linear-gradient(135deg, ${n.color} 0%, ${n.color}88 100%)`;
        }
        if (n.app && iconElement) {
            iconElement.innerHTML = getAppIconSVG(n.app);
        }
        if (titleEl && n.title) titleEl.textContent = n.title;
        if (msgEl && n.message) msgEl.textContent = n.message;
        if (appIcon && n.app) appIcon.innerHTML = getAppIconSVG(n.app, 18);
        if (appName && n.app) appName.textContent = n.app;
        if (senderEl && n.sender) senderEl.textContent = n.sender;
        if (contentEl && n.content) contentEl.textContent = n.content;
    });

    // 通过本地 API 周期性拉取系统信息与最新通知
    let apiBase = '';
    ipcRenderer.on('api-ready', (event, payload) => {
        apiBase = payload.baseUrl;
        startPollingApi();
    });

    function startPollingApi() {
        if (!apiBase) return;
        // 系统信息（可扩展使用 expanded 面板显示）
        setInterval(async () => {
            try {
                const res = await fetch(`${apiBase}/api/system`);
                if (!res.ok) return;
                const sys = await res.json();
                renderSystemInfo(sys);
            } catch (_) {}
        }, 5000);

        // 最新通知（如果存在则替换当前展示）
        setInterval(async () => {
            try {
                const res = await fetch(`${apiBase}/api/notification/latest`);
                if (res.status === 204) return;
                if (!res.ok) return;
                const n = await res.json();
                const iconCircle = document.querySelector('.icon-circle');
                const iconElement = document.querySelector('.icon');
                const titleEl = document.querySelector('.notification-title');
                const msgEl = document.querySelector('.notification-message');
                const appIcon = document.querySelector('.app-icon');
                const appName = document.querySelector('.app-name');
                const senderEl = document.querySelector('.sender');
                const contentEl = document.querySelector('.message');
                if (n.color && iconCircle) {
                    iconCircle.style.background = `linear-gradient(135deg, ${n.color} 0%, ${n.color}88 100%)`;
                }
                if (n.app && iconElement) {
                    iconElement.innerHTML = getAppIconSVG(n.app);
                }
                if (titleEl && n.title) titleEl.textContent = n.title;
                if (msgEl && n.message) msgEl.textContent = n.message;
                if (appIcon && n.app) appIcon.innerHTML = getAppIconSVG(n.app, 18);
                if (appName && n.app) appName.textContent = n.app;
                if (senderEl && n.sender) senderEl.textContent = n.sender;
                if (contentEl && n.content) contentEl.textContent = n.content;
            } catch (_) {}
        }, 4000);
    }
}

function renderSystemInfo(sys) {
    if (!sys) return;
    const b = sys.battery || {};
    const m = sys.memory || {};
    const c = sys.cpu || {};
    const n = Array.isArray(sys.network) ? sys.network : [];
    const ns = Array.isArray(sys.netSpeed) ? sys.netSpeed : [];
    const memText = (m.total && m.used) ? `${Math.round(m.used/1024/1024)}MB / ${Math.round(m.total/1024/1024)}MB` : '--';
    const cpuText = (typeof c.avgLoad === 'number') ? `${c.avgLoad.toFixed(0)}%` : '--';
    const batText = (typeof b.percent === 'number') ? `${Math.round(b.percent)}%${b.isCharging ? ' ⚡' : ''}` : '--';
    const upIface = n.find(x => x.operstate === 'up');
    const fmt = (v) => v >= 1024*1024 ? `${(v/1024/1024).toFixed(1)} MB/s` : v >= 1024 ? `${(v/1024).toFixed(0)} KB/s` : `${Math.round(v)} B/s`;
    let upRate = '--', downRate = '--';
    if (upIface) {
        const s = ns.find(v => v.iface === upIface.iface);
        if (s) {
            downRate = fmt(s.rxSec || 0);
            upRate = fmt(s.txSec || 0);
        }
    }
    const netText = upIface ? `${upIface.iface} 在线` : '离线';
    const elBat = document.getElementById('sysBattery');
    const elCPU = document.getElementById('sysCPU');
    const elMem = document.getElementById('sysMem');
    const elNet = document.getElementById('sysNet');
    if (elBat) elBat.textContent = batText;
    if (elCPU) elCPU.textContent = cpuText;
    if (elMem) elMem.textContent = memText;
    if (elNet) elNet.textContent = netText;
    const miniCPU = document.getElementById('miniCPU');
    const miniUp = document.getElementById('miniUp');
    const miniDown = document.getElementById('miniDown');
    if (miniCPU) miniCPU.textContent = `CPU ${cpuText}`;
    if (miniUp) miniUp.textContent = `↑ ${upRate}`;
    if (miniDown) miniDown.textContent = `↓ ${downRate}`;
}

// 展开通知
function expandNotification() {
    console.log(`[展开] 开始展开通知`);
    // 如果正在拖拽，不执行展开（因为展开会改变窗口大小）
    if (isDragging) {
        console.log(`[展开] 拖拽中，忽略展开请求`);
        return;
    }
    
    isExpanded = true;
    const expandedContent = document.getElementById('expandedContent');
    const expandBtn = document.getElementById('expand-btn');
    
    expandedContent.style.display = 'block';
    expandBtn.classList.add('expanded');
    
    // 动画调整窗口高度
    setTimeout(() => {
        console.log(`[展开] 调整窗口高度到280px`);
        ipcRenderer.invoke('resize-window', 280); // 展开到280px高度
    }, 100);
    
    // 清除自动隐藏定时器
    if (autoHideTimer) {
        clearTimeout(autoHideTimer);
    }
}

// 收起通知
function hideExpanded() {
    // 如果正在拖拽，不执行收起（因为收起会改变窗口大小）
    if (isDragging) {
        console.log(`[收起] 拖拽中，忽略收起请求`);
        return;
    }
    
    isExpanded = false;
    const expandedContent = document.getElementById('expandedContent');
    const expandBtn = document.getElementById('expand-btn');
    
    expandedContent.style.display = 'none';
    expandBtn.classList.remove('expanded');
    
    // 动画调整窗口高度回到原始大小
    setTimeout(() => {
        console.log(`[收起] 调整窗口高度到120px`);
        ipcRenderer.invoke('resize-window', 120); // 收缩到120px高度
    }, 100);
    
    // 不再自动隐藏，保持始终显示
}

// 隐藏通知（现在只是切换到下一个通知，不隐藏窗口）
function hideNotification() {
    // 直接切换到下一个通知，不隐藏窗口
    nextNotification();
}

// 下一个通知（mock已移除，保留空实现以兼容调用）
function nextNotification() {}

// 开始自动轮播
function startAutoRotation() {}

// 键盘快捷键
document.addEventListener('keydown', function(e) {
    switch(e.key) {
        case 'Escape':
            if (isExpanded) {
                hideExpanded();
            } else {
                hideNotification();
            }
            break;
        case 'ArrowRight':
            nextNotification();
            break;
        case 'ArrowLeft':
            // 已移除mock左右切换
            break;
        case ' ':
            e.preventDefault();
            if (isExpanded) {
                hideExpanded();
            } else {
                expandNotification();
            }
            break;
    }
});

// 设置控制按钮功能
function setupControlButtons() {
    console.log('🔧 开始设置控制按钮');
    
    const expandBtn = document.getElementById('expand-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const closeBtn = document.getElementById('close-btn');
    
    console.log('🔧 按钮元素:', { expandBtn, settingsBtn, closeBtn });
    
    // 检查按钮是否存在
    if (!expandBtn) {
        console.error('❌ 找不到expand-btn元素');
    }
    if (!settingsBtn) {
        console.error('❌ 找不到settings-btn元素');
    }
    if (!closeBtn) {
        console.error('❌ 找不到close-btn元素');
    }
    
    // 展开/收起按钮
    if (expandBtn) {
        expandBtn.addEventListener('click', function(e) {
            console.log('🔧 展开按钮被点击');
            e.stopPropagation();
            if (isExpanded) {
                hideExpanded();
            } else {
                expandNotification();
            }
        });
        console.log('✅ 展开按钮事件监听器设置完成');
    }
    
    // 设置按钮
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function(e) {
            console.log('🔧 设置按钮被点击');
            e.stopPropagation();
            ipcRenderer.invoke('open-settings');
        });
        console.log('✅ 设置按钮事件监听器设置完成');
    }
    
    // 关闭按钮
    if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
            console.log('🔧 关闭按钮被点击');
            e.stopPropagation();
            closeApplication();
        });
        console.log('✅ 关闭按钮事件监听器设置完成');
    }
    
    console.log('✅ 控制按钮设置完成');
}

// 更新轮播间隔
function updateRotationInterval(seconds) {
    // 清除现有的轮播定时器
    if (window.rotationTimer) {
        clearInterval(window.rotationTimer);
    }
    
    // 设置新的轮播定时器
    window.rotationTimer = setInterval(() => {
        if (!isExpanded) {
            nextNotification();
        }
    }, seconds * 1000);
}

// 关闭应用
function closeApplication() {
    ipcRenderer.invoke('open-close-confirm');
}


// 设置拖拽功能
// 设置拖拽功能 - 使用CSS原生拖拽
function setupDragFunctionality() {
    console.log(`[拖拽] 使用CSS原生拖拽功能`);
    // CSS -webkit-app-region 已经处理了拖拽功能
    // 不需要JavaScript拖拽代码
}

// 鼠标悬停效果（现在只是暂停自动轮播）
const dynamicIsland = document.querySelector('.dynamic-island');
let hoverPauseTimer = null;

dynamicIsland.addEventListener('mouseenter', function() {
    // 暂停自动轮播
    if (hoverPauseTimer) {
        clearTimeout(hoverPauseTimer);
    }
});

dynamicIsland.addEventListener('mouseleave', function() {
    // 恢复自动轮播（延迟1秒）
    hoverPauseTimer = setTimeout(() => {
        // 自动轮播会继续
    }, 1000);
});