# 前端动效系统实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于 Ant Design 动效设计指南，为 DuanDB 前端全部 UI 交互场景添加统一的 CSS 动效系统。

**Architecture:** 新建 `src/styles/motion.less` 定义 Motion Token（时长、缓动函数）、@keyframes 动画库和工具类。通过 `global.less` 全局引入后，逐个更新各组件的 LESS 文件，将硬编码过渡值替换为 token 引用，并为缺少动效的交互场景添加动画。

**Tech Stack:** CSS Transitions / Keyframes / CSS Variables / LESS

**注意：** 本项目无测试框架，验证方式为 `pnpm dev:hot` 启动后视觉检查。

---

## 文件结构

| 操作 | 文件路径 | 职责 |
|------|---------|------|
| 新建 | `src/styles/motion.less` | Motion Token 变量 + @keyframes + 工具类 + prefers-reduced-motion |
| 修改 | `src/styles/global.less` | 引入 motion.less |
| 修改 | `src/styles/antd.less` | 将硬编码缓动值替换为 token |
| 修改 | `src/styles/var.less` | 将 .f-icon-button hover 添加 transition |
| 修改 | `src/blocks/Tree/index.less` | 统一 tree 动效到 token |
| 修改 | `src/components/Tabs/index.less` | 添加 tab 内容切换 + 关闭动画 |
| 修改 | `src/pages/main/index.less` | 导航切换 + componentBox 动效 |
| 修改 | `src/pages/main/connection/index.less` | 连接列表项 hover 过渡 |
| 修改 | `src/pages/main/workspace/components/WorkspaceTabs/index.less` | welcome 页卡片入场动画 |
| 修改 | `src/components/Output/index.less` | 输出项入场动画 |
| 修改 | `src/components/SearchResult/components/TableBox/index.less` | 行状态过渡 |
| 修改 | `src/blocks/LogViewer/index.less` | 日志项 hover 过渡 |
| 修改 | `src/pages/main/workspace/components/WorkspaceLeft/index.less` | SaveList 面板切换动效 |

---

### Task 1: 创建 Motion Token + Keyframes + 工具类

**Files:**
- Create: `src/styles/motion.less`

- [ ] **Step 1: 创建 motion.less**

