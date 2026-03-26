use crate::commands::helpers::*;
use crate::models::common::*;
use crate::models::result::*;
use crate::state::AppState;
use sqlx::mysql::MySqlRow;
use sqlx::{Column, Row, TypeInfo};
use std::time::Instant;
use tauri::State;

/// 执行 SQL
#[tauri::command]
pub async fn sql_execute(
    state: State<'_, AppState>,
    params: ExecuteSqlParams,
) -> Result<ApiResponse<Vec<ExecuteResult>>, String> {
    let data_source_id = params.data_source_id.unwrap_or(0);
    let pool = get_mysql_pool(&state, data_source_id).await?;

    // 切换数据库
    if let Some(ref db) = params.database_name {
        if !db.is_empty() {
            let use_sql = format!("USE `{}`", db.replace('`', "``"));
            sqlx::raw_sql(&use_sql)
                .execute(&pool)
                .await
                .map_err(|e| e.to_string())?;
        }
    }

    let sql_text = params.sql.as_deref().unwrap_or("");
    if sql_text.trim().is_empty() {
        return Ok(ApiResponse::err("SQL 不能为空"));
    }

    // 按分号拆分 SQL（简单拆分，不处理引号内的分号）
    let statements = split_sql_statements(sql_text);
    let mut results = Vec::new();

    for stmt in &statements {
        let trimmed = stmt.trim();
        if trimmed.is_empty() {
            continue;
        }

        let start = Instant::now();
        let sql_upper = trimmed.to_uppercase();
        let is_select = sql_upper.starts_with("SELECT")
            || sql_upper.starts_with("SHOW")
            || sql_upper.starts_with("DESCRIBE")
            || sql_upper.starts_with("DESC")
            || sql_upper.starts_with("EXPLAIN");

        if is_select {
            let result = execute_query(&pool, trimmed, &params).await;
            let duration = start.elapsed().as_millis() as i64;
            match result {
                Ok(mut r) => {
                    r.duration = duration;
                    results.push(r);
                }
                Err(e) => {
                    results.push(ExecuteResult {
                        sql: trimmed.to_string(),
                        original_sql: Some(trimmed.to_string()),
                        description: String::new(),
                        message: e,
                        success: false,
                        header_list: vec![],
                        data_list: vec![],
                        duration,
                        fuzzy_total: None,
                        has_next_page: false,
                        sql_type: "UNKNOWN".into(),
                        update_count: None,
                        can_edit: None,
                        table_name: None,
                    });
                }
            }
        } else {
            // DML/DDL
            match sqlx::raw_sql(trimmed).execute(&pool).await {
                Ok(result) => {
                    let duration = start.elapsed().as_millis() as i64;
                    results.push(ExecuteResult {
                        sql: trimmed.to_string(),
                        original_sql: Some(trimmed.to_string()),
                        description: format!("影响行数: {}", result.rows_affected()),
                        message: String::new(),
                        success: true,
                        header_list: vec![],
                        data_list: vec![],
                        duration,
                        fuzzy_total: None,
                        has_next_page: false,
                        sql_type: "UNKNOWN".into(),
                        update_count: Some(result.rows_affected() as i64),
                        can_edit: None,
                        table_name: None,
                    });
                }
                Err(e) => {
                    let duration = start.elapsed().as_millis() as i64;
                    results.push(ExecuteResult {
                        sql: trimmed.to_string(),
                        original_sql: Some(trimmed.to_string()),
                        description: String::new(),
                        message: e.to_string(),
                        success: false,
                        header_list: vec![],
                        data_list: vec![],
                        duration,
                        fuzzy_total: None,
                        has_next_page: false,
                        sql_type: "UNKNOWN".into(),
                        update_count: None,
                        can_edit: None,
                        table_name: None,
                    });
                }
            }
        }
    }

    Ok(ApiResponse::ok(results))
}

/// 执行查看表数据
#[tauri::command]
pub async fn sql_execute_table(
    state: State<'_, AppState>,
    params: ExecuteSqlParams,
) -> Result<ApiResponse<Vec<ExecuteResult>>, String> {
    let table_name = params.table_name.as_deref().unwrap_or("");
    let database = params.database_name.as_deref().unwrap_or("");

    let sql = format!(
        "SELECT * FROM `{}`.`{}`",
        database.replace('`', "``"),
        table_name.replace('`', "``"),
    );

    let new_params = ExecuteSqlParams {
        sql: Some(sql),
        ..params
    };

    sql_execute(state, new_params).await
}

