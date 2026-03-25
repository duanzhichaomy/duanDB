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

/// 对比新旧表结构，生成 ALTER TABLE SQL
pub fn build_modify_table_sql(
    database: &str,
    old_table: &EditTableInfo,
    new_table: &EditTableInfo,
) -> Vec<String> {
    let mut sqls = Vec::new();
    let escaped_db = database.replace('`', "``");
    let escaped_old_name = old_table.name.replace('`', "``");
    let escaped_new_name = new_table.name.replace('`', "``");
    let table_ref = format!("`{}`.`{}`", escaped_db, escaped_old_name);

    // 1. 表重命名
    if old_table.name != new_table.name {
        sqls.push(format!(
            "ALTER TABLE {} RENAME TO `{}`.`{}`",
            table_ref, escaped_db, escaped_new_name
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
            sqls.push(format!("ALTER TABLE {} ENGINE={}", table_ref_new, engine));
        }
    }

    // 4. Charset 修改
    if old_table.charset != new_table.charset {
        if let Some(ref charset) = new_table.charset {
            sqls.push(format!(
                "ALTER TABLE {} DEFAULT CHARACTER SET={}",
                table_ref_new, charset
            ));
        }
    }

    // 5. Auto increment 修改
    if old_table.increment_value != new_table.increment_value {
        if let Some(ref val) = new_table.increment_value {
            sqls.push(format!(
                "ALTER TABLE {} AUTO_INCREMENT={}",
                table_ref_new, val
            ));
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

    // 7. 索引变更
    for idx in &new_table.index_list {
        let status = idx.edit_status.as_deref().unwrap_or("");
        match status {
            "ADD" => {
                let idx_sql = build_index_definition(idx);
                sqls.push(format!(
                    "ALTER TABLE {} ADD {}",
                    table_ref_new, idx_sql
                ));
            }
            "DELETE" => {
                if idx.name == "PRIMARY" || idx.index_type == "PRIMARY_KEY" {
                    sqls.push(format!(
                        "ALTER TABLE {} DROP PRIMARY KEY",
                        table_ref_new
                    ));
                } else {
                    sqls.push(format!(
                        "ALTER TABLE {} DROP INDEX `{}`",
                        table_ref_new,
                        idx.name.replace('`', "``")
                    ));
                }
            }
            _ => {}
        }
    }

    sqls
}

/// 构建列定义 SQL 片段
fn build_column_definition(col: &ColumnInfo) -> String {
    let name = col.name.as_deref().unwrap_or("column");
    let col_type = col.column_type.as_deref().unwrap_or("VARCHAR(255)");

    let mut parts = vec![format!("`{}`", name.replace('`', "``"))];
    parts.push(col_type.to_string());

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
        if default == "CURRENT_TIMESTAMP" {
            parts.push(format!("DEFAULT {}", default));
        } else if default == "EMPTY_STRING" {
            parts.push("DEFAULT ''".into());
        } else if default == "NULL" {
            parts.push("DEFAULT NULL".into());
        } else {
            parts.push(format!("DEFAULT '{}'", default.replace('\'', "''")));
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