```less
// ===== Motion Token 变量 =====
:root {
  // 时长
  --motion-duration-fast: 0.1s;
  --motion-duration-mid: 0.2s;
  --motion-duration-slow: 0.3s;

  // 缓动函数
  --motion-ease-out: cubic-bezier(0.215, 0.61, 0.355, 1);
  --motion-ease-in: cubic-bezier(0.55, 0.055, 0.675, 0.19);
  --motion-ease-in-out: cubic-bezier(0.645, 0.045, 0.355, 1);
  --motion-ease-out-circ: cubic-bezier(0.08, 0.82, 0.17, 1);
  --motion-ease-in-out-circ: cubic-bezier(0.78, 0.14, 0.15, 0.86);
}

// ===== @keyframes 动画 =====

// Fade
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

// Fade + Move Up
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes fadeOutDown {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(8px);
  }
}

// Slide
@keyframes slideInRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
@keyframes slideOutRight {
  from { transform: translateX(0); }
  to { transform: translateX(100%); }
}
@keyframes slideInUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
@keyframes slideOutDown {
  from { transform: translateY(0); }
  to { transform: translateY(100%); }
}
@keyframes slideInDown {
  from { transform: translateY(-20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

// Zoom
@keyframes zoomIn {
  from {
    opacity: 0;
    transform: scale(0.85);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
@keyframes zoomOut {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.85);
  }
}

// Flash 高亮（行编辑反馈）
@keyframes rowFlash {
  0% { background-color: var(--color-success-bg); }
  100% { background-color: transparent; }
}

// ===== 工具类 =====
:global {
  .motion-fade-enter {
    animation: fadeIn var(--motion-duration-mid) var(--motion-ease-out) both;
  }
  .motion-fade-leave {
    animation: fadeOut var(--motion-duration-mid) var(--motion-ease-in) both;
  }
  .motion-fade-up-enter {
    animation: fadeInUp var(--motion-duration-slow) var(--motion-ease-out) both;
  }
  .motion-fade-up-leave {
    animation: fadeOutDown var(--motion-duration-slow) var(--motion-ease-in) both;
  }
  .motion-zoom-enter {
    animation: zoomIn var(--motion-duration-slow) var(--motion-ease-out-circ) both;
  }
  .motion-zoom-leave {
    animation: zoomOut var(--motion-duration-slow) var(--motion-ease-in) both;
  }
  .motion-slide-right-enter {
    animation: slideInRight var(--motion-duration-slow) var(--motion-ease-out-circ) both;
  }
  .motion-slide-up-enter {
    animation: slideInUp var(--motion-duration-slow) var(--motion-ease-out-circ) both;
  }
}

// ===== LESS Mixins =====
.f-transition-fast() {
  transition: all var(--motion-duration-fast) var(--motion-ease-in-out);
}
.f-transition-mid() {
  transition: all var(--motion-duration-mid) var(--motion-ease-in-out);
}
.f-transition-slow() {
  transition: all var(--motion-duration-slow) var(--motion-ease-in-out);
}

// ===== prefers-reduced-motion =====
@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-duration-fast: 0s;
    --motion-duration-mid: 0s;
    --motion-duration-slow: 0s;
  }
  :global {
    .motion-fade-enter,
    .motion-fade-leave,
    .motion-fade-up-enter,
    .motion-fade-up-leave,
    .motion-zoom-enter,
    .motion-zoom-leave,
    .motion-slide-right-enter,
    .motion-slide-up-enter {
      animation: none !important;
    }
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/styles/motion.less
git commit -m "feat: 添加 Motion Token 体系和全局动画库"
```

---

### Task 2: 全局引入 motion.less + 更新基础样式

**Files:**
- Modify: `src/styles/global.less:1-3`
- Modify: `src/styles/antd.less:1-15`
- Modify: `src/styles/var.less:18-35`

- [ ] **Step 1: 在 global.less 顶部引入 motion.less**

在 `src/styles/global.less` 第 1 行前添加：

```less
@import './motion.less';
```

- [ ] **Step 2: 更新 antd.less 中的硬编码缓动值**

将 `src/styles/antd.less` 中的硬编码值替换为 token：

```less
:root {
  :global {
    // 切换主题时避免 background-color 过渡闪烁
    .ant-input,
    .ant-input-password {
      transition: all var(--motion-duration-mid) var(--motion-ease-in-out), background-color 0s;
    }
    .ant-btn {
      transition: all var(--motion-duration-mid) var(--motion-ease-in-out), background-color 0s;
    }
    .ant-select-single:not(.ant-select-customize-input) .ant-select-selector {
      transition: all var(--motion-duration-mid) var(--motion-ease-in-out), background-color 0s;
    }
  }
}
```

- [ ] **Step 3: 更新 var.less 中 .f-icon-button 的 hover 过渡**

将 `src/styles/var.less` 的 `.f-icon-button` 添加 transition：

```less
.f-icon-button {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 32px;
  width: 32px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--color-text-quaternary);
  transition: background-color var(--motion-duration-fast) var(--motion-ease-in-out);

  &:hover {
    background-color: var(--control-item-bg-hover);
  }

  i {
    font-size: 22px;
  }
}
```

- [ ] **Step 4: 验证**

Run: `pnpm dev:hot`
确认页面正常加载，无样式错误。检查 Ant Design 组件的 hover/focus 过渡是否正常。

- [ ] **Step 5: 提交**

```bash
git add src/styles/global.less src/styles/antd.less src/styles/var.less
git commit -m "feat: 全局引入 motion.less 并统一基础样式过渡到 token"
```

