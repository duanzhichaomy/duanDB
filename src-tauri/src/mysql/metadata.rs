use crate::models::metadata::*;
use sqlx::mysql::MySqlRow;
use sqlx::{MySqlPool, Row};

/// 获取数据库列表
pub async fn get_databases(pool: &MySqlPool) -> Result<Vec<DatabaseInfo>, String> {
    let rows: Vec<MySqlRow> = sqlx::raw_sql("SHOW DATABASES")
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    let system_dbs = ["information_schema", "performance_schema", "mysql", "sys"];
    let mut databases = Vec::new();
    for row in rows {
        let name: String = row.try_get(0).unwrap_or_default();
        if !system_dbs.contains(&name.as_str()) {
            databases.push(DatabaseInfo { name });
        }
    }
    Ok(databases)
}

/// 获取表列表（分页，返回 (数据, 总数)，SQL 层面限制数据量）
pub async fn get_tables_paged(
    pool: &MySqlPool,
    database: &str,
    search_key: Option<&str>,
    page_no: Option<i64>,
    page_size: Option<i64>,
) -> Result<(Vec<TableInfo>, i64), String> {
    let escaped_db = escape_sql_string(database);
    let mut where_clause = format!(
        "TABLE_SCHEMA = '{}' AND TABLE_TYPE = 'BASE TABLE'",
        escaped_db
    );
    if let Some(key) = search_key {
        if !key.is_empty() {
            where_clause.push_str(&format!(
                " AND TABLE_NAME LIKE '%{}%'",
                escape_sql_string(key)
            ));
        }
    }

    // 查总数
    let count_sql = format!(
        "SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE {}",
        where_clause
    );

    let mut data_sql = format!(
        r#"SELECT TABLE_NAME, TABLE_COMMENT
           FROM INFORMATION_SCHEMA.TABLES
           WHERE {}
           ORDER BY TABLE_NAME"#,
        where_clause
    );

    // 如果指定了分页，SQL 层面限制
    let p_no = page_no.unwrap_or(1);
    let p_size = page_size.unwrap_or(100);
    let offset = (p_no - 1) * p_size;
    data_sql.push_str(&format!(" LIMIT {} OFFSET {}", p_size, offset));

    // 并行查询数据和总数
    let (rows_result, count_result) = tokio::join!(
        sqlx::query(&data_sql).fetch_all(pool),
        sqlx::query(&count_sql).fetch_one(pool)
    );

    let rows = rows_result.map_err(|e| e.to_string())?;
    let total: i64 = count_result
        .map(|r| r.try_get::<i64, _>("cnt").unwrap_or(0))
        .unwrap_or(0);

    let mut tables = Vec::new();
    for row in rows {
        tables.push(TableInfo {
            name: row.try_get("TABLE_NAME").ok(),
            comment: row.try_get("TABLE_COMMENT").ok(),
            pinned: false,
        });
    }
    Ok((tables, total))
}

/// 获取表名列表（简单）
pub async fn get_table_names(
    pool: &MySqlPool,
    database: &str,
) -> Result<Vec<TableNameItem>, String> {
    let sql = format!(
        r#"SELECT TABLE_NAME, TABLE_COMMENT
           FROM INFORMATION_SCHEMA.TABLES
           WHERE TABLE_SCHEMA = '{}' AND TABLE_TYPE = 'BASE TABLE'
           ORDER BY TABLE_NAME"#,
        escape_sql_string(database)
    );

    let rows: Vec<MySqlRow> = sqlx::query(&sql)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(TableNameItem {
            name: row.try_get("TABLE_NAME").unwrap_or_default(),
            comment: row.try_get("TABLE_COMMENT").ok(),
        });
    }
    Ok(result)
}

