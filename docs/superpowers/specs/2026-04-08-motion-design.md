# DuanDB 前端动效设计规范

## 背景

DuanDB 桌面应用目前已有零散的 CSS 过渡效果（Tree 节点展开、Tab hover、Loading 动画等），但缺乏统一的动效体系。本规范参照 [Ant Design 动效设计指南](https://ant.design/docs/spec/motion-cn) 的三大原则（自然、高效、克制），为全部 UI 交互场景建立一致的动效系统。

## 技术方案

**CSS Transitions + Keyframes**，基于 Ant Design Motion Token 体系，零新依赖。

理由：项目已有 CSS 动画基础，abandon 文件夹中存在完整 motion 变量定义可复用，与 Ant Design 组件内置动效保持一致。

---

## 一、Motion Token 体系

新建 `src/styles/motion.less`，在 `global.less` 中 import。

### 1.1 时长变量

```less
:root {
  --motion-duration-fast: 0.1s;   // hover、active、微交互
  --motion-duration-mid: 0.2s;    // 展开收起、Tab 切换、下拉
  --motion-duration-slow: 0.3s;   // Modal、Drawer、页面切换
}
```

### 1.2 缓动函数

```less
:root {
  --motion-ease-out: cubic-bezier(0.215, 0.61, 0.355, 1);           // 元素进入
  --motion-ease-in: cubic-bezier(0.55, 0.055, 0.675, 0.19);         // 元素退出
  --motion-ease-in-out: cubic-bezier(0.645, 0.045, 0.355, 1);       // 状态切换
  --motion-ease-out-circ: cubic-bezier(0.08, 0.82, 0.17, 1);        // 弹性进入
  --motion-ease-in-out-circ: cubic-bezier(0.78, 0.14, 0.15, 0.86);  // 强调过渡
}
```

### 1.3 复合快捷变量

```less
:root {
  --transition-fast: all 0.1s var(--motion-ease-in-out);
  --transition-mid: all 0.2s var(--motion-ease-in-out);
  --transition-slow: all 0.3s var(--motion-ease-in-out);
}
```

---

## 二、全局 Keyframe 动画

在 `motion.less` 中定义以下 @keyframes 及对应工具类：

### 2.1 Fade 淡入淡出

```less
// fadeIn: opacity 0 → 1
// fadeOut: opacity 1 → 0
// 用途：Tooltip、通知、内容切换
```

### 2.2 FadeUp 淡入上移

```less
// fadeInUp: opacity(0→1) + translateY(8px→0)
// fadeOutDown: opacity(1→0) + translateY(0→8px)
// 用途：页面进入、列表项出现、查询结果
```

### 2.3 Slide 滑入滑出

```less
// slideInRight / slideOutRight: translateX(100%→0 / 0→100%)
// slideInDown / slideOutUp: translateY(-100%→0 / 0→-100%)
// slideInUp / slideOutDown: translateY(100%→0 / 0→100%)
// 用途：Drawer、侧面板、下拉菜单
```

### 2.4 Zoom 缩放

```less
// zoomIn: scale(0.85→1) + opacity(0→1)
// zoomOut: scale(1→0.85) + opacity(1→0)
// 用途：Modal、Popover、右键菜单
```

### 2.5 Collapse 折叠

```less
// 通过 max-height + opacity 实现高度动画
// 配合 JS 切换 .expanded / .collapsed 类名
// 用途：Tree 节点展开、折叠面板
```

### 2.6 Flash 高亮

```less
// rowFlash: 背景色从绿色闪烁后恢复透明
// 用途：数据行编辑保存反馈
```

### 2.7 工具类

```less
.motion-fade-enter      { animation: fadeIn var(--motion-duration-mid) var(--motion-ease-out); }
.motion-fade-leave       { animation: fadeOut var(--motion-duration-mid) var(--motion-ease-in); }
.motion-fade-up-enter    { animation: fadeInUp var(--motion-duration-slow) var(--motion-ease-out); }
.motion-fade-up-leave    { animation: fadeOutDown var(--motion-duration-slow) var(--motion-ease-in); }
.motion-slide-right-enter { animation: slideInRight var(--motion-duration-slow) var(--motion-ease-out-circ); }
.motion-slide-right-leave { animation: slideOutRight var(--motion-duration-slow) var(--motion-ease-in); }
.motion-zoom-enter       { animation: zoomIn var(--motion-duration-slow) var(--motion-ease-out-circ); }
.motion-zoom-leave       { animation: zoomOut var(--motion-duration-slow) var(--motion-ease-in); }
.motion-collapse         { transition: max-height var(--motion-duration-mid) var(--motion-ease-in-out),
                                       opacity var(--motion-duration-mid) var(--motion-ease-in-out); }
```

---

## 三、场景应用方案

### 3.1 页面切换

| 项目 | 值 |
|------|-----|
| 动效 | fadeInUp |
| 时长 | 0.3s |
| 缓动 | ease-out |
| 实现 | 页面根容器添加 .motion-fade-up-enter |
| 文件 | `src/pages/main/index.tsx` |

### 3.2 Tab 标签页

| 交互 | 动效 | 时长 |
|------|------|------|
| Tab 切换 | 内容区 fadeIn | 0.2s |
| 新增 Tab | 标签 fadeIn + 内容 fadeInUp | 0.2s |
| 关闭 Tab | 标签 fadeOut + width 收缩 | 0.15s |

文件：`src/pages/main/workspace/components/WorkspaceTabs/`

### 3.3 Tree 数据库导航

| 交互 | 动效 | 时长 |
|------|------|------|
| 节点展开/收起 | collapse (max-height + opacity) | 0.2s |
| 箭头旋转 | rotate(0→90deg) | 0.2s |
| 搜索结果出现 | stagger fadeIn (每项延迟 30ms) | 0.15s |
| 节点 hover | background-color transition | 0.1s |

文件：`src/blocks/Tree/`, `src/pages/main/workspace/components/WorkspaceLeft/`
现状：已有基础 transition，需统一到 motion token。

### 3.4 Modal 弹窗

| 交互 | 动效 | 时长 |
|------|------|------|
| 打开 | 遮罩 fadeIn(0.2s) + 内容 zoomIn(0.3s) | 0.3s |
| 关闭 | 遮罩 fadeOut(0.2s) + 内容 zoomOut(0.2s) | 0.2s |

Ant Design Modal 已有内置动效，自定义 Modal (BaseModal/TriggeredModal) 需添加。
文件：`src/components/BaseModal/`, `src/components/TriggeredModal/`

### 3.5 Drawer 抽屉

| 交互 | 动效 | 时长 |
|------|------|------|
| 日志面板(底部) | slideUp + fadeIn | 0.3s |
| 侧边 Drawer | slideRight + fadeIn | 0.3s |

Ant Design Drawer 内置动效，确保参数与 token 一致。
文件：`src/blocks/LogViewer/`

### 3.6 数据表 & 查询结果

| 交互 | 动效 | 时长 |
|------|------|------|
| 结果出现 | fadeInUp | 0.2s |
| 分页切换 | fadeIn | 0.15s |
| 行编辑保存 | rowFlash (绿色高亮闪烁) | 0.5s |
| 行删除 | fadeOut + height 收缩 | 0.2s |
| Loading 状态 | fadeIn/Out 切换 | 保持现有 |

文件：`src/components/SearchResult/`, `src/components/Output/`

### 3.7 侧边栏 & 面板

| 交互 | 动效 | 时长 |
|------|------|------|
| 面板折叠/展开 | width transition + 内容 fadeIn | 0.3s |
| Save List 切换 | fadeIn | 0.2s |
| 拖拽调整 | 实时跟随（已有） | — |

文件：`src/components/DraggableContainer/`, `src/pages/main/workspace/components/WorkspaceLeft/`

### 3.8 通知 & 消息

| 交互 | 动效 | 时长 |
|------|------|------|
| Message | slideDown + fadeIn（从顶部） | 0.3s |
| Notification | slideRight + fadeIn（从右侧） | 0.3s |
| 自动消失 | fadeOut + slideUp | 0.2s |

Ant Design message/notification 内置动效。
文件：`src/components/MyNotification/`

### 3.9 连接管理

| 交互 | 动效 | 时长 |
|------|------|------|
| 连接列表加载 | stagger fadeInUp (每项延迟 50ms) | 0.2s |
| 连接状态变化 | fadeIn 切换 | 0.2s |
| 新建/编辑弹窗 | 同 Modal 规范 | — |

文件：`src/pages/main/connection/`, `src/components/ConnectionEdit/`

### 3.10 通用交互

| 交互 | 动效 | 时长 |
|------|------|------|
| 按钮 hover/active | background-color + box-shadow | 0.1s |
| 图标按钮 hover | background-color | 0.15s |
| 输入框 focus | border-color + box-shadow (Ant Design 内置) | 0.2s |
| 右键菜单 | zoomIn + fadeIn, origin: 点击位置 | 0.15s |
| Tooltip/Popover | fadeIn + 微位移 (Ant Design 内置) | 0.1s |

---

## 四、实现原则

1. **Ant Design 组件优先使用内置动效**：Modal、Drawer、Tooltip、Message、Notification 等已有动效的组件，不重复实现，仅在需要时通过 token 微调参数
2. **自定义组件统一使用 motion token**：所有新增/修改的过渡效果必须引用 CSS 变量，禁止硬编码时长和缓动函数
3. **现有动画迁移**：将项目中已有的硬编码 transition 值逐步替换为 motion token 引用
4. **性能优先**：动画属性优先使用 transform 和 opacity（GPU 加速），避免 width/height 直接动画（collapse 场景使用 max-height）
5. **prefers-reduced-motion**：尊重系统「减少动态效果」设置，添加全局媒体查询关闭动效

---

## 五、文件变更清单

| 操作 | 文件路径 | 说明 |
|------|---------|------|
| 新建 | `src/styles/motion.less` | Motion Token + Keyframes + 工具类 |
| 修改 | `src/styles/global.less` | import motion.less |
| 修改 | `src/pages/main/index.tsx` | 页面切换动效 |
| 修改 | `src/pages/main/workspace/components/WorkspaceTabs/` | Tab 动效 |
| 修改 | `src/blocks/Tree/` + `WorkspaceLeft/` | Tree 动效统一 |
| 修改 | `src/components/BaseModal/` | 自定义 Modal 动效 |
| 修改 | `src/components/TriggeredModal/` | 触发式 Modal 动效 |
| 修改 | `src/blocks/LogViewer/` | Drawer 动效确认 |
| 修改 | `src/components/SearchResult/` | 数据表动效 |
| 修改 | `src/components/Output/` | 查询输出动效 |
| 修改 | `src/pages/main/connection/` | 连接列表 stagger |
| 修改 | `src/components/ConnectionEdit/` | 连接编辑动效 |
| 修改 | 各组件 index.less | 将硬编码 transition 替换为 token |

---

## 六、验证方式

1. `pnpm dev:hot` 启动开发服务器
2. 逐场景验证：
   - 页面切换是否有 fadeInUp 效果
   - Tab 新增/关闭/切换的动画流畅度
   - Tree 展开收起的折叠动画
   - Modal/Drawer 的进出动效
   - 数据表查询结果出现动画
   - 连接列表 stagger 效果
3. 打开系统「减少动态效果」设置，确认动效被正确禁用
4. 检查 Chrome DevTools Performance，确认无 layout thrashing
