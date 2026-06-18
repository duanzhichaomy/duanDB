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
    for (index, col) in new_table.column_list.iter().enumerate() {
        let status = col.edit_status.as_deref().unwrap_or("");
        match status {
            "ADD" => {
                let col_def = build_column_definition(col);
                sqls.push(format!(
                    "ALTER TABLE {} ADD COLUMN {}{}",
                    table_ref_new,
                    col_def,
                    build_column_position_clause(&new_table.column_list, index).unwrap_or_default()
                ));
            }
            "MODIFY" => {
                let col_def = build_column_definition(col);
                let position_clause = if is_column_position_changed(old_table, new_table, col) {
                    build_column_position_clause(&new_table.column_list, index).unwrap_or_default()
                } else {
                    String::new()
                };
                if let Some(ref old_name) = col.old_name {
                    let name = col.name.as_deref().unwrap_or("");
                    if old_name != name {
                        sqls.push(format!(
                            "ALTER TABLE {} CHANGE COLUMN `{}` {}{}",
                            table_ref_new,
                            old_name.replace('`', "``"),
                            col_def,
                            position_clause
                        ));
                    } else {
                        sqls.push(format!(
                            "ALTER TABLE {} MODIFY COLUMN {}{}",
                            table_ref_new, col_def, position_clause
                        ));
                    }
                } else {
                    sqls.push(format!(
                        "ALTER TABLE {} MODIFY COLUMN {}{}",
                        table_ref_new, col_def, position_clause
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
            _ => {
                if is_column_position_changed(old_table, new_table, col) {
                    let col_def = build_column_definition(col);
                    sqls.push(format!(
                        "ALTER TABLE {} MODIFY COLUMN {}{}",
                        table_ref_new,
                        col_def,
                        build_column_position_clause(&new_table.column_list, index)
                            .unwrap_or_default()
                    ));
                }
            }
        }
    }

    // 7. 主键变更（列信息页的主键勾选不会改 index_list，需要在这里对比 column_list）
    if !has_explicit_primary_index_change(&new_table.index_list) {
        let old_primary_keys = primary_key_column_names(&old_table.column_list);
        let new_primary_keys = primary_key_column_names(&new_table.column_list);
        if old_primary_keys != new_primary_keys {
            if !old_primary_keys.is_empty() {
                sqls.push(format!("ALTER TABLE {} DROP PRIMARY KEY", table_ref_new));
            }
            if !new_primary_keys.is_empty() {
                sqls.push(format!(
                    "ALTER TABLE {} ADD PRIMARY KEY ({})",
                    table_ref_new,
                    quote_column_names(&new_primary_keys)
                ));
            }
        }
    }

    // 8. 索引变更（MODIFY 走先 DROP 再 ADD）
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
    let primary_keys = primary_key_column_names(&table.column_list);
    if !primary_keys.is_empty() {
        lines.push(format!(
            "  PRIMARY KEY ({})",
            quote_column_names(&primary_keys)
        ));
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

fn has_explicit_primary_index_change(indexes: &[IndexInfo]) -> bool {
    indexes.iter().any(|idx| {
        matches!(
            idx.edit_status.as_deref(),
            Some("ADD" | "DELETE" | "MODIFY")
        ) && (idx.name == "PRIMARY" || idx.index_type == "PRIMARY_KEY")
    })
}

fn primary_key_column_names(columns: &[ColumnInfo]) -> Vec<String> {
    let mut primary_keys: Vec<(i64, usize, String)> = columns
        .iter()
        .enumerate()
        .filter(|(_, col)| {
            col.primary_key.unwrap_or(false) && col.edit_status.as_deref() != Some("DELETE")
        })
        .filter_map(|(index, col)| {
            let name = col.name.as_deref()?.trim();
            if name.is_empty() {
                return None;
            }
            Some((
                col.primary_key_order
                    .or(col.ordinal_position)
                    .unwrap_or((index + 1) as i64),
                index,
                name.to_string(),
            ))
        })
        .collect();

    primary_keys.sort_by_key(|(order, index, _)| (*order, *index));
    primary_keys.into_iter().map(|(_, _, name)| name).collect()
}

fn quote_column_names(names: &[String]) -> String {
    names
        .iter()
        .map(|name| format!("`{}`", name.replace('`', "``")))
        .collect::<Vec<_>>()
        .join(", ")
}

fn column_identity(col: &ColumnInfo) -> Option<&str> {
    col.old_name
        .as_deref()
        .filter(|name| !name.is_empty())
        .or_else(|| col.name.as_deref().filter(|name| !name.is_empty()))
}

fn visible_column_identities(columns: &[ColumnInfo]) -> Vec<&str> {
    columns
        .iter()
        .filter(|col| col.edit_status.as_deref() != Some("DELETE"))
        .filter_map(column_identity)
        .collect()
}

fn previous_visible_column_identity<'a>(
    columns: &'a [ColumnInfo],
    identity: &str,
) -> Option<&'a str> {
    let identities = visible_column_identities(columns);
    identities
        .iter()
        .position(|candidate| *candidate == identity)
        .and_then(|index| index.checked_sub(1))
        .and_then(|index| identities.get(index).copied())
}

fn build_column_position_clause(columns: &[ColumnInfo], index: usize) -> Option<String> {
    let visible_columns: Vec<&ColumnInfo> = columns
        .iter()
        .filter(|col| col.edit_status.as_deref() != Some("DELETE"))
        .filter(|col| {
            col.name
                .as_deref()
                .map(|name| !name.is_empty())
                .unwrap_or(false)
        })
        .collect();

    let column = columns.get(index)?;
    let name = column.name.as_deref()?;
    let visible_index = visible_columns
        .iter()
        .position(|col| col.name.as_deref() == Some(name))?;

    if visible_index == 0 {
        return Some(" FIRST".into());
    }

    visible_columns
        .get(visible_index - 1)
        .and_then(|col| col.name.as_deref())
        .map(|previous_name| format!(" AFTER `{}`", previous_name.replace('`', "``")))
}

fn is_column_position_changed(
    old_table: &EditTableInfo,
    new_table: &EditTableInfo,
    column: &ColumnInfo,
) -> bool {
    let Some(identity) = column_identity(column) else {
        return false;
    };

    if !visible_column_identities(&old_table.column_list)
        .iter()
        .any(|candidate| *candidate == identity)
    {
        return false;
    }

    previous_visible_column_identity(&old_table.column_list, identity)
        != previous_visible_column_identity(&new_table.column_list, identity)
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
        _ => format!("INDEX `{}` ({})", idx.name.replace('`', "``"), col_str),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn column(name: &str, type_name: &str) -> ColumnInfo {
        ColumnInfo {
            edit_status: None,
            old_name: None,
            name: Some(name.to_string()),
            database_name: None,
            schema_name: None,
            table_name: None,
            column_type: None,
            data_type: None,
            default_value: None,
            auto_increment: None,
            comment: None,
            primary_key: None,
            primary_key_order: None,
            type_name: Some(type_name.to_string()),
            column_size: None,
            buffer_length: None,
            decimal_digits: None,
            num_prec_radix: None,
            sql_data_type: None,
            sql_datetime_sub: None,
            char_octet_length: None,
            ordinal_position: None,
            nullable: None,
            generated_column: None,
            char_set_name: None,
            collation_name: None,
            value: None,
        }
    }

    fn table(name: &str) -> EditTableInfo {
        EditTableInfo {
            name: name.to_string(),
            comment: None,
            charset: None,
            engine: None,
            increment_value: None,
            column_list: vec![],
            index_list: vec![],
        }
    }

    #[test]
    fn create_database_escapes_identifier() {
        assert_eq!(
            build_create_database_sql("prod`db"),
            "CREATE DATABASE `prod``db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci"
        );
    }

    #[test]
    fn create_table_includes_columns_primary_key_indexes_and_options() {
        let mut id = column("id", "BIGINT");
        id.nullable = Some("NO".into());
        id.auto_increment = Some("YES".into());
        id.primary_key = Some(true);
        id.primary_key_order = Some(1);

        let mut name = column("user`name", "VARCHAR");
        name.column_size = Some(64);
        name.default_value = Some("O'Reilly".into());
        name.comment = Some("display's name".into());

        let mut info = table("account`profile");
        info.comment = Some("tenant's table".into());
        info.charset = Some("utf8mb4".into());
        info.engine = Some("InnoDB".into());
        info.column_list = vec![id, name];
        info.index_list = vec![IndexInfo {
            edit_status: None,
            name: "idx_name".into(),
            index_type: "UNIQUE".into(),
            comment: None,
            column_list: vec![IndexColumnInfo {
                name: "user`name".into(),
                collation: Some("DESC".into()),
                cardinality: None,
                sub_part: None,
                ordinal_position: None,
            }],
        }];

        let sql = build_modify_table_sql("prod`db", None, &info).join("\n");

        assert!(sql.contains("CREATE TABLE `prod``db`.`account``profile`"));
        assert!(sql.contains("`id` BIGINT NOT NULL AUTO_INCREMENT"));
        assert!(
            sql.contains("`user``name` VARCHAR(64) DEFAULT 'O''Reilly' COMMENT 'display''s name'")
        );
        assert!(sql.contains("PRIMARY KEY (`id`)"));
        assert!(sql.contains("UNIQUE INDEX `idx_name` (`user``name` DESC)"));
        assert!(sql.ends_with("ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='tenant''s table'"));
    }

    #[test]
    fn modify_table_generates_rename_column_and_primary_key_drop() {
        let mut old_table = table("users");
        old_table.comment = Some("old".into());

        let mut renamed_column = column("display_name", "VARCHAR");
        renamed_column.edit_status = Some("MODIFY".into());
        renamed_column.old_name = Some("name".into());
        renamed_column.column_size = Some(128);
        renamed_column.nullable = Some("YES".into());

        let mut new_table = table("members");
        new_table.comment = Some("new".into());
        new_table.column_list = vec![renamed_column];
        new_table.index_list = vec![IndexInfo {
            edit_status: Some("DELETE".into()),
            name: "PRIMARY".into(),
            index_type: "PRIMARY_KEY".into(),
            comment: None,
            column_list: vec![],
        }];

        let sqls = build_modify_table_sql("app", Some(&old_table), &new_table);

        assert_eq!(sqls[0], "ALTER TABLE `app`.`users` RENAME TO `members`");
        assert_eq!(sqls[1], "ALTER TABLE `app`.`members` COMMENT='new'");
        assert_eq!(
            sqls[2],
            "ALTER TABLE `app`.`members` CHANGE COLUMN `name` `display_name` VARCHAR(128) NULL"
        );
        assert_eq!(sqls[3], "ALTER TABLE `app`.`members` DROP PRIMARY KEY");
    }

    #[test]
    fn modify_table_generates_column_reorder_sql() {
        let mut old_table = table("users");
        old_table.column_list = vec![
            column("id", "INT"),
            column("mobile", "VARCHAR"),
            column("password", "VARCHAR"),
        ];

        let mut new_table = table("users");
        new_table.column_list = vec![
            column("id", "INT"),
            column("password", "VARCHAR"),
            column("mobile", "VARCHAR"),
        ];

        let sqls = build_modify_table_sql("app", Some(&old_table), &new_table);

        assert_eq!(
            sqls,
            vec![
                "ALTER TABLE `app`.`users` MODIFY COLUMN `password` VARCHAR AFTER `id`",
                "ALTER TABLE `app`.`users` MODIFY COLUMN `mobile` VARCHAR AFTER `password`",
            ]
        );
    }

    #[test]
    fn modify_table_generates_primary_key_change_from_columns() {
        let mut old_id = column("id", "INT");
        old_id.primary_key = Some(true);
        old_id.ordinal_position = Some(1);

        let mut new_id = column("id", "INT");
        new_id.primary_key = Some(true);
        new_id.ordinal_position = Some(1);

        let mut tenant_id = column("tenant_id", "INT");
        tenant_id.primary_key = Some(true);
        tenant_id.primary_key_order = Some(2);
        tenant_id.ordinal_position = Some(2);

        let mut old_table = table("users");
        old_table.column_list = vec![old_id, column("tenant_id", "INT")];

        let mut new_table = table("users");
        new_table.column_list = vec![new_id, tenant_id];

        let sqls = build_modify_table_sql("app", Some(&old_table), &new_table);

        assert_eq!(
            sqls,
            vec![
                "ALTER TABLE `app`.`users` DROP PRIMARY KEY",
                "ALTER TABLE `app`.`users` ADD PRIMARY KEY (`id`, `tenant_id`)",
            ]
        );
    }

    #[test]
    fn modify_table_appends_position_to_changed_column() {
        let mut old_table = table("users");
        old_table.column_list = vec![column("id", "INT"), column("name", "VARCHAR")];

        let mut changed_column = column("name", "VARCHAR");
        changed_column.edit_status = Some("MODIFY".into());
        changed_column.column_size = Some(128);

        let mut new_table = table("users");
        new_table.column_list = vec![changed_column, column("id", "INT")];

        let sqls = build_modify_table_sql("app", Some(&old_table), &new_table);

        assert_eq!(
            sqls,
            vec![
                "ALTER TABLE `app`.`users` MODIFY COLUMN `name` VARCHAR(128) FIRST",
                "ALTER TABLE `app`.`users` MODIFY COLUMN `id` INT AFTER `name`",
            ]
        );
    }
}
