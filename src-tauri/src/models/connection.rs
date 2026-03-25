use serde::{Deserialize, Serialize};

/// 连接列表项（不含密码）
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionListItem {
    pub id: i64,
    pub alias: String,
    #[serde(rename = "type")]
    pub db_type: String,
    pub host: Option<String>,
    pub port: Option<i64>,
    pub user: Option<String>,
    pub url: Option<String>,
    pub database_name: Option<String>,
    pub support_database: bool,
    pub support_schema: bool,
    pub environment: ConnectionEnv,
}

/// 连接详情（含密码）
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionDetails {
    pub id: i64,
    pub alias: String,
    #[serde(rename = "type")]
    pub db_type: String,
    pub host: Option<String>,
    pub port: Option<i64>,
    pub url: Option<String>,
    pub user: Option<String>,
    pub password: Option<String>,
    pub database_name: Option<String>,
    pub environment: ConnectionEnv,
    pub environment_id: Option<i64>,
    #[serde(default)]
    pub extend_info: Vec<ExtendInfoItem>,
}

/// 创建/更新连接请求
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionCreateRequest {
    pub alias: String,
    #[serde(rename = "type")]
    pub db_type: Option<String>,
    pub host: Option<String>,
    pub port: Option<i64>,
    pub url: Option<String>,
    pub user: Option<String>,
    pub password: Option<String>,
    pub database_name: Option<String>,
    pub environment_id: Option<i64>,
    #[serde(default)]
    pub extend_info: Vec<ExtendInfoItem>,
}

/// 更新连接请求
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionUpdateRequest {
    pub id: i64,
    pub alias: String,
    #[serde(rename = "type")]
    pub db_type: Option<String>,
    pub host: Option<String>,
    pub port: Option<i64>,
    pub url: Option<String>,
    pub user: Option<String>,
    pub password: Option<String>,
    pub database_name: Option<String>,
    pub environment_id: Option<i64>,
    #[serde(default)]
    pub extend_info: Vec<ExtendInfoItem>,
}

/// 连接环境
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionEnv {
    pub id: i64,
    pub name: String,
    pub short_name: String,
    pub color: String,
}

impl Default for ConnectionEnv {
    fn default() -> Self {
        Self {
            id: 1,
            name: "Local".into(),
            short_name: "Local".into(),
            color: "#1890ff".into(),
        }
    }
}

/// 连接扩展信息
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExtendInfoItem {
    pub key: String,
    pub value: String,
}

/// 测试连接请求
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionTestRequest {
    #[serde(rename = "type")]
    pub db_type: Option<String>,
    pub host: Option<String>,
    pub port: Option<i64>,
    pub url: Option<String>,
    pub user: Option<String>,
    pub password: Option<String>,
    pub database_name: Option<String>,
    #[serde(default)]
    pub extend_info: Vec<ExtendInfoItem>,
}
