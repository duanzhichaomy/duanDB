use crate::commands::helpers::*;
use crate::models::common::*;
use crate::models::metadata::*;
use crate::mysql::{builder, metadata as mysql_meta};
use crate::state::AppState;
use tauri::State;

/// 获取数据库列表
#[tauri::command]
pub async fn database_list(
    state: State<'_, AppState>,
    data_source_id: i64,
    _refresh: Option<bool>,
) -> Result<ApiResponse<Vec<DatabaseInfo>>, String> {
    let pool = get_mysql_pool(&state, data_source_id).await?;
    let databases = mysql_meta::get_databases(&pool).await?;
    Ok(ApiResponse::ok(databases))
}

/// 获取数据库和 Schema 列表
#[tauri::command]
pub async fn database_schema_list(
    state: State<'_, AppState>,
    data_source_id: i64,
) -> Result<ApiResponse<MetaSchemaVO>, String> {
    let pool = get_mysql_pool(&state, data_source_id).await?;
    let databases = mysql_meta::get_databases(&pool).await?;

    let items: Vec<DatabaseSchemaItem> = databases
        .into_iter()
        .map(|db| DatabaseSchemaItem {
            name: db.name,
            schemas: vec![],
        })
        .collect();

    Ok(ApiResponse::ok(MetaSchemaVO { databases: items }))
}

/// 获取 Schema 列表（MySQL 不使用 schema，返回空列表）
#[tauri::command]
pub async fn schema_list(
    _state: State<'_, AppState>,
    _data_source_id: i64,
    _database_name: Option<String>,
    _refresh: Option<bool>,
) -> Result<ApiResponse<Vec<SchemaInfo>>, String> {
    Ok(ApiResponse::ok(vec![]))
}

/// 生成创建数据库 SQL
#[tauri::command]
pub async fn database_create_sql(
    _state: State<'_, AppState>,
    _data_source_id: i64,
    database_name: String,
) -> Result<ApiResponse<SqlResult>, String> {
    let sql = builder::build_create_database_sql(&database_name);
    Ok(ApiResponse::ok(SqlResult { sql }))
}

#[derive(serde::Serialize)]
pub struct SqlResult {
    pub sql: String,
}