/// 执行 DDL
#[tauri::command]
pub async fn sql_execute_ddl(
    state: State<'_, AppState>,
    params: ExecuteSqlParams,
) -> Result<ApiResponse<DdlExecuteResult>, String> {
    let data_source_id = params.data_source_id.unwrap_or(0);
    let pool = get_mysql_pool(&state, data_source_id).await?;

    if let Some(ref db) = params.database_name {
        if !db.is_empty() {
            let use_sql = format!("USE `{}`", db.replace('`', "``"));
            sqlx::raw_sql(&use_sql).execute(&pool).await.ok();
        }
    }

    let sql_text = params.sql.as_deref().unwrap_or("");

    match sqlx::raw_sql(sql_text).execute(&pool).await {
        Ok(_) => Ok(ApiResponse::ok(DdlExecuteResult {
            success: true,
            message: "执行成功".into(),
            original_sql: Some(sql_text.into()),
            sql: Some(sql_text.into()),
        })),
        Err(e) => Ok(ApiResponse::ok(DdlExecuteResult {
            success: false,
            message: e.to_string(),
            original_sql: Some(sql_text.into()),
            sql: Some(sql_text.into()),
        })),
    }
}

/// 执行 UPDATE（从编辑结果生成的 SQL）
#[tauri::command]
pub async fn sql_execute_update(
    state: State<'_, AppState>,
    params: ExecuteSqlParams,
) -> Result<ApiResponse<DdlExecuteResult>, String> {
    sql_execute_ddl(state, params).await
}

/// 获取更新数据的 SQL（预览待提交的更改）
#[tauri::command]
pub async fn sql_get_update_sql(
    params: GetUpdateSqlParams,
) -> Result<ApiResponse<String>, String> {
    let table_name = params.table_name.as_deref().unwrap_or("");
    let database = params.database_name.as_deref().unwrap_or("");
    let headers = &params.header_list;

    // 跳过第一列（CHAT2DB_ROW_NUMBER 序号列）
    let col_headers: Vec<&TableHeader> = headers.iter()
        .filter(|h| h.data_type != "CHAT2DB_ROW_NUMBER")
        .collect();

    let mut sql_parts: Vec<String> = Vec::new();

    for op in &params.operations {
        match op.op_type.as_str() {
            "UPDATE" => {
                if let (Some(data_list), Some(old_data_list)) = (&op.data_list, &op.old_data_list) {
                    let mut set_parts = Vec::new();
                    let mut where_parts = Vec::new();

                    // 检查是否存在主键列
                    let has_primary_key = col_headers.iter().any(|h| h.primary_key == Some(true));

                    for (i, header) in col_headers.iter().enumerate() {
                        // data_list 包含序号列，所以索引偏移1
                        let data_idx = i + 1;
                        let new_val = data_list.get(data_idx).and_then(|v| v.as_ref());
                        let old_val = old_data_list.get(data_idx).and_then(|v| v.as_ref());

                        if new_val != old_val {
                            let col = escape_identifier(&header.name);
                            set_parts.push(format!("{} = {}", col, escape_value(new_val)));
                        }

                        // 有主键时只用主键列作为WHERE条件，无主键时用所有列
                        if !has_primary_key || header.primary_key == Some(true) {
                            let col = escape_identifier(&header.name);
                            where_parts.push(escape_where_condition(&col, old_val));
                        }
                    }

                    if !set_parts.is_empty() {
                        sql_parts.push(format!(
                            "UPDATE `{}`.`{}` SET {} WHERE {} LIMIT 1;",
                            database.replace('`', "``"),
                            table_name.replace('`', "``"),
                            set_parts.join(", "),
                            where_parts.join(" AND "),
                        ));
                    }
                }
            }
            "CREATE" => {
                if let Some(data_list) = &op.data_list {
                    let cols: Vec<String> = col_headers.iter().map(|h| escape_identifier(&h.name)).collect();
                    let vals: Vec<String> = (1..=col_headers.len())
                        .map(|i| escape_value(data_list.get(i).and_then(|v| v.as_ref())))
                        .collect();
                    sql_parts.push(format!(
                        "INSERT INTO `{}`.`{}` ({}) VALUES ({});",
                        database.replace('`', "``"),
                        table_name.replace('`', "``"),
                        cols.join(", "),
                        vals.join(", "),
                    ));
                }
            }
            "DELETE" => {
                if let Some(old_data_list) = &op.old_data_list {
                    let has_primary_key = col_headers.iter().any(|h| h.primary_key == Some(true));
                    let where_parts: Vec<String> = col_headers.iter().enumerate()
                        .filter(|(_, header)| !has_primary_key || header.primary_key == Some(true))
                        .map(|(i, header)| {
                            let data_idx = i + 1;
                            let val = old_data_list.get(data_idx).and_then(|v| v.as_ref());
                            let col = escape_identifier(&header.name);
                            escape_where_condition(&col, val)
                        }).collect();
                    sql_parts.push(format!(
                        "DELETE FROM `{}`.`{}` WHERE {} LIMIT 1;",
                        database.replace('`', "``"),
                        table_name.replace('`', "``"),
                        where_parts.join(" AND "),
                    ));
                }
            }
            "UPDATE_COPY" => {
                if let Some(data_list) = &op.data_list {
                    let cols: Vec<String> = col_headers.iter().map(|h| escape_identifier(&h.name)).collect();
                    let vals: Vec<String> = (1..=col_headers.len())
                        .map(|i| escape_value(data_list.get(i).and_then(|v| v.as_ref())))
                        .collect();
                    sql_parts.push(format!(
                        "INSERT INTO `{}`.`{}` ({}) VALUES ({});",
                        database.replace('`', "``"),
                        table_name.replace('`', "``"),
                        cols.join(", "),
                        vals.join(", "),
                    ));
                }
            }
            _ => {}
        }
    }

    Ok(ApiResponse::ok(sql_parts.join("\n")))
}

