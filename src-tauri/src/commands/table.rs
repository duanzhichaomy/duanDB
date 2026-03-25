use crate::commands::helpers::*;
use crate::models::common::*;
use crate::models::metadata::*;
use crate::mysql::{builder, metadata as mysql_meta, types};
use crate::state::AppState;
use tauri::State;

/// 表列表（分页）
#[tauri::command]
pub async fn table_list(
    state: State<'_, AppState>,
    params: TableListParams,
) -> Result<ApiResponse<PageResponse<TableInfo>>, String> {
    let pool = get_mysql_pool(&state, params.data_source_id).await?;
    let db = params.database_name.as_deref().unwrap_or("");
    let tables = mysql_meta::get_tables(&pool, db, params.search_key.as_deref()).await?;

    let total = tables.len() as i64;
    let page_no = params.page_no.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(100);
    let offset = ((page_no - 1) * page_size) as usize;
    let paged: Vec<TableInfo> = tables.into_iter().skip(offset).take(page_size as usize).collect();
    let has_next_page = (offset + page_size as usize) < total as usize;

    Ok(ApiResponse::ok(PageResponse {
        data: paged,
        page_no,
        page_size,
        total,
        has_next_page,
    }))
}

/// 表名列表（简单）
#[tauri::command]
pub async fn table_name_list(
    state: State<'_, AppState>,
    data_source_id: i64,
    database_name: Option<String>,
    _schema_name: Option<String>,
) -> Result<ApiResponse<Vec<TableNameItem>>, String> {
    let pool = get_mysql_pool(&state, data_source_id).await?;
    let db = database_name.as_deref().unwrap_or("");
    let names = mysql_meta::get_table_names(&pool, db).await?;
    Ok(ApiResponse::ok(names))
}

/// 表详情（列 + 索引 + 表信息）
#[tauri::command]
pub async fn table_detail(
    state: State<'_, AppState>,
    data_source_id: i64,
    database_name: String,
    _schema_name: Option<String>,
    table_name: String,
    _refresh: Option<bool>,
) -> Result<ApiResponse<EditTableInfo>, String> {
    let pool = get_mysql_pool(&state, data_source_id).await?;
    let columns = mysql_meta::get_columns(&pool, &database_name, &table_name).await?;
    let indexes = mysql_meta::get_indexes(&pool, &database_name, &table_name).await?;
    let (engine, collation, auto_inc, comment) =
        mysql_meta::get_table_detail_info(&pool, &database_name, &table_name).await?;

    // 从 collation 提取 charset
    let charset = collation.as_ref().and_then(|c| {
        c.split('_').next().map(|s| s.to_string())
    });

    Ok(ApiResponse::ok(EditTableInfo {
        name: table_name,
        comment,
        charset,
        engine,
        increment_value: auto_inc,
        column_list: columns,
        index_list: indexes,
    }))
}

