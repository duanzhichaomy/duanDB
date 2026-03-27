1. 更新版本号（3 个地方保持一致）：
- package.json → version
- src-tauri/Cargo.toml → version
- src-tauri/tauri.conf.json → version

2. 提交并打 tag：
git add -A && git commit -m "release: v0.2.0"
git tag v0.2.0
git push origin main --tags