/// 转义标识符
fn escape_identifier(name: &str) -> String {
    format!("`{}`", name.replace('`', "``"))
}

/// 转义值
fn escape_value(val: Option<&String>) -> String {
    match val {
        None => "NULL".to_string(),
        Some(v) => format!("'{}'", v.replace('\'', "\\'")),
    }
}

/// 生成 WHERE 条件片段（NULL 用 IS NULL 而非 = NULL）
fn escape_where_condition(col: &str, val: Option<&String>) -> String {
    match val {
        None => format!("{} IS NULL", col),
        Some(v) => format!("{} = '{}'", col, v.replace('\'', "\\'")),
    }
}

/// 获取总行数
#[tauri::command]
pub async fn sql_count(
    state: State<'_, AppState>,
    params: ExecuteSqlParams,
) -> Result<ApiResponse<i64>, String> {
    let data_source_id = params.data_source_id.unwrap_or(0);
    let pool = get_mysql_pool(&state, data_source_id).await?;

    if let Some(ref db) = params.database_name {
        if !db.is_empty() {
            let use_sql = format!("USE `{}`", db.replace('`', "``"));
            sqlx::raw_sql(&use_sql).execute(&pool).await.ok();
        }
    }

    let sql_text = params.sql.as_deref().unwrap_or("");
    let count_sql = format!("SELECT COUNT(*) AS cnt FROM ({}) AS t", sql_text);

    let count: i64 = sqlx::raw_sql(&count_sql)
        .fetch_one(&pool)
        .await
        .map(|row: MySqlRow| row.try_get::<i64, _>("cnt").unwrap_or(0))
        .unwrap_or(0);

    Ok(ApiResponse::ok(count))
}

/// SQL 格式化
#[tauri::command]
pub async fn sql_format(
    sql: String,
    _db_type: Option<String>,
) -> Result<ApiResponse<String>, String> {
    let formatted = sqlformat::format(
        &sql,
        &sqlformat::QueryParams::None,
        &sqlformat::FormatOptions {
            indent: sqlformat::Indent::Spaces(2),
            uppercase: Some(true),
            lines_between_queries: 2,
            ..Default::default()
        },
    );
    Ok(ApiResponse::ok(formatted))
}

