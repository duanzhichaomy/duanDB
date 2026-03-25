use crate::commands::helpers::*;
use crate::models::common::*;
use crate::models::metadata::*;
use crate::mysql::metadata as mysql_meta;
use crate::state::AppState;
use tauri::State;

/// 视图列表
#[tauri::command]
pub async fn view_list(
    state: State<'_, AppState>,
    params: TableListParams,
) -> Result<ApiResponse<PageResponse<RoutineInfo>>, String> {
    let pool = get_mysql_pool(&state, params.data_source_id).await?;
    let db = params.database_name.as_deref().unwrap_or("");
    let views = mysql_meta::get_views(&pool, db, params.search_key.as_deref()).await?;
    let total = views.len() as i64;
    Ok(ApiResponse::ok(PageResponse {
        data: views,
        page_no: params.page_no.unwrap_or(1),
        page_size: params.page_size.unwrap_or(100),
        total,
        has_next_page: false,
    }))
}

/// 视图详情（DDL）
#[tauri::command]
pub async fn view_detail(
    state: State<'_, AppState>,
    data_source_id: i64,
    database_name: String,
    _schema_name: Option<String>,
    table_name: String,
) -> Result<ApiResponse<ViewDetail>, String> {
    let pool = get_mysql_pool(&state, data_source_id).await?;
    let ddl = mysql_meta::get_view_ddl(&pool, &database_name, &table_name).await?;
    Ok(ApiResponse::ok(ViewDetail { ddl }))
}

#[derive(serde::Serialize)]
pub struct ViewDetail {
    pub ddl: String,
}

/// 视图列列表
#[tauri::command]
pub async fn view_column_list(
    state: State<'_, AppState>,
    data_source_id: i64,
    database_name: String,
    _schema_name: Option<String>,
    table_name: String,
) -> Result<ApiResponse<Vec<ColumnInfo>>, String> {
    let pool = get_mysql_pool(&state, data_source_id).await?;
    let columns = mysql_meta::get_columns(&pool, &database_name, &table_name).await?;
    Ok(ApiResponse::ok(columns))
}

/// 函数列表
#[tauri::command]
pub async fn function_list(
    state: State<'_, AppState>,
    params: TableListParams,
) -> Result<ApiResponse<PageResponse<RoutineInfo>>, String> {
    let pool = get_mysql_pool(&state, params.data_source_id).await?;
    let db = params.database_name.as_deref().unwrap_or("");
    let funcs = mysql_meta::get_functions(&pool, db, params.search_key.as_deref()).await?;
    let total = funcs.len() as i64;
    Ok(ApiResponse::ok(PageResponse {
        data: funcs,
        page_no: params.page_no.unwrap_or(1),
        page_size: params.page_size.unwrap_or(100),
        total,
        has_next_page: false,
    }))
}

/// 函数详情
#[tauri::command]
pub async fn function_detail(
    state: State<'_, AppState>,
    data_source_id: i64,
    database_name: String,
    _schema_name: Option<String>,
    function_name: String,
) -> Result<ApiResponse<FunctionDetail>, String> {
    let pool = get_mysql_pool(&state, data_source_id).await?;
    let body =
        mysql_meta::get_function_detail(&pool, &database_name, &function_name).await?;
    Ok(ApiResponse::ok(FunctionDetail {
        function_body: body,
    }))
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FunctionDetail {
    pub function_body: String,
}

/// 存储过程列表
#[tauri::command]
pub async fn procedure_list(
    state: State<'_, AppState>,
    params: TableListParams,
) -> Result<ApiResponse<PageResponse<RoutineInfo>>, String> {
    let pool = get_mysql_pool(&state, params.data_source_id).await?;
    let db = params.database_name.as_deref().unwrap_or("");
    let procs = mysql_meta::get_procedures(&pool, db, params.search_key.as_deref()).await?;
    let total = procs.len() as i64;
    Ok(ApiResponse::ok(PageResponse {
        data: procs,
        page_no: params.page_no.unwrap_or(1),
        page_size: params.page_size.unwrap_or(100),
        total,
        has_next_page: false,
    }))
}

/// 存储过程详情
#[tauri::command]
pub async fn procedure_detail(
    state: State<'_, AppState>,
    data_source_id: i64,
    database_name: String,
    _schema_name: Option<String>,
    procedure_name: String,
) -> Result<ApiResponse<ProcedureDetail>, String> {
    let pool = get_mysql_pool(&state, data_source_id).await?;
    let body =
        mysql_meta::get_procedure_detail(&pool, &database_name, &procedure_name).await?;
    Ok(ApiResponse::ok(ProcedureDetail {
        procedure_body: body,
    }))
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcedureDetail {
    pub procedure_body: String,
}

/// 触发器列表
#[tauri::command]
pub async fn trigger_list(
    state: State<'_, AppState>,
    params: TableListParams,
) -> Result<ApiResponse<PageResponse<RoutineInfo>>, String> {
    let pool = get_mysql_pool(&state, params.data_source_id).await?;
    let db = params.database_name.as_deref().unwrap_or("");
    let triggers = mysql_meta::get_triggers(&pool, db, params.search_key.as_deref()).await?;
    let total = triggers.len() as i64;
    Ok(ApiResponse::ok(PageResponse {
        data: triggers,
        page_no: params.page_no.unwrap_or(1),
        page_size: params.page_size.unwrap_or(100),
        total,
        has_next_page: false,
    }))
}

/// 触发器详情
#[tauri::command]
pub async fn trigger_detail(
    state: State<'_, AppState>,
    data_source_id: i64,
    database_name: String,
    _schema_name: Option<String>,
    trigger_name: String,
) -> Result<ApiResponse<TriggerDetail>, String> {
    let pool = get_mysql_pool(&state, data_source_id).await?;
    let body =
        mysql_meta::get_trigger_detail(&pool, &database_name, &trigger_name).await?;
    Ok(ApiResponse::ok(TriggerDetail {
        trigger_body: body,
    }))
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TriggerDetail {
    pub trigger_body: String,
}
