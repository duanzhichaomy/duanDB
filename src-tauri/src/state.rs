use sqlx::SqlitePool;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

/// MySQL 连接池，按 data_source_id 存储
pub type MysqlPools = Arc<RwLock<HashMap<i64, sqlx::MySqlPool>>>;

/// 全局应用状态
pub struct AppState {
    /// 本地 SQLite 数据库（存连接配置、历史等）
    pub local_db: SqlitePool,
    /// MySQL 连接池 map
    pub mysql_pools: MysqlPools,
}
