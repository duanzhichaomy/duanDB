use crate::models::common::ApiResponse;
use std::fs;
use std::path::Path;

/// 将字节数组写入指定路径（用于导出 CSV / SQL / XLSX 等文件）
///
/// 前端通过 `@tauri-apps/plugin-dialog` 的 `save()` 让用户选择保存路径，
/// 再调用本命令把文件内容写到该路径。
#[tauri::command]
pub async fn save_file_bytes(
    path: String,
    bytes: Vec<u8>,
) -> Result<ApiResponse<String>, String> {
    let p = Path::new(&path);
    if let Some(parent) = p.parent() {
        if !parent.as_os_str().is_empty() && !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }
    fs::write(p, &bytes).map_err(|e| e.to_string())?;
    Ok(ApiResponse::ok(path))
}
