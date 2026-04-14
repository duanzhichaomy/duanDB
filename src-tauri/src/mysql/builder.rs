use crate::models::metadata::*;

/// 生成 CREATE DATABASE SQL
pub fn build_create_database_sql(database_name: &str) -> String {
    format!(
        "CREATE DATABASE `{}` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci",
        database_name.replace('`', "``")
    )
}

/// 生成 CREATE TABLE 示例 SQL
pub fn build_create_table_example() -> String {
    r#"CREATE TABLE `example_table` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
  `name` VARCHAR(255) NOT NULL COMMENT '名称',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='示例表';"#
        .to_string()
}

/// 生成 ALTER TABLE 示例 SQL
pub fn build_update_table_example() -> String {
    r#"-- 添加列
ALTER TABLE `example_table` ADD COLUMN `new_column` VARCHAR(255) DEFAULT NULL COMMENT '新列';

-- 修改列
ALTER TABLE `example_table` MODIFY COLUMN `name` VARCHAR(512) NOT NULL COMMENT '名称';

-- 删除列
ALTER TABLE `example_table` DROP COLUMN `new_column`;

-- 添加索引
ALTER TABLE `example_table` ADD INDEX `idx_name` (`name`);

-- 删除索引
ALTER TABLE `example_table` DROP INDEX `idx_name`;"#
        .to_string()
}

/// 对比新旧表结构，生成 ALTER TABLE SQL；若 old_table 为 None 则视为新建表，生成 CREATE TABLE
pub fn build_modify_table_sql(
    database: &str,
    old_table: Option<&EditTableInfo>,
    new_table: &EditTableInfo,
) -> Vec<String> {
    let escaped_db = database.replace('`', "``");

    // 新建表：生成单条 CREATE TABLE
    let Some(old_table) = old_table else {
        return vec![build_create_table_sql(&escaped_db, new_table)];
    };

    let mut sqls = Vec::new();
    let escaped_old_name = old_table.name.replace('`', "``");
    let escaped_new_name = new_table.name.replace('`', "``");
    let table_ref = format!("`{}`.`{}`", escaped_db, escaped_old_name);

    // 1. 表重命名
    if old_table.name != new_table.name {
        sqls.push(format!(
            "ALTER TABLE {} RENAME TO `{}`",
            table_ref, escaped_new_name
        ));
    }

    // 用修改后的表名
    let table_ref_new = if old_table.name != new_table.name {
        format!("`{}`.`{}`", escaped_db, escaped_new_name)
    } else {
        table_ref.clone()
    };

    // 2. 表注释修改
    if old_table.comment != new_table.comment {
        if let Some(ref comment) = new_table.comment {
            sqls.push(format!(
                "ALTER TABLE {} COMMENT='{}'",
                table_ref_new,
                comment.replace('\'', "''")
            ));
        }
    }

    // 3. Engine 修改
    if old_table.engine != new_table.engine {
        if let Some(ref engine) = new_table.engine {
            if !engine.is_empty() {
                sqls.push(format!("ALTER TABLE {} ENGINE={}", table_ref_new, engine));
            }
        }
    }

    // 4. Charset 修改
    if old_table.charset != new_table.charset {
        if let Some(ref charset) = new_table.charset {
            if !charset.is_empty() {
                sqls.push(format!(
                    "ALTER TABLE {} DEFAULT CHARACTER SET={}",
                    table_ref_new, charset
                ));
            }
        }
    }

    // 5. Auto increment 修改
    if old_table.increment_value != new_table.increment_value {
        if let Some(ref val) = new_table.increment_value {
            if !val.is_empty() {
                sqls.push(format!(
                    "ALTER TABLE {} AUTO_INCREMENT={}",
                    table_ref_new, val
                ));
            }
        }
    }

    // 6. 列变更
    for col in &new_table.column_list {
        let status = col.edit_status.as_deref().unwrap_or("");
        match status {
            "ADD" => {
                let col_def = build_column_definition(col);
                sqls.push(format!(
                    "ALTER TABLE {} ADD COLUMN {}",
                    table_ref_new, col_def
                ));
            }
            "MODIFY" => {
                let col_def = build_column_definition(col);
                if let Some(ref old_name) = col.old_name {
                    let name = col.name.as_deref().unwrap_or("");
                    if old_name != name {
                        sqls.push(format!(
                            "ALTER TABLE {} CHANGE COLUMN `{}` {}",
                            table_ref_new,
                            old_name.replace('`', "``"),
                            col_def
                        ));
                    } else {
                        sqls.push(format!(
                            "ALTER TABLE {} MODIFY COLUMN {}",
                            table_ref_new, col_def
                        ));
                    }
                } else {
                    sqls.push(format!(
                        "ALTER TABLE {} MODIFY COLUMN {}",
                        table_ref_new, col_def
                    ));
                }
            }
            "DELETE" => {
                if let Some(ref name) = col.name {
                    sqls.push(format!(
                        "ALTER TABLE {} DROP COLUMN `{}`",
                        table_ref_new,
                        name.replace('`', "``")
                    ));
                }
            }
            _ => {}
        }
    }

    // 7. 索引变更（MODIFY 走先 DROP 再 ADD）
    for idx in &new_table.index_list {
        let status = idx.edit_status.as_deref().unwrap_or("");
        match status {
            "ADD" => {
                let idx_sql = build_index_definition(idx);
                sqls.push(format!("ALTER TABLE {} ADD {}", table_ref_new, idx_sql));
            }
            "DELETE" => {
                sqls.push(build_drop_index_sql(&table_ref_new, idx));
            }
            "MODIFY" => {
                sqls.push(build_drop_index_sql(&table_ref_new, idx));
                let idx_sql = build_index_definition(idx);
                sqls.push(format!("ALTER TABLE {} ADD {}", table_ref_new, idx_sql));
            }
            _ => {}
        }
    }

    sqls
}