/// 获取列信息
pub async fn get_columns(
    pool: &MySqlPool,
    database: &str,
    table: &str,
) -> Result<Vec<ColumnInfo>, String> {
    let sql = format!(
        r#"SELECT * FROM INFORMATION_SCHEMA.COLUMNS
           WHERE TABLE_SCHEMA = '{}' AND TABLE_NAME = '{}'
           ORDER BY ORDINAL_POSITION"#,
        escape_sql_string(database),
        escape_sql_string(table)
    );

    let rows: Vec<MySqlRow> = sqlx::query(&sql)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    let mut columns = Vec::new();
    for row in rows {
        let column_type: String = row.try_get("COLUMN_TYPE").unwrap_or_default();
        let column_key: String = row.try_get("COLUMN_KEY").unwrap_or_default();
        let extra: String = row.try_get("EXTRA").unwrap_or_default();
        let is_nullable: String = row.try_get("IS_NULLABLE").unwrap_or_default();
        let data_type_str: String = row.try_get("DATA_TYPE").unwrap_or_default();

        // 解析 column_size 和 decimal_digits
        let (col_size, dec_digits) = parse_column_type_size(&column_type);

        columns.push(ColumnInfo {
            edit_status: None,
            old_name: None,
            name: row.try_get("COLUMN_NAME").ok(),
            database_name: row.try_get("TABLE_SCHEMA").ok(),
            schema_name: None,
            table_name: row.try_get("TABLE_NAME").ok(),
            column_type: Some(column_type.to_uppercase()),
            data_type: None,
            default_value: row.try_get("COLUMN_DEFAULT").ok(),
            auto_increment: if extra.contains("auto_increment") {
                Some("YES".to_string())
            } else {
                Some("NO".to_string())
            },
            comment: row.try_get("COLUMN_COMMENT").ok(),
            primary_key: Some(column_key == "PRI"),
            primary_key_order: None,
            type_name: Some(data_type_str.to_uppercase()),
            column_size: col_size,
            buffer_length: None,
            decimal_digits: dec_digits.map(|d| d.to_string()),
            num_prec_radix: None,
            sql_data_type: None,
            sql_datetime_sub: None,
            char_octet_length: None,
            ordinal_position: row.try_get("ORDINAL_POSITION").ok(),
            nullable: Some(if is_nullable == "YES" {
                "YES".to_string()
            } else {
                "NO".to_string()
            }),
            generated_column: None,
            char_set_name: row.try_get("CHARACTER_SET_NAME").ok(),
            collation_name: row.try_get("COLLATION_NAME").ok(),
            value: None,
        });
    }
    Ok(columns)
}

/// 获取索引信息
pub async fn get_indexes(
    pool: &MySqlPool,
    database: &str,
    table: &str,
) -> Result<Vec<IndexInfo>, String> {
    let sql = format!(
        "SHOW INDEX FROM `{}` FROM `{}`",
        escape_sql_string(table),
        escape_sql_string(database)
    );

    let rows: Vec<MySqlRow> = sqlx::raw_sql(&sql)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    // 按 Key_name 分组（保持插入顺序）
    let mut index_map: indexmap::IndexMap<String, Vec<MySqlRow>> =
        indexmap::IndexMap::new();
    for row in rows {
        let key_name: String = row.try_get("Key_name").unwrap_or_default();
        index_map.entry(key_name).or_default().push(row);
    }

    let mut indexes = Vec::new();
    for (key_name, rows) in index_map {
        let first = &rows[0];
        let non_unique: i64 = first.try_get("Non_unique").unwrap_or(1);
        let index_type_str: String = first.try_get("Index_type").unwrap_or_default();
        let comment: Option<String> = first.try_get("Index_comment").ok();

        let idx_type = if key_name == "PRIMARY" {
            "PRIMARY_KEY".to_string()
        } else if non_unique == 0 {
            "UNIQUE".to_string()
        } else if index_type_str == "FULLTEXT" {
            "FULLTEXT".to_string()
        } else if index_type_str == "SPATIAL" {
            "SPATIAL".to_string()
        } else {
            "NORMAL".to_string()
        };

        let mut column_list = Vec::new();
        for r in &rows {
            let col_name: String = r.try_get("Column_name").unwrap_or_default();
            let collation: Option<String> = r.try_get("Collation").ok();
            let cardinality: Option<i64> = r.try_get("Cardinality").ok();
            let sub_part: Option<i64> = r.try_get("Sub_part").ok();
            let seq: Option<i64> = r.try_get("Seq_in_index").ok();

            column_list.push(IndexColumnInfo {
                name: col_name,
                collation: collation.map(|c| if c == "A" { "ASC".into() } else { "DESC".into() }),
                cardinality,
                sub_part,
                ordinal_position: seq,
            });
        }
        column_list.sort_by_key(|c| c.ordinal_position.unwrap_or(0));

        indexes.push(IndexInfo {
            edit_status: None,
            name: key_name,
            index_type: idx_type,
            comment: comment.filter(|c| !c.is_empty()),
            column_list,
        });
    }
    Ok(indexes)
}

/// 获取表 DDL（SHOW CREATE TABLE）
pub async fn get_table_ddl(
    pool: &MySqlPool,
    database: &str,
    table: &str,
) -> Result<String, String> {
    let sql = format!(
        "SHOW CREATE TABLE `{}`.`{}`",
        escape_sql_string(database),
        escape_sql_string(table)
    );

    let row: MySqlRow = sqlx::raw_sql(&sql)
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?;

    let ddl: String = row.try_get(1).unwrap_or_default();
    Ok(ddl)
}

