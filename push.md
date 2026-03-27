1. 更新版本号（3 个地方保持一致）：
- package.json → version
- src-tauri/Cargo.toml → version
- src-tauri/tauri.conf.json → version

2. 提交并打 tag：
git tag v0.1.1
git push origin main --tags