---

### Task 3: Tree 导航动效统一

**Files:**
- Modify: `src/blocks/Tree/index.less:1-194`

- [ ] **Step 1: 更新 Tree 样式，将硬编码过渡替换为 motion token**

修改 `src/blocks/Tree/index.less`：

1. 在文件顶部 import 后添加 motion.less 的 import：
```less
@import '../../styles/motion.less';
```

2. 将 `.treeNode` 的 transition 替换为：
```less
.treeNode {
  // ... 其他样式保持不变
  transition: opacity var(--motion-duration-fast) var(--motion-ease-in-out),
              height var(--motion-duration-fast) var(--motion-ease-in-out),
              background-color var(--motion-duration-fast) var(--motion-ease-in-out);
}
```

3. 将 `.arrows` 的 transition 替换为：
```less
.arrows {
  // ... 其他样式保持不变
  transition: transform var(--motion-duration-mid) var(--motion-ease-in-out);
}
```

4. 将 `.hiddenTreeNode` 的 transition 替换为：
```less
.hiddenTreeNode {
  height: 0;
  opacity: 0;
  transition: opacity var(--motion-duration-mid) var(--motion-ease-in-out),
              height var(--motion-duration-fast) var(--motion-ease-in-out);

  .arrows {
    transform: rotate(0deg);
    transition: transform var(--motion-duration-mid) var(--motion-ease-in-out);
  }
}
```

- [ ] **Step 2: 验证**

Run: `pnpm dev:hot`
在 workspace 中展开/折叠 Tree 节点，确认箭头旋转和节点展开动画流畅。

- [ ] **Step 3: 提交**

```bash
git add src/blocks/Tree/index.less
git commit -m "feat: 统一 Tree 组件动效到 motion token"
```

---

### Task 4: Tabs 组件动效

**Files:**
- Modify: `src/components/Tabs/index.less:1-197`

- [ ] **Step 1: 更新 Tabs 样式**

修改 `src/components/Tabs/index.less`：

1. 顶部添加 import：
```less
@import '../../styles/motion.less';
```

2. 将 `.tabItem` 的 transition 替换为 token：
```less
.tabItem {
  // ... 其他样式保持不变
  transition: color var(--motion-duration-fast) var(--motion-ease-in-out),
              background-color var(--motion-duration-fast) var(--motion-ease-in-out);
}
```

3. 将 `.tabItem .icon` 的 transition 替换：
```less
.icon {
  // ... 其他样式保持不变
  transition: opacity var(--motion-duration-fast) var(--motion-ease-in-out);
}
```

4. 为 `.tabsContentItemActive` 添加 fade 进入动画：
```less
.tabsContentItemActive {
  display: block;
  animation: fadeIn var(--motion-duration-mid) var(--motion-ease-out);
}
```

5. 为 `.addIcon` 和 `.moreTabs` 添加 hover transition：
```less
.moreTabs {
  // ... 其他样式保持不变
  transition: color var(--motion-duration-fast) var(--motion-ease-in-out),
              background-color var(--motion-duration-fast) var(--motion-ease-in-out);
}

.addIcon {
  // ... 其他样式保持不变
  transition: color var(--motion-duration-fast) var(--motion-ease-in-out),
              background-color var(--motion-duration-fast) var(--motion-ease-in-out);
}
```

- [ ] **Step 2: 验证**

Run: `pnpm dev:hot`
切换 Tab 时内容区应有淡入效果。hover Tab 项的颜色过渡应更平滑。

- [ ] **Step 3: 提交**

```bash
git add src/components/Tabs/index.less
git commit -m "feat: 添加 Tabs 组件内容切换淡入和 hover 过渡动效"
```

---

### Task 5: 主页面导航动效

**Files:**
- Modify: `src/pages/main/index.less:1-147`

