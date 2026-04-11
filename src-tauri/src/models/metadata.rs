use serde::{Deserialize, Serialize};

/// 数据库信息
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseInfo {
    pub name: String,
}

/// 数据库和 Schema 列表
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MetaSchemaVO {
    pub databases: Vec<DatabaseSchemaItem>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseSchemaItem {
    pub name: String,
    #[serde(default)]
    pub schemas: Vec<SchemaInfo>,
}

/// Schema 信息
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SchemaInfo {
    pub name: String,
}

/// 表信息（列表用）
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TableInfo {
    pub name: Option<String>,
    pub comment: Option<String>,
    #[serde(default)]
    pub pinned: bool,
}

/// 表名+注释（简单列表用）
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TableNameItem {
    pub name: String,
    pub comment: Option<String>,
}

/// 列信息（完整）
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ColumnInfo {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub edit_status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub old_name: Option<String>,
    pub name: Option<String>,
    pub database_name: Option<String>,
    pub schema_name: Option<String>,
    pub table_name: Option<String>,
    pub column_type: Option<String>,
    pub data_type: Option<i64>,
    pub default_value: Option<String>,
    pub auto_increment: Option<String>,
    pub comment: Option<String>,
    pub primary_key: Option<bool>,
    pub primary_key_order: Option<i64>,
    pub type_name: Option<String>,
    pub column_size: Option<i64>,
    pub buffer_length: Option<i64>,
    pub decimal_digits: Option<String>,
    pub num_prec_radix: Option<i64>,
    pub sql_data_type: Option<String>,
    pub sql_datetime_sub: Option<String>,
    pub char_octet_length: Option<String>,
    pub ordinal_position: Option<i64>,
    pub nullable: Option<String>,
    pub generated_column: Option<String>,
    pub char_set_name: Option<String>,
    pub collation_name: Option<String>,
    pub value: Option<String>,
}

/// 索引信息
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct IndexInfo {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub edit_status: Option<String>,
    pub name: String,
    #[serde(rename = "type")]
    pub index_type: String,
    pub comment: Option<String>,
    pub column_list: Vec<IndexColumnInfo>,
}

/// 索引中的列
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct IndexColumnInfo {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub collation: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cardinality: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sub_part: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ordinal_position: Option<i64>,
}

/// 编辑表信息（table_detail 返回）
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EditTableInfo {
    pub name: String,
    pub comment: Option<String>,
    pub charset: Option<String>,
    pub engine: Option<String>,
    pub increment_value: Option<String>,
    pub column_list: Vec<ColumnInfo>,
    pub index_list: Vec<IndexInfo>,
}

/// 视图/函数/过程/触发器列表项
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RoutineInfo {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub comment: Option<String>,
    #[serde(default)]
    pub pinned: bool,
}

/// 通用查询参数
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct TableQueryParams {
    pub data_source_id: i64,
    pub database_name: Option<String>,
    pub schema_name: Option<String>,
    pub table_name: Option<String>,
    #[serde(default)]
    pub refresh: bool,
}

/// 表列表查询参数
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct TableListParams {
    pub data_source_id: i64,
    pub database_name: Option<String>,
    pub schema_name: Option<String>,
    pub page_no: Option<i64>,
    pub page_size: Option<i64>,
    pub search_key: Option<String>,
}

/// 数据库支持的字段类型等元信息
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseSupportField {
    pub column_types: Vec<ColumnTypeInfo>,
    pub charsets: Vec<CharsetInfo>,
    pub collations: Vec<CollationInfo>,
    pub index_types: Vec<IndexTypeInfo>,
    pub default_values: Vec<DefaultValueInfo>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ColumnTypeInfo {
    pub type_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub support_length: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub support_scale: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub support_nullable: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub support_auto_increment: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub support_charset: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub support_collation: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub support_comment: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub support_default_value: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub support_extent: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub support_value: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CharsetInfo {
    pub charset_name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CollationInfo {
    pub collation_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub charset_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct IndexTypeInfo {
    pub type_name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DefaultValueInfo {
    pub default_value: String,
}

/// 修改表 SQL 请求
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct ModifyTableSqlRequest {
    pub data_source_id: i64,
    pub database_name: Option<String>,
    pub schema_name: Option<String>,
    pub old_table: EditTableInfo,
    pub new_table: EditTableInfo,
}