/// 获取视图列表
pub async fn get_views(
    pool: &MySqlPool,
    database: &str,
    search_key: Option<&str>,
) -> Result<Vec<RoutineInfo>, String> {
    let mut sql = format!(
        r#"SELECT TABLE_NAME, TABLE_COMMENT
           FROM INFORMATION_SCHEMA.VIEWS
           WHERE TABLE_SCHEMA = '{}'"#,
        escape_sql_string(database)
    );
    if let Some(key) = search_key {
        if !key.is_empty() {
            sql.push_str(&format!(
                " AND TABLE_NAME LIKE '%{}%'",
                escape_sql_string(key)
            ));
        }
    }

    let rows: Vec<MySqlRow> = sqlx::query(&sql)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    let mut views = Vec::new();
    for row in rows {
        views.push(RoutineInfo {
            name: row.try_get("TABLE_NAME").unwrap_or_default(),
            comment: None,
            pinned: false,
        });
    }
    Ok(views)
}

/// 获取视图 DDL
pub async fn get_view_ddl(
    pool: &MySqlPool,
    database: &str,
    view_name: &str,
) -> Result<String, String> {
    let sql = format!(
        "SHOW CREATE VIEW `{}`.`{}`",
        escape_sql_string(database),
        escape_sql_string(view_name)
    );

    let row: MySqlRow = sqlx::raw_sql(&sql)
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?;

    let ddl: String = row.try_get("Create View").unwrap_or_default();
    Ok(ddl)
}

/// 获取函数列表
pub async fn get_functions(
    pool: &MySqlPool,
    database: &str,
    search_key: Option<&str>,
) -> Result<Vec<RoutineInfo>, String> {
    let mut sql = format!(
        r#"SELECT ROUTINE_NAME, ROUTINE_COMMENT
           FROM INFORMATION_SCHEMA.ROUTINES
           WHERE ROUTINE_SCHEMA = '{}' AND ROUTINE_TYPE = 'FUNCTION'"#,
        escape_sql_string(database)
    );
    if let Some(key) = search_key {
        if !key.is_empty() {
            sql.push_str(&format!(
                " AND ROUTINE_NAME LIKE '%{}%'",
                escape_sql_string(key)
            ));
        }
    }

    let rows: Vec<MySqlRow> = sqlx::query(&sql)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    let mut funcs = Vec::new();
    for row in rows {
        funcs.push(RoutineInfo {
            name: row.try_get("ROUTINE_NAME").unwrap_or_default(),
            comment: row.try_get("ROUTINE_COMMENT").ok(),
            pinned: false,
        });
    }
    Ok(funcs)
}

/// 获取函数详情
pub async fn get_function_detail(
    pool: &MySqlPool,
    database: &str,
    function_name: &str,
) -> Result<String, String> {
    let sql = format!(
        "SHOW CREATE FUNCTION `{}`.`{}`",
        escape_sql_string(database),
        escape_sql_string(function_name)
    );

    let row: MySqlRow = sqlx::raw_sql(&sql)
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?;

    let body: String = row.try_get("Create Function").unwrap_or_default();
    Ok(body)
}

/// 获取存储过程列表
pub async fn get_procedures(
    pool: &MySqlPool,
    database: &str,
    search_key: Option<&str>,
) -> Result<Vec<RoutineInfo>, String> {
    let mut sql = format!(
        r#"SELECT ROUTINE_NAME, ROUTINE_COMMENT
           FROM INFORMATION_SCHEMA.ROUTINES
           WHERE ROUTINE_SCHEMA = '{}' AND ROUTINE_TYPE = 'PROCEDURE'"#,
        escape_sql_string(database)
    );
    if let Some(key) = search_key {
        if !key.is_empty() {
            sql.push_str(&format!(
                " AND ROUTINE_NAME LIKE '%{}%'",
                escape_sql_string(key)
            ));
        }
    }

    let rows: Vec<MySqlRow> = sqlx::query(&sql)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    let mut procs = Vec::new();
    for row in rows {
        procs.push(RoutineInfo {
            name: row.try_get("ROUTINE_NAME").unwrap_or_default(),
            comment: row.try_get("ROUTINE_COMMENT").ok(),
            pinned: false,
        });
    }
    Ok(procs)
}

/// 获取存储过程详情
pub async fn get_procedure_detail(
    pool: &MySqlPool,
    database: &str,
    procedure_name: &str,
) -> Result<String, String> {
    let sql = format!(
        "SHOW CREATE PROCEDURE `{}`.`{}`",
        escape_sql_string(database),
        escape_sql_string(procedure_name)
    );

    let row: MySqlRow = sqlx::raw_sql(&sql)
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?;

    let body: String = row.try_get("Create Procedure").unwrap_or_default();
    Ok(body)
}

