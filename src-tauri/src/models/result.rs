use serde::{Deserialize, Serialize};

/// SQL 执行结果
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExecuteResult {
    pub sql: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub original_sql: Option<String>,
    pub description: String,
    pub message: String,
    pub success: bool,
    pub header_list: Vec<TableHeader>,
    pub data_list: Vec<Vec<Option<String>>>,
    pub duration: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fuzzy_total: Option<String>,
    pub has_next_page: bool,
    pub sql_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub update_count: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub can_edit: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub table_name: Option<String>,
}

impl ExecuteResult {
    pub fn error(sql: &str, message: String, duration: i64) -> Self {
        Self {
            sql: sql.to_string(),
            original_sql: None,
            description: String::new(),
            message,
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
        }
    }
}

/// 表头信息
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TableHeader {
    pub name: String,
    pub data_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub auto_increment: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub column_size: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub comment: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub decimal_digits: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default_value: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub nullable: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub primary_key: Option<bool>,
}

/// SQL 执行请求
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecuteSqlParams {
    pub sql: Option<String>,
    pub console_id: Option<i64>,
    pub data_source_id: Option<i64>,
    pub database_name: Option<String>,
    pub schema_name: Option<String>,
    pub table_name: Option<String>,
    pub page_no: Option<i64>,
    pub page_size: Option<i64>,
}

/// 获取更新 SQL 的请求参数
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetUpdateSqlParams {
    pub database_name: Option<String>,
    pub data_source_id: Option<i64>,
    pub schema_name: Option<String>,
    #[serde(rename = "type")]
    pub db_type: Option<String>,
    pub table_name: Option<String>,
    pub header_list: Vec<TableHeader>,
    pub operations: Vec<UpdateOperation>,
}

/// 单个更新操作
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateOperation {
    #[serde(rename = "type")]
    pub op_type: String,
    pub row_id: String,
    pub data_list: Option<Vec<Option<String>>>,
    pub old_data_list: Option<Vec<Option<String>>>,
}

/// DDL 执行结果
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DdlExecuteResult {
    pub success: bool,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub original_sql: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sql: Option<String>,
}
