use crate::state::MysqlPools;
use sqlx::mysql::MySqlPoolOptions;
use sqlx::MySqlPool;

/// 构建 MySQL 连接 URL
pub fn build_mysql_url(
    host: &str,
    port: i64,
    user: &str,
    password: &str,
    database: Option<&str>,
) -> String {
    let encoded_password = urlencoding::encode(password);
    match database {
        Some(db) if !db.is_empty() => {
            format!(
                "mysql://{}:{}@{}:{}/{}",
                user, encoded_password, host, port, db
            )
        }
        _ => {
            format!("mysql://{}:{}@{}:{}", user, encoded_password, host, port)
        }
    }
}

/// 获取或创建 MySQL 连接池
pub async fn get_or_create_pool(
    pools: &MysqlPools,
    data_source_id: i64,
    url: &str,
) -> Result<MySqlPool, String> {
    // 先读取，看是否已存在
    {
        let read = pools.read().await;
        if let Some(pool) = read.get(&data_source_id) {
            return Ok(pool.clone());
        }
    }

    // 创建新连接池
    let pool = MySqlPoolOptions::new()
        .max_connections(5)
        .min_connections(0)
        .acquire_timeout(std::time::Duration::from_secs(10))
        .idle_timeout(std::time::Duration::from_secs(300))
        .max_lifetime(std::time::Duration::from_secs(1800))
        .test_before_acquire(true)
        .connect(url)
        .await
        .map_err(|e| format!("连接 MySQL 失败: {}", e))?;

    let mut write = pools.write().await;
    write.insert(data_source_id, pool.clone());
    Ok(pool)
}

/// 关闭指定连接池
pub async fn close_pool(pools: &MysqlPools, data_source_id: i64) {
    let mut write = pools.write().await;
    if let Some(pool) = write.remove(&data_source_id) {
        pool.close().await;
    }
}

/// 测试 MySQL 连接
pub async fn test_connection(url: &str) -> Result<(), String> {
    let pool = MySqlPoolOptions::new()
        .max_connections(1)
        .acquire_timeout(std::time::Duration::from_secs(10))
        .connect(url)
        .await
        .map_err(|e| format!("连接失败: {}", e))?;

    sqlx::query("SELECT 1")
        .execute(&pool)
        .await
        .map_err(|e| format!("执行测试查询失败: {}", e))?;

    pool.close().await;
    Ok(())
}
