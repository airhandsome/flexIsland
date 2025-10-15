const { ipcRenderer } = require('electron');

class FlexIslandApp {
    constructor() {
        this.isExpanded = false;
        this.config = {
            opacity: 0.9,
            size: 'medium',
            theme: 'gradient',
            alwaysOnTop: true,
            showTime: true,
            showBattery: true,
            showNetwork: true,
            showNotifications: true,
            showMedia: true
        };
        this.init();
    }

    applyVisibility() {
        // 主内容显示项
        const timeWrapper = document.getElementById('time-display');
        const batteryWrapper = document.getElementById('battery-status');
        const networkWrapper = document.getElementById('network-status');
        if (timeWrapper) timeWrapper.style.display = this.config.showTime ? '' : 'none';
        if (batteryWrapper) batteryWrapper.style.display = this.config.showBattery ? '' : 'none';
        if (networkWrapper) networkWrapper.style.display = this.config.showNetwork ? '' : 'none';

        // 展开内容显示项
        const notificationArea = document.getElementById('notification-area');
        const mediaControl = document.getElementById('media-control');
        if (notificationArea) notificationArea.style.display = this.config.showNotifications ? '' : 'none';
        if (mediaControl) mediaControl.style.display = this.config.showMedia ? '' : 'none';
    }

    async init() {
        // 加载配置
        await this.loadConfig();
        
        // 初始化UI
        this.initUI();
        
        // 设置事件监听
        this.setupEventListeners();
        
        // 启动定时器
        this.startTimers();
        
        // 应用主题
        this.applyTheme();

        // 若主进程透明启用，确保可见样式
        if (this.config.transparent) {
            document.body.classList.add('transparent-visible');
        } else {
            document.body.classList.remove('transparent-visible');
        }

        // 主进程广播的透明模式信号
        ipcRenderer.on('transparent-mode', (_e, isTransparent) => {
            if (isTransparent) {
                document.body.classList.add('transparent-visible');
            } else {
                document.body.classList.remove('transparent-visible');
            }
            // 调试：打印容器的计算样式，确认前景是否可见
            const c = getComputedStyle(document.getElementById('flexisland-container'));
            console.log('[透明调试] container background:', c.backgroundImage || c.backgroundColor, 'opacity:', c.opacity);
        });

        // 启动后自检：若容器宽高为0或背景完全透明，报告主进程降级
        setTimeout(() => {
            const el = document.getElementById('flexisland-container');
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            const bgVisible = (cs.backgroundImage && cs.backgroundImage !== 'none') || (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)');
            if ((rect.width < 5 || rect.height < 5) || !bgVisible) {
                console.warn('[兼容] 前景疑似不可见，申请降级为非透明窗口');
                ipcRenderer.invoke('report-invisible');
            }
        }, 400);
    }

    async loadConfig() {
        try {
            const savedConfig = await ipcRenderer.invoke('get-config');
            this.config = { ...this.config, ...savedConfig };
        } catch (error) {
            console.error('加载配置失败:', error);
        }
    }

    async saveConfig() {
        try {
            await ipcRenderer.invoke('set-config', this.config);
        } catch (error) {
            console.error('保存配置失败:', error);
        }
    }

