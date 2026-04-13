# 发布流程

目前版本号：0.5.2

## 步骤

### 1. 确保所有代码已提交

发布前检查工作区是否干净：

```bash
git status
```

如有未提交的改动，先提交：

```bash
git add <files>
git commit -m "feat/fix: 描述"
```

### 2. 更新版本号

以下 3 个文件的版本号必须保持一致：

| 文件 | 字段 |
|------|------|
| `package.json` | `version` |
| `src-tauri/Cargo.toml` | `version` |
| `src-tauri/tauri.conf.json` | `version` |

> 前端 `__APP_VERSION__` 会自动从 `package.json` 读取，无需额外修改。

### 3. 提交版本号变更

```bash
git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json push.md
git commit -m "chore: bump version to vX.X.X"
```

### 4. 打 tag 并推送

```bash
git tag vX.X.X
git push origin main --tags
```

### 5. 等待构建完成

推送 `v*` tag 后，GitHub Actions（`.github/workflows/release.yml`）会自动触发：
- 构建 macOS（aarch64 + x86_64）和 Windows 安装包
- 发布到 GitHub Release

在 GitHub 仓库的 Actions 页面可查看构建进度。

### 6. 验证发布

- 从 GitHub Release 下载安装包
- 安装后检查"设置 → 关于我们"中的版本号是否正确
- 验证新功能是否正常工作
- xattr -cr /Applications/DuanDB.app