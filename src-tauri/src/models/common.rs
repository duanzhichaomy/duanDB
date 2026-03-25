use serde::{Deserialize, Serialize};

/// 统一 API 响应
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiResponse<T: Serialize> {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
}

impl<T: Serialize> ApiResponse<T> {
    pub fn ok(data: T) -> Self {
        Self {
            success: true,
            error_code: None,
            error_message: None,
            data: Some(data),
        }
    }

    pub fn err(message: impl Into<String>) -> Self {
        Self {
            success: false,
            error_code: Some("error".into()),
            error_message: Some(message.into()),
            data: None,
        }
    }
}

/// 分页响应
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PageResponse<T: Serialize> {
    pub data: Vec<T>,
    pub page_no: i64,
    pub page_size: i64,
    pub total: i64,
    pub has_next_page: bool,
}

/// 分页请求参数
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PageParams {
    #[serde(default = "default_page_no")]
    pub page_no: i64,
    #[serde(default = "default_page_size")]
    pub page_size: i64,
    pub search_key: Option<String>,
}

fn default_page_no() -> i64 {
    1
}

fn default_page_size() -> i64 {
    100
}
