use serde::Serialize;
use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;

#[derive(Serialize)]
pub struct UpdateInfo {
    pub version: String,
    pub body: Option<String>,
}

/// 检查是否有新版本
#[tauri::command]
pub async fn check_update(app: AppHandle) -> Result<Option<UpdateInfo>, String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    match updater.check().await {
        Ok(Some(update)) => Ok(Some(UpdateInfo {
            version: update.version.clone(),
            body: update.body.clone(),
        })),
        Ok(None) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

/// 下载并安装更新
#[tauri::command]
pub async fn download_and_install_update(app: AppHandle) -> Result<bool, String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    let update = updater
        .check()
        .await
        .map_err(|e| e.to_string())?
        .ok_or("没有可用的更新".to_string())?;

    // 下载并安装
    let mut downloaded = 0;
    update
        .download_and_install(
            |chunk_length, content_length| {
                downloaded += chunk_length;
                log::info!(
                    "下载进度: {} / {}",
                    downloaded,
                    content_length.unwrap_or(0)
                );
            },
            || {
                log::info!("下载完成，准备安装");
            },
        )
        .await
        .map_err(|e| e.to_string())?;

    Ok(true)
}