- [ ] **Step 1: 更新主页面样式**

修改 `src/pages/main/index.less`：

1. 顶部添加 import：
```less
@import '../../styles/motion.less';
```

2. 为 `.navList li` 的 transition 替换为 token：
```less
li {
  // ... 其他样式保持不变
  transition: background-color var(--motion-duration-fast) var(--motion-ease-in-out),
              color var(--motion-duration-fast) var(--motion-ease-in-out);
}
```

3. 为 `.componentBox` 添加入场动画（页面首次加载时的 fade）：
```less
.componentBox {
  position: relative;
  width: 100%;
  height: 100%;
  animation: fadeIn var(--motion-duration-slow) var(--motion-ease-out);
}
```

4. 为 `.footer` 图标添加 hover 过渡：
```less
.footer {
  // ... 其他样式保持不变
  .userBox {
    .questionIcon {
      // ... 保持不变
      transition: color var(--motion-duration-fast) var(--motion-ease-in-out);
    }
  }
  .rocketIcon {
    // ... 保持不变
    transition: color var(--motion-duration-fast) var(--motion-ease-in-out);
  }
}
```

- [ ] **Step 2: 验证**

Run: `pnpm dev:hot`
页面加载时 componentBox 应有淡入效果。导航图标 hover 应有平滑过渡。

- [ ] **Step 3: 提交**

```bash
git add src/pages/main/index.less
git commit -m "feat: 添加主页面导航和内容区入场动效"
```

---

### Task 6: 连接管理页动效

**Files:**
- Modify: `src/pages/main/connection/index.less:1-238`

- [ ] **Step 1: 更新连接页面样式**

修改 `src/pages/main/connection/index.less`：

1. 顶部添加 import：
```less
@import '../../../styles/motion.less';
```

2. 为 `.menuItem` 添加 hover 过渡：
```less
.menuItem {
  // ... 其他样式保持不变
  transition: background-color var(--motion-duration-fast) var(--motion-ease-in-out);
}
```

3. 更新 `.databaseItem` 的 hover 过渡：
```less
.databaseItem {
  // ... 其他样式保持不变
  transition: border-color var(--motion-duration-mid) var(--motion-ease-in-out),
              background-color var(--motion-duration-mid) var(--motion-ease-in-out),
              box-shadow var(--motion-duration-mid) var(--motion-ease-in-out);
}
```

4. 将 `.createConnections` 的过渡替换为 token：
```less
.createConnections {
  // ... 其他样式保持不变
  transition: transform var(--motion-duration-fast) var(--motion-ease-in-out);
}

.showCreateConnections {
  z-index: 1;
  transform: scale(1);
  transition: transform var(--motion-duration-slow) var(--motion-ease-out-circ);
}
```

- [ ] **Step 2: 验证**

Run: `pnpm dev:hot`
连接列表项 hover 应有背景色过渡。创建连接弹窗应有 scale 缩放动效。

- [ ] **Step 3: 提交**

```bash
git add src/pages/main/connection/index.less
git commit -m "feat: 添加连接管理页 hover 和面板过渡动效"
```

---

### Task 7: WorkspaceTabs 欢迎页 + 数据库卡片动效

**Files:**
- Modify: `src/pages/main/workspace/components/WorkspaceTabs/index.less:1-86`

- [ ] **Step 1: 更新 WorkspaceTabs 样式**

修改 `src/pages/main/workspace/components/WorkspaceTabs/index.less`：

1. 顶部添加 import：
```less
@import '../../../../../styles/motion.less';
```

2. 将 `.databaseTypeCard` 的 transition 替换为 token：
```less
.databaseTypeCard {
  // ... 其他样式保持不变
  transition: border-color var(--motion-duration-mid) var(--motion-ease-in-out),
              box-shadow var(--motion-duration-mid) var(--motion-ease-in-out),
              transform var(--motion-duration-mid) var(--motion-ease-out);
}
```