/// 执行 SELECT 查询并返回结果
async fn execute_query(
    pool: &sqlx::MySqlPool,
    sql: &str,
    params: &ExecuteSqlParams,
) -> Result<ExecuteResult, String> {
    let page_no = params.page_no.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(500);

    // 检查是否已有 LIMIT
    let sql_upper = sql.to_uppercase();
    let final_sql = if !sql_upper.contains("LIMIT") {
        format!("{} LIMIT {}, {}", sql, (page_no - 1) * page_size, page_size + 1)
    } else {
        sql.to_string()
    };

    let rows: Vec<MySqlRow> = sqlx::raw_sql(&final_sql)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    let has_next_page = if !sql_upper.contains("LIMIT") {
        rows.len() as i64 > page_size
    } else {
        false
    };

    let actual_rows = if has_next_page && !sql_upper.contains("LIMIT") {
        &rows[..rows.len() - 1]
    } else {
        &rows[..]
    };

    // 构建 header：第一列固定为序号列（CHAT2DB_ROW_NUMBER）
    let mut headers = vec![TableHeader {
        name: "CHAT2DB_ROW_NUMBER".to_string(),
        data_type: "CHAT2DB_ROW_NUMBER".to_string(),
        auto_increment: None,
        column_size: None,
        comment: None,
        decimal_digits: None,
        default_value: None,
        nullable: None,
        primary_key: None,
    }];
    if let Some(first_row) = rows.first() {
        for col in first_row.columns() {
            headers.push(TableHeader {
                name: col.name().to_string(),
                data_type: map_mysql_type(col.type_info().name()),
                auto_increment: None,
                column_size: None,
                comment: None,
                decimal_digits: None,
                default_value: None,
                nullable: None,
                primary_key: None,
            });
        }
    }

    // 构建数据：每行首位插入行号（作为前端唯一 rowId，从1开始）
    let mut data_list = Vec::new();
    for (row_idx, row) in actual_rows.iter().enumerate() {
        let mut row_data = vec![Some((row_idx + 1).to_string())]; // 序号列值
        for i in 0..headers.len() - 1 {
            row_data.push(cell_to_string(row, i));
        }
        data_list.push(row_data);
    }

    // 尝试获取表名（用于 canEdit）
    let table_name = extract_table_name(sql);

    // 查询主键列并填充到 header 中
    if let Some(ref tbl) = table_name {
        if let Ok(pk_rows) = sqlx::raw_sql(&format!(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{}' AND COLUMN_KEY = 'PRI'",
            tbl.replace('\'', "''")
        ))
        .fetch_all(pool)
        .await
        {
            let pk_cols: Vec<String> = pk_rows
                .iter()
                .filter_map(|r| r.try_get::<String, _>(0).ok())
                .collect();
            for header in headers.iter_mut() {
                header.primary_key = Some(pk_cols.contains(&header.name));
            }
        }
    }

    let row_count = data_list.len();

    Ok(ExecuteResult {
        sql: sql.to_string(),
        original_sql: Some(sql.to_string()),
        description: format!("共 {} 行", row_count),
        message: String::new(),
        success: true,
        header_list: headers,
        data_list,
        duration: 0,
        fuzzy_total: Some(format!("{}", row_count)),
        has_next_page,
        sql_type: "SELECT".into(),
        update_count: None,
        can_edit: table_name.as_ref().map(|_| true),
        table_name,
    })
}

/// 映射 MySQL 类型到前端类型
fn map_mysql_type(type_name: &str) -> String {
    let upper = type_name.to_uppercase();
    if upper.contains("INT")
        || upper.contains("DECIMAL")
        || upper.contains("FLOAT")
        || upper.contains("DOUBLE")
        || upper.contains("NUMERIC")
    {
        "NUMERIC".into()
    } else if upper.contains("DATE") || upper.contains("TIME") || upper.contains("YEAR") {
        "DATETIME".into()
    } else if upper.contains("BLOB") || upper.contains("BINARY") {
        "BINARY".into()
    } else if upper.contains("BOOL") {
        "BOOLEAN".into()
    } else if upper.contains("JSON") {
        "CONTENT".into()
    } else {
        "STRING".into()
    }
}

/// 简单提取 SELECT 语句中的表名
fn extract_table_name(sql: &str) -> Option<String> {
    let upper = sql.to_uppercase();
    if let Some(from_pos) = upper.find("FROM") {
        let after_from = &sql[from_pos + 4..].trim_start();
        let table_part = after_from
            .split_whitespace()
            .next()
            .unwrap_or("")
            .trim_matches('`')
            .trim_matches('"');
        // 处理 database.table 格式
        if let Some(dot_pos) = table_part.find('.') {
            let t = &table_part[dot_pos + 1..];
            if !t.is_empty() {
                return Some(t.trim_matches('`').to_string());
            }
        }
        if !table_part.is_empty() && !table_part.contains('(') {
            return Some(table_part.to_string());
        }
    }
    None
}

