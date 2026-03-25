use crate::models::common::*;
use crate::state::AppState;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use tauri::State;

// === Console ===

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ConsoleItem {
    pub id: i64,
    pub name: String,
    pub ddl: Option<String>,
    pub data_source_id: Option<i64>,
    pub database_name: Option<String>,
    pub schema_name: Option<String>,
    pub db_type: Option<String>,
    pub status: Option<String>,
    pub operation_type: Option<String>,
    pub connectable: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConsoleCreateRequest {
    pub name: String,
    pub ddl: Option<String>,
    pub data_source_id: Option<i64>,
    pub database_name: Option<String>,
    pub schema_name: Option<String>,
    pub db_type: Option<String>,
    pub status: Option<String>,
    pub operation_type: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConsoleUpdateRequest {
    pub id: i64,
    pub name: Option<String>,
    pub ddl: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConsoleListParams {
    pub data_source_id: Option<i64>,
    pub database_name: Option<String>,
    pub page_no: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    #[serde(default)]
    pub order_by_desc: bool,
}

/// 创建 console
#[tauri::command]
pub async fn console_create(
    state: State<'_, AppState>,
    params: ConsoleCreateRequest,
) -> Result<ApiResponse<i64>, String> {
    let result = sqlx::query(
        "INSERT INTO console (name, ddl, data_source_id, database_name, schema_name, db_type, status, operation_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&params.name)
    .bind(&params.ddl)
    .bind(params.data_source_id)
    .bind(&params.database_name)
    .bind(&params.schema_name)
    .bind(params.db_type.as_deref().unwrap_or("MYSQL"))
    .bind(params.status.as_deref().unwrap_or("DRAFT"))
    .bind(params.operation_type.as_deref().unwrap_or("CONSOLE"))
    .execute(&state.local_db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(ApiResponse::ok(result.last_insert_rowid()))
}

/// 更新 console
#[tauri::command]
pub async fn console_update(
    state: State<'_, AppState>,
    params: ConsoleUpdateRequest,
) -> Result<ApiResponse<i64>, String> {
    let mut set_parts = Vec::new();
    if params.name.is_some() {
        set_parts.push("name = ?".to_string());
    }
    if params.ddl.is_some() {
        set_parts.push("ddl = ?".to_string());
    }
    if params.status.is_some() {
        set_parts.push("status = ?".to_string());
    }
    set_parts.push("updated_at = CURRENT_TIMESTAMP".to_string());

    let sql = format!("UPDATE console SET {} WHERE id = ?", set_parts.join(", "));
    let mut query = sqlx::query(&sql);

    if let Some(ref name) = params.name {
        query = query.bind(name);
    }
    if let Some(ref ddl) = params.ddl {
        query = query.bind(ddl);
    }
    if let Some(ref status) = params.status {
        query = query.bind(status);
    }
    query = query.bind(params.id);

    query
        .execute(&state.local_db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(ApiResponse::ok(params.id))
}

/// 获取 console 列表
#[tauri::command]
pub async fn console_list(
    state: State<'_, AppState>,
    params: ConsoleListParams,
) -> Result<ApiResponse<PageResponse<ConsoleItem>>, String> {
    let page_no = params.page_no.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(100);
    let offset = (page_no - 1) * page_size;

    let mut where_parts = Vec::new();
    if let Some(ds_id) = params.data_source_id {
        where_parts.push(format!("data_source_id = {}", ds_id));
    }
    if let Some(ref db) = params.database_name {
        where_parts.push(format!("database_name = '{}'", db.replace('\'', "''")));
    }
    if let Some(ref status) = params.status {
        where_parts.push(format!("status = '{}'", status.replace('\'', "''")));
    }

    let where_clause = if where_parts.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", where_parts.join(" AND "))
    };

    let order = if params.order_by_desc {
        "DESC"
    } else {
        "ASC"
    };

    let count_sql = format!("SELECT COUNT(*) FROM console {}", where_clause);
    let total: i64 = sqlx::query_scalar(&count_sql)
        .fetch_one(&state.local_db)
        .await
        .unwrap_or(0);

    let sql = format!(
        "SELECT * FROM console {} ORDER BY id {} LIMIT {} OFFSET {}",
        where_clause, order, page_size, offset
    );

    let rows = sqlx::query(&sql)
        .fetch_all(&state.local_db)
        .await
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for row in rows {
        items.push(ConsoleItem {
            id: row.try_get("id").unwrap_or(0),
            name: row.try_get("name").unwrap_or_default(),
            ddl: row.try_get("ddl").ok(),
            data_source_id: row.try_get("data_source_id").ok(),
            database_name: row.try_get("database_name").ok(),
            schema_name: row.try_get("schema_name").ok(),
            db_type: row.try_get("db_type").ok(),
            status: row.try_get("status").ok(),
            operation_type: row.try_get("operation_type").ok(),
            connectable: true,
        });
    }

    Ok(ApiResponse::ok(PageResponse {
        data: items,
        page_no,
        page_size,
        total,
        has_next_page: offset + page_size < total,
    }))
}

/// 删除 console
#[tauri::command]
pub async fn console_delete(
    state: State<'_, AppState>,
    id: i64,
) -> Result<ApiResponse<()>, String> {
    sqlx::query("DELETE FROM console WHERE id = ?")
        .bind(id)
        .execute(&state.local_db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(ApiResponse::ok(()))
}

// === 历史记录 ===

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryRecord {
    pub id: i64,
    pub name: Option<String>,
    pub ddl: Option<String>,
    pub data_source_id: Option<i64>,
    pub database_name: Option<String>,
    pub db_type: Option<String>,
    pub status: Option<String>,
    pub operation_rows: Option<i64>,
    pub use_time: Option<i64>,
    pub gmt_create: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryCreateRequest {
    pub name: Option<String>,
    pub ddl: Option<String>,
    pub data_source_id: Option<i64>,
    pub database_name: Option<String>,
    pub db_type: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryListParams {
    pub data_source_id: Option<i64>,
    pub database_name: Option<String>,
    pub page_no: Option<i64>,
    pub page_size: Option<i64>,
    pub search_key: Option<String>,
}

/// 创建历史记录
#[tauri::command]
pub async fn history_create(
    state: State<'_, AppState>,
    params: HistoryCreateRequest,
) -> Result<ApiResponse<()>, String> {
    sqlx::query(
        "INSERT INTO operation_log (name, ddl, data_source_id, database_name, db_type) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&params.name)
    .bind(&params.ddl)
    .bind(params.data_source_id)
    .bind(&params.database_name)
    .bind(params.db_type.as_deref().unwrap_or("MYSQL"))
    .execute(&state.local_db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(ApiResponse::ok(()))
}

/// 获取历史记录列表
#[tauri::command]
pub async fn history_list(
    state: State<'_, AppState>,
    params: HistoryListParams,
) -> Result<ApiResponse<PageResponse<HistoryRecord>>, String> {
    let page_no = params.page_no.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(100);
    let offset = (page_no - 1) * page_size;

    let mut where_parts = Vec::new();
    if let Some(ds_id) = params.data_source_id {
        where_parts.push(format!("data_source_id = {}", ds_id));
    }
    if let Some(ref db) = params.database_name {
        where_parts.push(format!("database_name = '{}'", db.replace('\'', "''")));
    }
    if let Some(ref key) = params.search_key {
        if !key.is_empty() {
            where_parts.push(format!(
                "(name LIKE '%{}%' OR ddl LIKE '%{}%')",
                key.replace('\'', "''"),
                key.replace('\'', "''")
            ));
        }
    }

    let where_clause = if where_parts.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", where_parts.join(" AND "))
    };

    let count_sql = format!("SELECT COUNT(*) FROM operation_log {}", where_clause);
    let total: i64 = sqlx::query_scalar(&count_sql)
        .fetch_one(&state.local_db)
        .await
        .unwrap_or(0);

    let sql = format!(
        "SELECT * FROM operation_log {} ORDER BY id DESC LIMIT {} OFFSET {}",
        where_clause, page_size, offset
    );

    let rows = sqlx::query(&sql)
        .fetch_all(&state.local_db)
        .await
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for row in rows {
        items.push(HistoryRecord {
            id: row.try_get("id").unwrap_or(0),
            name: row.try_get("name").ok(),
            ddl: row.try_get("ddl").ok(),
            data_source_id: row.try_get("data_source_id").ok(),
            database_name: row.try_get("database_name").ok(),
            db_type: row.try_get("db_type").ok(),
            status: row.try_get("status").ok(),
            operation_rows: row.try_get("operation_rows").ok(),
            use_time: row.try_get("use_time").ok(),
            gmt_create: row.try_get("created_at").ok(),
        });
    }

    Ok(ApiResponse::ok(PageResponse {
        data: items,
        page_no,
        page_size,
        total,
        has_next_page: offset + page_size < total,
    }))
}