/// 生成 CREATE TABLE SQL（用于新建表）
fn build_create_table_sql(escaped_db: &str, table: &EditTableInfo) -> String {
    let table_name = table.name.replace('`', "``");
    let mut lines: Vec<String> = Vec::new();

    // 列定义（跳过被标记 DELETE 的）
    for col in &table.column_list {
        if col.edit_status.as_deref() == Some("DELETE") {
            continue;
        }
        if col.name.as_deref().map(|n| n.is_empty()).unwrap_or(true) {
            continue;
        }
        lines.push(format!("  {}", build_column_definition(col)));
    }

    // 主键（来自 column_list 中标记了 primary_key 的列）
    let mut primary_keys: Vec<&ColumnInfo> = table
        .column_list
        .iter()
        .filter(|c| c.primary_key.unwrap_or(false) && c.edit_status.as_deref() != Some("DELETE"))
        .collect();
    primary_keys.sort_by_key(|c| c.primary_key_order.unwrap_or(0));
    if !primary_keys.is_empty() {
        let cols: Vec<String> = primary_keys
            .iter()
            .filter_map(|c| c.name.as_ref())
            .map(|n| format!("`{}`", n.replace('`', "``")))
            .collect();
        if !cols.is_empty() {
            lines.push(format!("  PRIMARY KEY ({})", cols.join(", ")));
        }
    }

    // 索引
    for idx in &table.index_list {
        if idx.edit_status.as_deref() == Some("DELETE") {
            continue;
        }
        if idx.index_type == "PRIMARY_KEY" {
            // 主键已通过列定义处理
            continue;
        }
        if idx.column_list.is_empty() {
            continue;
        }
        lines.push(format!("  {}", build_index_definition(idx)));
    }

    let mut sql = format!(
        "CREATE TABLE `{}`.`{}` (\n{}\n)",
        escaped_db,
        table_name,
        lines.join(",\n")
    );

    // 表选项
    if let Some(ref engine) = table.engine {
        if !engine.is_empty() {
            sql.push_str(&format!(" ENGINE={}", engine));
        }
    }
    if let Some(ref charset) = table.charset {
        if !charset.is_empty() {
            sql.push_str(&format!(" DEFAULT CHARSET={}", charset));
        }
    }
    if let Some(ref auto_inc) = table.increment_value {
        if !auto_inc.is_empty() {
            sql.push_str(&format!(" AUTO_INCREMENT={}", auto_inc));
        }
    }
    if let Some(ref comment) = table.comment {
        if !comment.is_empty() {
            sql.push_str(&format!(" COMMENT='{}'", comment.replace('\'', "''")));
        }
    }

    sql
}

/// 删除索引 SQL（区分主键）
fn build_drop_index_sql(table_ref: &str, idx: &IndexInfo) -> String {
    if idx.name == "PRIMARY" || idx.index_type == "PRIMARY_KEY" {
        format!("ALTER TABLE {} DROP PRIMARY KEY", table_ref)
    } else {
        format!(
            "ALTER TABLE {} DROP INDEX `{}`",
            table_ref,
            idx.name.replace('`', "``")
        )
    }
}

