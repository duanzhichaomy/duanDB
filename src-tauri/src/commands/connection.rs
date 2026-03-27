use crate::db::pool;
use crate::models::common::*;
use crate::models::connection::*;
use crate::state::AppState;
use sqlx::Row;
use tauri::State;

/// 获取连接列表
#[tauri::command]
pub async fn connection_list(
    state: State<'_, AppState>,
    params: Option<PageParams>,
) -> Result<ApiResponse<PageResponse<ConnectionListItem>>, String> {
    let params = params.unwrap_or(PageParams {
        page_no: 1,
        page_size: 100,
        search_key: None,
    });
    let offset = (params.page_no - 1) * params.page_size;

    let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM data_source")
        .fetch_one(&state.local_db)
        .await
        .unwrap_or(0);

    let rows = sqlx::query(
        "SELECT id, alias, url, host, port, user, db_type, database_name FROM data_source ORDER BY id DESC LIMIT ? OFFSET ?",
    )
    .bind(params.page_size)
    .bind(offset)
    .fetch_all(&state.local_db)
    .await
    .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for row in rows {
        items.push(ConnectionListItem {
            id: row.try_get("id").unwrap_or(0),
            alias: row.try_get("alias").unwrap_or_default(),
            db_type: row.try_get("db_type").unwrap_or("MYSQL".into()),
            host: row.try_get("host").ok(),
            port: row.try_get("port").ok(),
            user: row.try_get("user").ok(),
            url: row.try_get("url").ok(),
            database_name: row.try_get("database_name").ok(),
            support_database: true,
            support_schema: false,
            environment: ConnectionEnv::default(),
        });
    }

    Ok(ApiResponse::ok(PageResponse {
        data: items,
        page_no: params.page_no,
        page_size: params.page_size,
        total,
        has_next_page: offset + params.page_size < total,
    }))
}

/// 获取连接详情
#[tauri::command]
pub async fn connection_get(
    state: State<'_, AppState>,
    id: i64,
) -> Result<ApiResponse<ConnectionDetails>, String> {
    let row = sqlx::query("SELECT * FROM data_source WHERE id = ?")
        .bind(id)
        .fetch_optional(&state.local_db)
        .await
        .map_err(|e| e.to_string())?;

    match row {
        Some(row) => {
            let extend_info_str: String = row.try_get("extend_info").unwrap_or("[]".into());
            let extend_info: Vec<ExtendInfoItem> =
                serde_json::from_str(&extend_info_str).unwrap_or_default();

            Ok(ApiResponse::ok(ConnectionDetails {
                id: row.try_get("id").unwrap_or(0),
                alias: row.try_get("alias").unwrap_or_default(),
                db_type: row.try_get("db_type").unwrap_or("MYSQL".into()),
                host: row.try_get("host").ok(),
                port: row.try_get("port").ok(),
                url: row.try_get("url").ok(),
                user: row.try_get("user").ok(),
                password: row.try_get("password").ok(),
                database_name: row.try_get("database_name").ok(),
                environment: ConnectionEnv::default(),
                environment_id: Some(1),
                extend_info,
            }))
        }
        None => Ok(ApiResponse::err("连接不存在")),
    }
}

/// 创建连接
#[tauri::command]
pub async fn connection_create(
    state: State<'_, AppState>,
    params: ConnectionCreateRequest,
) -> Result<ApiResponse<i64>, String> {
    let url = build_url_from_params(
        params.host.as_deref(),
        params.port,
        params.user.as_deref(),
        params.password.as_deref(),
        params.url.as_deref(),
    );
    let extend_info_str = serde_json::to_string(&params.extend_info).unwrap_or("[]".into());

    let result = sqlx::query(
        "INSERT INTO data_source (alias, url, host, port, user, password, db_type, database_name, extend_info) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&params.alias)
    .bind(&url)
    .bind(&params.host)
    .bind(params.port.unwrap_or(3306))
    .bind(&params.user)
    .bind(&params.password)
    .bind(params.db_type.as_deref().unwrap_or("MYSQL"))
    .bind(&params.database_name)
    .bind(&extend_info_str)
    .execute(&state.local_db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(ApiResponse::ok(result.last_insert_rowid()))
}

/// 更新连接
#[tauri::command]
pub async fn connection_update(
    state: State<'_, AppState>,
    params: ConnectionUpdateRequest,
) -> Result<ApiResponse<()>, String> {
    let url = build_url_from_params(
        params.host.as_deref(),
        params.port,
        params.user.as_deref(),
        params.password.as_deref(),
        params.url.as_deref(),
    );
    let extend_info_str = serde_json::to_string(&params.extend_info).unwrap_or("[]".into());

    sqlx::query(
        "UPDATE data_source SET alias=?, url=?, host=?, port=?, user=?, password=?, db_type=?, database_name=?, extend_info=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
    )
    .bind(&params.alias)
    .bind(&url)
    .bind(&params.host)
    .bind(params.port.unwrap_or(3306))
    .bind(&params.user)
    .bind(&params.password)
    .bind(params.db_type.as_deref().unwrap_or("MYSQL"))
    .bind(&params.database_name)
    .bind(&extend_info_str)
    .bind(params.id)
    .execute(&state.local_db)
    .await
    .map_err(|e| e.to_string())?;

    // 关闭旧连接池
    pool::close_pools_by_prefix(&state.mysql_pools, params.id).await;

    Ok(ApiResponse::ok(()))
}

/// 删除连接
#[tauri::command]
pub async fn connection_delete(
    state: State<'_, AppState>,
    id: i64,
) -> Result<ApiResponse<()>, String> {
    pool::close_pools_by_prefix(&state.mysql_pools, id).await;

    sqlx::query("DELETE FROM data_source WHERE id = ?")
        .bind(id)
        .execute(&state.local_db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(ApiResponse::ok(()))
}

/// 测试连接
#[tauri::command]
pub async fn connection_test(
    params: ConnectionTestRequest,
) -> Result<ApiResponse<bool>, String> {
    let url = build_url_from_params(
        params.host.as_deref(),
        params.port,
        params.user.as_deref(),
        params.password.as_deref(),
        params.url.as_deref(),
    );

    match pool::test_connection(&url).await {
        Ok(()) => Ok(ApiResponse::ok(true)),
        Err(e) => Ok(ApiResponse::err(e)),
    }
}

/// 关闭连接
#[tauri::command]
pub async fn connection_close(
    state: State<'_, AppState>,
    id: i64,
) -> Result<ApiResponse<()>, String> {
    pool::close_pools_by_prefix(&state.mysql_pools, id).await;
    Ok(ApiResponse::ok(()))
}

/// 从参数构建 MySQL URL
fn build_url_from_params(
    host: Option<&str>,
    port: Option<i64>,
    user: Option<&str>,
    password: Option<&str>,
    url: Option<&str>,
) -> String {
    // 如果直接提供了 url，使用它
    if let Some(u) = url {
        if !u.is_empty() {
            return u.to_string();
        }
    }
    pool::build_mysql_url(
        host.unwrap_or("localhost"),
        port.unwrap_or(3306),
        user.unwrap_or("root"),
        password.unwrap_or(""),
        None,
    )
}