    initUI() {
        // 获取DOM元素
        this.elements = {
            container: document.getElementById('flexisland-container'),
            mainContent: document.getElementById('main-content'),
            expandedContent: document.getElementById('expanded-content'),
            timeDisplay: document.getElementById('current-time'),
            batteryLevel: document.getElementById('battery-level'),
            networkName: document.getElementById('network-name'),
            expandBtn: document.getElementById('expand-btn'),
            settingsBtn: document.getElementById('settings-btn'),
            closeBtn: document.getElementById('close-btn'),
            settingsPanel: document.getElementById('settings-panel'),
            closeSettings: document.getElementById('close-settings'),
            opacitySlider: document.getElementById('opacity-slider'),
            opacityValue: document.getElementById('opacity-value'),
            sizeSelector: document.getElementById('size-selector'),
            themeSelector: document.getElementById('theme-selector'),
            alwaysOnTop: document.getElementById('always-on-top'),
            showTime: document.getElementById('show-time'),
            showBattery: document.getElementById('show-battery'),
            showNetwork: document.getElementById('show-network'),
            showNotifications: document.getElementById('show-notifications'),
            showMedia: document.getElementById('show-media')
        };

        // 设置初始值
        this.elements.opacitySlider.value = this.config.opacity;
        this.elements.opacityValue.textContent = Math.round(this.config.opacity * 100) + '%';
        this.elements.sizeSelector.value = this.config.size;
        this.elements.themeSelector.value = this.config.theme;
        this.elements.alwaysOnTop.checked = this.config.alwaysOnTop;
        if (this.elements.showTime) this.elements.showTime.checked = this.config.showTime;
        if (this.elements.showBattery) this.elements.showBattery.checked = this.config.showBattery;
        if (this.elements.showNetwork) this.elements.showNetwork.checked = this.config.showNetwork;
        if (this.elements.showNotifications) this.elements.showNotifications.checked = this.config.showNotifications;
        if (this.elements.showMedia) this.elements.showMedia.checked = this.config.showMedia;
        this.applyVisibility();

        // 挂载系统信息部件（订阅主进程推送）
        try {
            const { SystemInfoWidget } = require('./ui/systemInfoWidget');
            this.systemInfoWidget = new SystemInfoWidget();
            this.systemInfoWidget.mount();
        } catch (e) {
            console.warn('系统信息部件加载失败:', e);
        }

        // 挂载媒体与通知部件
        try {
            const { MediaWidget } = require('./ui/mediaWidget');
            this.mediaWidget = new MediaWidget();
            this.mediaWidget.mount();
        } catch (e) {
            console.warn('媒体部件加载失败:', e);
        }
        try {
            const { NotificationWidget } = require('./ui/notificationWidget');
            this.notificationWidget = new NotificationWidget();
            this.notificationWidget.mount();
        } catch (e) {
            console.warn('通知部件加载失败:', e);
        }
    }

    setupEventListeners() {
        // 展开/收起按钮
        this.elements.expandBtn.addEventListener('click', () => {
            this.toggleExpanded();
        });

        // 设置按钮：打开独立设置窗口
        this.elements.settingsBtn.addEventListener('click', async () => {
            try {
                await ipcRenderer.invoke('open-settings-window');
            } catch (e) {
                console.error('打开设置窗口失败:', e);
            }
        });

        // 关闭按钮
        this.elements.closeBtn.addEventListener('click', () => {
            this.hideWindow();
        });

        // 设置面板关闭
        this.elements.closeSettings.addEventListener('click', () => {
            this.hideSettings();
        });

        // 透明度滑块
        this.elements.opacitySlider.addEventListener('input', (e) => {
            const opacity = parseFloat(e.target.value);
            this.config.opacity = opacity;
            this.elements.opacityValue.textContent = Math.round(opacity * 100) + '%';
            this.saveConfig();
        });

        // 大小选择器
        this.elements.sizeSelector.addEventListener('change', (e) => {
            this.config.size = e.target.value;
            this.applySize();
            this.saveConfig();
        });

        // 主题选择器
        this.elements.themeSelector.addEventListener('change', (e) => {
            this.config.theme = e.target.value;
            this.applyTheme();
            this.saveConfig();
        });

        // 始终置顶复选框
        this.elements.alwaysOnTop.addEventListener('change', (e) => {
            this.config.alwaysOnTop = e.target.checked;
            this.saveConfig();
        });

        // 显示项开关
        this.elements.showTime.addEventListener('change', (e) => {
            this.config.showTime = e.target.checked;
            this.applyVisibility();
            this.saveConfig();
        });
        this.elements.showBattery.addEventListener('change', (e) => {
            this.config.showBattery = e.target.checked;
            this.applyVisibility();
            this.saveConfig();
        });
        this.elements.showNetwork.addEventListener('change', (e) => {
            this.config.showNetwork = e.target.checked;
            this.applyVisibility();
            this.saveConfig();
        });
        this.elements.showNotifications.addEventListener('change', (e) => {
            this.config.showNotifications = e.target.checked;
            this.applyVisibility();
            this.saveConfig();
        });
        this.elements.showMedia.addEventListener('change', (e) => {
            this.config.showMedia = e.target.checked;
            this.applyVisibility();
            this.saveConfig();
        });

        // 点击设置面板外部关闭
        this.elements.settingsPanel.addEventListener('click', (e) => {
            if (e.target === this.elements.settingsPanel) {
                this.hideSettings();
            }
        });

        // 监听主进程配置更新，立即应用
        ipcRenderer.on('config-updated', (_evt, cfg) => {
            this.config = { ...this.config, ...cfg };
            this.applyTheme();
            this.applyVisibility();
            this.elements.opacitySlider.value = this.config.opacity;
            this.elements.opacityValue.textContent = Math.round(this.config.opacity * 100) + '%';
            if (this.config.transparent) {
                document.body.classList.add('transparent-visible');
            } else {
                document.body.classList.remove('transparent-visible');
            }
        });
    }