/// 获取触发器列表
pub async fn get_triggers(
    pool: &MySqlPool,
    database: &str,
    search_key: Option<&str>,
) -> Result<Vec<RoutineInfo>, String> {
    let mut sql = format!(
        r#"SELECT TRIGGER_NAME
           FROM INFORMATION_SCHEMA.TRIGGERS
           WHERE TRIGGER_SCHEMA = '{}'"#,
        escape_sql_string(database)
    );
    if let Some(key) = search_key {
        if !key.is_empty() {
            sql.push_str(&format!(
                " AND TRIGGER_NAME LIKE '%{}%'",
                escape_sql_string(key)
            ));
        }
    }

    let rows: Vec<MySqlRow> = sqlx::query(&sql)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    let mut triggers = Vec::new();
    for row in rows {
        triggers.push(RoutineInfo {
            name: row.try_get("TRIGGER_NAME").unwrap_or_default(),
            comment: None,
            pinned: false,
        });
    }
    Ok(triggers)
}

/// 获取触发器详情
pub async fn get_trigger_detail(
    pool: &MySqlPool,
    database: &str,
    trigger_name: &str,
) -> Result<String, String> {
    let sql = format!(
        r#"SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE,
                  ACTION_STATEMENT, ACTION_TIMING
           FROM INFORMATION_SCHEMA.TRIGGERS
           WHERE TRIGGER_SCHEMA = '{}' AND TRIGGER_NAME = '{}'"#,
        escape_sql_string(database),
        escape_sql_string(trigger_name)
    );

    let row: MySqlRow = sqlx::query(&sql)
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?;

    let timing: String = row.try_get("ACTION_TIMING").unwrap_or_default();
    let event: String = row.try_get("EVENT_MANIPULATION").unwrap_or_default();
    let table: String = row.try_get("EVENT_OBJECT_TABLE").unwrap_or_default();
    let body: String = row.try_get("ACTION_STATEMENT").unwrap_or_default();

    Ok(format!(
        "CREATE TRIGGER `{}` {} {} ON `{}` FOR EACH ROW\n{}",
        trigger_name, timing, event, table, body
    ))
}

/// 获取字符集列表
pub async fn get_charsets(pool: &MySqlPool) -> Result<Vec<CharsetInfo>, String> {
    let rows: Vec<MySqlRow> = sqlx::raw_sql("SHOW CHARACTER SET")
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    let mut charsets = Vec::new();
    for row in rows {
        charsets.push(CharsetInfo {
            charset_name: row.try_get("Charset").unwrap_or_default(),
        });
    }
    Ok(charsets)
}

/// 获取排序规则列表
pub async fn get_collations(pool: &MySqlPool) -> Result<Vec<CollationInfo>, String> {
    let rows: Vec<MySqlRow> = sqlx::raw_sql("SHOW COLLATION")
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    let mut collations = Vec::new();
    for row in rows {
        collations.push(CollationInfo {
            collation_name: row.try_get("Collation").unwrap_or_default(),
            charset_name: row.try_get("Charset").ok(),
        });
    }
    Ok(collations)
}

/// 获取表详细信息（engine, charset, auto_increment 等）
pub async fn get_table_detail_info(
    pool: &MySqlPool,
    database: &str,
    table: &str,
) -> Result<(Option<String>, Option<String>, Option<String>, Option<String>), String> {
    let sql = format!(
        r#"SELECT ENGINE, TABLE_COLLATION, AUTO_INCREMENT, TABLE_COMMENT
           FROM INFORMATION_SCHEMA.TABLES
           WHERE TABLE_SCHEMA = '{}' AND TABLE_NAME = '{}'"#,
        escape_sql_string(database),
        escape_sql_string(table)
    );

    let row: MySqlRow = sqlx::query(&sql)
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok((
        row.try_get("ENGINE").ok(),
        row.try_get("TABLE_COLLATION").ok(),
        row.try_get::<Option<String>, _>("AUTO_INCREMENT")
            .unwrap_or(None),
        row.try_get("TABLE_COMMENT").ok(),
    ))
}

// --- 工具函数 ---

/// 简单转义 SQL 字符串中的单引号和反引号
fn escape_sql_string(s: &str) -> String {
    s.replace('\'', "''").replace('`', "``")
}

/// 解析 COLUMN_TYPE 中的 size 和 decimal，如 "varchar(255)" -> (Some(255), None), "decimal(10,2)" -> (Some(10), Some(2))
fn parse_column_type_size(column_type: &str) -> (Option<i64>, Option<i64>) {
    if let Some(start) = column_type.find('(') {
        if let Some(end) = column_type.find(')') {
            let inner = &column_type[start + 1..end];
            if let Some(comma) = inner.find(',') {
                let size = inner[..comma].trim().parse().ok();
                let digits = inner[comma + 1..].trim().parse().ok();
                return (size, digits);
            } else {
                let size = inner.trim().parse().ok();
                return (size, None);
            }
        }
    }
    (None, None)
}
