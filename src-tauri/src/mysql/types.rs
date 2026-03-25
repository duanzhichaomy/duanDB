use crate::models::metadata::*;

/// 获取 MySQL 支持的列类型元信息
pub fn get_mysql_column_types() -> Vec<ColumnTypeInfo> {
    vec![
        // 数值类型
        col_type("BIT", false, false, true, true, false, false, true, true, false, false),
        col_type("TINYINT", true, false, true, true, false, false, true, true, false, false),
        col_type("SMALLINT", true, false, true, true, false, false, true, true, false, false),
        col_type("MEDIUMINT", true, false, true, true, false, false, true, true, false, false),
        col_type("INT", true, false, true, true, false, false, true, true, false, false),
        col_type("BIGINT", true, false, true, true, false, false, true, true, false, false),
        col_type("DECIMAL", true, true, true, false, false, false, true, true, false, false),
        col_type("FLOAT", true, true, true, false, false, false, true, true, false, false),
        col_type("DOUBLE", true, true, true, false, false, false, true, true, false, false),
        // 日期时间
        col_type("DATE", false, false, true, false, false, false, true, true, false, false),
        col_type("DATETIME", true, false, true, false, false, false, true, true, false, false),
        col_type("TIMESTAMP", true, false, true, false, false, false, true, true, false, false),
        col_type("TIME", true, false, true, false, false, false, true, true, false, false),
        col_type("YEAR", false, false, true, false, false, false, true, true, false, false),
        // 字符串
        col_type("CHAR", true, false, true, false, true, true, true, true, false, false),
        col_type("VARCHAR", true, false, true, false, true, true, true, true, false, false),
        col_type("TINYTEXT", false, false, true, false, true, true, true, false, false, false),
        col_type("TEXT", false, false, true, false, true, true, true, false, false, false),
        col_type("MEDIUMTEXT", false, false, true, false, true, true, true, false, false, false),
        col_type("LONGTEXT", false, false, true, false, true, true, true, false, false, false),
        col_type("ENUM", false, false, true, false, true, true, true, true, false, true),
        col_type("SET", false, false, true, false, true, true, true, true, false, true),
        // 二进制
        col_type("BINARY", true, false, true, false, false, false, true, true, false, false),
        col_type("VARBINARY", true, false, true, false, false, false, true, true, false, false),
        col_type("TINYBLOB", false, false, true, false, false, false, true, false, false, false),
        col_type("BLOB", false, false, true, false, false, false, true, false, false, false),
        col_type("MEDIUMBLOB", false, false, true, false, false, false, true, false, false, false),
        col_type("LONGBLOB", false, false, true, false, false, false, true, false, false, false),
        // JSON
        col_type("JSON", false, false, true, false, false, false, true, false, false, false),
    ]
}

fn col_type(
    name: &str,
    length: bool,
    scale: bool,
    nullable: bool,
    auto_inc: bool,
    charset: bool,
    collation: bool,
    comment: bool,
    default_val: bool,
    extent: bool,
    value: bool,
) -> ColumnTypeInfo {
    ColumnTypeInfo {
        type_name: name.to_string(),
        support_length: Some(length),
        support_scale: Some(scale),
        support_nullable: Some(nullable),
        support_auto_increment: Some(auto_inc),
        support_charset: Some(charset),
        support_collation: Some(collation),
        support_comment: Some(comment),
        support_default_value: Some(default_val),
        support_extent: Some(extent),
        support_value: Some(value),
    }
}

/// 获取 MySQL 支持的索引类型
pub fn get_mysql_index_types() -> Vec<IndexTypeInfo> {
    vec![
        IndexTypeInfo { type_name: "PRIMARY_KEY".into() },
        IndexTypeInfo { type_name: "NORMAL".into() },
        IndexTypeInfo { type_name: "UNIQUE".into() },
        IndexTypeInfo { type_name: "FULLTEXT".into() },
        IndexTypeInfo { type_name: "SPATIAL".into() },
    ]
}

/// 获取 MySQL 默认值选项
pub fn get_mysql_default_values() -> Vec<DefaultValueInfo> {
    vec![
        DefaultValueInfo { default_value: "EMPTY_STRING".into() },
        DefaultValueInfo { default_value: "NULL".into() },
        DefaultValueInfo { default_value: "CURRENT_TIMESTAMP".into() },
    ]
}
