use crate::commands::helpers::*;
use crate::models::common::*;
use crate::models::result::*;
use crate::state::AppState;
use futures::StreamExt;
use sqlx::mysql::MySqlRow;
use sqlx::{Column, Row, TypeInfo};
use std::time::Instant;
use tauri::{AppHandle, Emitter, State};

/// 执行 SQL
#[tauri::command]
pub async fn sql_execute(
    app: AppHandle,
    state: State<'_, AppState>,
    params: ExecuteSqlParams,
) -> Result<ApiResponse<Vec<ExecuteResult>>, String> {
    let data_source_id = params.data_source_id.unwrap_or(0);
    let pool = get_mysql_pool_with_db(
        &state,
        data_source_id,
        params.database_name.as_deref(),
    )
    .await?;

    let sql_text = params.sql.as_deref().unwrap_or("");
    if sql_text.trim().is_empty() {
        return Ok(ApiResponse::err("SQL 不能为空"));
    }

    let statements = split_sql_statements(sql_text);
    let mut results = Vec::with_capacity(statements.len());

    for stmt in &statements {
        let trimmed = stmt.trim();
        if trimmed.is_empty() {
            continue;
        }

        let start = Instant::now();
        let is_select = is_select_statement(trimmed);

        if is_select {
            let result = execute_query(&pool, trimmed, &params, &app).await;
            let duration = start.elapsed().as_millis() as i64;
            match result {
                Ok(mut r) => {
                    r.duration = duration;
                    results.push(r);
                }
                Err(e) => {
                    results.push(ExecuteResult::error(trimmed, e, duration));
                }
            }
        } else {
            match sqlx::raw_sql(trimmed).execute(&pool).await {
                Ok(result) => {
                    let duration = start.elapsed().as_millis() as i64;
                    results.push(ExecuteResult {
                        sql: trimmed.to_string(),
                        original_sql: None,
                        description: format!("影响行数: {}", result.rows_affected()),
                        message: String::new(),
                        success: true,
                        header_list: vec![],
                        data_list: vec![],
                        duration,
                        fuzzy_total: None,
                        has_next_page: false,
                        sql_type: "DML".into(),
                        update_count: Some(result.rows_affected() as i64),
                        can_edit: None,
                        table_name: None,
                    });
                }
                Err(e) => {
                    let duration = start.elapsed().as_millis() as i64;
                    results.push(ExecuteResult::error(trimmed, e.to_string(), duration));
                }
            }
        }
    }

    Ok(ApiResponse::ok(results))
}

/// 执行查看表数据
#[tauri::command]
pub async fn sql_execute_table(
    app: AppHandle,
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

    sql_execute(app, state, new_params).await
}

