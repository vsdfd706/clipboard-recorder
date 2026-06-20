# 📋 剪贴板记录器 (Clipboard Recorder)

一款基于 Electron 的桌面剪贴板管理工具。持续后台监控剪贴板变化，自动记录复制内容，支持编辑、搜索、删除和回收站功能。

## ✨ 功能

- 🔄 **自动监控** — 200ms 轮询，自动捕获复制的文本、图片和文件
- 🔒 **智能去重** — MD5 哈希去重，连续复制相同内容只保留一条
- ✏️ **随时编辑** — 点击即可编辑记录内容，1 秒防抖自动保存
- 🔍 **搜索筛选** — 支持关键词搜索，按时间/类型筛选
- 🗑 **回收站** — 删除后进入回收站，可恢复或彻底删除
- ⚙️ **设置灵活** — 开机自启、最小化到托盘、最大记录数限制
- ⌨️ **快捷键** — Ctrl+F 搜索、Ctrl+N 切换列表、Delete 删除、Ctrl+H 隐藏窗口
- 🎨 **苹果风格** — 毛玻璃工具栏、圆角卡片、SF Pro 字体、浅色主题
- 🌐 **全中文** — 界面、菜单、提示全部中文化

## 🖼️ 界面

```
┌─────────────────────────────────────────────────┐
│ 🔍 搜索剪贴板记录...      全部时间 ▾ 全部类型 ▾  ● 监控中 │
├──────────────┬──────────────────────────────────┤
│ 📝 记录预览  │   📋 剪贴板内容                   │
│   14:32     │                                   │
│              │   2024-06-21 14:32:15             │
│ 📝 记录预览  │   [可编辑的文本区域]               │
│   14:28     │                                   │
│              │   [📋 复制到剪贴板] [🗑 删除]      │
│ 🖼️ 记录预览 │                                   │
│   14:15     │                                   │
├──────────────┴──────────────────────────────────┤
│ 📋 剪贴板 (128)  │  🗑 回收站 (5)  │  ⚙️ 设置    │
└─────────────────────────────────────────────────┘
```

## 🚀 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) 18+
- Windows 10/11（macOS / Linux 也可运行）

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/vsdfd706/clipboard-recorder.git
cd clipboard-recorder

# 安装依赖
npm install

# 编译原生模块（Electron 版本适配）
npx electron-rebuild

# 启动应用
npm start
```

### 构建安装包

```bash
npm run build
```

安装包输出在 `dist/` 目录下。

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+F` | 聚焦搜索框 |
| `Ctrl+S` | 手动保存编辑 |
| `Ctrl+N` | 切换到剪贴板标签 |
| `Ctrl+H` | 隐藏窗口到托盘 |
| `Delete` | 删除选中的记录 |
| `Ctrl+Shift+Delete` | 清空回收站 |

## 📁 项目结构

```
src/
├── main/                  # 主进程
│   ├── index.js           # 入口：app 生命周期，模块组装
│   ├── database.js        # SQLite 数据库 CRUD
│   ├── clipboard.js       # 剪贴板监控（轮询 + 去重）
│   ├── ipc-handlers.js    # IPC 通信处理
│   └── tray.js            # 系统托盘
├── preload/
│   └── index.js           # contextBridge 预加载
└── renderer/              # 渲染进程
    ├── index.html         # 主页面
    ├── styles/
    │   └── main.css       # 苹果风格样式
    └── scripts/
        ├── app.js         # 入口：标签切换、状态管理
        ├── list.js        # 记录列表
        ├── detail.js      # 详情编辑面板
        ├── search.js      # 搜索和筛选
        ├── trash.js       # 回收站
        ├── settings.js    # 设置页面
        └── keys.js        # 键盘快捷键
```

## 🛠 技术栈

| 层 | 技术 |
|---|------|
| 桌面框架 | Electron 33 |
| 数据库 | better-sqlite3 (SQLite) |
| 前端 | HTML + CSS + 原生 JS (ES Modules) |
| 打包 | electron-builder |
| 存储位置 | `%APPDATA%/clipboard-recorder/` |

## 📄 许可

MIT