/// 获取表列列表
#[tauri::command]
pub async fn table_column_list(
    state: State<'_, AppState>,
    data_source_id: i64,
    database_name: Option<String>,
    _schema_name: Option<String>,
    table_name: String,
) -> Result<ApiResponse<Vec<ColumnNameItem>>, String> {
    let pool = get_mysql_pool(&state, data_source_id).await?;
    let db = database_name.as_deref().unwrap_or("");
    let columns = mysql_meta::get_columns(&pool, db, &table_name).await?;
    let items: Vec<ColumnNameItem> = columns
        .into_iter()
        .map(|c| ColumnNameItem {
            name: c.name.unwrap_or_default(),
            table_name: c.table_name.unwrap_or_default(),
        })
        .collect();
    Ok(ApiResponse::ok(items))
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ColumnNameItem {
    pub name: String,
    pub table_name: String,
}

/// 获取表元信息（支持的数据类型、字符集等）
#[tauri::command]
pub async fn table_meta(
    state: State<'_, AppState>,
    data_source_id: i64,
    _database_name: Option<String>,
) -> Result<ApiResponse<DatabaseSupportField>, String> {
    let pool = get_mysql_pool(&state, data_source_id).await?;
    let charsets = mysql_meta::get_charsets(&pool).await?;
    let collations = mysql_meta::get_collations(&pool).await?;

    Ok(ApiResponse::ok(DatabaseSupportField {
        column_types: types::get_mysql_column_types(),
        charsets,
        collations,
        index_types: types::get_mysql_index_types(),
        default_values: types::get_mysql_default_values(),
    }))
}

/// 生成修改表 SQL
#[tauri::command]
pub async fn table_modify_sql(
    _state: State<'_, AppState>,
    params: ModifyTableSqlRequest,
) -> Result<ApiResponse<Vec<SqlItem>>, String> {
    let database = params.database_name.as_deref().unwrap_or("");
    let sqls = builder::build_modify_table_sql(database, &params.old_table, &params.new_table);
    let items: Vec<SqlItem> = sqls.into_iter().map(|sql| SqlItem { sql }).collect();
    Ok(ApiResponse::ok(items))
}

#[derive(serde::Serialize)]
pub struct SqlItem {
    pub sql: String,
}

/// DDL 列列表
#[tauri::command]
pub async fn ddl_column_list(
    state: State<'_, AppState>,
    params: TableQueryParams,
) -> Result<ApiResponse<Vec<ColumnInfo>>, String> {
    let pool = get_mysql_pool(&state, params.data_source_id).await?;
    let db = params.database_name.as_deref().unwrap_or("");
    let table = params.table_name.as_deref().unwrap_or("");
    let columns = mysql_meta::get_columns(&pool, db, table).await?;
    Ok(ApiResponse::ok(columns))
}

/// DDL 索引列表
#[tauri::command]
pub async fn ddl_index_list(
    state: State<'_, AppState>,
    params: TableQueryParams,
) -> Result<ApiResponse<Vec<IndexInfo>>, String> {
    let pool = get_mysql_pool(&state, params.data_source_id).await?;
    let db = params.database_name.as_deref().unwrap_or("");
    let table = params.table_name.as_deref().unwrap_or("");
    let indexes = mysql_meta::get_indexes(&pool, db, table).await?;
    Ok(ApiResponse::ok(indexes))
}

/// 导出表 DDL
#[tauri::command]
pub async fn ddl_export(
    state: State<'_, AppState>,
    params: TableQueryParams,
) -> Result<ApiResponse<String>, String> {
    let pool = get_mysql_pool(&state, params.data_source_id).await?;
    let db = params.database_name.as_deref().unwrap_or("");
    let table = params.table_name.as_deref().unwrap_or("");
    let ddl = mysql_meta::get_table_ddl(&pool, db, table).await?;
    Ok(ApiResponse::ok(ddl))
}

/// CREATE TABLE 示例
#[tauri::command]
pub async fn ddl_create_example(
    _db_type: Option<String>,
) -> Result<ApiResponse<String>, String> {
    Ok(ApiResponse::ok(builder::build_create_table_example()))
}

/// ALTER TABLE 示例
#[tauri::command]
pub async fn ddl_update_example(
    _db_type: Option<String>,
) -> Result<ApiResponse<String>, String> {
    Ok(ApiResponse::ok(builder::build_update_table_example()))
}

/// 执行 DDL（建表等）
#[tauri::command]
pub async fn ddl_execute(
    state: State<'_, AppState>,
    params: DdlExecuteParams,
) -> Result<ApiResponse<String>, String> {
    let pool = get_mysql_pool(&state, params.data_source_id).await?;

    if let Some(ref db) = params.database_name {
        if !db.is_empty() {
            let use_sql = format!("USE `{}`", db.replace('`', "``"));
            sqlx::query(&use_sql).execute(&pool).await.ok();
        }
    }

    sqlx::query(&params.sql)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(ApiResponse::ok("执行成功".to_string()))
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DdlExecuteParams {
    pub data_source_id: i64,
    pub database_name: Option<String>,
    pub schema_name: Option<String>,
    pub sql: String,
}

/// 删除表
#[tauri::command]
pub async fn ddl_delete(
    state: State<'_, AppState>,
    params: TableQueryParams,
) -> Result<ApiResponse<()>, String> {
    let pool = get_mysql_pool(&state, params.data_source_id).await?;
    let db = params.database_name.as_deref().unwrap_or("");
    let table = params.table_name.as_deref().unwrap_or("");
    let sql = format!(
        "DROP TABLE `{}`.`{}`",
        db.replace('`', "``"),
        table.replace('`', "``")
    );
    sqlx::query(&sql)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(ApiResponse::ok(()))
}
