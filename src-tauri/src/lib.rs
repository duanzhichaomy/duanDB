mod commands;
mod db;
mod models;
mod mysql;
mod state;

use state::AppState;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::menu::{MenuBuilder, SubmenuBuilder};
use tauri::Manager;
use tokio::sync::RwLock;

#[cfg(target_os = "macos")]
fn show_or_create_main_window(app_handle: &tauri::AppHandle) {
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
        return;
    }

    if let Some(window) = app_handle.webview_windows().into_values().next() {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
        return;
    }

    if let Some(window_config) = app_handle.config().app.windows.first() {
        if let Ok(window) = tauri::WebviewWindowBuilder::from_config(app_handle, window_config)
            .and_then(|builder| builder.build())
        {
            let _ = window.show();
            let _ = window.unminimize();
            let _ = window.set_focus();
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // 自定义菜单，移除 Cmd+W 的默认关闭窗口行为
            #[cfg(target_os = "macos")]
            {
                let app_submenu = SubmenuBuilder::new(app, "DuanDB")
                    .about(None)
                    .separator()
                    .hide()
                    .hide_others()
                    .show_all()
                    .separator()
                    .quit()
                    .build()?;

                let edit_submenu = SubmenuBuilder::new(app, "Edit")
                    .undo()
                    .redo()
                    .separator()
                    .cut()
                    .copy()
                    .paste()
                    .select_all()
                    .build()?;

                let window_submenu = SubmenuBuilder::new(app, "Window").minimize().build()?;

                let menu = MenuBuilder::new(app)
                    .item(&app_submenu)
                    .item(&edit_submenu)
                    .item(&window_submenu)
                    .build()?;

                app.set_menu(menu)?;
            }

            // 初始化本地 SQLite
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to get app data dir");

            let handle = app.handle().clone();
            tauri::async_runtime::block_on(async {
                let local_db = db::local::init_local_db(app_data_dir)
                    .await
                    .expect("failed to init local db");

                let app_state = AppState {
                    local_db,
                    mysql_pools: Arc::new(RwLock::new(HashMap::new())),
                };

                handle.manage(app_state);
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // 连接管理
            commands::connection::connection_list,
            commands::connection::connection_get,
            commands::connection::connection_create,
            commands::connection::connection_update,
            commands::connection::connection_delete,
            commands::connection::connection_test,
            commands::connection::connection_close,
            // 数据库
            commands::database::database_list,
            commands::database::database_schema_list,
            commands::database::database_create_sql,
            commands::database::schema_list,
            // SQL 执行
            commands::sql::sql_execute,
            commands::sql::sql_execute_table,
            commands::sql::sql_execute_ddl,
            commands::sql::sql_execute_update,
            commands::sql::sql_count,
            commands::sql::sql_format,
            commands::sql::sql_get_update_sql,
            // 表操作
            commands::table::table_list,
            commands::table::table_name_list,
            commands::table::table_detail,
            commands::table::table_column_list,
            commands::table::table_meta,
            commands::table::table_modify_sql,
            commands::table::ddl_column_list,
            commands::table::ddl_key_list,
            commands::table::ddl_index_list,
            commands::table::ddl_export,
            commands::table::ddl_create_example,
            commands::table::ddl_update_example,
            commands::table::ddl_execute,
            commands::table::ddl_delete,
            // 元数据
            commands::metadata::view_list,
            commands::metadata::view_detail,
            commands::metadata::view_column_list,
            commands::metadata::function_list,
            commands::metadata::function_detail,
            commands::metadata::procedure_list,
            commands::metadata::procedure_detail,
            commands::metadata::trigger_list,
            commands::metadata::trigger_detail,
            // Console / 历史
            commands::console::console_create,
            commands::console::console_update,
            commands::console::console_list,
            commands::console::console_delete,
            commands::console::history_create,
            commands::console::history_list,
            commands::console::history_clear,
            // 更新
            commands::updater::check_update,
            commands::updater::download_and_install_update,
            // 文件导出
            commands::export::save_file_bytes,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        #[cfg(target_os = "macos")]
        match event {
            tauri::RunEvent::Ready => {
                show_or_create_main_window(app_handle);
            }
            tauri::RunEvent::Reopen {
                has_visible_windows,
                ..
            } => {
                if !has_visible_windows {
                    show_or_create_main_window(app_handle);
                }
            }
            _ => {}
        }
    });
}
