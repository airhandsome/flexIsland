# FlexIsland - Windows灵动岛

基于Electron开发的Windows桌面灵动岛应用，为用户提供类似iPhone 14 Pro灵动岛的交互体验。

## 功能特性

- 🎯 **智能通知** - 实时显示系统通知
- 🎵 **媒体控制** - 音乐播放控制
- ⏰ **时间显示** - 实时时间显示
- 🔋 **系统状态** - 电池、网络状态监控
- ⚙️ **个性化设置** - 主题、透明度、大小调节
- 🎨 **现代化UI** - 毛玻璃效果，流畅动画

## 开发环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0
- Windows 10/11

## 安装依赖

```bash
npm install
```

## 开发模式运行

```bash
npm run dev
```

## 构建应用

```bash
# 构建Windows版本
npm run build:win

# 构建所有平台
npm run build
```

## 项目结构

```
flexIsland/
├── src/
│   ├── main.js              # 主进程
│   └── renderer/            # 渲染进程
│       ├── index.html       # 主界面
│       ├── styles.css       # 样式文件
│       └── app.js          # 前端逻辑
├── assets/                  # 资源文件
├── package.json            # 项目配置
└── README.md               # 说明文档
```

## 快捷键

- `Ctrl+Shift+I` - 显示/隐藏窗口
- `Ctrl+Shift+H` - 隐藏窗口

## 开发计划

- [x] 阶段一：基础框架
- [ ] 阶段二：核心功能
- [ ] 阶段三：高级功能
- [ ] 阶段四：测试与发布

## 许可证

MIT License