/// 构建列定义 SQL 片段
fn build_column_definition(col: &ColumnInfo) -> String {
    let name = col.name.as_deref().unwrap_or("column");
    let mut parts = vec![format!("`{}`", name.replace('`', "``"))];
    parts.push(build_column_type_expr(col));

    // charset
    if let Some(ref charset) = col.char_set_name {
        if !charset.is_empty() {
            parts.push(format!("CHARACTER SET {}", charset));
        }
    }

    // collation
    if let Some(ref collation) = col.collation_name {
        if !collation.is_empty() {
            parts.push(format!("COLLATE {}", collation));
        }
    }

    // nullable
    match col.nullable.as_deref() {
        Some("NO") => parts.push("NOT NULL".into()),
        Some("YES") => parts.push("NULL".into()),
        _ => {}
    }

    // auto increment
    if col.auto_increment.as_deref() == Some("YES") {
        parts.push("AUTO_INCREMENT".into());
    }

    // default value
    if let Some(ref default) = col.default_value {
        if !default.is_empty() {
            parts.push(format_default_value(default));
        }
    }

    // comment
    if let Some(ref comment) = col.comment {
        if !comment.is_empty() {
            parts.push(format!("COMMENT '{}'", comment.replace('\'', "''")));
        }
    }

    parts.join(" ")
}

/// 优先用 type_name + column_size/decimal_digits/value 重新组装类型表达式；
/// 仅当全部缺失时回退到原始 column_type。
fn build_column_type_expr(col: &ColumnInfo) -> String {
    // 选用 type_name（裸类型名）作为主信息源
    let raw_type = col
        .type_name
        .as_deref()
        .filter(|s| !s.is_empty())
        .or(col.column_type.as_deref())
        .unwrap_or("VARCHAR");

    // 取裸类型（去掉可能带的括号部分）
    let base = match raw_type.find('(') {
        Some(idx) => raw_type[..idx].trim().to_string(),
        None => raw_type.trim().to_string(),
    };
    let base_upper = base.to_uppercase();

    // ENUM / SET：需要 value（一组带引号的取值）
    if base_upper == "ENUM" || base_upper == "SET" {
        if let Some(ref v) = col.value {
            if !v.is_empty() {
                return format!("{}({})", base_upper, v);
            }
        }
        // 回退到原始类型表达式（此时通常带括号）
        if let Some(ct) = col.column_type.as_deref() {
            if ct.contains('(') {
                return ct.to_string();
            }
        }
        return base_upper;
    }

    // 数值/字符串等：根据 column_size + decimal_digits 拼接
    if let Some(size) = col.column_size {
        if size > 0 {
            if let Some(ref digits) = col.decimal_digits {
                let digits_trim = digits.trim();
                if !digits_trim.is_empty() && digits_trim != "0" {
                    return format!("{}({},{})", base_upper, size, digits_trim);
                }
            }
            return format!("{}({})", base_upper, size);
        }
    }

    // 没有 size 信息：若原 column_type 自带括号（如 datetime(6) / enum(...)）则保留，否则用裸类型
    if let Some(ct) = col.column_type.as_deref() {
        if ct.contains('(') {
            return ct.to_string();
        }
    }
    base_upper
}

/// 把 sentinel/字面量默认值转换成合法的 SQL 片段
fn format_default_value(default: &str) -> String {
    let trimmed = default.trim();
    let upper = trimmed.to_uppercase();

    // sentinel
    if upper == "EMPTY_STRING" {
        return "DEFAULT ''".into();
    }
    if upper == "NULL" {
        return "DEFAULT NULL".into();
    }
    // 函数 / 关键字（不加引号）
    if upper == "CURRENT_TIMESTAMP"
        || upper.starts_with("CURRENT_TIMESTAMP(")
        || upper == "NOW()"
        || upper == "CURRENT_DATE"
        || upper == "CURRENT_TIME"
        || upper == "TRUE"
        || upper == "FALSE"
    {
        return format!("DEFAULT {}", trimmed);
    }
    // 纯数字
    if trimmed.parse::<f64>().is_ok() {
        return format!("DEFAULT {}", trimmed);
    }
    // 字符串字面量
    format!("DEFAULT '{}'", trimmed.replace('\'', "''"))
}

/// 构建索引定义 SQL 片段
fn build_index_definition(idx: &IndexInfo) -> String {
    let cols: Vec<String> = idx
        .column_list
        .iter()
        .map(|c| {
            let mut s = format!("`{}`", c.name.replace('`', "``"));
            if let Some(ref order) = c.collation {
                if order == "DESC" {
                    s.push_str(" DESC");
                }
            }
            s
        })
        .collect();
    let col_str = cols.join(", ");

    match idx.index_type.as_str() {
        "PRIMARY_KEY" => format!("PRIMARY KEY ({})", col_str),
        "UNIQUE" => format!(
            "UNIQUE INDEX `{}` ({})",
            idx.name.replace('`', "``"),
            col_str
        ),
        "FULLTEXT" => format!(
            "FULLTEXT INDEX `{}` ({})",
            idx.name.replace('`', "``"),
            col_str
        ),
        "SPATIAL" => format!(
            "SPATIAL INDEX `{}` ({})",
            idx.name.replace('`', "``"),
            col_str
        ),
        _ => format!(
            "INDEX `{}` ({})",
            idx.name.replace('`', "``"),
            col_str
        ),
    }
}