/// 简单按分号拆分 SQL（不处理引号/注释内的分号）
fn split_sql_statements(sql: &str) -> Vec<String> {
    let mut statements = Vec::new();
    let mut current = String::new();
    let mut in_single_quote = false;
    let mut in_double_quote = false;
    let mut prev_char = '\0';

    for ch in sql.chars() {
        match ch {
            '\'' if !in_double_quote && prev_char != '\\' => {
                in_single_quote = !in_single_quote;
                current.push(ch);
            }
            '"' if !in_single_quote && prev_char != '\\' => {
                in_double_quote = !in_double_quote;
                current.push(ch);
            }
            ';' if !in_single_quote && !in_double_quote => {
                let trimmed = current.trim().to_string();
                if !trimmed.is_empty() {
                    statements.push(trimmed);
                }
                current.clear();
            }
            _ => {
                current.push(ch);
            }
        }
        prev_char = ch;
    }

    let trimmed = current.trim().to_string();
    if !trimmed.is_empty() {
        statements.push(trimmed);
    }

    statements
}

/// 将 MySQL 单元格值转为 Option<String>，按列类型分别解码，避免非字符串类型被误判为 NULL
fn cell_to_string(row: &MySqlRow, col_idx: usize) -> Option<String> {
    use sqlx::ValueRef;

    // 先通过原始值判断是否真正为 NULL
    let raw = row.try_get_raw(col_idx).ok()?;
    if raw.is_null() {
        return None;
    }

    let type_name = raw.type_info().name().to_uppercase();

    // 整数类型
    if matches!(
        type_name.as_str(),
        "TINYINT" | "SMALLINT" | "INT" | "MEDIUMINT" | "BIGINT" | "YEAR" | "BOOLEAN"
    ) || type_name.starts_with("TINYINT")
        || type_name.starts_with("SMALLINT")
        || type_name.starts_with("INT")
        || type_name.starts_with("MEDIUMINT")
        || type_name.starts_with("BIGINT")
    {
        if let Ok(v) = row.try_get::<i64, _>(col_idx) {
            return Some(v.to_string());
        }
        if let Ok(v) = row.try_get::<u64, _>(col_idx) {
            return Some(v.to_string());
        }
    }

    // 浮点类型
    if type_name == "FLOAT" {
        if let Ok(v) = row.try_get::<f32, _>(col_idx) {
            return Some(v.to_string());
        }
    }

    // 双精度/小数类型
    if matches!(type_name.as_str(), "DOUBLE" | "DECIMAL" | "NUMERIC")
        || type_name.starts_with("DECIMAL")
        || type_name.starts_with("NUMERIC")
    {
        if let Ok(v) = row.try_get::<f64, _>(col_idx) {
            return Some(v.to_string());
        }
    }

    // 日期时间类型
    if matches!(type_name.as_str(), "DATETIME" | "TIMESTAMP") {
        if let Ok(v) = row.try_get::<chrono::NaiveDateTime, _>(col_idx) {
            return Some(v.to_string());
        }
    }

    // 日期类型
    if type_name == "DATE" {
        if let Ok(v) = row.try_get::<chrono::NaiveDate, _>(col_idx) {
            return Some(v.to_string());
        }
    }

    // 时间类型（TIME 可能为负，优先尝试 NaiveTime，失败则退回字符串）
    if type_name == "TIME" {
        if let Ok(v) = row.try_get::<chrono::NaiveTime, _>(col_idx) {
            return Some(v.to_string());
        }
    }

    // 二进制/BLOB 类型
    if type_name.contains("BLOB") || type_name.contains("BINARY") {
        if let Ok(v) = row.try_get::<Vec<u8>, _>(col_idx) {
            return Some(
                String::from_utf8(v.clone())
                    .unwrap_or_else(|_| format!("[binary {} bytes]", v.len())),
            );
        }
    }

    // 其余（VARCHAR、TEXT、CHAR、ENUM、SET、JSON、TIME 回退等）
    row.try_get::<String, _>(col_idx).ok()
}