    setupDrag() {
        let isDragging = false;
        let startX, startY, startWindowX, startWindowY;

        this.elements.container.addEventListener('mousedown', (e) => {
            // 如果点击的是按钮，不启动拖拽
            if (e.target.classList.contains('control-btn') || 
                e.target.classList.contains('media-btn') ||
                e.target.closest('#settings-panel')) {
                return;
            }

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            
            // 获取当前窗口位置
            ipcRenderer.invoke('get-window-position').then(position => {
                startWindowX = position.x;
                startWindowY = position.y;
            });

            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const newX = startWindowX + deltaX;
            const newY = startWindowY + deltaY;

            ipcRenderer.invoke('set-window-position', { x: newX, y: newY });
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        // 支持滚轮调节展开区域大小
        const expanded = this.elements.expandedContent;
        if (expanded) {
            expanded.addEventListener('wheel', (e) => {
                // 允许自然滚动
            }, { passive: true });
        }
    }

    toggleExpanded() {
        this.isExpanded = !this.isExpanded;
        
        const baseHeight = 100; // 与主窗口默认高度保持一致
        const currentWidthPromise = ipcRenderer.invoke('get-window-size');
        if (this.isExpanded) {
            this.elements.expandedContent.classList.remove('hidden');
            this.elements.expandBtn.textContent = '▲';
            const expandedHeight = baseHeight + 220;
            currentWidthPromise.then(({ width }) => {
                ipcRenderer.invoke('set-window-size', { width, height: expandedHeight });
            });
        } else {
            this.elements.expandedContent.classList.add('hidden');
            this.elements.expandBtn.textContent = '▼';
            currentWidthPromise.then(({ width }) => {
                ipcRenderer.invoke('set-window-size', { width, height: baseHeight });
            });
        }
    }

    showSettings() {
        this.elements.settingsPanel.classList.remove('hidden');
    }

    hideSettings() {
        this.elements.settingsPanel.classList.add('hidden');
    }

    async hideWindow() {
        try {
            await ipcRenderer.invoke('toggle-window');
        } catch (error) {
            console.error('隐藏窗口失败:', error);
        }
    }

    applySize() {
        const sizes = {
            small: { width: 250, height: 60 },
            medium: { width: 300, height: 80 },
            large: { width: 350, height: 100 }
        };

        const size = sizes[this.config.size];
        if (size) {
            // 这里需要通知主进程调整窗口大小
            // 暂时通过CSS调整
            this.elements.container.style.width = size.width + 'px';
            this.elements.container.style.minHeight = size.height + 'px';
        }
    }

    applyTheme() {
        // 移除所有主题类
        document.body.classList.remove('light-theme', 'dark-theme');
        
        // 新增多主题类
        document.body.classList.remove('theme-gradient','theme-blue','theme-green','theme-glass');
        if (['gradient','blue','green','glass'].includes(this.config.theme)) {
            const map = {
                gradient: 'theme-gradient',
                blue: 'theme-blue',
                green: 'theme-green',
                glass: 'theme-glass'
            };
            document.body.classList.add(map[this.config.theme]);
        }

        if (this.config.theme === 'light') {
            document.body.classList.add('light-theme');
        } else if (this.config.theme === 'dark') {
            document.body.classList.add('dark-theme');
        } else if (this.config.theme === 'auto') {
            // 跟随系统主题
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.body.classList.add(prefersDark ? 'dark-theme' : 'light-theme');
        }
    }

    startTimers() {
        // 更新时间
        this.updateTime();
        setInterval(() => {
            this.updateTime();
        }, 1000);

        // 移除本地系统信息模拟，改为主进程推送
        // 通知与媒体模拟保留
        setInterval(() => {
            this.updateMockNotifications();
        }, 10000);

        setInterval(() => {
            this.updateMockMedia();
        }, 15000);
    }

    updateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        this.elements.timeDisplay.textContent = timeString;
    }

    async updateSystemInfo() {
        try {
            // 模拟系统信息更新
            const mockBattery = Math.floor(Math.random() * 30) + 70; // 70-100%
            const networks = ['WiFi', '以太网', '移动热点'];
            const mockNetwork = networks[Math.floor(Math.random() * networks.length)];
            
            this.elements.batteryLevel.textContent = mockBattery + '%';
            this.elements.networkName.textContent = mockNetwork;
        } catch (error) {
            console.error('更新系统信息失败:', error);
        }
    }

    // 添加模拟通知数据
    addMockNotification() {
        const notifications = [
            { icon: '📧', title: '新邮件', text: '您收到一封来自同事的邮件' },
            { icon: '🔔', title: '系统更新', text: 'Windows更新已准备就绪' },
            { icon: '💬', title: '微信消息', text: '张三: 你好，今天有空吗？' },
            { icon: '📱', title: '手机来电', text: '李四 正在呼叫...' },
            { icon: '⏰', title: '提醒', text: '会议将在10分钟后开始' }
        ];
        
        const randomNotification = notifications[Math.floor(Math.random() * notifications.length)];
        return randomNotification;
    }

    // 添加模拟媒体数据
    getMockMediaInfo() {
        const mediaList = [
            { title: '夜曲', artist: '周杰伦' },
            { title: '青花瓷', artist: '周杰伦' },
            { title: '稻香', artist: '周杰伦' },
            { title: '告白气球', artist: '周杰伦' },
            { title: '晴天', artist: '周杰伦' }
        ];
        
        return mediaList[Math.floor(Math.random() * mediaList.length)];
    }

    // 更新模拟通知
    updateMockNotifications() {
        if (Math.random() > 0.7) { // 30%概率更新通知
            const notification = this.addMockNotification();
            const notificationArea = document.getElementById('notification-area');
            
            // 创建新的通知项
            const notificationItem = document.createElement('div');
            notificationItem.className = 'notification-item slide-in';
            notificationItem.innerHTML = `
                <div class="notification-icon">${notification.icon}</div>
                <div class="notification-content">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-text">${notification.text}</div>
                </div>
            `;
            
            // 插入到通知区域顶部
            notificationArea.insertBefore(notificationItem, notificationArea.firstChild);
            
            // 限制通知数量，最多显示3个
            const notifications = notificationArea.querySelectorAll('.notification-item');
            if (notifications.length > 3) {
                notificationArea.removeChild(notifications[notifications.length - 1]);
            }
        }
    }

    // 更新模拟媒体信息
    updateMockMedia() {
        if (Math.random() > 0.5) { // 50%概率更新媒体信息
            const mediaInfo = this.getMockMediaInfo();
            const mediaTitle = document.querySelector('.media-title');
            const mediaArtist = document.querySelector('.media-artist');
            
            if (mediaTitle && mediaArtist) {
                mediaTitle.textContent = mediaInfo.title;
                mediaArtist.textContent = mediaInfo.artist;
            }
        }
    }
}

// 应用启动
document.addEventListener('DOMContentLoaded', () => {
    new FlexIslandApp();
});

// 处理窗口事件
window.addEventListener('beforeunload', () => {
    // 清理资源
});