/// 执行 DDL
#[tauri::command]
pub async fn sql_execute_ddl(
    state: State<'_, AppState>,
    params: ExecuteSqlParams,
) -> Result<ApiResponse<DdlExecuteResult>, String> {
    let data_source_id = params.data_source_id.unwrap_or(0);
    let pool = get_mysql_pool_with_db(
        &state,
        data_source_id,
        params.database_name.as_deref(),
    )
    .await?;

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

    // 跳过第一列（DUANDB_ROW_NUMBER 序号列）
    let col_headers: Vec<&TableHeader> = headers.iter()
        .filter(|h| h.data_type != "DUANDB_ROW_NUMBER")
        .collect();

    let escaped_db = database.replace('`', "``");
    let escaped_table = table_name.replace('`', "``");
    let mut sql_parts: Vec<String> = Vec::new();

    for op in &params.operations {
        match op.op_type.as_str() {
            "UPDATE" => {
                if let (Some(data_list), Some(old_data_list)) = (&op.data_list, &op.old_data_list) {
                    let mut set_parts = Vec::new();
                    let mut where_parts = Vec::new();

                    let has_primary_key = col_headers.iter().any(|h| h.primary_key == Some(true));

                    for (i, header) in col_headers.iter().enumerate() {
                        let data_idx = i + 1;
                        let new_val = data_list.get(data_idx).and_then(|v| v.as_ref());
                        let old_val = old_data_list.get(data_idx).and_then(|v| v.as_ref());

                        if new_val != old_val {
                            let col = escape_identifier(&header.name);
                            set_parts.push(format!("{} = {}", col, escape_value(new_val)));
                        }

                        if !has_primary_key || header.primary_key == Some(true) {
                            let col = escape_identifier(&header.name);
                            where_parts.push(escape_where_condition(&col, old_val));
                        }
                    }

                    if !set_parts.is_empty() {
                        sql_parts.push(format!(
                            "UPDATE `{}`.`{}` SET {} WHERE {} LIMIT 1;",
                            escaped_db, escaped_table,
                            set_parts.join(", "),
                            where_parts.join(" AND "),
                        ));
                    }
                }
            }
            "CREATE" | "UPDATE_COPY" => {
                if let Some(data_list) = &op.data_list {
                    let cols: Vec<String> = col_headers.iter().map(|h| escape_identifier(&h.name)).collect();
                    let vals: Vec<String> = (1..=col_headers.len())
                        .map(|i| escape_value(data_list.get(i).and_then(|v| v.as_ref())))
                        .collect();
                    sql_parts.push(format!(
                        "INSERT INTO `{}`.`{}` ({}) VALUES ({});",
                        escaped_db, escaped_table,
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
                        escaped_db, escaped_table,
                        where_parts.join(" AND "),
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

/// 转义值（使用 MySQL 标准的双单引号转义）
fn escape_value(val: Option<&String>) -> String {
    match val {
        None => "NULL".to_string(),
        Some(v) => format!("'{}'", v.replace('\'', "''")),
    }
}

/// 生成 WHERE 条件片段（NULL 用 IS NULL 而非 = NULL）
fn escape_where_condition(col: &str, val: Option<&String>) -> String {
    match val {
        None => format!("{} IS NULL", col),
        Some(v) => format!("{} = '{}'", col, v.replace('\'', "''")),
    }
}

/// 获取总行数
#[tauri::command]
pub async fn sql_count(
    state: State<'_, AppState>,
    params: ExecuteSqlParams,
) -> Result<ApiResponse<i64>, String> {
    let data_source_id = params.data_source_id.unwrap_or(0);
    let pool = get_mysql_pool_with_db(
        &state,
        data_source_id,
        params.database_name.as_deref(),
    )
    .await?;

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

/// 判断是否为 SELECT 类语句
#[inline]
fn is_select_statement(sql: &str) -> bool {
    let bytes = sql.as_bytes();
    // 快速跳过前导空白
    let start = bytes.iter().position(|&b| !b.is_ascii_whitespace()).unwrap_or(0);
    let upper_start: String = sql[start..].chars().take(8).collect::<String>().to_uppercase();
    upper_start.starts_with("SELECT")
        || upper_start.starts_with("SHOW")
        || upper_start.starts_with("DESCRIBE")
        || upper_start.starts_with("DESC")
        || upper_start.starts_with("EXPLAIN")
}

/// 执行 SELECT 查询并返回结果（流式处理，边读边转换，避免双倍内存）
async fn execute_query(
    pool: &sqlx::MySqlPool,
    sql: &str,
    params: &ExecuteSqlParams,
    app: &AppHandle,
) -> Result<ExecuteResult, String> {
    let page_no = params.page_no.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(500);

    // 检查是否已有 LIMIT
    let has_user_limit = has_limit_clause(sql);
    let final_sql = if !has_user_limit {
        format!("{} LIMIT {}, {}", sql, (page_no - 1) * page_size, page_size + 1)
    } else {
        sql.to_string()
    };

    // 流式读取并直接转换为字符串，不缓存 MySqlRow
    let mut stream = sqlx::raw_sql(&final_sql).fetch(pool);
    let mut headers_built = false;
    let mut headers = Vec::with_capacity(32);
    headers.push(TableHeader {
        name: "DUANDB_ROW_NUMBER".to_string(),
        data_type: "DUANDB_ROW_NUMBER".to_string(),
        auto_increment: None,
        column_size: None,
        comment: None,
        decimal_digits: None,
        default_value: None,
        nullable: None,
        primary_key: None,
    });

    let mut data_list: Vec<Vec<Option<String>>> = Vec::with_capacity(page_size as usize);
    let mut col_count = 0usize;
    let mut row_idx = 0usize;

    while let Some(result) = stream.next().await {
        let row = result.map_err(|e| e.to_string())?;

        // 从第一行构建 header
        if !headers_built {
            let columns = row.columns();
            col_count = columns.len();
            headers.reserve(col_count);
            for col in columns {
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
            headers_built = true;
        }

        // 直接转换为字符串行，不缓存 MySqlRow
        row_idx += 1;
        let mut row_data = Vec::with_capacity(col_count + 1);
        row_data.push(Some(row_idx.to_string()));
        for i in 0..col_count {
            row_data.push(cell_to_string(&row, i));
        }
        data_list.push(row_data);

        // 每 200 行发送一次进度事件
        if row_idx % 200 == 0 {
            let _ = app.emit("sql_progress", row_idx);
        }
    }

    let _ = app.emit("sql_progress", row_idx);

    let has_next_page = if !has_user_limit {
        data_list.len() as i64 > page_size
    } else {
        false
    };

    // 如果多取了一行用于判断分页，去掉
    if has_next_page && !has_user_limit {
        data_list.pop();
    }

    // 尝试获取表名（用于 canEdit）
    let table_name = extract_table_name(sql);

    // 并行查询主键列
    if let Some(ref tbl) = table_name {
        let pk_sql = format!(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{}' AND COLUMN_KEY = 'PRI'",
            tbl.replace('\'', "''")
        );
        if let Ok(pk_rows) = sqlx::raw_sql(&pk_sql).fetch_all(pool).await {
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
        fuzzy_total: Some(row_count.to_string()),
        has_next_page,
        sql_type: "SELECT".into(),
        update_count: None,
        can_edit: table_name.as_ref().map(|_| true),
        table_name,
    })
}

/// 快速检测 SQL 是否包含 LIMIT 子句（忽略引号内的 LIMIT）
fn has_limit_clause(sql: &str) -> bool {
    let mut in_single_quote = false;
    let mut in_double_quote = false;
    let bytes = sql.as_bytes();
    let len = bytes.len();

    let mut i = 0;
    while i < len {
        let b = bytes[i];
        match b {
            b'\'' if !in_double_quote => in_single_quote = !in_single_quote,
            b'"' if !in_single_quote => in_double_quote = !in_double_quote,
            b'L' | b'l' if !in_single_quote && !in_double_quote && i + 5 <= len => {
                if sql[i..i + 5].eq_ignore_ascii_case("LIMIT") {
                    // 确认前后不是标识符字符
                    let before_ok = i == 0 || !bytes[i - 1].is_ascii_alphanumeric() && bytes[i - 1] != b'_';
                    let after_ok = i + 5 >= len || !bytes[i + 5].is_ascii_alphanumeric() && bytes[i + 5] != b'_';
                    if before_ok && after_ok {
                        return true;
                    }
                }
            }
            _ => {}
        }
        i += 1;
    }
    false
}

/// 映射 MySQL 类型到前端类型（避免 to_uppercase 分配）
fn map_mysql_type(type_name: &str) -> String {
    // 用 ASCII case-insensitive 比较，避免 String 分配
    let name = type_name.as_bytes();
    if contains_ci(name, b"INT")
        || contains_ci(name, b"DECIMAL")
        || contains_ci(name, b"FLOAT")
        || contains_ci(name, b"DOUBLE")
        || contains_ci(name, b"NUMERIC")
    {
        "NUMERIC".into()
    } else if contains_ci(name, b"DATE") || contains_ci(name, b"TIME") || contains_ci(name, b"YEAR") {
        "DATETIME".into()
    } else if contains_ci(name, b"BLOB") || contains_ci(name, b"BINARY") {
        "BINARY".into()
    } else if contains_ci(name, b"BOOL") {
        "BOOLEAN".into()
    } else if contains_ci(name, b"JSON") {
        "CONTENT".into()
    } else {
        "STRING".into()
    }
}

/// Case-insensitive bytes contains
#[inline]
fn contains_ci(haystack: &[u8], needle: &[u8]) -> bool {
    haystack.windows(needle.len()).any(|w| w.eq_ignore_ascii_case(needle))
}

/// 简单提取 SELECT 语句中的表名
fn extract_table_name(sql: &str) -> Option<String> {
    let upper = sql.to_uppercase();
    let from_pos = upper.find("FROM")?;
    let after_from = sql[from_pos + 4..].trim_start();
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
        Some(table_part.to_string())
    } else {
        None
    }
}

/// 按分号拆分 SQL（正确处理引号、单行注释和块注释内的分号）
fn split_sql_statements(sql: &str) -> Vec<String> {
    let mut statements = Vec::new();
    let mut current = String::new();
    let mut in_single_quote = false;
    let mut in_double_quote = false;
    let mut in_line_comment = false;
    let mut in_block_comment = false;
    let mut prev_char = '\0';

    let chars: Vec<char> = sql.chars().collect();
    let len = chars.len();
    let mut i = 0;

    while i < len {
        let ch = chars[i];

        // 处理块注释结束
        if in_block_comment {
            current.push(ch);
            if ch == '/' && prev_char == '*' {
                in_block_comment = false;
            }
            prev_char = ch;
            i += 1;
            continue;
        }

        // 处理行注释结束
        if in_line_comment {
            current.push(ch);
            if ch == '\n' {
                in_line_comment = false;
            }
            prev_char = ch;
            i += 1;
            continue;
        }

        // 检测块注释开始
        if !in_single_quote && !in_double_quote && ch == '/' && i + 1 < len && chars[i + 1] == '*' {
            in_block_comment = true;
            current.push(ch);
            prev_char = ch;
            i += 1;
            continue;
        }

        // 检测行注释开始
        if !in_single_quote && !in_double_quote && ch == '-' && i + 1 < len && chars[i + 1] == '-' {
            in_line_comment = true;
            current.push(ch);
            prev_char = ch;
            i += 1;
            continue;
        }

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
        i += 1;
    }

    let trimmed = current.trim().to_string();
    if !trimmed.is_empty() {
        statements.push(trimmed);
    }

    statements
}

/// 将 MySQL 单元格值转为 Option<String>
fn cell_to_string(row: &MySqlRow, col_idx: usize) -> Option<String> {
    use sqlx::ValueRef;

    let raw = row.try_get_raw(col_idx).ok()?;
    if raw.is_null() {
        return None;
    }

    let type_info = raw.type_info();
    let type_name = type_info.name();

    // 使用 ASCII case-insensitive 匹配，避免 to_uppercase 分配
    let name_bytes = type_name.as_bytes();

    // 整数类型
    if starts_with_ci(name_bytes, b"TINYINT")
        || starts_with_ci(name_bytes, b"SMALLINT")
        || starts_with_ci(name_bytes, b"INT")
        || starts_with_ci(name_bytes, b"MEDIUMINT")
        || starts_with_ci(name_bytes, b"BIGINT")
        || eq_ci(name_bytes, b"YEAR")
        || eq_ci(name_bytes, b"BOOLEAN")
    {
        if let Ok(v) = row.try_get::<i64, _>(col_idx) {
            return Some(v.to_string());
        }
        if let Ok(v) = row.try_get::<u64, _>(col_idx) {
            return Some(v.to_string());
        }
    }

    // 浮点类型
    if eq_ci(name_bytes, b"FLOAT") {
        if let Ok(v) = row.try_get::<f32, _>(col_idx) {
            return Some(v.to_string());
        }
    }

    if eq_ci(name_bytes, b"DOUBLE") {
        if let Ok(v) = row.try_get::<f64, _>(col_idx) {
            return Some(v.to_string());
        }
    }

    // 日期时间类型
    if eq_ci(name_bytes, b"DATETIME") || eq_ci(name_bytes, b"TIMESTAMP") {
        if let Ok(v) = row.try_get::<chrono::NaiveDateTime, _>(col_idx) {
            return Some(v.to_string());
        }
    }

    if eq_ci(name_bytes, b"DATE") {
        if let Ok(v) = row.try_get::<chrono::NaiveDate, _>(col_idx) {
            return Some(v.to_string());
        }
    }

    if eq_ci(name_bytes, b"TIME") {
        if let Ok(v) = row.try_get::<chrono::NaiveTime, _>(col_idx) {
            return Some(v.to_string());
        }
    }

    // 二进制/BLOB 类型
    if contains_ci(name_bytes, b"BLOB") || contains_ci(name_bytes, b"BINARY") {
        if let Ok(v) = row.try_get::<Vec<u8>, _>(col_idx) {
            return Some(
                String::from_utf8(v.clone())
                    .unwrap_or_else(|e| format!("[binary {} bytes]", e.into_bytes().len())),
            );
        }
    }

    // DECIMAL / NUMERIC
    if contains_ci(name_bytes, b"DECIMAL") || contains_ci(name_bytes, b"NUMERIC") {
        if let Ok(v) = row.try_get::<rust_decimal::Decimal, _>(col_idx) {
            return Some(v.to_string());
        }
    }

    // 兜底：常见类型
    if let Ok(v) = row.try_get::<String, _>(col_idx) {
        return Some(v);
    }
    if let Ok(v) = row.try_get::<i64, _>(col_idx) {
        return Some(v.to_string());
    }
    if let Ok(v) = row.try_get::<f64, _>(col_idx) {
        return Some(v.to_string());
    }
    if let Ok(v) = row.try_get::<rust_decimal::Decimal, _>(col_idx) {
        return Some(v.to_string());
    }

    None
}

/// Case-insensitive bytes starts_with
#[inline]
fn starts_with_ci(haystack: &[u8], prefix: &[u8]) -> bool {
    haystack.len() >= prefix.len() && haystack[..prefix.len()].eq_ignore_ascii_case(prefix)
}

/// Case-insensitive bytes equality
#[inline]
fn eq_ci(a: &[u8], b: &[u8]) -> bool {
    a.len() == b.len() && a.eq_ignore_ascii_case(b)
}