3. 为 `.welcomePage` 添加入场动画：
```less
.welcomePage {
  // ... 其他样式保持不变
  animation: fadeInUp var(--motion-duration-slow) var(--motion-ease-out);
}
```

4. 为 `.databaseTypeList` 中的卡片添加 stagger 效果：
```less
.databaseTypeList {
  // ... 其他样式保持不变
  .databaseTypeCard {
    animation: fadeInUp var(--motion-duration-slow) var(--motion-ease-out) both;

    &:nth-child(1) { animation-delay: 0s; }
    &:nth-child(2) { animation-delay: 0.05s; }
    &:nth-child(3) { animation-delay: 0.1s; }
    &:nth-child(4) { animation-delay: 0.15s; }
    &:nth-child(5) { animation-delay: 0.2s; }
    &:nth-child(6) { animation-delay: 0.25s; }
    &:nth-child(7) { animation-delay: 0.3s; }
    &:nth-child(8) { animation-delay: 0.35s; }
  }
}
```

- [ ] **Step 2: 验证**

Run: `pnpm dev:hot`
欢迎页加载时应有整体淡入上移效果，数据库卡片应逐个依次出现（stagger）。

- [ ] **Step 3: 提交**

```bash
git add src/pages/main/workspace/components/WorkspaceTabs/index.less
git commit -m "feat: 添加欢迎页入场和数据库卡片 stagger 动效"
```

---

### Task 8: Output 查询输出动效

**Files:**
- Modify: `src/components/Output/index.less:1-152`

- [ ] **Step 1: 更新 Output 样式**

修改 `src/components/Output/index.less`：

1. 顶部添加 import（已有 var.less，再添加）：
```less
@import '../../styles/motion.less';
```

2. 将 `.outputItem` 的 transition 替换为 token，并添加入场动画：
```less
.outputItem {
  // ... 其他样式保持不变
  transition: background-color var(--motion-duration-fast) var(--motion-ease-in-out);
  animation: fadeInUp var(--motion-duration-mid) var(--motion-ease-out);
}
```

3. 将 `.headerRight` 的 transition 替换：
```less
.headerRight {
  // ... 其他样式保持不变
  transition: opacity var(--motion-duration-fast) var(--motion-ease-in-out);
}
```

4. 将 `.actionBtn` 的 transition 替换：
```less
.actionBtn {
  // ... 其他样式保持不变
  transition: background-color var(--motion-duration-fast) var(--motion-ease-in-out),
              color var(--motion-duration-fast) var(--motion-ease-in-out);
}
```

- [ ] **Step 2: 验证**

Run: `pnpm dev:hot`
执行 SQL 后，输出面板的新结果项应有淡入上移效果。

- [ ] **Step 3: 提交**

```bash
git add src/components/Output/index.less
git commit -m "feat: 添加 Output 查询输出项入场和 hover 动效"
```

---

### Task 9: TableBox 数据表动效

**Files:**
- Modify: `src/components/SearchResult/components/TableBox/index.less:1-421`

- [ ] **Step 1: 更新 TableBox 样式**

修改 `src/components/SearchResult/components/TableBox/index.less`：

1. 顶部添加 import：
```less
@import '../../../../styles/motion.less';
```

2. 为 `.supportBaseTableBox` 中的加载遮罩添加 fadeIn：
```less
.supportBaseTableSpin {
  // ... 其他样式保持不变
  animation: fadeIn var(--motion-duration-mid) var(--motion-ease-out);
}
```

3. 为 `.searchBarBtn` 添加 hover 过渡：
```less
.searchBarBtn {
  // ... 其他样式保持不变
  transition: background-color var(--motion-duration-fast) var(--motion-ease-in-out);
}
```

4. 为行状态变化添加 transition：
```less
.tableItem {
  // ... 其他样式保持不变
  transition: background-color var(--motion-duration-fast) var(--motion-ease-in-out);
}
```

