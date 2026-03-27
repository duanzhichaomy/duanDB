# DuanDB

桌面端数据库管理工具，基于 Tauri 2 (Rust) + React 18 / Umi 4 构建。支持 MySQL 连接管理、SQL 编辑执行、表结构浏览与内联编辑。

## 技术选型

- **前端**: Umi v4 + React 18 + Ant Design 5 + Zustand (状态管理) + Monaco Editor (SQL 编辑器)
- **后端**: Tauri 2 + Rust + SQLx (MySQL/SQLite)
- **桌面**: Tauri 2 (跨平台桌面应用)
- **国际化**: 自研 i18n 方案，支持中英文

## 项目结构

```
├── src/                    # 前端源码
│   ├── assets/             # 静态资源
│   ├── blocks/             # 通用业务块
│   ├── components/         # 通用组件 (MonacoEditor, Iconfont, SearchResult 等)
│   ├── constants/          # 常量定义
│   ├── hooks/              # 自定义 Hooks
│   ├── i18n/               # 国际化文案 (中/英)
│   ├── indexedDB/          # IndexedDB 本地缓存
│   ├── layouts/            # 页面布局
│   ├── pages/              # 页面 (workspace, connection, dashboard, team)
│   ├── service/            # API 服务层 + Tauri Bridge
│   ├── store/              # Zustand 全局状态
│   ├── styles/             # 全局样式 & CSS 变量
│   ├── theme/              # 主题配置
│   ├── typings/            # TypeScript 类型定义
│   └── utils/              # 工具函数 (IntelliSense, SQL 格式化等)
├── src-tauri/              # Rust 后端源码
│   └── src/
│       ├── commands/       # Tauri 命令 (connection, sql, table, database, metadata, console)
│       ├── db/             # 数据库管理 (SQLite 本地存储, MySQL 连接池)
│       ├── models/         # 数据模型 (请求/响应结构体)
│       ├── mysql/          # MySQL 元数据查询, DDL 构建, 类型映射
│       ├── lib.rs          # Tauri 应用入口 & 命令注册
│       └── state.rs        # 应用状态 (SQLite pool + MySQL pools)
├── public/                 # 公共静态文件
├── mock/                   # Mock 数据
└── dist/                   # 构建产物
```

## 启动项目

环境要求：Node.js 18+、pnpm、Rust toolchain。

```bash
# 安装依赖
pnpm install

# 启动桌面应用（前端 + Tauri 同时启动）
pnpm tauri:dev

# 仅启动前端开发服务器（HMR）
pnpm dev:hot

# 仅启动前端开发服务器
pnpm dev
```

## 构建

```bash
# 构建前端
pnpm build:web

# 构建桌面应用
pnpm tauri:build

# 仅编译 Rust 后端
cd src-tauri && cargo build
```

## 代码规范

### TypeScript

- 所有的 interface 与 type 必须以 `I` 开头：
  ```ts
  interface IState { name: string }  // good
  interface State { name: string }   // bad
  ```

### 颜色使用

- CSS 中使用 CSS 变量：`background: var(--control-item-bg-active)` // good
- JS 中使用主题包：`window._AppThemePack.controlItemBgActive` // good
- 禁止硬编码颜色值：`color: #fff` // bad

### 国际化

所有 key 格式为 `模块名称.文案类型.文案描述`，占位符使用 `{1}`、`{2}`。

```tsx
import i18n from '@/i18n';

// 'home.tip.welcome': '欢迎您，{1}！'
i18n('home.tip.welcome', user.name); // => '欢迎您，张三！'
```

### Rust 规范

- 响应统一使用 `ApiResponse::ok(data)` / `ApiResponse::err(message)`
- 错误传播使用 `.map_err(|e| e.to_string())?`
- SQL 值转义使用 MySQL 标准双单引号 `''`