5. 为 `.button-bar-item()` mixin 添加过渡：
```less
.button-bar-item() {
  // ... 其他样式保持不变
  transition: background-color var(--motion-duration-fast) var(--motion-ease-in-out);
}
```

- [ ] **Step 2: 验证**

Run: `pnpm dev:hot`
查询结果加载遮罩应有淡入效果。行 hover 和状态切换应有平滑背景色过渡。

- [ ] **Step 3: 提交**

```bash
git add src/components/SearchResult/components/TableBox/index.less
git commit -m "feat: 添加 TableBox 数据表加载和行状态过渡动效"
```

---

### Task 10: LogViewer 日志查看器动效

**Files:**
- Modify: `src/blocks/LogViewer/index.less`

- [ ] **Step 1: 读取并更新 LogViewer 样式**

修改 `src/blocks/LogViewer/index.less`：

1. 顶部添加 import：
```less
@import '../../styles/motion.less';
```

2. 为 `.logIcon` 添加 color 过渡：
```less
.logIcon {
  transition: color var(--motion-duration-fast) var(--motion-ease-in-out);
}
```

3. 为 `.logEntry` 添加 hover 过渡和入场动画：
```less
.logEntry {
  transition: background-color var(--motion-duration-fast) var(--motion-ease-in-out);
  animation: fadeIn var(--motion-duration-fast) var(--motion-ease-out);
}
```

- [ ] **Step 2: 验证**

Run: `pnpm dev:hot`
打开日志 Drawer，日志条目应有淡入效果，hover 应有平滑背景色过渡。

- [ ] **Step 3: 提交**

```bash
git add src/blocks/LogViewer/index.less
git commit -m "feat: 添加 LogViewer 日志条目动效"
```

---

### Task 11: WorkspaceLeft 侧边栏动效

**Files:**
- Modify: `src/pages/main/workspace/components/WorkspaceLeft/index.less`

- [ ] **Step 1: 更新 WorkspaceLeft 样式**

修改 `src/pages/main/workspace/components/WorkspaceLeft/index.less`：

1. 顶部添加 import：
```less
@import '../../../../../styles/motion.less';
```

2. 为 `.saveListPanel` 添加入场动画（当 SaveList 面板显示时）：
```less
.saveListPanel {
  // ... 其他样式保持不变
  animation: fadeIn var(--motion-duration-mid) var(--motion-ease-out);
}
```

- [ ] **Step 2: 验证**

Run: `pnpm dev:hot`
点击左侧导航栏的 SaveList 图标，SaveList 面板应有淡入效果。

- [ ] **Step 3: 提交**

```bash
git add src/pages/main/workspace/components/WorkspaceLeft/index.less
git commit -m "feat: 添加 WorkspaceLeft SaveList 面板切换动效"
```

---

### Task 12: 最终验证 + 统一提交

- [ ] **Step 1: 全场景验证**

Run: `pnpm dev:hot`

逐项检查：
1. 页面加载 — componentBox 有 fadeIn
2. Tab 切换 — 内容区有 fadeIn
3. Tree 展开/收起 — 箭头旋转 + 节点折叠过渡流畅
4. 欢迎页 — 数据库卡片 stagger fadeInUp
5. Modal/Drawer — Ant Design 内置动效正常
6. 查询结果 — 加载遮罩 fadeIn，行状态过渡
7. Output — 新输出项 fadeInUp
8. 连接列表 — hover 背景色过渡
9. LogViewer — 日志条目 fadeIn + hover 过渡
10. SaveList — 面板 fadeIn

- [ ] **Step 2: 检查 prefers-reduced-motion**

在 Chrome DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce`
确认所有动画被禁用。

- [ ] **Step 3: 检查性能**

Chrome DevTools → Performance → 录制操作
确认无 layout thrashing，动画帧率稳定在 60fps。
